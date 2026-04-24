import { getApp, getApps, initializeApp } from "firebase/app";

const readEnvOverride = (key, fallback) => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const firebaseConfig = {
  apiKey: readEnvOverride("VITE_FIREBASE_API_KEY", ""),
  authDomain: readEnvOverride("VITE_FIREBASE_AUTH_DOMAIN", ""),
  projectId: readEnvOverride("VITE_FIREBASE_PROJECT_ID", ""),
  storageBucket: readEnvOverride("VITE_FIREBASE_STORAGE_BUCKET", ""),
  messagingSenderId: readEnvOverride("VITE_FIREBASE_MESSAGING_SENDER_ID", ""),
  appId: readEnvOverride("VITE_FIREBASE_APP_ID", ""),
  measurementId: readEnvOverride("VITE_FIREBASE_MEASUREMENT_ID", ""),
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export { firebaseConfig };
