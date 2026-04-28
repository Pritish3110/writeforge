import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalAiAssistant } from "@/components/ai/GlobalAiAssistant";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
        <GlobalAiAssistant />
      </div>
    </SidebarProvider>
  );
}
