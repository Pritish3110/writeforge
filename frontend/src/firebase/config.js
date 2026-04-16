import { getApp, getApps, initializeApp } from "firebase/app";

const readEnvOverride = (key, fallback) => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const firebaseConfig = {
  apiKey: "AIzaSyAnKzPTUbnyBnibXrDoa8Rg6yH16CpFhzo",
  authDomain: "writerz-uk3312.firebaseapp.com",
  projectId: "writerz-uk3312",
  storageBucket: readEnvOverride(
    "VITE_FIREBASE_STORAGE_BUCKET",
    "writerz-uk3312.firebasestorage.app",
  ),
  messagingSenderId: "304343634359",
  appId: "1:304343634359:web:b6539ecb33bb8259f34ba2",
  measurementId: "G-4DQ2T06YPT",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export { firebaseConfig };
