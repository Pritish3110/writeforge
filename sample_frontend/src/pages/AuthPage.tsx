import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { BrandMark } from "@/components/brand/BrandMark";
import { OpenBookIllustration } from "@/components/illustrations/OpenBookIllustration";
import { AuroraBackdrop } from "@/components/shared/AuroraBackdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth, type PendingAuthAction } from "@/contexts/AuthContext";
import { useWriteForgeData } from "@/contexts/WriteForgeDataContext";
import { isValidEmail } from "@/lib/identity";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

interface FieldErrors {
  confirmPassword?: string | null;
  email?: string | null;
  password?: string | null;
}

const editorialNotes = [
  {
    description:
      "Production data only migrates once, and only when the backend is still empty.",
    title: "Safe migration",
  },
  {
    description:
      "Drafts, characters, worldbuilding, and planning stay attached to a single account.",
    title: "Synced workspace",
  },
  {
    description:
      "Localhost stays careful by default and never auto-migrates development data.",
    title: "Controlled fallback",
  },
];

const buildLoginErrors = (email: string, password: string): FieldErrors => ({
  email: !email.trim()
    ? "Enter the email linked to your workspace."
    : !isValidEmail(email)
      ? "Use a valid email address."
      : null,
  password: !password ? "Enter your password to continue." : null,
});

const buildSignupErrors = (
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors => ({
  email: !email.trim()
    ? "Add the email you want to use for this workspace."
    : !isValidEmail(email)
      ? "Use a valid email address."
      : null,
  password: !password
    ? "Create a password for your account."
    : password.length < 6
      ? "Use at least 6 characters."
      : null,
  confirmPassword: !confirmPassword
    ? "Repeat the password to confirm it."
    : password !== confirmPassword
      ? "Passwords need to match."
      : null,
});

const getLoadingCopy = (
  pendingAuthAction: PendingAuthAction,
  status: ReturnType<typeof useWriteForgeData>["status"],
  canMigrate: boolean,
) => {
  if (status === "migrating" || canMigrate) {
    return {
      description:
        "We are moving your existing workspace into Supabase without changing IDs, timestamps, or established backend records.",
      eyebrow: "Migration",
      title: "Migrating your data...",
    };
  }

  if (status === "booting" || status === "syncing") {
    return {
      description:
        "Your account is authenticated. We are reconnecting drafts, characters, tasks, and workspace state now.",
      eyebrow: "Sync",
      title: "Syncing workspace...",
    };
  }

  if (pendingAuthAction === "sign_in") {
    return {
      description:
        "Hold on while we reopen the account attached to your synced writing workspace.",
      eyebrow: "Access",
      title: "Signing in...",
    };
  }

  if (pendingAuthAction === "sign_up") {
    return {
      description:
        "We are creating your account and preparing the backend-first workspace around it.",
      eyebrow: "Setup",
      title: "Creating your workspace...",
    };
  }

  return {
    description:
      "We are checking your current session and deciding whether to reopen the app or return you to sign in.",
    eyebrow: "Session",
    title: "Checking your session...",
  };
};

const AuthShell = ({
  children,
}: {
  children: ReactNode;
}) => (
  <AuroraBackdrop className="min-h-screen" contentClassName="min-h-screen">
    <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">
      <section className="flex flex-col justify-between border-b border-border px-6 py-8 sm:px-10 sm:py-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-14">
        <div className="space-y-10">
          <BrandMark />

          <div className="space-y-8">
            <div className="max-w-xl space-y-4">
              <p className="text-sm text-muted-foreground">
                Calm, connected writing.
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                WriterZ
              </h1>
              <p className="text-lg leading-8 text-foreground/88">
                One workspace for drafts, systems, and long-form writing.
              </p>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                WriterZ keeps your writing process in one place, with a quieter
                interface, a synced backend, and a migration path that respects the
                data you already have.
              </p>
            </div>

            <Card level="secondary" className="p-5 sm:p-6">
              <OpenBookIllustration className="w-full max-w-2xl" />
              <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                  <img src="/favicon.svg" alt="" aria-hidden="true" className="h-4 w-4 opacity-80" />
                </span>
                The pen mark stays with the product, now as a quieter editorial signature.
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-5 pt-8 sm:grid-cols-3 lg:grid-cols-1">
          {editorialNotes.map((item) => (
            <div key={item.title} className="border-t border-border pt-4">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        {children}
      </section>
    </div>
  </AuroraBackdrop>
);

export const AuthLoadingState = () => {
  const { pendingAuthAction } = useAuth();
  const { canMigrate, status } = useWriteForgeData();
  const copy = getLoadingCopy(pendingAuthAction, status, canMigrate);

  return (
    <AuthShell>
      <Card hoverable={false} className="w-full max-w-md p-5 sm:p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {copy.eyebrow}
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
          {copy.title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {copy.description}
        </p>

        <div className="mt-8 space-y-4 border-t border-border pt-5">
          {[
            "Authenticating your session",
            "Checking the synced workspace",
            "Protecting one-time migration rules",
          ].map((item) => (
            <div key={item} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{item}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/55" />
            </div>
          ))}
        </div>
      </Card>
    </AuthShell>
  );
};

const AuthPage = () => {
  const { pendingAuthAction, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    confirmPassword: "",
    email: "",
    password: "",
  });
  const [loginTouched, setLoginTouched] = useState({
    email: false,
    password: false,
  });
  const [signupTouched, setSignupTouched] = useState({
    confirmPassword: false,
    email: false,
    password: false,
  });
  const [activeAction, setActiveAction] = useState<AuthMode | null>(null);

  const loginErrors = useMemo(
    () => buildLoginErrors(loginForm.email, loginForm.password),
    [loginForm.email, loginForm.password],
  );
  const signupErrors = useMemo(
    () =>
      buildSignupErrors(
        signupForm.email,
        signupForm.password,
        signupForm.confirmPassword,
      ),
    [signupForm.confirmPassword, signupForm.email, signupForm.password],
  );

  const isLoginPending = activeAction === "login" || pendingAuthAction === "sign_in";
  const isSignupPending = activeAction === "signup" || pendingAuthAction === "sign_up";

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Object.values(loginErrors).some(Boolean)) {
      setLoginTouched({
        email: true,
        password: true,
      });
      return;
    }

    setActiveAction("login");

    try {
      await signIn(loginForm.email, loginForm.password);
      toast.success("Welcome back", {
        description: "Your synced workspace is opening now.",
      });
    } catch (error) {
      toast.error("Unable to sign in", {
        description:
          error instanceof Error
            ? error.message
            : "Please verify your credentials and try again.",
      });
    } finally {
      setActiveAction(null);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Object.values(signupErrors).some(Boolean)) {
      setSignupTouched({
        confirmPassword: true,
        email: true,
        password: true,
      });
      return;
    }

    setActiveAction("signup");

    try {
      const result = await signUp(signupForm.email, signupForm.password);

      setLoginForm((current) => ({
        ...current,
        email: signupForm.email,
      }));

      if (result.needsEmailVerification) {
        toast.success("Check your inbox", {
          description: "Confirm your email, then return here to log in.",
        });
        setMode("login");
      } else {
        toast.success("Workspace created", {
          description: "Your account is ready and WriterZ is connecting now.",
        });
      }

      setSignupForm((current) => ({
        ...current,
        confirmPassword: "",
        password: "",
      }));
    } catch (error) {
      toast.error("Unable to create your account", {
        description:
          error instanceof Error
            ? error.message
            : "Try again with a different email address.",
      });
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <AuthShell>
      <Card hoverable={false} className="w-full max-w-md p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Account access</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">
            {mode === "login" ? "Return to your workspace" : "Create your account"}
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {mode === "login"
              ? "Sign in to reopen your synced drafts, systems, and planning tools."
              : "Create a new account for a backend-first writing workspace with safe migration rules."}
          </p>
        </div>

        <div className="relative mt-8 grid grid-cols-2 rounded-[12px] border border-border bg-background p-1">
          <motion.span
            animate={{ x: mode === "login" ? "0%" : "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[8px] border border-border bg-card"
          />
          {([
            { label: "Log in", value: "login" },
            { label: "Sign up", value: "signup" },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={cn(
                "relative z-10 h-10 text-sm transition-colors duration-150",
                mode === item.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pt-8"
          >
            {mode === "login" ? (
              <form className="space-y-5" onSubmit={(event) => void handleLoginSubmit(event)}>
                <AuthField
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  label="Email"
                  icon={Mail}
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setLoginTouched((current) => ({
                      ...current,
                      email: true,
                    }))
                  }
                  error={loginTouched.email ? loginErrors.email : null}
                  successMessage={
                    loginTouched.email && !loginErrors.email
                      ? "This address is ready."
                      : null
                  }
                />

                <AuthField
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  label="Password"
                  icon={LockKeyhole}
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setLoginTouched((current) => ({
                      ...current,
                      password: true,
                    }))
                  }
                  error={loginTouched.password ? loginErrors.password : null}
                  hint="Your writing workspace reconnects as soon as sign-in succeeds."
                />

                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isLoginPending}
                    className="h-11 w-full justify-between rounded-xl px-4"
                  >
                    <span>{isLoginPending ? "Signing in..." : "Open workspace"}</span>
                    {isLoginPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Sign in uses your existing account and never overwrites synced backend records.
                  </p>
                </div>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={(event) => void handleSignupSubmit(event)}>
                <AuthField
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  label="Email"
                  icon={Mail}
                  placeholder="writer@storyworld.com"
                  value={signupForm.email}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setSignupTouched((current) => ({
                      ...current,
                      email: true,
                    }))
                  }
                  error={signupTouched.email ? signupErrors.email : null}
                  successMessage={
                    signupTouched.email && !signupErrors.email
                      ? "This will anchor your account."
                      : null
                  }
                />

                <AuthField
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  label="Password"
                  icon={LockKeyhole}
                  placeholder="Create a password"
                  value={signupForm.password}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setSignupTouched((current) => ({
                      ...current,
                      password: true,
                    }))
                  }
                  error={signupTouched.password ? signupErrors.password : null}
                  hint="Use at least 6 characters. A longer phrase is easier to remember and stronger."
                />

                <PasswordStrengthMeter password={signupForm.password} />

                <AuthField
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  label="Confirm password"
                  icon={ShieldCheck}
                  placeholder="Repeat your password"
                  value={signupForm.confirmPassword}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setSignupTouched((current) => ({
                      ...current,
                      confirmPassword: true,
                    }))
                  }
                  error={
                    signupTouched.confirmPassword
                      ? signupErrors.confirmPassword
                      : null
                  }
                  successMessage={
                    signupTouched.confirmPassword &&
                    !signupErrors.confirmPassword &&
                    signupForm.confirmPassword
                      ? "Passwords match."
                      : null
                  }
                />

                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isSignupPending}
                    className="h-11 w-full justify-between rounded-xl px-4"
                  >
                    <span>{isSignupPending ? "Creating account..." : "Open workspace"}</span>
                    {isSignupPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Depending on your Supabase settings, you may need to confirm your email before the first login.
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 border-t border-border pt-5 text-sm leading-7 text-muted-foreground">
          IDs, timestamps, and relationships stay intact. Existing backend data is never overwritten.
        </div>
      </Card>
    </AuthShell>
  );
};

export default AuthPage;
