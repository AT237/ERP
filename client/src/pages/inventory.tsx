import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';


const defaultColumns: ColumnConfig[] = [
  createIdColumn('sku', 'Artikelcode (SKU)'),
  {
    key: 'image', label: 'Afbeelding', visible: false, width: 52, filterable: false, sortable: false,
    renderCell: (value: string) => value
      ? <img src={value} alt="" className="-my-2 -ml-6 h-10 w-10 object-cover rounded border border-gray-200" />
      : null,
  },
  { key: 'name', label: 'Product Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'category', label: 'Categorie', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'brand', label: 'Merk', visible: false, width: 120, filterable: true, sortable: true },
  { key: 'manufacturerPartNumber', label: 'Fabrikant type nr.', visible: false, width: 160, filterable: true, sortable: true },
  { key: 'description', label: 'Description', visible: true, width: 250, filterable: true, sortable: true },
  { key: 'costPrice', label: 'Cost Price', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'unitPrice', label: 'Selling Price', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'margin', label: 'Margin %', visible: true, width: 100, filterable: false, sortable: true },
  { key: 'currentStock', label: 'Current Stock', visible: true, width: 100, filterable: false, sortable: true },
  { key: 'unit', label: 'Unit', visible: false, width: 80, filterable: true, sortable: true },
  { key: 'minimumStock', label: 'Minimum Stock', visible: true, width: 110, filterable: false, sortable: true },
  { key: 'maximumStock', label: 'Maximum Stock', visible: false, width: 110, filterable: false, sortable: true },
  { key: 'location', label: 'Storage Location', visible: false, width: 140, filterable: true, sortable: true },
  { key: 'barcode', label: 'Barcode', visible: false, width: 130, filterable: true, sortable: true },
  { key: 'isComposite', label: 'Is Composite Item', visible: false, width: 130, filterable: false, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true },
];

export default function Inventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'inventory',
  });

  // Data fetching
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const del = useEntityDelete<InventoryItem>({
    endpoint: '/api/inventory',
    queryKeys: ['/api/inventory'],
    entityLabel: 'Item',
    checkUsages: true,
    getName: (row) => row.name || row.sku
  });

  const duplicateMutation = useMutation({
    mutationFn: (item: InventoryItem) =>
      fetch(`/api/inventory/${item.id}/duplicate`, { method: 'POST' }).then(r => {
        if (!r.ok) throw new Error('Duplicate failed');
        return r.json();
      }),
    onSuccess: (newItem: InventoryItem) => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: 'Item gedupliceerd', description: `${newItem.name || newItem.sku} aangemaakt` });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `edit-inventory-${newItem.id}`,
          name: `${newItem.name || newItem.sku}`,
          formType: 'inventory',
          parentId: newItem.id,
        }
      }));
    },
    onError: () => toast({ title: 'Fout', description: 'Dupliceren mislukt', variant: 'destructive' }),
  });

  const handleDuplicate = (item: InventoryItem) => duplicateMutation.mutate(item);

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
      deleteConfirmDialog={{
        isOpen: del.isBulkDeleteOpen,
        onOpenChange: del.setIsBulkDeleteOpen,
        onConfirm: () => del.handleBulkDelete(tableState.selectedRows, items),
        itemCount: tableState.selectedRows.length
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
      onDuplicate={handleDuplicate}
      rowActions={(row: InventoryItem) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(row)
        },
        {
          key: 'duplicate',
          label: 'Duplicate',
          icon: <CopyPlus className="h-4 w-4" />,
          onClick: () => handleDuplicate(row),
          variant: 'outline' as const
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => del.handleDeleteRow(row),
          className: 'text-red-600 hover:text-red-700'
        }
      ]}
    />
    {del.renderDeleteDialogs()}
    </div>
  );
}