import { AlertTriangle, MapPin, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UsageLocation } from "@/components/ui/safe-delete-dialog";

interface UsageConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  usages: UsageLocation[];
}

export function UsageConflictDialog({
  open,
  onOpenChange,
  entityName,
  usages,
}: UsageConflictDialogProps) {
  const totalCount = usages.reduce((sum, u) => sum + u.count, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Cannot delete — in use
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">"{entityName}"</span> is still referenced in {totalCount} place{totalCount !== 1 ? "s" : ""}. Remove those references first before deleting.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1 space-y-2">
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              First remove all references below, then try again.
            </p>
          </div>

          {usages.map((usage) => (
            <div key={usage.location} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {usage.location}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {usage.count} {usage.count === 1 ? "record" : "records"}
                </Badge>
              </div>
              {usage.examples.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-1 ml-5">
                  {usage.examples.map((ex, i) => (
                    <li key={i} className="truncate">• {ex}</li>
                  ))}
                  {usage.count > usage.examples.length && (
                    <li className="text-muted-foreground/70">
                      … and {usage.count - usage.examples.length} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
