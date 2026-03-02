import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { UsageConflictDialog } from "@/components/ui/usage-conflict-dialog";
import type { UsageLocation } from "@/components/ui/safe-delete-dialog";

interface UseEntityDeleteOptions {
  endpoint: string;
  queryKeys: string[];
  getName?: (row: any) => string;
  entityLabel?: string;
  checkUsages?: boolean;
  onSuccess?: () => void;
}

export function useEntityDelete({
  endpoint,
  queryKeys,
  getName = (row: any) => row.name || row.code || row.title || row.number || "record",
  entityLabel = "record",
  checkUsages = false,
  onSuccess,
}: UseEntityDeleteOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{ name: string; usages: UsageLocation[] } | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw Object.assign(new Error(body.message || "Failed to delete"), { status: response.status, body });
      }
    },
    onSuccess: () => {
      queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      setDeleteTarget(null);
      toast({ title: "Deleted", description: `${entityLabel} deleted successfully` });
      onSuccess?.();
    },
    onError: (error: any) => {
      if (error.status === 409) {
        const usages: UsageLocation[] = error.body?.usages || [];
        setConflictDialog({ name: deleteTarget?.name || entityLabel, usages });
      } else {
        toast({ title: "Error", description: `Failed to delete ${entityLabel.toLowerCase()}`, variant: "destructive" });
      }
    },
  });

  const handleDeleteRow = (row: any) => {
    const name = getName(row);
    setDeleteTarget({ id: row.id, name });
  };

  const handleBulkDelete = async (ids: string[], items: any[]) => {
    let successCount = 0;
    const allBlockedUsages: UsageLocation[] = [];
    const blockedNames: string[] = [];

    for (const id of ids) {
      try {
        const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
        if (response.ok) {
          successCount++;
        } else if (response.status === 409) {
          const body = await response.json().catch(() => ({}));
          const usages: UsageLocation[] = body.usages || [];
          const item = items.find((i: any) => i.id === id);
          const name = item ? getName(item) : id;
          blockedNames.push(name);
          usages.forEach(u => {
            allBlockedUsages.push({ location: `${name} → ${u.location}`, count: u.count, examples: u.examples });
          });
        }
      } catch {}
    }

    queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    setIsBulkDeleteOpen(false);

    if (allBlockedUsages.length > 0) {
      const dialogName = blockedNames.length === 1 ? blockedNames[0] : `${blockedNames.length} items`;
      setConflictDialog({ name: dialogName, usages: allBlockedUsages });
    }
    if (successCount > 0) {
      toast({ title: "Deleted", description: `${successCount} ${entityLabel}${successCount !== 1 ? "s" : ""} deleted` });
      onSuccess?.();
    }
  };

  const renderDeleteDialogs = () => (
    <>
      {deleteTarget && (
        <SafeDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          entityName={deleteTarget.name}
          entityId={deleteTarget.id}
          checkUsagesUrl={checkUsages ? `${endpoint}/${deleteTarget.id}/check-usages` : undefined}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          isPending={deleteMutation.isPending}
        />
      )}
      {conflictDialog && (
        <UsageConflictDialog
          open={!!conflictDialog}
          onOpenChange={(open) => { if (!open) setConflictDialog(null); }}
          entityName={conflictDialog.name}
          usages={conflictDialog.usages}
        />
      )}
    </>
  );

  return {
    handleDeleteRow,
    handleBulkDelete,
    isBulkDeleteOpen,
    setIsBulkDeleteOpen,
    isPending: deleteMutation.isPending,
    renderDeleteDialogs,
    deleteTarget,
    setDeleteTarget,
    conflictDialog,
    setConflictDialog,
    deleteMutation,
  };
}
