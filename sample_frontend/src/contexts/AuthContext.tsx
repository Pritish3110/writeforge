import type { User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getUserAvatarUrl,
  getUserBio,
  getUserDisplayName,
} from "@/lib/identity";
import {
  getSupabaseClient,
  getSupabaseSession,
  hasSupabaseConfig,
} from "@/lib/supabase/client";

export type PendingAuthAction =
  | "change_password"
  | "resend_verification"
  | "restore_session"
  | "sign_in"
  | "sign_out"
  | "sign_up"
  | "update_profile"
  | null;
export type AuthStatus = "disabled" | "checking" | "authenticated" | "unauthenticated";

export interface AuthProfileUpdateInput {
  avatarUrl?: string | null;
  bio?: string | null;
  displayName?: string | null;
}

export interface AuthSignUpResult {
  needsEmailVerification: boolean;
}

interface AuthContextValue {
  authStatus: AuthStatus;
  changePassword: (password: string) => Promise<void>;
  emailVerified: boolean;
  hasBackend: boolean;
  isAuthenticated: boolean;
  lastSignInAt: string | null;
  loading: boolean;
  pendingAuthAction: PendingAuthAction;
  refreshUser: () => Promise<User | null>;
  resendVerificationEmail: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<AuthSignUpResult>;
  updateProfile: (input: AuthProfileUpdateInput) => Promise<User | null>;
  user: User | null;
  userAvatarUrl: string | null;
  userBio: string | null;
  userDisplayName: string | null;
  userEmail: string | null;
  userEmailConfirmedAt: string | null;
  userId: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
};

const requireSupabaseClient = () => {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Supabase auth is not configured for this environment.");
  }

  return client;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [pendingAuthAction, setPendingAuthAction] =
    useState<PendingAuthAction>(hasSupabaseConfig ? "restore_session" : null);

  const refreshUser = useCallback(async () => {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.getUser();

    console.log("USER TEST:", data, error);

    if (error) {
      throw error;
    }

    const nextUser = data.user ?? null;
    setUser(nextUser ?? null);
    return nextUser ?? null;
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      setPendingAuthAction(null);
      setUser(null);
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setLoading(false);
      setPendingAuthAction(null);
      setUser(null);
      return;
    }

    let active = true;

    const init = async () => {
      setPendingAuthAction("restore_session");

      try {
        await getSupabaseSession(client);
        await refreshUser();
      } catch (error) {
        console.error("Failed to restore auth session", error);

        if (!active) return;

        setUser(null);
      } finally {
        if (!active) return;
        setLoading(false);
        setPendingAuthAction(null);
      }
    };

    void init();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabaseClient();
    setPendingAuthAction("sign_in");

    try {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const nextUser = await refreshUser();
      console.log("USER:", nextUser);
      return nextUser;
    } finally {
      setPendingAuthAction(null);
    }
  }, [refreshUser]);

  const signUp = useCallback(async (email: string, password: string) => {
    const client = requireSupabaseClient();
    setPendingAuthAction("sign_up");

    try {
      const emailRedirectTo =
        typeof window === "undefined" ? undefined : `${window.location.origin}/`;

      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (error) {
        throw error;
      }

      const needsEmailVerification = !data.session;

      if (!needsEmailVerification) {
        const nextUser = await refreshUser();
        console.log("USER:", nextUser);
      }

      return { needsEmailVerification };
    } finally {
      setPendingAuthAction(null);
    }
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    const client = requireSupabaseClient();
    setPendingAuthAction("sign_out");

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      console.log("USER:", null);
    } catch (error) {
      console.error("SIGN OUT ERROR:", error);
      throw error;
    } finally {
      setPendingAuthAction(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: AuthProfileUpdateInput) => {
    const client = requireSupabaseClient();
    setPendingAuthAction("update_profile");

    try {
      const { error } = await client.auth.updateUser({
        data: {
          avatar_url: input.avatarUrl?.trim() || null,
          bio: input.bio?.trim() || null,
          display_name: input.displayName?.trim() || null,
        },
      });

      if (error) {
        throw error;
      }

      const nextUser = await refreshUser();
      console.log("USER:", nextUser);
      return nextUser;
    } catch (error) {
      console.error("UPDATE ERROR:", error);
      throw error;
    } finally {
      setPendingAuthAction(null);
    }
  }, [refreshUser]);

  const changePassword = useCallback(async (password: string) => {
    const client = requireSupabaseClient();
    setPendingAuthAction("change_password");

    try {
      const { error } = await client.auth.updateUser({ password });

      if (error) {
        throw error;
      }
    } finally {
      setPendingAuthAction(null);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    const client = requireSupabaseClient();

    if (!user?.email) {
      throw new Error("A signed-in email address is required to resend verification.");
    }

    setPendingAuthAction("resend_verification");

    try {
      const emailRedirectTo =
        typeof window === "undefined" ? undefined : `${window.location.origin}/`;

      const { error } = await client.auth.resend({
        email: user.email,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
        type: "signup",
      });

      if (error) {
        throw error;
      }
    } finally {
      setPendingAuthAction(null);
    }
  }, [user?.email]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authStatus: !hasSupabaseConfig
        ? "disabled"
        : loading
          ? "checking"
          : user
            ? "authenticated"
            : "unauthenticated",
      changePassword,
      emailVerified: Boolean(user?.email_confirmed_at),
      hasBackend: hasSupabaseConfig,
      isAuthenticated: Boolean(user),
      lastSignInAt: user?.last_sign_in_at ?? null,
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
      userAvatarUrl: getUserAvatarUrl(user),
      userBio: getUserBio(user),
      userDisplayName: getUserDisplayName(user),
      userEmail: user?.email ?? null,
      userEmailConfirmedAt: user?.email_confirmed_at ?? null,
      userId: user?.id ?? null,
    }),
    [
      changePassword,
      loading,
      pendingAuthAction,
      refreshUser,
      resendVerificationEmail,
      signIn,
      signOut,
      signUp,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
