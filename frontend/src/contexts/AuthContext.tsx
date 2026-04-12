import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import {
  auth,
  deleteCurrentUser,
  observeAuthState,
  reloadCurrentUser,
  resendCurrentUserVerificationEmail,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  updateCurrentUserPassword,
  updateCurrentUserProfile,
} from "@/firebase/auth.js";
import {
  clearStoredBackendUser,
  readStoredBackendUser,
  readWorkspaceSnapshot,
  writeStoredBackendUser,
  type BackendWorkspaceUser,
} from "@/lib/backend/workspaceSnapshot";
import {
  readStoredStringValue,
  removeStoredValue,
  subscribeToStorage,
} from "@/lib/backend/storageAdapter";
import { getFallbackDisplayName } from "@/lib/identity";
import { RESETTABLE_STORAGE_KEYS, STORAGE_KEYS } from "@/lib/storageKeys";
import { deleteWorkspace, saveWorkspaceData } from "@/services/snapshotService.js";

export type PendingAuthAction =
  | "session-check"
  | "sign-in"
  | "sign-up"
  | "sign-out"
  | "delete-account"
  | "update-profile"
  | "change-password"
  | "resend-verification"
  | "sync"
  | "migration"
  | null;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  emailVerified: boolean;
  provider: "firebase";
  createdAt: string;
  lastSignInAt: string;
  updatedAt: string;
  user_metadata: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  };
}

interface SignInPayload {
  email: string;
  password: string;
}

interface SignUpPayload extends SignInPayload {
  displayName?: string;
}

interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  pendingAuthAction: PendingAuthAction;
  displayName: string;
  avatarUrl: string;
  bio: string;
  email: string;
  isEmailVerified: boolean;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<AuthUser | null>;
  signIn: (payload: SignInPayload) => Promise<AuthUser>;
  signUp: (payload: SignUpPayload) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  changePassword: (password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  pendingAuthAction: "session-check",
  displayName: "Writer",
  avatarUrl: "",
  bio: "",
  email: "",
  isEmailVerified: false,
  setUser: () => {},
  refreshUser: async () => null,
  signIn: async () => {
    throw new Error("Auth provider is not ready.");
  },
  signUp: async () => {
    throw new Error("Auth provider is not ready.");
  },
  signOut: async () => {},
  deleteAccount: async () => {},
  updateProfile: async () => {
    throw new Error("Auth provider is not ready.");
  },
  changePassword: async () => {},
  resendVerificationEmail: async () => {},
});

const trimToEmpty = (value: string | undefined) => value?.trim() || "";
const readThemeValue = (fallback: "dark" | "light" = "dark") => {
  const rawTheme = readStoredStringValue(STORAGE_KEYS.theme, fallback);
  return rawTheme === "light" ? "light" : "dark";
};

const readCharacterSeedVersion = (fallback = 0) => {
  const rawValue = Number(
    readStoredStringValue(
      STORAGE_KEYS.characterSeedVersion,
      String(fallback),
    ),
  );

  return Number.isFinite(rawValue) ? rawValue : fallback;
};

const readStoredProfileForUser = (userId: string) => {
  const storedProfile = readStoredBackendUser();
  return storedProfile?.id === userId ? storedProfile : null;
};

const buildStoredProfileDraft = (
  firebaseUser: FirebaseUser,
  overrides: Partial<
    Pick<BackendWorkspaceUser, "bio" | "displayName" | "photoURL">
  > = {},
) => {
  const now = new Date().toISOString();
  const storedProfile = readStoredProfileForUser(firebaseUser.uid);
  const displayName =
    trimToEmpty(overrides.displayName) ||
    storedProfile?.displayName ||
    trimToEmpty(firebaseUser.displayName || "") ||
    getFallbackDisplayName(firebaseUser.email);

  return {
    id: firebaseUser.uid,
    displayName,
    email: trimToEmpty(firebaseUser.email || storedProfile?.email || ""),
    photoURL:
      overrides.photoURL !== undefined
        ? trimToEmpty(overrides.photoURL)
        : storedProfile?.photoURL || trimToEmpty(firebaseUser.photoURL || ""),
    bio:
      overrides.bio !== undefined
        ? overrides.bio.trim()
        : storedProfile?.bio || "",
    theme: storedProfile?.theme || readThemeValue(),
    characterSeedVersion: readCharacterSeedVersion(
      storedProfile?.characterSeedVersion || 0,
    ),
    createdAt: storedProfile?.createdAt || firebaseUser.metadata.creationTime || now,
  };
};

const syncStoredProfile = (
  firebaseUser: FirebaseUser,
  overrides: Partial<
    Pick<BackendWorkspaceUser, "bio" | "displayName" | "photoURL">
  > = {},
  forceUpdatedAt = false,
) => {
  const now = new Date().toISOString();
  const storedProfile = readStoredProfileForUser(firebaseUser.uid);
  const nextProfileBase = buildStoredProfileDraft(firebaseUser, overrides);

  const hasMeaningfulChanges =
    !storedProfile ||
    storedProfile.displayName !== nextProfileBase.displayName ||
    storedProfile.email !== nextProfileBase.email ||
    storedProfile.photoURL !== nextProfileBase.photoURL ||
    storedProfile.bio !== nextProfileBase.bio ||
    storedProfile.theme !== nextProfileBase.theme ||
    storedProfile.characterSeedVersion !==
      nextProfileBase.characterSeedVersion ||
    storedProfile.createdAt !== nextProfileBase.createdAt;

  const nextProfile: BackendWorkspaceUser = {
    ...nextProfileBase,
    updatedAt:
      storedProfile && !forceUpdatedAt && !hasMeaningfulChanges
        ? storedProfile.updatedAt || now
        : now,
  };

  if (
    !storedProfile ||
    hasMeaningfulChanges ||
    storedProfile.updatedAt !== nextProfile.updatedAt
  ) {
    writeStoredBackendUser(nextProfile);
  }

  return nextProfile;
};

const buildAuthUser = (
  firebaseUser: FirebaseUser,
  profile: BackendWorkspaceUser | null = readStoredProfileForUser(firebaseUser.uid),
): AuthUser => {
  const now = new Date().toISOString();
  const displayName =
    profile?.displayName ||
    trimToEmpty(firebaseUser.displayName || "") ||
    getFallbackDisplayName(firebaseUser.email);
  const avatarUrl = profile?.photoURL || trimToEmpty(firebaseUser.photoURL || "");
  const bio = profile?.bio || "";
  const createdAt = profile?.createdAt || firebaseUser.metadata.creationTime || now;
  const lastSignInAt =
    firebaseUser.metadata.lastSignInTime || profile?.updatedAt || createdAt;

  return {
    id: firebaseUser.uid,
    email: trimToEmpty(firebaseUser.email || profile?.email || ""),
    displayName,
    avatarUrl,
    bio,
    emailVerified: firebaseUser.emailVerified,
    provider: "firebase",
    createdAt,
    lastSignInAt,
    updatedAt: profile?.updatedAt || lastSignInAt,
    user_metadata: {
      display_name: displayName,
      avatar_url: avatarUrl,
      bio,
    },
  };
};

const createAuthError = (error: unknown, fallback: string) => {
  const code =
    typeof error === "object" &&
    error &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return new Error("That email is already in use.");
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return new Error("We couldn't match that email and password.");
    case "auth/invalid-email":
      return new Error("Use a valid email address.");
    case "auth/missing-password":
      return new Error("Enter a password to continue.");
    case "auth/network-request-failed":
      return new Error(
        "We couldn't reach the server. Check your connection and try again.",
      );
    case "auth/requires-recent-login":
      return new Error(
        "For security, please sign in again before changing sensitive account details.",
      );
    case "auth/too-many-requests":
      return new Error("Too many attempts just now. Please wait a moment and try again.");
    case "auth/weak-password":
      return new Error("Use at least 6 characters for your password.");
    default:
      return error instanceof Error ? error : new Error(fallback);
  }
};

const clearWorkspaceSession = () => {
  RESETTABLE_STORAGE_KEYS.forEach((key) => {
    removeStoredValue(key);
  });
  clearStoredBackendUser();
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAuthAction, setPendingAuthAction] =
    useState<PendingAuthAction>("session-check");

  const setUser = useCallback((nextUser: AuthUser | null) => {
    setUserState(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const firebaseUser = await reloadCurrentUser();
      const nextUser = firebaseUser ? buildAuthUser(firebaseUser) : null;
      setUserState(nextUser);
      return nextUser;
    } catch (error) {
      console.error("Failed to refresh the current auth session.", error);
      const nextUser = auth.currentUser ? buildAuthUser(auth.currentUser) : null;
      setUserState(nextUser);
      return nextUser;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPendingAuthAction("session-check");

    const unsubscribe = observeAuthState((firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = syncStoredProfile(firebaseUser);
          setUserState(buildAuthUser(firebaseUser, profile));
        } else {
          clearWorkspaceSession();
          setUserState(null);
        }
      } catch (error) {
        console.error("Failed to restore the Firebase auth session.", error);
        setUserState(null);
      } finally {
        setPendingAuthAction(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(
    () =>
      subscribeToStorage((key) => {
        if (key !== STORAGE_KEYS.backendUser) return;

        setUserState((currentUser) => {
          if (!auth.currentUser || !currentUser) {
            return auth.currentUser ? buildAuthUser(auth.currentUser) : currentUser;
          }

          return buildAuthUser(auth.currentUser);
        });
      }),
    [],
  );

  const signIn = useCallback(async ({ email, password }: SignInPayload) => {
    setPendingAuthAction("sign-in");

    try {
      const credentials = await signInWithEmail({
        email: email.trim().toLowerCase(),
        password,
      });
      const profile = syncStoredProfile(credentials.user);
      const nextUser = buildAuthUser(credentials.user, profile);
      setUserState(nextUser);
      return nextUser;
    } catch (error) {
      console.error("Firebase sign-in failed.", error);
      throw createAuthError(error, "Unable to sign in right now.");
    } finally {
      setPendingAuthAction(null);
    }
  }, []);

  const signUp = useCallback(
    async ({ email, password, displayName }: SignUpPayload) => {
      setPendingAuthAction("sign-up");

      try {
        const normalizedEmail = email.trim().toLowerCase();
        const resolvedDisplayName =
          trimToEmpty(displayName) || getFallbackDisplayName(normalizedEmail);
        const credentials = await signUpWithEmail({
          email: normalizedEmail,
          password,
          displayName: resolvedDisplayName,
        });
        const nextProfile = syncStoredProfile(
          credentials.user,
          {
            displayName: resolvedDisplayName,
          },
          true,
        );
        const nextUser = buildAuthUser(credentials.user, nextProfile);
        setUserState(nextUser);
        return nextUser;
      } catch (error) {
        console.error("Firebase sign-up failed.", error);
        throw createAuthError(error, "Unable to create your account right now.");
      } finally {
        setPendingAuthAction(null);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setPendingAuthAction("sign-out");

    try {
      await signOutUser();
      setUserState(null);
    } catch (error) {
      console.error("Firebase sign-out failed.", error);
      throw createAuthError(error, "Unable to sign out right now.");
    } finally {
      setPendingAuthAction(null);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error("You need to be signed in to delete your account.");
    }

    const userId = auth.currentUser.uid;
    const snapshotBackup = readWorkspaceSnapshot(userId);
    setPendingAuthAction("delete-account");

    try {
      await deleteWorkspace(userId);

      try {
        await deleteCurrentUser();
      } catch (error) {
        try {
          await saveWorkspaceData(userId, snapshotBackup);
        } catch (restoreError) {
          console.error("Unable to restore the workspace data after delete failure.", restoreError);
        }

        throw error;
      }

      clearWorkspaceSession();
      setUserState(null);
    } catch (error) {
      console.error("Firebase account deletion failed.", error);
      throw createAuthError(error, "Unable to delete your account right now.");
    } finally {
      setPendingAuthAction(null);
    }
  }, []);

  const updateProfile = useCallback(
    async ({ displayName, bio, avatarUrl }: UpdateProfilePayload) => {
      if (!auth.currentUser) {
        throw new Error("You need to be signed in to update your profile.");
      }

      setPendingAuthAction("update-profile");

      try {
        const resolvedDisplayName =
          displayName !== undefined
            ? trimToEmpty(displayName) ||
              getFallbackDisplayName(auth.currentUser.email)
            : undefined;
        const resolvedAvatarUrl =
          avatarUrl !== undefined ? trimToEmpty(avatarUrl) : undefined;

        if (displayName !== undefined || avatarUrl !== undefined) {
          await updateCurrentUserProfile({
            displayName: resolvedDisplayName,
            avatarUrl: resolvedAvatarUrl,
          });
        }

        const currentFirebaseUser = auth.currentUser;

        if (!currentFirebaseUser) {
          throw new Error("Your session ended before the profile could be updated.");
        }

        const nextProfile = syncStoredProfile(
          currentFirebaseUser,
          {
            bio,
            displayName: resolvedDisplayName,
            photoURL: resolvedAvatarUrl,
          },
          true,
        );
        const nextUser = buildAuthUser(currentFirebaseUser, nextProfile);
        setUserState(nextUser);
        return nextUser;
      } catch (error) {
        console.error("Firebase profile update failed.", error);
        throw createAuthError(error, "Unable to save your profile right now.");
      } finally {
        setPendingAuthAction(null);
      }
    },
    [],
  );

  const changePassword = useCallback(
    async (password: string) => {
      if (!auth.currentUser) {
        throw new Error("You need to be signed in to change your password.");
      }

      setPendingAuthAction("change-password");

      try {
        await updateCurrentUserPassword(password);
      } catch (error) {
        console.error("Firebase password update failed.", error);
        throw createAuthError(error, "Unable to change your password right now.");
      } finally {
        setPendingAuthAction(null);
      }
    },
    [],
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error("You need to be signed in to resend verification.");
    }

    setPendingAuthAction("resend-verification");

    try {
      await resendCurrentUserVerificationEmail();
    } catch (error) {
      console.error("Firebase verification resend failed.", error);
      throw createAuthError(error, "Unable to send a new verification email.");
    } finally {
      setPendingAuthAction(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      pendingAuthAction,
      displayName:
        user?.user_metadata.display_name ||
        user?.displayName ||
        getFallbackDisplayName(user?.email),
      avatarUrl: user?.avatarUrl || user?.user_metadata.avatar_url || "",
      bio: user?.bio || user?.user_metadata.bio || "",
      email: user?.email || "",
      isEmailVerified: user?.emailVerified || false,
      setUser,
      refreshUser,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      updateProfile,
      changePassword,
      resendVerificationEmail,
    }),
    [
      changePassword,
      deleteAccount,
      loading,
      pendingAuthAction,
      refreshUser,
      resendVerificationEmail,
      setUser,
      signIn,
      signOut,
      signUp,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
