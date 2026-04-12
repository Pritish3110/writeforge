import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockFirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  [key: string]: unknown;
}

const firebaseAuthMock = vi.hoisted(() => {
  const auth = { currentUser: null as MockFirebaseUser | null };

  const createUser = (overrides: Record<string, unknown> = {}): MockFirebaseUser => ({
    uid: "firebase-user-001",
    email: "iris@example.com",
    displayName: "Iris Vale",
    photoURL: "https://cdn.writerz.app/avatar.png",
    metadata: {
      creationTime: "2026-04-07T00:00:00.000Z",
      lastSignInTime: "2026-04-07T00:00:00.000Z",
    },
    ...overrides,
  });

  return {
    auth,
    browserLocalPersistence: Symbol("browserLocalPersistence"),
    createUser,
    createUserWithEmailAndPassword: vi.fn(async (_auth: unknown, email: string) => {
      const user = createUser({ email });
      auth.currentUser = user;
      return { user };
    }),
    deleteUser: vi.fn(async () => {}),
    getAuth: vi.fn(() => auth),
    onAuthStateChanged: vi.fn(),
    reload: vi.fn(async () => {}),
    sendEmailVerification: vi.fn(async () => {}),
    setPersistence: vi.fn(async () => {}),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updatePassword: vi.fn(),
    updateProfile: vi.fn(async () => {}),
  };
});

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: firebaseAuthMock.browserLocalPersistence,
  createUserWithEmailAndPassword: firebaseAuthMock.createUserWithEmailAndPassword,
  deleteUser: firebaseAuthMock.deleteUser,
  getAuth: firebaseAuthMock.getAuth,
  onAuthStateChanged: firebaseAuthMock.onAuthStateChanged,
  reload: firebaseAuthMock.reload,
  sendEmailVerification: firebaseAuthMock.sendEmailVerification,
  setPersistence: firebaseAuthMock.setPersistence,
  signInWithEmailAndPassword: firebaseAuthMock.signInWithEmailAndPassword,
  signOut: firebaseAuthMock.signOut,
  updatePassword: firebaseAuthMock.updatePassword,
  updateProfile: firebaseAuthMock.updateProfile,
}));

vi.mock("@/firebase/config.js", () => ({
  app: {},
}));

import { auth, signUpWithEmail, updateCurrentUserProfile } from "@/firebase/auth.js";

describe("firebase auth helpers", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = firebaseAuthMock.createUser();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not send data URLs to Firebase profile photoURL", async () => {
    await updateCurrentUserProfile({
      displayName: "Iris Vale",
      avatarUrl: "data:image/png;base64,abc123",
    });

    expect(firebaseAuthMock.updateProfile).toHaveBeenCalledWith(auth.currentUser, {
      displayName: "Iris Vale",
    });
    expect(firebaseAuthMock.reload).toHaveBeenCalledWith(auth.currentUser);
  });

  it("clears the Firebase photoURL when the avatar is removed", async () => {
    await updateCurrentUserProfile({
      avatarUrl: "",
    });

    expect(firebaseAuthMock.updateProfile).toHaveBeenCalledWith(auth.currentUser, {
      photoURL: null,
    });
  });

  it("tries to send a verification email after sign up without failing account creation", async () => {
    const createdUser = firebaseAuthMock.createUser({
      email: "new-writer@example.com",
      photoURL: "",
    });

    firebaseAuthMock.createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: createdUser,
    });
    firebaseAuthMock.sendEmailVerification.mockRejectedValueOnce(
      new Error("delivery failed"),
    );

    const credentials = await signUpWithEmail({
      email: "new-writer@example.com",
      password: "Drafting!123",
      displayName: "Iris Vale",
    });

    expect(credentials.user).toBe(createdUser);
    expect(firebaseAuthMock.updateProfile).toHaveBeenCalledWith(createdUser, {
      displayName: "Iris Vale",
    });
    expect(firebaseAuthMock.sendEmailVerification).toHaveBeenCalledWith(createdUser);
    expect(firebaseAuthMock.reload).toHaveBeenCalledWith(createdUser);
  });
});
