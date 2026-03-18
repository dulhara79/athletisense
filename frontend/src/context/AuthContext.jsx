import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { ref, set, get, push, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';

const AuthContext = createContext(null);

// Keeping USERS_METADATA as fallback/legacy
export const USERS_METADATA = {
  'coach@athletisense.io': {
    role: 'admin',
    name: 'Head Coach Rivera',
    title: 'Head Coach'
  },
  'physio@athletisense.io': {
    role: 'admin',
    name: 'Dr. Emily Patel',
    title: 'Therapist'
  }
};

// ─── Helper: look up a UID by username ───────────────────────────────────────
async function uidByUsername(username) {
  const snap = await get(ref(db, `usernames/${username}`));
  return snap.exists() ? snap.val().uid : null;
}

// ─── Helper: fetch full user profile by UID ──────────────────────────────────
async function fetchUserProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [connectedCoaches, setConnectedCoaches] = useState([]);
  const [connectedAthletes, setConnectedAthletes] = useState([]);

  // ─── Global Session Timer ────────────────────────────────────────────────────
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => setTimerSecs((s) => s + 1), 1000);
    } else if (!timerRunning && timerSecs !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSecs]);

  // ─── Build enriched user object from Firebase data ─────────────────────────
  async function buildUser(firebaseUser) {
    let metadata = {};

    try {
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        metadata = snapshot.val();
      } else {
        metadata = USERS_METADATA[firebaseUser.email] || {};
      }
    } catch (err) {
      console.error("Error fetching user metadata:", err);
      metadata = USERS_METADATA[firebaseUser.email] || {};
    }

    return {
      email: firebaseUser.email,
      uid: firebaseUser.uid,
      ...metadata
    };
  }

  // ─── Load connected coaches (for athletes) ─────────────────────────────────
  async function loadConnectedCoaches(uid) {
    const snap = await get(ref(db, `users/${uid}/coaches`));
    if (!snap.exists()) { setConnectedCoaches([]); return; }
    const coachUids = Object.keys(snap.val());
    const coaches = await Promise.all(
      coachUids.map(async (cUid) => {
        const profile = await fetchUserProfile(cUid);
        return profile ? { uid: cUid, name: profile.name, username: profile.username, title: profile.title } : null;
      })
    );
    setConnectedCoaches(coaches.filter(Boolean));
  }

  // ─── Load connected athletes (for coaches/admins) ──────────────────────────
  async function loadConnectedAthletes(uid) {
    const snap = await get(ref(db, `users/${uid}/athletes`));
    if (!snap.exists()) { setConnectedAthletes([]); return; }
    const athUids = Object.keys(snap.val());
    const athletes = await Promise.all(
      athUids.map(async (aUid) => {
        const profile = await fetchUserProfile(aUid);
        return profile ? { uid: aUid, name: profile.name, username: profile.username, athleteId: profile.athleteId, sport: profile.sport } : null;
      })
    );
    setConnectedAthletes(athletes.filter(Boolean));
  }

  // ─── Load pending connection requests ──────────────────────────────────────
  function loadPendingRequests(uid) {
    // Listen for requests sent TO me
    const inRef = query(ref(db, 'connection_requests'), orderByChild('to'), equalTo(uid));
    return onValue(inRef, async (snap) => {
      if (!snap.exists()) { setPendingRequests([]); return; }
      const requests = [];
      snap.forEach((child) => {
        const data = child.val();
        if (data.status === 'pending') {
          requests.push({ id: child.key, ...data });
        }
      });
      setPendingRequests(requests);
    });
  }

  useEffect(() => {
    let unsubRequests = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const enrichedUser = await buildUser(firebaseUser);
        setUser(enrichedUser);

        // Load connections based on role
        if (enrichedUser.role === 'admin') {
          await loadConnectedAthletes(firebaseUser.uid);
        } else {
          await loadConnectedCoaches(firebaseUser.uid);
        }

        // Listen for pending requests
        unsubRequests = loadPendingRequests(firebaseUser.uid);
      } else {
        setUser(null);
        setPendingRequests([]);
        setConnectedCoaches([]);
        setConnectedAthletes([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubRequests) unsubRequests();
    };
  }, []);

  // ─── Check if a username is available ──────────────────────────────────────
  const checkUsernameAvailable = async (username) => {
    const snap = await get(ref(db, `usernames/${username}`));
    return !snap.exists();
  };

  // ─── Signup ────────────────────────────────────────────────────────────────
  const signup = async (email, password, metadata) => {
    try {
      // Check username uniqueness first
      const available = await checkUsernameAvailable(metadata.username);
      if (!available) {
        return { success: false, error: 'This username is already taken. Please choose another.' };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Save metadata to database
      await set(ref(db, `users/${firebaseUser.uid}`), {
        email,
        ...metadata,
        coaches: metadata.coaches || {},
        athletes: metadata.athletes || {},
        createdAt: new Date().toISOString()
      });

      // Reserve username
      await set(ref(db, `usernames/${metadata.username}`), {
        uid: firebaseUser.uid
      });

      // If athlete entered a coach username, send connection request
      if (metadata.coachUsername) {
        const coachUid = await uidByUsername(metadata.coachUsername);
        if (coachUid) {
          await push(ref(db, 'connection_requests'), {
            from: firebaseUser.uid,
            fromUsername: metadata.username,
            fromName: metadata.name,
            fromRole: metadata.role,
            to: coachUid,
            toUsername: metadata.coachUsername,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
        }
      }

      setUser({
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        ...metadata
      });
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      if (error?.code === 'auth/configuration-not-found') {
        return {
          success: false,
          error: 'Authentication is not configured for this Firebase project. Enable Email/Password sign-in in the Firebase Console or verify your API key.'
        };
      }
      return { success: false, error: error.message };
    }
  };

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const enrichedUser = await buildUser(firebaseUser);
      setUser(enrichedUser);

      // Load connections
      if (enrichedUser.role === 'admin') {
        await loadConnectedAthletes(firebaseUser.uid);
      } else {
        await loadConnectedCoaches(firebaseUser.uid);
      }

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      if (error?.code === 'auth/configuration-not-found') {
        return {
          success: false,
          error: 'Authentication is not configured for this Firebase project. Enable Email/Password sign-in in the Firebase Console or verify your API key.'
        };
      }
      return { success: false, error: error.message };
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setPendingRequests([]);
    setConnectedCoaches([]);
    setConnectedAthletes([]);
    setTimerSecs(0);
    setTimerRunning(false);
  };

  // ─── Delete Account ────────────────────────────────────────────────────────
  const deleteAccount = async () => {
    try {
      if (!user || !auth.currentUser) return { success: false, error: 'No user signed in' };
      
      const uid = auth.currentUser.uid;
      const username = user.username;
      
      // Remove from connected coaches
      if (user.coaches) {
        for (const coachUid of Object.keys(user.coaches)) {
          await remove(ref(db, `users/${coachUid}/athletes/${uid}`));
        }
      }
      
      // Remove from connected athletes
      if (user.athletes) {
        for (const athleteUid of Object.keys(user.athletes)) {
          await remove(ref(db, `users/${athleteUid}/coaches/${uid}`));
        }
      }

      // Remove any pending connection requests involving this user
      const requestsSnap = await get(ref(db, 'connection_requests'));
      if (requestsSnap.exists()) {
        requestsSnap.forEach((child) => {
          const req = child.val();
          if (req.from === uid || req.to === uid) {
            remove(ref(db, `connection_requests/${child.key}`));
          }
        });
      }
      
      // Delete user data from database
      await remove(ref(db, `users/${uid}`));
      if (username) {
        await remove(ref(db, `usernames/${username}`));
      }
      
      // Delete auth user
      try {
        await deleteUser(auth.currentUser);
      } catch (authError) {
        if (authError?.code === 'auth/requires-recent-login') {
          const password = window.prompt("Security check: Please enter your password to finalize account deletion.");
          if (password) {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await deleteUser(auth.currentUser);
          } else {
             // If canceled, still log out as the account data is now gone
             await logout();
             return { success: true };
          }
        } else {
          throw authError; // pass other auth errors down to main catch block
        }
      }
      
      setUser(null);
      setPendingRequests([]);
      setConnectedCoaches([]);
      setConnectedAthletes([]);
      setTimerSecs(0);
      setTimerRunning(false);
      
      return { success: true };
    } catch (error) {
      console.error("Delete account error:", error);
      alert(error.message);
      return { success: false, error: error.message };
    }
  };

  // ─── Accept a connection request ───────────────────────────────────────────
  const acceptRequest = async (requestId, request) => {
    try {
      // Update request status
      await update(ref(db, `connection_requests/${requestId}`), { status: 'accepted' });

      if (request.fromRole === 'athlete' || request.fromRole !== 'admin') {
        // Athlete sent request to coach → link them
        await set(ref(db, `users/${request.to}/athletes/${request.from}`), true);
        await set(ref(db, `users/${request.from}/coaches/${request.to}`), true);
      } else {
        // Coach sent request to athlete → link them
        await set(ref(db, `users/${request.from}/athletes/${request.to}`), true);
        await set(ref(db, `users/${request.to}/coaches/${request.from}`), true);
      }

      // Reload connections
      if (user?.role === 'admin') {
        await loadConnectedAthletes(user.uid);
      } else {
        await loadConnectedCoaches(user.uid);
      }
    } catch (err) {
      console.error("Accept request error:", err);
    }
  };

  // ─── Reject a connection request ───────────────────────────────────────────
  const rejectRequest = async (requestId) => {
    await update(ref(db, `connection_requests/${requestId}`), { status: 'rejected' });
  };

  // ─── Send a connection request by username ─────────────────────────────────
  const sendRequest = async (targetUsername) => {
    const targetUid = await uidByUsername(targetUsername);
    if (!targetUid) return { success: false, error: 'Username not found.' };
    if (targetUid === user.uid) return { success: false, error: 'You cannot connect with yourself.' };

    await push(ref(db, 'connection_requests'), {
      from: user.uid,
      fromUsername: user.username,
      fromName: user.name,
      fromRole: user.role,
      to: targetUid,
      toUsername: targetUsername,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return { success: true };
  };

  // ─── Remove a connection ───────────────────────────────────────────────────
  const removeConnection = async (targetUid) => {
    try {
      if (user.role === 'admin') {
        await remove(ref(db, `users/${user.uid}/athletes/${targetUid}`));
        await remove(ref(db, `users/${targetUid}/coaches/${user.uid}`));
        await loadConnectedAthletes(user.uid);
      } else {
        await remove(ref(db, `users/${user.uid}/coaches/${targetUid}`));
        await remove(ref(db, `users/${targetUid}/athletes/${user.uid}`));
        await loadConnectedCoaches(user.uid);
      }
    } catch (err) {
      console.error("Remove connection error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading,
        login, signup, logout, deleteAccount,
        checkUsernameAvailable,
        pendingRequests, connectedCoaches, connectedAthletes,
        acceptRequest, rejectRequest, sendRequest, removeConnection,
        timerSecs, setTimerSecs, timerRunning, setTimerRunning
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
