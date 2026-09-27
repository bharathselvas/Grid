import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Loading placeholder for a live-data panel (no demo rows shown meanwhile). */
export function ApiLoadingState({ label = "Loading live data…" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

/**
 * Explicit failure state for core pages: never replaced by sample data.
 * Shows what went wrong and offers Retry.
 */
export function ApiErrorState({
  error,
  onRetry,
  label = "Unable to load live national data.",
}: {
  error: Error | null;
  onRetry: () => void;
  label?: string;
}) {
  return (
    <Card>
      <CardContent className="p-10 text-center">
        <AlertTriangle className="h-10 w-10 text-[#B42318] mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {error?.message && (
          <p className="text-xs text-muted-foreground mt-1 break-words">{error.message}</p>
        )}
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
        </Button>
      </CardContent>
    </Card>
  );
}
