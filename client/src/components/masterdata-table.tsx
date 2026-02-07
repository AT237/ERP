import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getMasterDataConfig } from "@/config/masterdata-config";
import { DataTableLayout, type ColumnConfig } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

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
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${endpoint}`] });
      toast({
        title: "Success",
        description: `${singularTitle} deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to delete ${singularTitle.toLowerCase()}`,
        variant: "destructive",
      });
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

  const handleDeleteItem = (id: string) => {
    if (confirm(`Are you sure you want to delete this ${singularTitle.toLowerCase()}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const tableData = Array.isArray(items) ? items : [];

  return (
    <div className="px-2 pt-2 md:p-6">
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
            onClick: () => handleDeleteItem(row.id),
            variant: 'destructive' as const
          }
        ]}
      />
    </div>
  );
}
