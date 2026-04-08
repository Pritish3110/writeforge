import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  ArrowUpRight,
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
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useWriteForgeData } from "@/contexts/WriteForgeDataContext";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import {
  formatAbsoluteDateTime,
  formatRelativeTime,
  getUserInitials,
} from "@/lib/identity";
import {
  WRITEFORGE_CHARACTERS_KEY,
  WRITEFORGE_DRAFTS_KEY,
} from "@/lib/storageKeys";
import { cn } from "@/lib/utils";

const detailRowClassName =
  "flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between";

const dialogClassName = "max-w-2xl border-border bg-card p-0";

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
  const confirmDelete = useDeleteConfirmation();
  const { getStreak } = useTaskTracking();
  const {
    getItem,
    hasRemoteData,
    isLocalhost,
    lastError,
    lastSyncedAt,
    migrationCompleted,
    resetProgressData,
    runMigration,
    status,
    backendMode,
    canMigrate,
  } = useWriteForgeData();
  const {
    authStatus,
    changePassword,
    emailVerified,
    hasBackend,
    isAuthenticated,
    lastSignInAt,
    pendingAuthAction,
    resendVerificationEmail,
    signOut,
    updateProfile,
    userAvatarUrl,
    userBio,
    userDisplayName,
    userEmail,
  } = useAuth();

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

  const drafts = getItem<unknown[]>(WRITEFORGE_DRAFTS_KEY, []);
  const characters = getItem<unknown[]>(WRITEFORGE_CHARACTERS_KEY, []);
  const streak = getStreak();
  const displayName = userDisplayName || "Story Crafter";
  const initials = getUserInitials(displayName, userEmail);
  const absoluteLastSync = formatAbsoluteDateTime(lastSyncedAt);
  const relativeLastSync = formatRelativeTime(lastSyncedAt);
  const lastSeenLabel = formatRelativeTime(lastSignInAt);

  const passwordError = useMemo(() => {
    if (!passwordForm.password) return "Enter a new password.";
    if (passwordForm.password.length < 6) return "Use at least 6 characters.";
    if (passwordForm.password !== passwordForm.confirmPassword) {
      return "Passwords need to match before you can save.";
    }

    return null;
  }, [passwordForm.confirmPassword, passwordForm.password]);

  const syncStatusLabel = !hasBackend
    ? "Local-only mode"
    : backendMode === "supabase"
      ? "Connected to Supabase"
      : "Using local fallback";

  const handleReset = async () => {
    const shouldReset = await confirmDelete({
      title: "Reset all progress?",
      description:
        "This will delete your tasks, characters, relationships, plot points, drafts, world elements, templates, and knowledge-base entries from the active data source. This action cannot be undone.",
      confirmLabel: "Reset Everything",
      badgeLabel: "Destructive Action",
    });

    if (!shouldReset) return;

    resetProgressData();
    toast.success("Workspace reset", {
      description:
        "The active data source was cleared. Synced backend records remain protected by normal auth and RLS rules.",
    });
  };

  const handleManualMigration = async () => {
    const result = await runMigration();

    if (!result) {
      toast.error("Migration is not available right now");
      return;
    }

    if (result.migrated) {
      toast.success("Production data migrated safely", {
        description: "WriterZ is now using Supabase as the source of truth for this account.",
      });
      return;
    }

    toast.message("Migration skipped", {
      description:
        result.reason || "The backend already contains data for this account.",
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out", {
        description: "Your session ended safely and the identity screen is ready when you return.",
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
      avatarUrl: userAvatarUrl || "",
      bio: userBio || "",
      displayName: userDisplayName || "",
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
      if (typeof reader.result === "string") {
        setProfileForm((current) => ({
          ...current,
          avatarUrl: reader.result,
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Profile & Settings</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Manage your account, sync status, and workspace preferences in one calm place.
        </p>
      </div>

      <Card hoverable={false} className="p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 rounded-[1.5rem] border border-border bg-background">
              <AvatarImage src={userAvatarUrl || undefined} alt={displayName} />
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
                    emailVerified ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {emailVerified ? "Verified" : "Verification pending"}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{userEmail || "Local workspace profile"}</p>
                <p>Last active {lastSeenLabel}</p>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {userBio ||
                  "Shape your writing identity, monitor sync health, and keep your account secure while WriterZ stays backend-first when synced data is available."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {hasBackend ? (
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
            title="Sync Status"
            description="A quick view of backend connectivity, environment handling, and the last known sync."
          >
            <DetailRow
              label="Connection"
              description="WriterZ chooses Supabase when remote data exists and uses browser storage as a controlled fallback."
              value={
                <div className="space-y-1 text-left sm:text-right">
                  <p>{syncStatusLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {backendMode === "supabase"
                      ? "Supabase is serving as the active source of truth."
                      : "This session is currently reading local browser data."}
                  </p>
                </div>
              }
            />
            <DetailRow
              label="Last synced"
              description="The most recent successful snapshot timestamp recorded by the app."
              value={
                <div className="space-y-1 text-left sm:text-right">
                  <p>{relativeLastSync}</p>
                  <p className="text-xs text-muted-foreground">{absoluteLastSync}</p>
                </div>
              }
            />
            <DetailRow
              label="Environment"
              description="Localhost never auto-migrates browser data. Production handles safe one-time migration only when allowed."
              value={isLocalhost ? "localhost" : "production"}
            />
            <DetailRow
              label="Remote data"
              description="Whether synced records already exist for the current authenticated account."
              value={hasRemoteData ? "Detected" : "Not found yet"}
            />
            {lastError ? (
              <DetailRow
                label="Latest issue"
                description="The most recent backend or sync error surfaced by the data layer."
                value={<span className="text-destructive">{lastError}</span>}
              />
            ) : null}
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
              description="WriterZ stays backend-first whenever synced data exists, with local storage acting as a fallback rather than the long-term source of truth."
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
              description="This address is used for sign-in, verification, and account recovery."
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{userEmail || "Not available"}</span>
                  <Badge
                    variant="outline"
                    className="border-border bg-transparent text-muted-foreground"
                  >
                    {emailVerified ? "Confirmed" : "Pending"}
                  </Badge>
                </div>
              }
            />
            <DetailRow
              label="Email verification"
              description={
                emailVerified
                  ? "Your email is confirmed and ready for account recovery."
                  : "Confirm your email to complete the account identity setup."
              }
              action={
                !emailVerified && hasBackend ? (
                  <Button
                    variant="outline"
                    onClick={() => void handleResendVerification()}
                    disabled={pendingAuthAction === "resend_verification"}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {pendingAuthAction === "resend_verification"
                      ? "Sending..."
                      : "Resend verification"}
                  </Button>
                ) : null
              }
            />
            <DetailRow
              label="Password"
              description="Refresh your password to keep the account secure across devices and sessions."
              action={
                hasBackend ? (
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
            title="Data Controls"
            description="Keep an eye on migration state, the active data source, and actions that modify stored content."
          >
            <DetailRow
              label="Active source"
              description="The data source currently serving this session."
              value={hasBackend ? backendMode : "local"}
            />
            <DetailRow
              label="Auth status"
              description="The current state of the session and backend bootstrap flow."
              value={authStatus}
            />
            <DetailRow
              label="Migration flag"
              description="This flag prevents the one-time production import from running twice for the same account."
              value={migrationCompleted ? "migrated" : "not migrated"}
            />
            {canMigrate ? (
              <DetailRow
                label="Manual migration"
                description="Available only when production browser data exists and the backend is still empty for this account."
                action={
                  <Button
                    variant="outline"
                    onClick={() => void handleManualMigration()}
                    disabled={status === "migrating"}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    {status === "migrating" ? "Migrating..." : "Run safe migration"}
                  </Button>
                }
              />
            ) : null}
            <DetailRow
              label="Reset workspace progress"
              description="Deletes tasks, characters, world elements, drafts, and related records from the currently active data source."
              action={
                <Button variant="outline" onClick={() => void handleReset()}>
                  <TriangleAlert className="h-4 w-4" />
                  Reset all progress
                </Button>
              }
            />
          </SettingsSection>
        </div>
      </div>

      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className={dialogClassName}>
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
                Edit Profile
              </DialogTitle>
              <DialogDescription className="mt-1 leading-7">
                Update the name, avatar, and note that appear across your synced workspace.
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
                    {getUserInitials(profileForm.displayName || displayName, userEmail)}
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
                  disabled={pendingAuthAction === "update_profile"}
                >
                  {pendingAuthAction === "update_profile" ? "Saving..." : "Save profile"}
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
                error={passwordForm.password ? (passwordForm.password.length < 6 ? "Use at least 6 characters." : null) : null}
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
                  disabled={pendingAuthAction === "change_password"}
                >
                  {pendingAuthAction === "change_password"
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
