import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';


const defaultColumns: ColumnConfig[] = [
  createIdColumn('sku', 'SKU'),
  { key: 'name', label: 'Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'description', label: 'Description', visible: true, width: 250, filterable: true, sortable: true },
  { key: 'category', label: 'Category', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'unitPrice', label: 'Unit Price', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'costPrice', label: 'Cost Price', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'margin', label: 'Margin', visible: true, width: 100, filterable: false, sortable: true },
  { key: 'currentStock', label: 'Current Stock', visible: true, width: 80, filterable: false, sortable: true },
  { key: 'minimumStock', label: 'Minimum Stock', visible: true, width: 80, filterable: false, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true },
  { key: 'isComposite', label: 'Is Composite', visible: true, width: 100, filterable: false, sortable: true },
];

export default function Inventory() {
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'inventory',
  });

  // Data fetching
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Succes",
        description: "Artikel verwijderd",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan artikel niet verwijderen",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: InventoryItem) => {
    // Dispatch custom event to open inventory edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-inventory-${item.id}`,
        name: `${item.name || item.sku}`,
        formType: 'inventory',
        parentId: item.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (item: InventoryItem) => {
    // Dispatch custom event to open inventory edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-inventory-${item.id}`,
        name: `${item.name || item.sku}`,
        formType: 'inventory',
        parentId: item.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je dit artikel wilt verwijderen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewItem = () => {
    // Dispatch custom event to open inventory form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-inventory',
        name: 'New Inventory Item',
        formType: 'inventory'
      }
    });
    window.dispatchEvent(event);
  };

  // Render table data with proper formatting
  const renderTableData = (items: InventoryItem[]) => {
    return items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice || '0.00',
      costPrice: item.costPrice || '0.00', 
      margin: item.margin || '0.00',
      currentStock: item.currentStock || 0,
      minimumStock: item.minimumStock || 0,
      status: item.status || 'active',
      isComposite: item.isComposite || false,
    }));
  };


  return (
    <div className="p-6">
      <DataTableLayout
      entityName="Product"
      entityNamePlural="Products"
      data={renderTableData(items)}
      columns={tableState.columns}
      setColumns={tableState.setColumns}
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
        const allIds = items.map(item => item.id);
        tableState.toggleAllRows(allIds);
      }}
      onRowDoubleClick={handleRowDoubleClick}
      getRowId={(row: InventoryItem) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      headerActions={[
        {
          key: 'add-inventory',
          label: 'Add Item',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleNewItem,
          variant: 'default' as const
        }
      ]}
      rowActions={(row: InventoryItem) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(row)
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDelete(row.id),
          className: 'text-red-600 hover:text-red-700'
        }
      ]}
    />
    </div>
  );
}