import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  WriteForgeDataProvider,
  useWriteForgeData,
} from "@/contexts/WriteForgeDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { DeleteConfirmationProvider } from "@/components/DeleteConfirmationProvider";
import LoadingScreen from "@/components/LoadingScreen";
import Dashboard from "./pages/Dashboard";
import DailyTasks from "./pages/DailyTasks";
import WeeklySchedule from "./pages/WeeklySchedule";
import Analytics from "./pages/Analytics";
import WritingAnalytics from "./pages/WritingAnalytics";
import CharacterLab from "./pages/CharacterLab";
import CharacterRelationships from "./pages/CharacterRelationships";
import KnowledgeBase from "./pages/KnowledgeBase";
import PlotBuilder from "./pages/PlotBuilder";
import ScenePractice from "./pages/ScenePractice";
import WorldElementDesignerPage from "./pages/WorldElementDesignerPage";
import SettingsPage from "./pages/SettingsPage";
import UpcomingFeatures from "./pages/UpcomingFeatures";
import NotFound from "./pages/NotFound";
import CustomTaskBuilder from "./pages/CustomTaskBuilder";
import AuthPage, { AuthLoadingState } from "./pages/AuthPage";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { hasBackend, loading, user } = useAuth();
  const { status } = useWriteForgeData();

  if (hasBackend && (loading || (user && status === "booting"))) {
    return <AuthLoadingState />;
  }

  if (hasBackend && !user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/daily-tasks" element={<DailyTasks />} />
        <Route path="/weekly-schedule" element={<WeeklySchedule />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/writing-analytics" element={<WritingAnalytics />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/character-lab" element={<CharacterLab />} />
        <Route path="/character-relationships" element={<CharacterRelationships />} />
        <Route path="/plot-builder" element={<PlotBuilder />} />
        <Route path="/scene-practice" element={<ScenePractice />} />
        <Route path="/world-elements" element={<WorldElementDesignerPage />} />
        <Route path="/custom-task-builder" element={<CustomTaskBuilder />} />
        <Route path="/upcoming" element={<UpcomingFeatures />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => {
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WriteForgeDataProvider>
          <ThemeProvider>
            <DeleteConfirmationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                  <AnimatePresence>
                    {showLoadingScreen && (
                      <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />
                    )}
                  </AnimatePresence>
                </BrowserRouter>
              </TooltipProvider>
            </DeleteConfirmationProvider>
          </ThemeProvider>
        </WriteForgeDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
