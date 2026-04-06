// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────
// Firebase Auth + Realtime DB user management.
// Provides: login, signup, logout, deleteAccount,
//           connection requests (send / accept / reject / remove),
//           session timer, and role-based user object.
// ─────────────────────────────────────────────────────────────
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const AuthContext = createContext(null);

// Legacy fallback metadata for hard-coded staff accounts
const STAFF_META = {
  "coach@athletisense.io": {
    role: "admin",
    name: "Head Coach Rivera",
    title: "Head Coach",
  },
  "physio@athletisense.io": {
    role: "admin",
    name: "Dr. Emily Patel",
    title: "Therapist",
  },
};

async function uidByUsername(username) {
  const snap = await get(ref(db, `usernames/${username}`));
  return snap.exists() ? snap.val().uid : null;
}

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
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // ── Session timer ─────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimerSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // ── Helpers ───────────────────────────────────────────────
  const loadConnectedAthletes = useCallback(async (uid) => {
    const snap = await get(ref(db, `users/${uid}/athletes`));
    if (!snap.exists()) {
      setConnectedAthletes([]);
      return;
    }
    const list = await Promise.all(
      Object.keys(snap.val()).map(async (aUid) => {
        const p = await fetchUserProfile(aUid);
        return p
          ? {
              uid: aUid,
              name: p.name,
              username: p.username,
              athleteId: p.athleteId,
              sport: p.sport,
            }
          : null;
      }),
    );
    setConnectedAthletes(list.filter(Boolean));
  }, []);

  const loadConnectedCoaches = useCallback(async (uid) => {
    const snap = await get(ref(db, `users/${uid}/coaches`));
    if (!snap.exists()) {
      setConnectedCoaches([]);
      return;
    }
    const list = await Promise.all(
      Object.keys(snap.val()).map(async (cUid) => {
        const p = await fetchUserProfile(cUid);
        return p
          ? { uid: cUid, name: p.name, username: p.username, title: p.title }
          : null;
      }),
    );
    setConnectedCoaches(list.filter(Boolean));
  }, []);

  const loadPendingRequests = useCallback((uid) => {
    const q = query(
      ref(db, "connection_requests"),
      orderByChild("to"),
      equalTo(uid),
    );
    return onValue(q, (snap) => {
      if (!snap.exists()) {
        setPendingRequests([]);
        return;
      }
      const reqs = [];
      snap.forEach((child) => {
        const d = child.val();
        if (d.status === "pending") reqs.push({ id: child.key, ...d });
      });
      setPendingRequests(reqs);
    });
  }, []);

  async function buildUser(fbUser) {
    try {
      const snap = await get(ref(db, `users/${fbUser.uid}`));
      const meta = snap.exists() ? snap.val() : STAFF_META[fbUser.email] || {};
      return { email: fbUser.email, uid: fbUser.uid, ...meta };
    } catch {
      return {
        email: fbUser.email,
        uid: fbUser.uid,
        ...(STAFF_META[fbUser.email] || {}),
      };
    }
  }

  // ── Auth state listener ───────────────────────────────────
  useEffect(() => {
    let unsubReqs = null;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const enriched = await buildUser(fbUser);
        setUser(enriched);
        if (enriched.role === "admin") {
          await loadConnectedAthletes(fbUser.uid);
        } else {
          await loadConnectedCoaches(fbUser.uid);
        }
        unsubReqs = loadPendingRequests(fbUser.uid);
      } else {
        setUser(null);
        setPendingRequests([]);
        setConnectedCoaches([]);
        setConnectedAthletes([]);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      unsubReqs?.();
    };
  }, [loadConnectedAthletes, loadConnectedCoaches, loadPendingRequests]);

  // ── Auth actions ──────────────────────────────────────────
  const checkUsernameAvailable = async (username) => {
    const snap = await get(ref(db, `usernames/${username}`));
    return !snap.exists();
  };

  const signup = async (email, password, metadata) => {
    try {
      const available = await checkUsernameAvailable(metadata.username);
      if (!available)
        return { success: false, error: "Username already taken." };

      const { user: fbUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      await set(ref(db, `users/${fbUser.uid}`), {
        email,
        ...metadata,
        coaches: {},
        athletes: {},
        createdAt: new Date().toISOString(),
      });
      await set(ref(db, `usernames/${metadata.username}`), { uid: fbUser.uid });

      if (metadata.coachUsername) {
        const coachUid = await uidByUsername(metadata.coachUsername);
        if (coachUid) {
          await push(ref(db, "connection_requests"), {
            from: fbUser.uid,
            fromUsername: metadata.username,
            fromName: metadata.name,
            fromRole: metadata.role,
            to: coachUid,
            toUsername: metadata.coachUsername,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        }
      }
      setUser({ email: fbUser.email, uid: fbUser.uid, ...metadata });
      return { success: true };
    } catch (err) {
      if (err?.code === "auth/configuration-not-found") {
        return {
          success: false,
          error: "Enable Email/Password sign-in in the Firebase Console.",
        };
      }
      return { success: false, error: err.message };
    }
  };

  const login = async (email, password) => {
    try {
      const { user: fbUser } = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const enriched = await buildUser(fbUser);
      setUser(enriched);
      if (enriched.role === "admin") await loadConnectedAthletes(fbUser.uid);
      else await loadConnectedCoaches(fbUser.uid);
      return { success: true };
    } catch (err) {
      if (err?.code === "auth/configuration-not-found") {
        return {
          success: false,
          error: "Enable Email/Password sign-in in the Firebase Console.",
        };
      }
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setPendingRequests([]);
    setConnectedCoaches([]);
    setConnectedAthletes([]);
    setTimerSecs(0);
    setTimerRunning(false);
  };

  const deleteAccount = async () => {
    try {
      if (!auth.currentUser) return { success: false, error: "Not signed in." };
      const uid = auth.currentUser.uid;
      const username = user?.username;

      // Clean up bidirectional connections
      if (user?.coaches)
        for (const cUid of Object.keys(user.coaches))
          await remove(ref(db, `users/${cUid}/athletes/${uid}`));
      if (user?.athletes)
        for (const aUid of Object.keys(user.athletes))
          await remove(ref(db, `users/${aUid}/coaches/${uid}`));

      // Remove pending requests
      const reqSnap = await get(ref(db, "connection_requests"));
      if (reqSnap.exists()) {
        reqSnap.forEach((child) => {
          const r = child.val();
          if (r.from === uid || r.to === uid)
            remove(ref(db, `connection_requests/${child.key}`));
        });
      }

      await remove(ref(db, `users/${uid}`));
      if (username) await remove(ref(db, `usernames/${username}`));

      try {
        await deleteUser(auth.currentUser);
      } catch (e) {
        if (e?.code === "auth/requires-recent-login") {
          const pw = window.prompt(
            "Security check: enter your password to confirm deletion.",
          );
          if (!pw) {
            await logout();
            return { success: true };
          }
          await reauthenticateWithCredential(
            auth.currentUser,
            EmailAuthProvider.credential(auth.currentUser.email, pw),
          );
          await deleteUser(auth.currentUser);
        } else throw e;
      }

      setUser(null);
      setPendingRequests([]);
      setConnectedCoaches([]);
      setConnectedAthletes([]);
      setTimerSecs(0);
      setTimerRunning(false);
      return { success: true };
    } catch (err) {
      alert(err.message);
      return { success: false, error: err.message };
    }
  };

  // ── Connection management ─────────────────────────────────
  const acceptRequest = async (requestId, request) => {
    try {
      await update(ref(db, `connection_requests/${requestId}`), {
        status: "accepted",
      });
      if (request.fromRole !== "admin") {
        await set(
          ref(db, `users/${request.to}/athletes/${request.from}`),
          true,
        );
        await set(ref(db, `users/${request.from}/coaches/${request.to}`), true);
      } else {
        await set(
          ref(db, `users/${request.from}/athletes/${request.to}`),
          true,
        );
        await set(ref(db, `users/${request.to}/coaches/${request.from}`), true);
      }
      if (user?.role === "admin") await loadConnectedAthletes(user.uid);
      else await loadConnectedCoaches(user.uid);
    } catch (err) {
      console.error("acceptRequest:", err);
    }
  };

  const rejectRequest = async (requestId) => {
    await update(ref(db, `connection_requests/${requestId}`), {
      status: "rejected",
    });
  };

  const sendRequest = async (targetUsername) => {
    const targetUid = await uidByUsername(targetUsername);
    if (!targetUid) return { success: false, error: "Username not found." };
    if (targetUid === user.uid)
      return { success: false, error: "Cannot connect with yourself." };
    await push(ref(db, "connection_requests"), {
      from: user.uid,
      fromUsername: user.username,
      fromName: user.name,
      fromRole: user.role,
      to: targetUid,
      toUsername: targetUsername,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  };

  const removeConnection = async (targetUid) => {
    try {
      if (user.role === "admin") {
        await remove(ref(db, `users/${user.uid}/athletes/${targetUid}`));
        await remove(ref(db, `users/${targetUid}/coaches/${user.uid}`));
        await loadConnectedAthletes(user.uid);
      } else {
        await remove(ref(db, `users/${user.uid}/coaches/${targetUid}`));
        await remove(ref(db, `users/${targetUid}/athletes/${user.uid}`));
        await loadConnectedCoaches(user.uid);
      }
    } catch (err) {
      console.error("removeConnection:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        deleteAccount,
        checkUsernameAvailable,
        pendingRequests,
        connectedCoaches,
        connectedAthletes,
        acceptRequest,
        rejectRequest,
        sendRequest,
        removeConnection,
        timerSecs,
        setTimerSecs,
        timerRunning,
        setTimerRunning,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
