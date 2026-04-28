import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { GlobalAiAssistant } from "@/components/ai/GlobalAiAssistant";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full flex-col">
        {/* Full-width top navbar — always on top, spans entire width */}
        <TopNavbar />
        {/* Sidebar + content sit below the navbar */}
        <div className="flex flex-1 min-w-0">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
          <GlobalAiAssistant />
        </div>
      </div>
    </SidebarProvider>
  );
}
