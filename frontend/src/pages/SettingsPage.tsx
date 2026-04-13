import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  BadgeCheck,
  CloudCog,
  Database,
  KeyRound,
  LogOut,
  Moon,
  PenSquare,
  RefreshCcw,
  ShieldCheck,
  Sun,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { InlineStat } from "@/components/profile/InlineStat";
import { SettingsSection } from "@/components/profile/SettingsSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBackendSync } from "@/contexts/BackendSyncContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { removeStoredValue } from "@/lib/backend/storageAdapter";
import {
  formatAbsoluteDateTime,
  formatRelativeTime,
  getUserInitials,
} from "@/lib/identity";
import { RESETTABLE_STORAGE_KEYS, STORAGE_KEYS } from "@/lib/storageKeys";
import { cn } from "@/lib/utils";

const detailRowClassName =
  "flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between";

const dialogClassName = "max-w-2xl border-border bg-card p-0";

type DangerAction = "delete-account" | "reset-workspace";

const normalizeConfirmationInput = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const DetailRow = ({
  action,
  description,
  label,
  value,
}: {
  action?: ReactNode;
  description?: string;
  label: string;
  value?: ReactNode;
}) => (
  <div className={detailRowClassName}>
    <div className="max-w-xl">
      <p className="text-sm font-medium">{label}</p>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    <div className="flex flex-col items-start gap-3 sm:items-end">
      {value ? <div className="text-sm text-foreground">{value}</div> : null}
      {action}
    </div>
  </div>
);

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { getStreak, resetAll } = useTaskTracking();
  const {
    enabled,
    status,
    lastSyncedAt,
    syncNow,
  } = useBackendSync();
  const {
    user,
    avatarUrl,
    bio,
    changePassword,
    deleteAccount,
    displayName: authDisplayName,
    email,
    isEmailVerified,
    pendingAuthAction,
    resendVerificationEmail,
    signOut,
    updateProfile,
  } = useAuth();

  const [drafts] = useLocalStorage<unknown[]>(STORAGE_KEYS.drafts, []);
  const [characters] = useLocalStorage<unknown[]>(STORAGE_KEYS.characters, []);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    avatarUrl: "",
    bio: "",
    displayName: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: "",
    password: "",
  });
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [dangerPhraseInput, setDangerPhraseInput] = useState("");

  const streak = getStreak();
  const displayName = authDisplayName || "Story Crafter";
  const initials = getUserInitials(displayName, email);
  const absoluteLastSync = formatAbsoluteDateTime(lastSyncedAt);
  const relativeLastSync = formatRelativeTime(lastSyncedAt);
  const lastSeenLabel = formatRelativeTime(
    user?.lastSignInAt || user?.updatedAt || user?.createdAt,
  );
  const isAuthenticated = Boolean(user);

  const passwordError = useMemo(() => {
    if (!passwordForm.password) return "Enter a new password.";
    if (passwordForm.password.length < 6) return "Use at least 6 characters.";
    if (passwordForm.password !== passwordForm.confirmPassword) {
      return "Passwords need to match before you can save.";
    }

    return null;
  }, [passwordForm.confirmPassword, passwordForm.password]);

  const syncStatusLabel = !enabled
    ? "Saved on this device"
    : status === "error"
      ? "Needs attention"
      : status === "syncing" || status === "booting"
        ? "Updating"
        : "Ready";

  const accountStatusLabel = (() => {
    if (pendingAuthAction === "update-profile") return "Saving profile";
    if (pendingAuthAction === "change-password") return "Updating password";
    if (pendingAuthAction === "resend-verification") return "Sending confirmation";
    if (pendingAuthAction === "delete-account") return "Deleting account";
    if (pendingAuthAction === "sign-out") return "Signing out";
    return isAuthenticated ? "Signed in" : "Signed out";
  })();

  const requiredDeletePhrase = useMemo(
    () => `delete ${displayName}`.trim(),
    [displayName],
  );

  const dangerDialogCopy = useMemo(() => {
    if (dangerAction === "delete-account") {
      return {
        confirmLabel: "Delete account",
        description:
          "This permanently removes your account and clears the writing space tied to it.",
        inputLabel: "Type the confirmation phrase below to continue.",
        requiredPhrase: requiredDeletePhrase,
        title: "Delete account?",
        warning:
          "This action is permanent and cannot be undone. Make sure you truly want to remove this account before continuing.",
      };
    }

    if (dangerAction === "reset-workspace") {
      return {
        confirmLabel: "Hard reset workspace",
        description:
          "This clears saved tasks, drafts, story tools, and local progress from this workspace.",
        inputLabel: "Type the confirmation phrase below to continue.",
        requiredPhrase: "hard reset workspace",
        title: "Hard reset workspace?",
        warning:
          "This is a hard reset. Your saved writing progress in this workspace will be removed immediately and cannot be recovered.",
      };
    }

    return null;
  }, [dangerAction, requiredDeletePhrase]);

  const isDangerDialogOpen = Boolean(dangerAction);
  const isDangerPhraseValid =
    dangerDialogCopy !== null &&
    (!dangerDialogCopy.requiredPhrase ||
      normalizeConfirmationInput(dangerPhraseInput) ===
        normalizeConfirmationInput(dangerDialogCopy.requiredPhrase));

  const closeDangerDialog = () => {
    setDangerAction(null);
    setDangerPhraseInput("");
  };

  const performWorkspaceReset = () => {
    resetAll();
    RESETTABLE_STORAGE_KEYS.forEach((key) => {
      removeStoredValue(key);
    });

    toast.success("Workspace reset", {
      description: "This writing space has been cleared.",
    });
  };

  const handleReset = () => {
    setDangerPhraseInput("");
    setDangerAction("reset-workspace");
  };

  const handleDeleteAccountDialog = () => {
    setDangerPhraseInput("");
    setDangerAction("delete-account");
  };

  const handleDangerAction = async () => {
    if (!dangerDialogCopy || !isDangerPhraseValid) return;

    if (dangerAction === "reset-workspace") {
      performWorkspaceReset();
      closeDangerDialog();
      return;
    }

    if (dangerAction === "delete-account") {
      try {
        await deleteAccount();
        closeDangerDialog();
        toast.success("Account deleted", {
          description: "Your account and writing space have been removed.",
        });
      } catch (error) {
        toast.error("Unable to delete account", {
          description:
            error instanceof Error ? error.message : "Please try again in a moment.",
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out", {
        description:
          "Your session ended safely and the identity screen is ready when you return.",
      });
    } catch (error) {
      toast.error("Unable to sign out", {
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const openProfileEditor = () => {
    setProfileForm({
      avatarUrl: avatarUrl || "",
      bio: bio || "",
      displayName: authDisplayName || "",
    });
    setIsEditProfileOpen(true);
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 250_000) {
      toast.error("Avatar file too large", {
        description: "Choose an image under 250 KB for a lightweight profile preview.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatarUrl = reader.result;

      if (typeof avatarUrl === "string") {
        setProfileForm((current) => ({
          ...current,
          avatarUrl,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    try {
      await updateProfile(profileForm);
      toast.success("Profile updated", {
        description: "Your workspace identity now reflects the latest details.",
      });
      setIsEditProfileOpen(false);
    } catch (error) {
      toast.error("Unable to save profile", {
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleProfileSave();
  };

  const handlePasswordSave = async () => {
    if (passwordError) {
      toast.error("Password update blocked", {
        description: passwordError,
      });
      return;
    }

    try {
      await changePassword(passwordForm.password);
      toast.success("Password updated", {
        description: "Your account credentials were refreshed successfully.",
      });
      setPasswordForm({
        confirmPassword: "",
        password: "",
      });
      setIsPasswordDialogOpen(false);
    } catch (error) {
      toast.error("Unable to change password", {
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handlePasswordSave();
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      toast.success("Verification email sent", {
        description: "A new confirmation email is on the way to your inbox.",
      });
    } catch (error) {
      toast.error("Unable to resend verification", {
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  const handleManualSync = async () => {
    try {
      await syncNow();
      toast.success("Workspace updated", {
        description: "Everything is back in step for this writing space.",
      });
    } catch (error) {
      toast.error("Unable to update now", {
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Profile & Settings</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Manage your profile, account, and workspace in one calm place.
        </p>
      </div>

      <Card hoverable={false} className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 rounded-[1.5rem] border border-border bg-background">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="rounded-[1.5rem] bg-background text-xl font-semibold text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-[-0.04em]">{displayName}</h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-border bg-transparent",
                    isEmailVerified ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {isEmailVerified ? "Verified" : "Verification pending"}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{email || "Local workspace profile"}</p>
                <p>Last active {lastSeenLabel}</p>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {bio ||
                  "Shape your writing identity, keep your account secure, and stay close to the work that matters most to you."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Button variant="outline" onClick={openProfileEditor}>
                <PenSquare className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : null}

            {isAuthenticated ? (
              <Button variant="outline" onClick={() => void handleSignOut()}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
          <InlineStat
            label="Drafts"
            value={String(drafts.length)}
            detail="Saved scenes, notes, and experiments"
          />
          <InlineStat
            label="Characters"
            value={String(characters.length)}
            detail="Profiles preserved across sessions"
          />
          <InlineStat
            label="Streak"
            value={`${streak.current} days`}
            detail={`Longest streak: ${streak.longest} days`}
          />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-4">
          <SettingsSection
            icon={CloudCog}
            title="Workspace"
            description="A calm overview of how ready your writing space is and when it was last refreshed."
          >
            <DetailRow
              label="Status"
              description="A quick sense of whether your writing space is ready to use."
              value={
                <div className="space-y-1 text-left sm:text-right">
                  <p>{syncStatusLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {enabled
                      ? "Your work is available and ready when you return."
                      : "This browser is keeping your current workspace in place."}
                  </p>
                </div>
              }
            />
            <DetailRow
              label="Last updated"
              description="The most recent moment this workspace was refreshed."
              value={
                <div className="space-y-1 text-left sm:text-right">
                  <p>{relativeLastSync}</p>
                  <p className="text-xs text-muted-foreground">{absoluteLastSync}</p>
                </div>
              }
            />
            <DetailRow
              label="Refresh workspace"
              description="Update everything again right now if you want an extra check-in."
              action={
                enabled ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleManualSync()}
                    disabled={status === "syncing"}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {status === "syncing" ? "Updating..." : "Refresh now"}
                  </Button>
                ) : null
              }
            />
          </SettingsSection>

          <SettingsSection
            icon={Sun}
            title="Preferences"
            description="A few quiet controls that change how the workspace feels without changing your writing data."
          >
            <DetailRow
              label="Theme"
              description="Switch between the darker editorial workspace and the lighter reading mode."
              value={
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                </div>
              }
            />
            <DetailRow
              label="App settings"
              description="WriterZ keeps the experience restrained and familiar, so your focus stays on the writing instead of the interface."
            />
          </SettingsSection>
        </div>

        <div className="space-y-4">
          <SettingsSection
            icon={ShieldCheck}
            title="Security"
            description="Monitor verification state, account identity, and password controls from one place."
          >
            <DetailRow
              label="Email"
              description="This address keeps your account connected to your writing space."
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{email || "Not available"}</span>
                  <Badge
                    variant="outline"
                    className="border-border bg-transparent text-muted-foreground"
                  >
                    {isEmailVerified ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
              }
            />
            <DetailRow
              label="Email verification"
              description={
                isEmailVerified
                  ? "Your account is confirmed and ready when you need it."
                  : "Confirm your email to finish setting up your account."
              }
              action={
                !isEmailVerified ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleResendVerification()}
                    disabled={pendingAuthAction === "resend-verification"}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {pendingAuthAction === "resend-verification"
                      ? "Sending..."
                      : "Resend verification"}
                  </Button>
                ) : null
              }
            />
            <DetailRow
              label="Password"
              description="Update your password whenever you want a little more peace of mind."
              action={
                isAuthenticated ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Button>
                ) : null
              }
            />
          </SettingsSection>

          <SettingsSection
            icon={Database}
            title="Workspace Care"
            description="A few simple account and reset controls for when you need to make a change."
          >
            <DetailRow
              label="Account"
              description="A simple readout of your current account state."
              value={accountStatusLabel}
            />
            <DetailRow
              label="Reset workspace progress"
              description="Clear saved progress from this workspace when you want a fresh start."
              action={
                <Button variant="destructive" onClick={handleReset}>
                  <TriangleAlert className="h-4 w-4" />
                  Hard reset workspace
                </Button>
              }
            />
            <DetailRow
              label="Delete account"
              description="Permanently remove this account after confirming the required phrase."
              action={
                isAuthenticated ? (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccountDialog}
                    disabled={pendingAuthAction === "delete-account"}
                  >
                    <Trash2 className="h-4 w-4" />
                    {pendingAuthAction === "delete-account"
                      ? "Deleting..."
                      : "Delete account"}
                  </Button>
                ) : null
              }
            />
          </SettingsSection>
        </div>
      </div>

      <Dialog
        open={isDangerDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDangerDialog();
          }
        }}
      >
        <DialogContent className={dialogClassName}>
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                {dangerDialogCopy?.title}
              </DialogTitle>
              <DialogDescription className="mt-1 leading-7">
                {dangerDialogCopy?.description}
              </DialogDescription>
            </DialogHeader>

            {dangerDialogCopy ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-foreground">
                  <p className="font-medium">Read this carefully.</p>
                  <p className="mt-2 text-muted-foreground">
                    {dangerDialogCopy.warning}
                  </p>
                </div>

                {dangerDialogCopy.requiredPhrase ? (
                  <div className="space-y-2">
                    <Label htmlFor="danger-confirmation-input">
                      {dangerDialogCopy.inputLabel}
                    </Label>
                    <p className="text-xs leading-6 text-muted-foreground">
                      Required phrase:{" "}
                      <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground">
                        {dangerDialogCopy.requiredPhrase}
                      </span>
                    </p>
                    <Input
                      id="danger-confirmation-input"
                      value={dangerPhraseInput}
                      onChange={(event) => setDangerPhraseInput(event.target.value)}
                      placeholder={dangerDialogCopy.requiredPhrase}
                      autoComplete="off"
                    />
                  </div>
                ) : null}

                <DialogFooter className="mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDangerDialog}
                    disabled={pendingAuthAction === "delete-account"}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleDangerAction()}
                    disabled={
                      !isDangerPhraseValid || pendingAuthAction === "delete-account"
                    }
                  >
                    {pendingAuthAction === "delete-account"
                      ? "Deleting..."
                      : dangerDialogCopy.confirmLabel}
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className={dialogClassName}>
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                Edit Profile
              </DialogTitle>
              <DialogDescription className="mt-1 leading-7">
                Update the name, avatar, and note that appear across your workspace.
              </DialogDescription>
            </DialogHeader>

            <form
              className="mt-6 space-y-6"
              onSubmit={(event) => void handleProfileSubmit(event)}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 rounded-[1.5rem] border border-border bg-background">
                  <AvatarImage
                    src={profileForm.avatarUrl || undefined}
                    alt={profileForm.displayName || displayName}
                  />
                  <AvatarFallback className="rounded-[1.5rem] bg-background text-xl font-semibold text-foreground">
                    {getUserInitials(profileForm.displayName || displayName, email)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-3">
                  <Label
                    htmlFor="avatar-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <UserRound className="h-4 w-4" />
                    Upload avatar
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <p className="text-xs leading-6 text-muted-foreground">
                    Small PNG, JPG, or WebP under 250 KB. If you skip this, WriterZ falls back to initials.
                  </p>
                  {profileForm.avatarUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setProfileForm((current) => ({
                          ...current,
                          avatarUrl: "",
                        }))
                      }
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Remove avatar
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={profileForm.displayName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Story Crafter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-bio">Bio</Label>
                  <Textarea
                    id="profile-bio"
                    value={profileForm.bio}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    className="min-h-[120px]"
                    placeholder="Describe your current writing focus, genre interests, or creative goals."
                  />
                </div>
              </div>

              <DialogFooter className="mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pendingAuthAction === "update-profile"}
                >
                  {pendingAuthAction === "update-profile" ? "Saving..." : "Save profile"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className={dialogClassName}>
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                Change Password
              </DialogTitle>
              <DialogDescription className="mt-1 leading-7">
                Update your credentials without leaving the workspace.
              </DialogDescription>
            </DialogHeader>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => void handlePasswordSubmit(event)}
            >
              <AuthField
                id="new-password"
                label="New password"
                type="password"
                icon={KeyRound}
                placeholder="Create a stronger password"
                value={passwordForm.password}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                error={
                  passwordForm.password
                    ? passwordForm.password.length < 6
                      ? "Use at least 6 characters."
                      : null
                    : null
                }
                hint="A longer passphrase with numbers or symbols offers stronger protection."
              />

              <PasswordStrengthMeter password={passwordForm.password} />

              <AuthField
                id="confirm-new-password"
                label="Confirm password"
                type="password"
                icon={BadgeCheck}
                placeholder="Repeat the password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                error={
                  passwordForm.confirmPassword
                    ? passwordForm.password !== passwordForm.confirmPassword
                      ? "Passwords must match."
                      : null
                    : null
                }
                successMessage={
                  passwordForm.confirmPassword &&
                  passwordForm.password === passwordForm.confirmPassword
                    ? "Passwords match."
                    : null
                }
              />

              <DialogFooter className="mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pendingAuthAction === "change-password"}
                >
                  {pendingAuthAction === "change-password"
                    ? "Updating..."
                    : "Update password"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
