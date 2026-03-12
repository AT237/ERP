import { useState } from "react";
import { Plus, Edit, Trash2, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getMasterDataConfig } from "@/config/masterdata-config";
import { DataTableLayout, type ColumnConfig } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { UsageConflictDialog } from "@/components/ui/usage-conflict-dialog";
import type { UsageLocation } from "@/components/ui/safe-delete-dialog";

interface MasterDataTableProps {
  title: string;
  endpoint: string;
  schema: z.ZodSchema;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any) => string;
  }>;
}

export default function MasterDataTable({ title, endpoint, schema, fields, columns }: MasterDataTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<{ name: string; usages: UsageLocation[] } | null>(null);
  
  const config = getMasterDataConfig(endpoint);
  const singularTitle = config?.singularTitle || title.slice(0, -1);

  const defaultColumns: ColumnConfig[] = columns.map((col) => ({
    key: col.key,
    label: col.label,
    visible: true,
    width: 150,
    filterable: true,
    sortable: true,
    renderCell: col.render ? (value: any) => col.render!(value) : undefined,
  }));

  const tableState = useDataTable({
    defaultColumns,
    tableKey: `masterdata-${endpoint}`,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: [`/api/masterdata/${endpoint}`],
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await fetch(`/api/masterdata/${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/masterdata/${endpoint}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw Object.assign(new Error(body.message || 'Failed to delete'), { status: response.status, body });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${endpoint}`] });
      setDeleteTarget(null);
      toast({
        title: "Deleted",
        description: `${singularTitle} deleted successfully`,
      });
    },
    onError: (error: any) => {
      if (error.status === 409) {
        const usages: UsageLocation[] = error.body?.usages || [];
        const name = deleteTarget?.name || singularTitle;
        setConflictDialog({ name, usages });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete ${singularTitle.toLowerCase()}`,
          variant: "destructive",
        });
      }
    }
  });

  const handleNewItem = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `new-${endpoint}`,
        name: `New ${singularTitle}`,
        formType: `masterdata-${endpoint}`,
      }
    }));
  };

  const handleEditItem = (row: any) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `${endpoint}-${row.id}`,
        name: `Edit ${singularTitle}`,
        formType: `masterdata-${endpoint}`,
        entityId: row.id,
      }
    }));
  };

  const handleDeleteItem = (row: any) => {
    const name = row.name || row.code || row.title || row.description || singularTitle;
    setDeleteTarget({ id: row.id, name });
  };

  const handleBulkDelete = async () => {
    const ids = [...tableState.selectedRows];
    let successCount = 0;
    const allBlockedUsages: UsageLocation[] = [];
    const blockedNames: string[] = [];

    for (const id of ids) {
      try {
        const response = await fetch(`/api/masterdata/${endpoint}/${id}`, { method: 'DELETE' });
        if (response.ok) {
          successCount++;
        } else if (response.status === 409) {
          const body = await response.json().catch(() => ({}));
          const usages: UsageLocation[] = body.usages || [];
          const item = items.find((i: any) => i.id === id);
          const name = item?.name || item?.code || id;
          blockedNames.push(name);
          usages.forEach(u => {
            const existing = allBlockedUsages.find(e => e.location === `${name} → ${u.location}`);
            if (existing) {
              existing.count += u.count;
              existing.examples.push(...u.examples);
            } else {
              allBlockedUsages.push({ location: `${name} → ${u.location}`, count: u.count, examples: u.examples });
            }
          });
        }
      } catch {}
    }

    queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${endpoint}`] });
    tableState.setSelectedRows([]);
    setIsBulkDeleteOpen(false);

    if (allBlockedUsages.length > 0) {
      const dialogName = blockedNames.length === 1 ? blockedNames[0] : `${blockedNames.length} items`;
      setConflictDialog({ name: dialogName, usages: allBlockedUsages });
    }

    if (successCount > 0) {
      toast({
        title: "Deleted",
        description: `${successCount} ${successCount === 1 ? singularTitle.toLowerCase() : title.toLowerCase()} deleted`,
      });
    }
  };

  const handleDuplicate = async (row: any) => {
    try {
      const res = await fetch(`/api/masterdata/${endpoint}/${row.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const { id, createdAt, updatedAt, ...duplicateData } = data;
      if (duplicateData.code) duplicateData.code = `${duplicateData.code}-COPY`;
      if (duplicateData.name) duplicateData.name = `${duplicateData.name} (Copy)`;
      const response = await fetch(`/api/masterdata/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });
      if (!response.ok) throw new Error('Failed to create duplicate');
      const newItem = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${endpoint}`] });
      toast({ title: "Success", description: `${singularTitle} duplicated` });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `${endpoint}-${newItem.id}`,
          name: `Edit ${singularTitle}`,
          formType: `masterdata-${endpoint}`,
          entityId: newItem.id,
        }
      }));
    } catch (error) {
      toast({ title: "Error", description: `Failed to duplicate ${singularTitle.toLowerCase()}`, variant: "destructive" });
    }
  };

  const tableData = Array.isArray(items) ? items : [];

  return (
    <div className="p-6">
      <DataTableLayout
        entityName={singularTitle}
        entityNamePlural={title}
        data={tableData}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        tableKey={`masterdata-${endpoint}`}
        isLoading={isLoading}
        searchTerm={tableState.searchTerm}
        setSearchTerm={tableState.setSearchTerm}
        filters={tableState.filters}
        setFilters={tableState.setFilters}
        onAddFilter={tableState.addFilter}
        onUpdateFilter={tableState.updateFilter}
        onRemoveFilter={tableState.removeFilter}
        sortConfig={tableState.sortConfig}
        onSort={tableState.handleSort}
        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={() => {
          const allIds = tableData.map((item: any) => item.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleEditItem}
        getRowId={(row: any) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: `add-${endpoint}`,
            label: `Add ${singularTitle}`,
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewItem,
            variant: 'default' as const
          }
        ]}
        onDuplicate={handleDuplicate}
        deleteConfirmDialog={{
          isOpen: isBulkDeleteOpen,
          onOpenChange: setIsBulkDeleteOpen,
          onConfirm: handleBulkDelete,
          itemCount: tableState.selectedRows.length,
        }}
        rowActions={(row: any) => [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditItem(row),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDeleteItem(row),
            variant: 'destructive' as const
          }
        ]}
      />
      {deleteTarget && (
        <SafeDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          entityName={deleteTarget.name}
          entityId={deleteTarget.id}
          checkUsagesUrl={`/api/masterdata/${endpoint}/${deleteTarget.id}/check-usages`}
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
    </div>
  );
}
