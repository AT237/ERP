import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Supplier } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

// Default column configuration for suppliers
const defaultColumns: ColumnConfig[] = [
  createIdColumn('supplierNumber', 'Supplier ID'),
  { key: 'name', label: 'Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'contactPerson', label: 'Contact Person', visible: true, width: 150, filterable: true, sortable: true },
  { key: 'email', label: 'Email', visible: true, width: 180, filterable: true, sortable: true },
  { key: 'phone', label: 'Phone', visible: true, width: 140, filterable: true, sortable: true },
  { key: 'address', label: 'Address', visible: false, width: 200, filterable: true, sortable: false },
  { key: 'taxId', label: 'Tax ID', visible: false, width: 120, filterable: true, sortable: true },
  { 
    key: 'paymentTerms', 
    label: 'Payment Terms', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: number) => `${value}d`
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => (
      <span className={`inline-flex px-1 py-0.5 rounded text-xs font-medium ${
        value === 'active' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {value}
      </span>
    )
  },
  { 
    key: 'createdAt', 
    label: 'Created', 
    visible: false, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? new Date(value).toLocaleDateString('nl-NL') : ''
  },
];

export default function SupplierTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use our data table hook
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'name', direction: 'asc' },
    tableKey: 'suppliers'
  });
  
  // Dialog states (keeping some for non-form operations)
  const [showSupplierReport, setShowSupplierReport] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [selectedSupplierForReport, setSelectedSupplierForReport] = useState<Supplier | null>(null);

  // Tab system handlers
  const handleNewSupplier = () => {
    // Dispatch custom event to open supplier form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-supplier',
        name: 'New Supplier',
        formType: 'supplier'
      }
    });
    window.dispatchEvent(event);
  };

  const handleEdit = (supplier: Supplier) => {
    // Format supplier number for display
    const formattedNumber = supplier.supplierNumber || `SUP-${supplier.id.slice(-4)}`;
    // Dispatch custom event to open supplier edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-supplier-${supplier.id}`,
        name: `${formattedNumber}`,
        formType: 'supplier',
        parentId: supplier.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (supplier: Supplier) => {
    // Same as edit for double-click
    handleEdit(supplier);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      deleteSuppliersMutation.mutate([id]);
    }
  };

  // Data fetching
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Mutations

  const deleteSuppliersMutation = useMutation({
    mutationFn: async (supplierIds: string[]) => {
      for (const supplierId of supplierIds) {
        const response = await fetch(`/api/suppliers/${supplierId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`Failed to delete supplier ${supplierId}`);
        }
      }
    },
    onSuccess: (_, supplierIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      dataTableState.setSelectedRows([]);
      setShowDeleteConfirmDialog(false);
      toast({
        title: "Success",
        description: `${supplierIds.length} ${supplierIds.length === 1 ? 'supplier' : 'suppliers'} deleted`,
      });
    },
  });

  const handleSupplierDoubleClick = (supplier: Supplier) => {
    setSelectedSupplierForReport(supplier);
    setShowSupplierReport(true);
  };

  const handleToggleAllRows = () => {
    const allRowIds = suppliers.map(supplier => supplier.id);
    dataTableState.toggleAllRows(allRowIds);
  };

  // Export functionality
  const handleExport = () => {
    // Implement export to Excel functionality similar to customer table
    toast({
      title: "Export",
      description: "Export functionality will be implemented",
    });
  };

  // Duplicate functionality  
  const handleDuplicate = (supplier: Supplier) => {
    // Dispatch custom event to open supplier form in new tab with pre-filled data for duplication
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `duplicate-supplier-${supplier.id}`,
        name: `${supplier.name} (Copy)`,
        formType: 'supplier',
        duplicateData: {
          name: `${supplier.name} (Copy)`,
          email: supplier.email || "",
          phone: supplier.phone || "",
          address: supplier.address || "",
          contactPerson: supplier.contactPerson || "",
          taxId: "", // Clear tax ID for duplicate
          paymentTerms: supplier.paymentTerms || 30,
          status: "active" // Reset to active
        }
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="p-6">
      <DataTableLayout
      // Data
      data={suppliers}
      isLoading={isLoading}
      getRowId={(supplier) => supplier.id}
      
      // Table configuration
      columns={dataTableState.columns}
      setColumns={dataTableState.setColumns}
      
      // Search and filtering
      searchTerm={dataTableState.searchTerm}
      setSearchTerm={dataTableState.setSearchTerm}
      filters={dataTableState.filters}
      setFilters={dataTableState.setFilters}
      onAddFilter={dataTableState.addFilter}
      onUpdateFilter={dataTableState.updateFilter}
      onRemoveFilter={dataTableState.removeFilter}
      
      // Sorting
      sortConfig={dataTableState.sortConfig}
      onSort={dataTableState.handleSort}
      
      // Row selection
      selectedRows={dataTableState.selectedRows}
      setSelectedRows={dataTableState.setSelectedRows}
      onToggleRowSelection={dataTableState.toggleRowSelection}
      onToggleAllRows={handleToggleAllRows}
      
      // Actions
      headerActions={[
        {
          key: 'add-supplier',
          label: 'Add Supplier',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleNewSupplier,
          variant: 'default' as const
        }
      ]}
      
      rowActions={(row: Supplier) => [
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
      
      detailDialog={selectedSupplierForReport ? {
        isOpen: showSupplierReport,
        onOpenChange: setShowSupplierReport,
        title: "Supplier Report",
        content: (
          <div className="space-y-6">
            {/* Supplier Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-800">{selectedSupplierForReport.name}</h2>
              <p className="text-sm text-gray-600">Supplier ID: {selectedSupplierForReport.supplierNumber}</p>
            </div>

            {/* Supplier Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Contact Person:</span>
                    <span>{selectedSupplierForReport.contactPerson || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span>{selectedSupplierForReport.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Phone:</span>
                    <span>{selectedSupplierForReport.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Address:</span>
                    <span className="text-right max-w-48">{selectedSupplierForReport.address || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">
                  Business Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Tax ID:</span>
                    <span>{selectedSupplierForReport.taxId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Payment Terms:</span>
                    <span>{selectedSupplierForReport.paymentTerms} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      selectedSupplierForReport.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedSupplierForReport.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Created:</span>
                    <span>{selectedSupplierForReport.createdAt ? new Date(selectedSupplierForReport.createdAt).toLocaleDateString('en-US') : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">
                Supplier Statistics
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Total Invoices</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">€0</div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Active Orders</div>
                </div>
              </div>
            </div>
          </div>
        )
      } : undefined}
      
      deleteConfirmDialog={{
        isOpen: showDeleteConfirmDialog,
        onOpenChange: setShowDeleteConfirmDialog,
        onConfirm: () => deleteSuppliersMutation.mutate(dataTableState.selectedRows),
        itemCount: dataTableState.selectedRows.length
      }}
      
      // Event handlers
      onRowDoubleClick={handleRowDoubleClick}
      
      // Customization
      entityName="Supplier"
      entityNamePlural="Suppliers"
      
      // Filter and search functions
      applyFiltersAndSearch={dataTableState.applyFiltersAndSearch}
      applySorting={dataTableState.applySorting}
      
      // Additional functionality
      onExport={handleExport}
      onDuplicate={handleDuplicate}
    />
    </div>
  );
}