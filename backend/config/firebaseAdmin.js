import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const parseServiceAccount = () => {
  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (inlineServiceAccount) {
    try {
      return JSON.parse(inlineServiceAccount);
    } catch (error) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
    }
  }

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  }

  return null;
};

const createFirebaseAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = parseServiceAccount();

  if (!serviceAccount) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
};

const app = createFirebaseAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
