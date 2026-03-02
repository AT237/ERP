import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Loader2, MapPin } from "lucide-react";
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

export interface UsageLocation {
  location: string;
  count: number;
  examples: string[];
}

export interface SafeDeleteConfig {
  checkUsagesUrl: (id: string) => string;
}

interface SafeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityId: string;
  checkUsagesUrl: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function SafeDeleteDialog({
  open,
  onOpenChange,
  entityName,
  entityId,
  checkUsagesUrl,
  onConfirm,
  isPending = false,
}: SafeDeleteDialogProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [canDelete, setCanDelete] = useState<boolean | null>(null);
  const [usages, setUsages] = useState<UsageLocation[]>([]);

  useEffect(() => {
    if (!open || !entityId) return;
    setIsChecking(true);
    setCanDelete(null);
    setUsages([]);
    fetch(checkUsagesUrl)
      .then(r => {
        if (!r.ok) return { canDelete: true, usages: [] };
        return r.json();
      })
      .then(data => {
        setCanDelete(data.canDelete ?? true);
        setUsages(data.usages || []);
      })
      .catch(() => {
        setCanDelete(true);
      })
      .finally(() => setIsChecking(false));
  }, [open, entityId, checkUsagesUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete {entityName}
          </DialogTitle>
          <DialogDescription>
            {isChecking ? "Checking where this is used..." : canDelete === false
              ? "This item is still in use and cannot be deleted."
              : `Are you sure you want to delete "${entityName}"? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isChecking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking usages...
            </div>
          )}

          {!isChecking && canDelete === false && usages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  This record is referenced in <strong>{usages.reduce((sum, u) => sum + u.count, 0)}</strong> place{usages.reduce((sum, u) => sum + u.count, 0) !== 1 ? "s" : ""}. Remove those references first.
                </p>
              </div>
              <div className="space-y-2">
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
                            ... and {usage.count - usage.examples.length} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isChecking && canDelete === true && (
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Delete</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
