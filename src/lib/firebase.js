import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/*
 * Configuração da app web do projeto Firebase "ferias-b-i". Não é secreta: identifica o projeto,
 * e quem protege os dados são as regras do Firestore (firestore.rules).
 * As variáveis VITE_FIREBASE_* do .env, se existirem, têm prioridade (útil para outro projeto).
 * Com VITE_LOCAL_MODE=true a app corre em modo local, sem Firebase.
 */
const DEFAULT = {
  apiKey: "AIzaSyC6f7sFA2V73rNCaabKvaAx-uHOiJNiexs",
  authDomain: "ferias-b-i.firebaseapp.com",
  projectId: "ferias-b-i",
  storageBucket: "ferias-b-i.firebasestorage.app",
  messagingSenderId: "1087334402055",
  appId: "1:1087334402055:web:6cacf45781ea5f160582a2",
};
const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY || DEFAULT.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || DEFAULT.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || DEFAULT.appId,
};

/** Em modo local (VITE_LOCAL_MODE=true), guarda só no browser, sem login. */
export const firebaseEnabled = env.VITE_LOCAL_MODE !== "true" && Boolean(cfg.apiKey && cfg.projectId);

export const app = firebaseEnabled ? initializeApp(cfg) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
