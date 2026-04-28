import type { FocusEvent, SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard, CalendarCheck, CalendarDays, BarChart3,
  FlaskConical, BookOpen, Wrench,
  BrainCircuit, GitFork, Map, Sparkles, PenSquare,
  PanelLeft, Plus,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavLink } from "@/components/NavLink";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter as SidebarFooterPrimitive,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader as SidebarHeaderPrimitive,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const navSections = [
  {
    label: null,
    items: [
      { title: "WriterZ Dashboard", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Planning",
    items: [
      { title: "Skill Builder", url: "/skill-builder", icon: BrainCircuit },
      { title: "Daily Tasks", url: "/daily-tasks", icon: CalendarCheck },
      { title: "Weekly Schedule", url: "/weekly-schedule", icon: CalendarDays },
      { title: "Custom Task Builder", url: "/custom-task-builder", icon: Wrench },
    ],
  },
  {
    label: "Writing",
    items: [
      { title: "Bookshelf", url: "/writing", icon: PenSquare },
      { title: "Scene Practice", url: "/scene-practice", icon: FaviconNavIcon },
      { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Writing Analytics", url: "/writing-analytics", icon: BarChart3 },
    ],
  },
];

const createItems = [
  { title: "Characters", url: "/character-lab", icon: FlaskConical },
  { title: "Relationships", url: "/character-relationships", icon: GitFork },
  { title: "Plot Builder", url: "/plot-builder", icon: Map },
  { title: "World Elements", url: "/world-elements", icon: Sparkles },
];

type SidebarControlMode = "expanded" | "collapsed" | "hover";

const SIDEBAR_MODE_STORAGE_KEY = "writerz:sidebar-mode";

const sidebarControlOptions: Array<{
  label: string;
  value: SidebarControlMode;
}> = [
    { label: "Expanded", value: "expanded" },
    { label: "Collapsed", value: "collapsed" },
    { label: "Expand on hover", value: "hover" },
  ];

const readStoredSidebarMode = (): SidebarControlMode => {
  if (typeof window === "undefined") {
    return "hover";
  }

  const storedMode = window.localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY);
  return storedMode === "expanded" || storedMode === "collapsed" || storedMode === "hover"
    ? storedMode
    : "hover";
};

export function AppSidebar() {
  const { setOpen } = useSidebar();
  const [controlMode, setControlMode] = useState<SidebarControlMode>(readStoredSidebarMode);
  const [isControlMenuOpen, setIsControlMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const isPointerInsideSidebarRef = useRef(false);
  const isHoverMode = controlMode === "hover";

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, controlMode);
  }, [controlMode]);

  useEffect(() => {
    setOpen(controlMode === "expanded");
    // setOpen changes identity when the sidebar opens/closes, so this effect
    // intentionally only responds to preference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlMode]);

  useEffect(() => {
    if (!isHoverMode) {
      return;
    }

    const collapseHoverSidebar = () => {
      isPointerInsideSidebarRef.current = false;
      setIsControlMenuOpen(false);
      setIsCreateMenuOpen(false);
      setOpen(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        collapseHoverSidebar();
      }
    };

    window.addEventListener("blur", collapseHoverSidebar);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", collapseHoverSidebar);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isHoverMode, setOpen]);

  const handleControlModeChange = (nextMode: string) => {
    if (nextMode === "expanded" || nextMode === "collapsed" || nextMode === "hover") {
      setControlMode(nextMode);
    }
  };

  const handleMouseEnter = () => {
    isPointerInsideSidebarRef.current = true;
    if (isHoverMode) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    isPointerInsideSidebarRef.current = false;
    if (isHoverMode && !isControlMenuOpen && !isCreateMenuOpen) {
      setOpen(false);
    }
  };

  const handleControlMenuOpenChange = (open: boolean) => {
    setIsControlMenuOpen(open);
    if (!open && isHoverMode && !isPointerInsideSidebarRef.current) {
      setOpen(false);
    }
  };

  const handleCreateMenuOpenChange = (open: boolean) => {
    setIsCreateMenuOpen(open);
    if (!open && isHoverMode && !isPointerInsideSidebarRef.current && !isControlMenuOpen) {
      setOpen(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border transition-[left,right,width] duration-300 ease-in-out"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent className="flex h-full flex-col overflow-visible bg-sidebar group-data-[collapsible=icon]:overflow-visible">
        <SidebarHeader
          isCreateMenuOpen={isCreateMenuOpen}
          onCreateMenuOpenChange={handleCreateMenuOpenChange}
        />
        <SidebarNav />
        <SidebarFooter
          controlMode={controlMode}
          isControlMenuOpen={isControlMenuOpen}
          onControlModeChange={handleControlModeChange}
          onControlMenuOpenChange={handleControlMenuOpenChange}
        />
      </SidebarContent>
    </Sidebar>
  );
}

function SidebarHeader({
  isCreateMenuOpen,
  onCreateMenuOpenChange,
}: {
  isCreateMenuOpen: boolean;
  onCreateMenuOpenChange: (open: boolean) => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarHeaderPrimitive className={cn("gap-4 p-3 pb-2 overflow-visible", collapsed && "items-center px-2")}>
      <CreateMenu
        collapsed={collapsed}
        open={isCreateMenuOpen}
        onOpenChange={onCreateMenuOpenChange}
      />
    </SidebarHeaderPrimitive>
  );
}

function CreateMenu({
  collapsed,
  open,
  onOpenChange,
}: {
  collapsed: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    onOpenChange(true);
  };

  const closeMenu = (delay = 140) => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      onOpenChange(false);
      closeTimerRef.current = null;
    }, delay);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      closeMenu(0);
    }
  };

  useEffect(() => {
    return clearCloseTimer;
  }, []);

  return (
    <div
      className={cn("relative", collapsed ? "w-9" : "w-full")}
      onBlur={handleBlur}
    >
      <button
        type="button"
        onPointerEnter={openMenu}
        onPointerLeave={() => closeMenu()}
        onFocus={openMenu}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors duration-150 hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed && "h-9 w-9 shrink-0 rounded-md px-0",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Create"
      >
        <Plus className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Create</span>}
        {!collapsed && <span className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </button>

      {open ? (
        <div
          className="absolute left-full z-50 pl-4"
          style={{ top: '0', transform: 'translateY(-5%)' }}
          onPointerEnter={openMenu}
          onPointerLeave={() => closeMenu()}
        >
          <div
            role="menu"
            aria-label="Create"
            className="w-64 rounded-lg border border-border bg-popover/95 p-2 text-popover-foreground shadow-xl backdrop-blur animate-in fade-in-0 slide-in-from-left-1 duration-150"
          >
            {createItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/55 hover:text-foreground focus-visible:bg-muted/55 focus-visible:text-foreground focus-visible:outline-none"
                activeClassName="bg-secondary text-foreground font-medium"
                role="menuitem"
                onClick={() => onOpenChange(false)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarFooter({
  controlMode,
  isControlMenuOpen,
  onControlModeChange,
  onControlMenuOpenChange,
}: {
  controlMode: SidebarControlMode;
  isControlMenuOpen: boolean;
  onControlModeChange: (mode: string) => void;
  onControlMenuOpenChange: (open: boolean) => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const selectedModeLabel = useMemo(
    () => sidebarControlOptions.find((option) => option.value === controlMode)?.label || "Expand on hover",
    [controlMode],
  );

  return (
    <SidebarFooterPrimitive className={cn("gap-2 p-3", collapsed && "items-center px-2")}>
      <SidebarMenu className={cn(collapsed && "items-center")}>
        <SidebarMenuItem>
          <DropdownMenu open={isControlMenuOpen} onOpenChange={onControlMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                aria-label={`Sidebar display mode: ${selectedModeLabel}`}
                className={cn(
                  "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                  collapsed && "justify-center",
                )}
              >
                <PanelLeft className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sidebar</span>}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Sidebar mode
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup value={controlMode} onValueChange={onControlModeChange}>
                {sidebarControlOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooterPrimitive>
  );
}

function SidebarNav() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarGroup className="min-h-0 flex-1 overflow-hidden">
      <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent className="min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="space-y-2">
          {navSections.map((section, sectionIndex) => (
            <div key={section.label || "top"} className={cn(sectionIndex > 0 && "pt-1")}>
              {section.label ? (
                collapsed ? (
                  <div className="mx-auto my-2 h-px w-6 bg-border/70" aria-hidden="true" />
                ) : (
                  <div className="px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {section.label}
                  </div>
                )
              ) : null}
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="transition-colors duration-150 hover:bg-muted/55 hover:text-foreground"
                        activeClassName="bg-secondary text-foreground font-medium"
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2")} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
