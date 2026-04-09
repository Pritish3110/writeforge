import {
  LayoutDashboard, CalendarCheck, CalendarDays, BarChart3,
  FlaskConical, PenTool, Settings, Moon, Sun, BookOpen, Rocket, Wrench, Activity, GitFork, Map, Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Daily Tasks", url: "/daily-tasks", icon: CalendarCheck },
  { title: "Weekly Schedule", url: "/weekly-schedule", icon: CalendarDays },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Writing Analytics", url: "/writing-analytics", icon: Activity },
  { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  { title: "Character Lab", url: "/character-lab", icon: FlaskConical },
  { title: "Character Relationships", url: "/character-relationships", icon: GitFork },
  { title: "Plot Builder", url: "/plot-builder", icon: Map },
  { title: "Scene Practice", url: "/scene-practice", icon: PenTool },
  { title: "World Element Designer", url: "/world-elements", icon: Sparkles },
  { title: "Custom Task Builder", url: "/custom-task-builder", icon: Wrench },
  // { title: "Upcoming Features", url: "/upcoming", icon: Rocket },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="flex flex-col justify-between h-full">
        <div>
          <div className="p-4 flex items-center gap-2">
            <PenTool className="h-6 w-6 text-neon-purple shrink-0" />
            {!collapsed && (
              <span className="font-mono text-lg font-bold text-neon-purple tracking-tight">
                WriteForge
              </span>
            )}
          </div>

          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
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
                        className="hover:bg-muted/50 transition-colors duration-200"
                        activeClassName="bg-primary/10 text-neon-purple font-medium"
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

        <div className="p-4">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors duration-200 text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
