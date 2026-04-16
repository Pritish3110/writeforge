import type { SVGProps } from "react";
import { useState } from "react";
import {
  LayoutDashboard, CalendarCheck, CalendarDays, BarChart3,
  FlaskConical, Settings, Moon, Sun, BookOpen, Rocket, Wrench,
  Activity, BrainCircuit, GitFork, Map, Sparkles, LogOut, ShieldCheck, PenSquare,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const FaviconNavIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <g
      transform="translate(8 8) scale(2)"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z" />
      <path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18" />
      <path d="m2.3 2.3 7.286 7.286" />
      <circle cx="11" cy="11" r="2" />
    </g>
  </svg>
);

const items = [
  { title: "WriterZ Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Skill Builder", url: "/skill-builder", icon: BrainCircuit },
  { title: "Daily Tasks", url: "/daily-tasks", icon: CalendarCheck },
  { title: "Weekly Schedule", url: "/weekly-schedule", icon: CalendarDays },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Bookshelf", url: "/writing", icon: PenSquare },
  { title: "Writing Analytics", url: "/writing-analytics", icon: Activity },
  { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  { title: "Character Lab", url: "/character-lab", icon: FlaskConical },
  { title: "Character Relationships", url: "/character-relationships", icon: GitFork },
  { title: "Plot Builder", url: "/plot-builder", icon: Map },
  { title: "Scene Practice", url: "/scene-practice", icon: FaviconNavIcon },
  { title: "World Element Designer", url: "/world-elements", icon: Sparkles },
  { title: "Custom Task Builder", url: "/custom-task-builder", icon: Wrench },
  // { title: "Upcoming Features", url: "/upcoming", icon: Rocket },
  { title: "Profile", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { theme, toggleTheme } = useTheme();
  const { displayName, email, isEmailVerified, signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="flex flex-col justify-between h-full">
        <div>
          <div className="p-4">
            {collapsed ? (
              <BrandMark showWordmark={false} className="justify-center" />
            ) : (
              <BrandMark />
            )}
          </div>

          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-[11px] uppercase tracking-[0.16em]">
              {!collapsed && "Navigation"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="transition-colors duration-150 hover:bg-muted/55 hover:text-foreground"
                        activeClassName="bg-secondary text-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="p-4 space-y-3">
          {user ? (
            <div className="space-y-2">
              {!collapsed ? (
                <div className="rounded-[12px] border border-border bg-card px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-background">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        Signed In
                      </p>
                      <p className="truncate text-sm">{displayName || email || "Active account"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isEmailVerified
                          ? "Verified identity."
                          : "Check your inbox to confirm your email."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => void handleSignOut()}
                className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/55 hover:text-foreground"
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>}
              </button>
            </div>
          ) : null}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/55 hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
