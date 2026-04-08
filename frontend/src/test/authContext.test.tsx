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
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  [key: string]: unknown;
}

const snapshotServiceMock = vi.hoisted(() => ({
  deleteSnapshot: vi.fn(async () => {}),
  saveSnapshot: vi.fn(async (_userId: string, snapshot: unknown) => snapshot),
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
    deleteCurrentUser: vi.fn(async () => {
      auth.currentUser = null;
      state.listener?.(null);
    }),
    signInWithEmail: vi.fn(async () => ({ user: auth.currentUser })),
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
  reloadCurrentUser: firebaseAuthMock.reloadCurrentUser,
  resendCurrentUserVerificationEmail:
    firebaseAuthMock.resendCurrentUserVerificationEmail,
  signInWithEmail: firebaseAuthMock.signInWithEmail,
  signOutUser: firebaseAuthMock.signOutUser,
  signUpWithEmail: firebaseAuthMock.signUpWithEmail,
  updateCurrentUserPassword: firebaseAuthMock.updateCurrentUserPassword,
  updateCurrentUserProfile: firebaseAuthMock.updateCurrentUserProfile,
}));

vi.mock("@/services/snapshotService.js", () => ({
  deleteSnapshot: snapshotServiceMock.deleteSnapshot,
  saveSnapshot: snapshotServiceMock.saveSnapshot,
}));

const AuthConsumer = () => {
  const { loading, displayName, email, deleteAccount, signUp, signOut } = useAuth();

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

    expect(snapshotServiceMock.deleteSnapshot).toHaveBeenCalledWith(
      "firebase-user-001",
    );
  });
});
