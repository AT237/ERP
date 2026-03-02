import { useState, createElement, Fragment } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SafeDeleteDialog, type UsageLocation } from '@/components/ui/safe-delete-dialog';
import { UsageConflictDialog } from '@/components/ui/usage-conflict-dialog';

interface UseEntityDeleteProps<T> {
  endpoint: string;
  queryKeys: string[];
  getName: (row: T) => string;
  entityLabel: string;
  checkUsages?: boolean;
}

export function useEntityDelete<T extends { id: string | number }>({
  endpoint,
  queryKeys,
  getName,
  entityLabel,
  checkUsages = true,
}: UseEntityDeleteProps<T>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{ entityName: string; usages: UsageLocation[] } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiRequest('DELETE', `${endpoint}/${id}`);
      if (!res.ok) {
        if (res.status === 409) {
          const data = await res.json();
          throw { type: 'USAGE_CONFLICT', data };
        }
        throw new Error('Failed to delete');
      }
      return id;
    },
    onSuccess: () => {
      queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      toast({
        title: 'Success',
        description: `${entityLabel} deleted successfully`,
      });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      if (error.type === 'USAGE_CONFLICT') {
        setConflictData({
          entityName: deleteTarget ? getName(deleteTarget) : entityLabel,
          usages: error.data.usages || [],
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || `Failed to delete ${entityLabel.toLowerCase()}`,
          variant: 'destructive',
        });
      }
      setDeleteTarget(null);
    },
  });

  const handleDeleteRow = (row: T) => {
    setDeleteTarget(row);
  };

  const handleBulkDelete = async (ids: (string | number)[], items: T[]) => {
    try {
      for (const id of ids) {
        const res = await apiRequest('DELETE', `${endpoint}/${id}`);
        if (!res.ok) {
          if (res.status === 409) {
            const data = await res.json();
            const item = items.find(i => String(i.id) === String(id));
            setConflictData({
              entityName: item ? getName(item) : entityLabel,
              usages: data.usages || [],
            });
            return; // Stop on first conflict
          }
          throw new Error('Failed to delete some items');
        }
      }
      queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      toast({
        title: 'Success',
        description: `Selected ${entityLabel.toLowerCase()}s deleted successfully`,
      });
      setIsBulkDeleteOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete items',
        variant: 'destructive',
      });
    }
  };

  const renderDeleteDialogs = () => createElement(Fragment, null, [
    createElement(SafeDeleteDialog, {
      key: 'safe-delete-dialog',
      open: !!deleteTarget,
      onOpenChange: (open: boolean) => !open && setDeleteTarget(null),
      entityName: deleteTarget ? getName(deleteTarget) : '',
      entityId: deleteTarget ? deleteTarget.id : '',
      checkUsagesUrl: (checkUsages && deleteTarget) ? `${endpoint}/${deleteTarget.id}/check-usages` : undefined,
      onConfirm: () => deleteTarget && deleteMutation.mutate(deleteTarget.id),
      isPending: deleteMutation.isPending
    }),
    conflictData ? createElement(UsageConflictDialog, {
      key: 'usage-conflict-dialog',
      open: !!conflictData,
      onOpenChange: (open: boolean) => !open && setConflictData(null),
      entityName: conflictData.entityName,
      usages: conflictData.usages
    }) : null
  ]);

  return {
    handleDeleteRow,
    handleBulkDelete,
    isBulkDeleteOpen,
    setIsBulkDeleteOpen,
    isPending: deleteMutation.isPending,
    renderDeleteDialogs,
    deleteMutation,
  };
}
