import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { BrandMark } from "@/components/brand/BrandMark";
import { PenMark } from "@/components/brand/PenMark";
import { OpenBookIllustration } from "@/components/illustrations/OpenBookIllustration";
import { AuroraBackdrop } from "@/components/shared/AuroraBackdrop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth, type PendingAuthAction } from "@/contexts/AuthContext";
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
    description: "Return to a writing space that still feels familiar and steady.",
    title: "Pick up gently",
  },
  {
    description: "Keep your drafts, scenes, and ideas moving in one calm flow.",
    title: "Stay in rhythm",
  },
  {
    description: "A quieter workspace helps your attention stay on the page.",
    title: "Write with focus",
  },
];

const authPanelClassName =
  "w-full max-w-[30rem] rounded-[16px] border border-foreground/10 bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.94))] p-6 shadow-[0_38px_110px_-56px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.05] backdrop-blur-[10px] hover:border-foreground/12 hover:bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)/0.96))] sm:p-7";

const authFieldInputClassName =
  "transition-[border-color,background-color,box-shadow] focus-visible:bg-background/28 focus-visible:shadow-[0_14px_36px_-28px_rgba(255,255,255,0.26)]";

const authPrimaryButtonClassName =
  "shadow-[0_18px_40px_-30px_rgba(255,255,255,0.14)] hover:-translate-y-0.5 hover:brightness-[1.03]";

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

const getLoadingCopy = (pendingAuthAction: PendingAuthAction) => {
  if (pendingAuthAction === "migration") {
    return {
      description:
        "We are bringing your writing space forward so it is ready when you arrive.",
      eyebrow: "Preparing",
      title: "Getting things ready...",
    };
  }

  if (pendingAuthAction === "sync") {
    return {
      description:
        "Your workspace is opening now, with everything arranged for a smooth return.",
      eyebrow: "Opening",
      title: "Opening your workspace...",
    };
  }

  if (pendingAuthAction === "sign-in") {
    return {
      description:
        "Hold on while we bring you back to your writing space.",
      eyebrow: "Access",
      title: "Signing you in...",
    };
  }

  if (pendingAuthAction === "sign-up") {
    return {
      description:
        "We are setting up a fresh writing space you can return to anytime.",
      eyebrow: "Setup",
      title: "Creating your workspace...",
    };
  }

  return {
    description:
      "We are checking whether your writing space is ready for you.",
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
    <motion.div
      className="mx-auto grid min-h-screen max-w-[84rem] lg:grid-cols-[minmax(0,1.02fr)_minmax(29rem,0.98fr)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <section className="flex items-center border-b border-border px-6 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r lg:px-10 lg:py-12 xl:px-12">
        <div className="mx-auto flex w-full max-w-[35rem] flex-col justify-center">
          <BrandMark />

          <div className="mt-8 space-y-6 lg:mt-10">
            <div className="max-w-[35rem] space-y-3">
              <p className="text-sm text-muted-foreground">Calm writing, within reach.</p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                WriterZ
              </h1>
              <p className="max-w-xl text-lg leading-8 text-foreground/88">
                Return to your writing with less friction and more focus.
              </p>
              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                A quiet place for drafts, scenes, and the next sentence.
              </p>
            </div>

            <Card className="rounded-[12px] border border-border bg-card/88 p-5 shadow-none hover:border-foreground/10 hover:bg-card/88 sm:p-6">
              <OpenBookIllustration className="w-full max-w-2xl" />
              <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
                  <PenMark className="h-4 w-4 opacity-80" />
                </span>
                A steady workspace for whatever you want to write next.
              </div>
            </Card>

            <div className="grid gap-4 pt-1 sm:grid-cols-3">
              {editorialNotes.map((item) => (
                <div key={item.title} className="border-t border-border/80 pt-3">
                  <p className="text-[12px] font-medium text-foreground/78">{item.title}</p>
                  <p className="mt-1.5 text-[12px] leading-6 text-muted-foreground/80">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-10 lg:py-12 xl:px-12">
        {children}
      </section>
    </motion.div>
  </AuroraBackdrop>
);

export const AuthLoadingState = () => {
  const { pendingAuthAction } = useAuth();
  const copy = getLoadingCopy(pendingAuthAction);

  return (
    <AuthShell>
      <Card className={authPanelClassName}>
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
            "Checking your account",
            "Preparing your workspace",
            "Almost there",
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
  const navigate = useNavigate();
  const location = useLocation();
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

  const nextRoute = useMemo(() => {
    const candidate =
      typeof location.state === "object" &&
      location.state &&
      "from" in location.state &&
      typeof location.state.from === "string"
        ? location.state.from
        : "/";

    return candidate === "/auth" ? "/" : candidate;
  }, [location.state]);

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

  const isLoginPending = activeAction === "login" || pendingAuthAction === "sign-in";
  const isSignupPending = activeAction === "signup" || pendingAuthAction === "sign-up";

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
      await signIn({
        email: loginForm.email,
        password: loginForm.password,
      });
      toast.success("Welcome back", {
        description: "Your writing space is opening now.",
      });
      navigate(nextRoute, { replace: true });
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
      await signUp({
        email: signupForm.email,
        password: signupForm.password,
      });

      setLoginForm((current) => ({
        ...current,
        email: signupForm.email,
      }));

      toast.success("Workspace created", {
        description:
          "Your account is ready. Check your inbox for the verification email, or resend it later from Settings.",
      });
      navigate(nextRoute, { replace: true });

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
      <Card className={authPanelClassName}>
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">Account access</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em]">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="max-w-[26rem] text-sm leading-6 text-muted-foreground">
            {mode === "login"
              ? "Open your writing space and continue from where you left off."
              : "Start a calm writing space you can return to whenever you want."}
          </p>
        </div>

        <div className="relative mt-7 grid grid-cols-2 rounded-[12px] border border-border bg-background p-1">
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
            className="pt-7"
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
                  inputClassName={authFieldInputClassName}
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
                  hint="Return to your drafts and keep your momentum."
                  inputClassName={authFieldInputClassName}
                />

                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isLoginPending}
                    className={cn(
                      "h-11 w-full justify-between rounded-xl px-4",
                      authPrimaryButtonClassName,
                    )}
                  >
                    <span>{isLoginPending ? "Signing in..." : "Open workspace"}</span>
                    {isLoginPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                  <p className="text-xs leading-6 text-muted-foreground/88">
                    One step back into the same writing flow.
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
                  inputClassName={authFieldInputClassName}
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
                  hint="Use at least 6 characters."
                  inputClassName={authFieldInputClassName}
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
                  inputClassName={authFieldInputClassName}
                />

                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isSignupPending}
                    className={cn(
                      "h-11 w-full justify-between rounded-xl px-4",
                      authPrimaryButtonClassName,
                    )}
                  >
                    <span>{isSignupPending ? "Creating account..." : "Open workspace"}</span>
                    {isSignupPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                  <p className="text-xs leading-6 text-muted-foreground/88">
                    We will guide you through any final step if confirmation is needed.
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 border-t border-border pt-5 text-sm leading-7 text-muted-foreground/88">
          Pick up where you left off.
        </div>
      </Card>
    </AuthShell>
  );
};

export default AuthPage;
