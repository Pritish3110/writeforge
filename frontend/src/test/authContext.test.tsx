import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { resetStorageAdapter } from "@/lib/backend/storageAdapter";

interface MockFirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  providerData: Array<{
    providerId: string;
  }>;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  [key: string]: unknown;
}

const snapshotServiceMock = vi.hoisted(() => ({
  deleteWorkspace: vi.fn(async () => {}),
  saveWorkspaceData: vi.fn(async (_userId: string, snapshot: unknown) => snapshot),
}));

const firebaseAuthMock = vi.hoisted(() => {
  const auth = { currentUser: null as MockFirebaseUser | null };
  const state = {
    listener: null as ((user: MockFirebaseUser | null) => void) | null,
  };

  const createUser = (overrides: Record<string, unknown> = {}): MockFirebaseUser => ({
    uid: "firebase-user-001",
    email: "iris@example.com",
    displayName: "Iris Vale",
    photoURL: "",
    emailVerified: true,
    providerData: [{ providerId: "password" }],
    metadata: {
      creationTime: "2026-04-07T00:00:00.000Z",
      lastSignInTime: "2026-04-07T00:00:00.000Z",
    },
    ...overrides,
  });

  return {
    auth,
    state,
    createUser,
    observeAuthState: vi.fn((callback: (user: MockFirebaseUser | null) => void) => {
      state.listener = callback;
      callback(auth.currentUser);
      return () => {
        if (state.listener === callback) {
          state.listener = null;
        }
      };
    }),
    reloadCurrentUser: vi.fn(async () => auth.currentUser),
    resendCurrentUserVerificationEmail: vi.fn(async () => {}),
    reauthenticateCurrentUser: vi.fn(async () => {}),
    deleteCurrentUser: vi.fn(async () => {
      auth.currentUser = null;
      state.listener?.(null);
    }),
    sendPasswordReset: vi.fn(async () => {}),
    signInWithEmail: vi.fn(async () => ({ user: auth.currentUser })),
    signInWithGoogle: vi.fn(async () => {
      const user = createUser({
        email: "google-writer@example.com",
        providerData: [{ providerId: "google.com" }],
      });
      auth.currentUser = user;
      state.listener?.(user);
      return { user };
    }),
    signOutUser: vi.fn(async () => {
      auth.currentUser = null;
      state.listener?.(null);
    }),
    signUpWithEmail: vi.fn(async ({ email, displayName }) => {
      const user = createUser({
        displayName,
        email,
      });
      auth.currentUser = user;
      state.listener?.(user);
      return { user };
    }),
    updateCurrentUserPassword: vi.fn(async () => {}),
    updateCurrentUserProfile: vi.fn(async () => auth.currentUser),
  };
});

vi.mock("@/firebase/auth.js", () => ({
  auth: firebaseAuthMock.auth,
  deleteCurrentUser: firebaseAuthMock.deleteCurrentUser,
  observeAuthState: firebaseAuthMock.observeAuthState,
  reauthenticateCurrentUser: firebaseAuthMock.reauthenticateCurrentUser,
  reloadCurrentUser: firebaseAuthMock.reloadCurrentUser,
  resendCurrentUserVerificationEmail:
    firebaseAuthMock.resendCurrentUserVerificationEmail,
  sendPasswordReset: firebaseAuthMock.sendPasswordReset,
  signInWithEmail: firebaseAuthMock.signInWithEmail,
  signInWithGoogle: firebaseAuthMock.signInWithGoogle,
  signOutUser: firebaseAuthMock.signOutUser,
  signUpWithEmail: firebaseAuthMock.signUpWithEmail,
  updateCurrentUserPassword: firebaseAuthMock.updateCurrentUserPassword,
  updateCurrentUserProfile: firebaseAuthMock.updateCurrentUserProfile,
}));

vi.mock("@/services/snapshotService.js", () => ({
  deleteWorkspace: snapshotServiceMock.deleteWorkspace,
  saveWorkspaceData: snapshotServiceMock.saveWorkspaceData,
}));

const AuthConsumer = () => {
  const { loading, changePassword, displayName, email, deleteAccount, signUp, signOut } =
    useAuth();

  return (
    <div>
      <p data-testid="loading-state">{loading ? "loading" : "ready"}</p>
      <p data-testid="display-name">{displayName}</p>
      <p data-testid="email">{email}</p>
      <button
        onClick={() =>
          void signUp({
            displayName: "Iris Vale",
            email: "iris@example.com",
            password: "Drafting!123",
          })
        }
      >
        Sign Up
      </button>
      <button
        onClick={() =>
          void changePassword({
            currentPassword: "Drafting!123",
            newPassword: "FreshDraft!456",
          })
        }
      >
        Change Password
      </button>
      <button onClick={() => void signOut()}>Sign Out</button>
      <button onClick={() => void deleteAccount()}>Delete Account</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    resetStorageAdapter();
    firebaseAuthMock.auth.currentUser = null;
    firebaseAuthMock.state.listener = null;
    vi.clearAllMocks();
  });

  it("creates a Firebase-backed session when sign up succeeds", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading-state")).toHaveTextContent("ready"),
    );

    await act(async () => {
      screen.getByText("Sign Up").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("display-name")).toHaveTextContent("Iris Vale"),
    );
    expect(screen.getByTestId("email")).toHaveTextContent("iris@example.com");
  });

  it("clears the active session on sign out", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading-state")).toHaveTextContent("ready"),
    );

    await act(async () => {
      screen.getByText("Sign Up").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("display-name")).toHaveTextContent("Iris Vale"),
    );

    await act(async () => {
      screen.getByText("Sign Out").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("email")).toHaveTextContent(""),
    );
  });

  it("clears the active session on account deletion", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading-state")).toHaveTextContent("ready"),
    );

    await act(async () => {
      screen.getByText("Sign Up").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("display-name")).toHaveTextContent("Iris Vale"),
    );

    await act(async () => {
      screen.getByText("Delete Account").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("email")).toHaveTextContent(""),
    );

    expect(snapshotServiceMock.deleteWorkspace).toHaveBeenCalledWith(
      "firebase-user-001",
    );
  });

  it("retries password changes after Firebase requests recent login", async () => {
    firebaseAuthMock.updateCurrentUserPassword
      .mockRejectedValueOnce({
        code: "auth/requires-recent-login",
      })
      .mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading-state")).toHaveTextContent("ready"),
    );

    await act(async () => {
      screen.getByText("Sign Up").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("display-name")).toHaveTextContent("Iris Vale"),
    );

    await act(async () => {
      screen.getByText("Change Password").click();
    });

    expect(firebaseAuthMock.reauthenticateCurrentUser).toHaveBeenCalledWith({
      password: "Drafting!123",
    });
    expect(firebaseAuthMock.updateCurrentUserPassword).toHaveBeenCalledTimes(2);
    expect(firebaseAuthMock.updateCurrentUserPassword).toHaveBeenLastCalledWith(
      "FreshDraft!456",
    );
  });
});
