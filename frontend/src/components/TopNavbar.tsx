import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Settings, Sun, UserRound, BadgeCheck, ShieldAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getUserInitials } from "@/lib/identity";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";

export function TopNavbar() {
  const { user, displayName, avatarUrl, email, isEmailVerified, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const initials = getUserInitials(displayName, email);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
      toast.success("Signed out", {
        description: "Your WriterZ session ended safely.",
      });
    } catch (error) {
      toast.error("Unable to sign out", {
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setIsSigningOut(false);
      setIsPopoverOpen(false);
    }
  };

  const handleNavigate = (path: string) => {
    setIsPopoverOpen(false);
    navigate(path);
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4">
      {/* Left section: username + verification status */}
      <div className="flex items-center gap-4">
        <BrandMark className="shrink-0" />
        <div className="h-5 w-px bg-border shrink-0 rotate-12 mx-2" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
          {displayName}
        </span>
        {isEmailVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            Unverified
          </span>
        )}
      </div>

      {/* Right section: Theme toggle + Profile avatar */}
      <div className="flex items-center gap-2">
        {/* Theme toggle button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Profile avatar with popover */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none transition-all duration-150 ring-offset-background focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 hover:opacity-80"
              aria-label="Open profile menu"
            >
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-64 rounded-lg border border-border bg-popover/95 p-0 shadow-xl backdrop-blur"
          >
            {/* User info */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email || "Local workspace"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Menu items */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => handleNavigate("/settings")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150",
                  "hover:bg-muted/55 hover:text-foreground focus-visible:bg-muted/55 focus-visible:text-foreground focus-visible:outline-none",
                )}
              >
                <UserRound className="h-4 w-4 shrink-0" />
                <span>Profile & Settings</span>
              </button>
            </div>

            <Separator />

            {/* Log out */}
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150",
                  "hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:outline-none",
                  isSigningOut && "pointer-events-none opacity-50",
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>{isSigningOut ? "Signing out..." : "Log out"}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
