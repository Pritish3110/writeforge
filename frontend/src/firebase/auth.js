import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { app } from "./config.js";

export const auth = getAuth(app);

const isPersistablePhotoUrl = (value) => /^(https?:\/\/|gs:\/\/)/i.test(value);

const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(
  (error) => {
    console.error("Unable to enable persistent Firebase auth sessions.", error);
  },
);

const ensurePersistence = async () => {
  await persistenceReady;
};

export const observeAuthState = (callback) => onAuthStateChanged(auth, callback);

export const signInWithEmail = async ({ email, password }) => {
  await ensurePersistence();
  return signInWithEmailAndPassword(auth, email.trim(), password);
};

export const signUpWithEmail = async ({ email, password, displayName }) => {
  await ensurePersistence();
  const credentials = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  if (displayName?.trim()) {
    await updateProfile(credentials.user, {
      displayName: displayName.trim(),
    });
  }

  try {
    await sendEmailVerification(credentials.user);
  } catch (error) {
    console.error("Unable to send the initial verification email.", error);
  }

  await reload(credentials.user);

  return credentials;
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const updateCurrentUserProfile = async ({
  displayName,
  avatarUrl,
}) => {
  if (!auth.currentUser) {
    throw new Error("You need to be signed in to update your profile.");
  }

  const payload = {};

  if (displayName !== undefined) {
    payload.displayName = displayName || null;
  }

  if (avatarUrl !== undefined) {
    const normalizedAvatarUrl = avatarUrl.trim();

    if (!normalizedAvatarUrl) {
      payload.photoURL = null;
    } else if (isPersistablePhotoUrl(normalizedAvatarUrl)) {
      payload.photoURL = normalizedAvatarUrl;
    }
  }

  if (Object.keys(payload).length > 0) {
    await updateProfile(auth.currentUser, payload);
    await reload(auth.currentUser);
  }

  return auth.currentUser;
};

export const updateCurrentUserPassword = async (password) => {
  if (!auth.currentUser) {
    throw new Error("You need to be signed in to change your password.");
  }

  await updatePassword(auth.currentUser, password);
};

export const resendCurrentUserVerificationEmail = async () => {
  if (!auth.currentUser) {
    throw new Error("You need to be signed in to resend verification.");
  }

  await sendEmailVerification(auth.currentUser);
};

export const deleteCurrentUser = async () => {
  if (!auth.currentUser) {
    throw new Error("You need to be signed in to delete your account.");
  }

  await deleteUser(auth.currentUser);
};

export const reloadCurrentUser = async () => {
  if (!auth.currentUser) {
    return null;
  }

  await reload(auth.currentUser);
  return auth.currentUser;
};
