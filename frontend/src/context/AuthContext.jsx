import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Try to fetch metadata from DB
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);

          let metadata = {};
          if (snapshot.exists()) {
            metadata = snapshot.val();
          } else {
            // Fallback to hardcoded metadata for legacy users
            metadata = USERS_METADATA[firebaseUser.email] || {};
          }

          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            ...metadata
          });
        } catch (err) {
          console.error("Error fetching user metadata:", err);
          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, metadata) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Save metadata to database
      await set(ref(db, `users/${firebaseUser.uid}`), {
        email,
        ...metadata,
        createdAt: new Date().toISOString()
      });

      setUser({
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        ...metadata
      });
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      // Provide a clearer error message for common misconfiguration
      if (error?.code === 'auth/configuration-not-found') {
        return {
          success: false,
          error: 'Authentication is not configured for this Firebase project. Enable Email/Password sign-in in the Firebase Console or verify your API key.'
        };
      }
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch metadata
      const userRef = ref(db, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);

      let metadata = {};
      if (snapshot.exists()) {
        metadata = snapshot.val();
      } else {
        metadata = USERS_METADATA[firebaseUser.email] || {};
      }

      setUser({
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        ...metadata
      });
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

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
