import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteConfirmationOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  badgeLabel?: string;
}

type DeleteConfirmationFn = (
  options: DeleteConfirmationOptions,
) => Promise<boolean>;

const DeleteConfirmationContext = createContext<DeleteConfirmationFn | null>(null);

export const DeleteConfirmationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [request, setRequest] = useState<DeleteConfirmationOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirmDelete = useCallback<DeleteConfirmationFn>((options) => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest({
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        badgeLabel: "Delete Warning",
        ...options,
      });
    });
  }, []);

  return (
    <DeleteConfirmationContext.Provider value={confirmDelete}>
      {children}

      <AlertDialog
        open={Boolean(request)}
        onOpenChange={(open) => {
          if (!open && request) {
            closeDialog(false);
          }
        }}
      >
        <AlertDialogContent className="glow-border border-neon-pink/35 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--muted)/0.24))] shadow-[0_0_0_1px_hsl(var(--neon-pink)/0.15),0_24px_48px_hsl(var(--background)/0.5)] backdrop-blur-sm sm:max-w-md">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-neon-pink/35 bg-neon-pink/10 p-3 text-neon-pink shadow-[0_0_18px_hsl(var(--neon-pink)/0.16)]">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <AlertDialogHeader className="text-left">
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-neon-pink/30 bg-neon-pink/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neon-pink">
                  <Trash2 className="h-3 w-3" />
                  {request?.badgeLabel}
                </div>
                <AlertDialogTitle className="font-mono text-lg tracking-tight">
                  {request?.title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {request?.description}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-5 gap-2 sm:justify-start sm:space-x-0">
                <AlertDialogCancel className="font-mono border-border/70 bg-background/60 hover:bg-muted/50">
                  {request?.cancelLabel}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => closeDialog(true)}
                >
                  {request?.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DeleteConfirmationContext.Provider>
  );
};

export const useDeleteConfirmation = () => {
  const context = useContext(DeleteConfirmationContext);

  if (!context) {
    throw new Error("useDeleteConfirmation must be used within DeleteConfirmationProvider");
  }

  return context;
};
