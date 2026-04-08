import { Component, type ErrorInfo, type ReactNode } from "react";
import WorldElementDesigner from "@/components/tasks/WorldElementDesigner";

class WorldElementDesignerBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("WORLD BUILDER CRASH", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Error loading world builder
        </div>
      );
    }

    return this.props.children;
  }
}

const WorldElementDesignerPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">World Element Designer</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Design physical, cultural, and magic systems in a reusable format that stays ready for later story work.
        </p>
      </div>

      <WorldElementDesignerBoundary>
        <WorldElementDesigner showIntro={false} />
      </WorldElementDesignerBoundary>
    </div>
  );
};

export default WorldElementDesignerPage;
