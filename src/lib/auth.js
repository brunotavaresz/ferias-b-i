import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, firebaseEnabled } from "./firebase.js";

const LOCAL_USER = { uid: "local", email: "eu@local", name: "Eu", local: true };

export function useAuth() {
  const [state, setState] = useState(firebaseEnabled ? { loading: true, user: null } : { loading: false, user: LOCAL_USER });
  useEffect(() => {
    if (!firebaseEnabled) return;
    return onAuthStateChanged(auth, (u) =>
      setState({ loading: false, user: u ? { uid: u.uid, email: (u.email || "").toLowerCase(), name: u.displayName || u.email, photo: u.photoURL } : null }));
  }, []);
  return state;
}

export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => (firebaseEnabled ? signOut(auth) : Promise.resolve());
