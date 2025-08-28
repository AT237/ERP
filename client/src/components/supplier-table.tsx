import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus } from "lucide-react";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig } from '@/components/layouts/DataTableLayout';
import { FormLayout, FormSection } from '@/components/layouts/FormLayout';
import { useDataTable } from '@/hooks/useDataTable';

// Form schema
const formSchema = insertSupplierSchema.extend({
  paymentTerms: z.string().min(1, "Payment terms is required"),
});

type FormData = z.infer<typeof formSchema>;

// Default column configuration for suppliers
const defaultColumns: ColumnConfig[] = [
  { key: 'supplierNumber', label: 'Supplier #', visible: true, width: 120, filterable: true, sortable: true },
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
    renderCell: (value: string) => value ? new Date(value).toLocaleDateString('nl-NL') : '-'
  },
];

export default function SupplierTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use our data table hook
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'name', direction: 'asc' }
  });
  
  // Dialog states
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [showSupplierReport, setShowSupplierReport] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierForReport, setSelectedSupplierForReport] = useState<Supplier | null>(null);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      taxId: "",
      paymentTerms: "30",
      status: "active",
    }
  });

  // Data fetching
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Mutations
  const createSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supplierData: InsertSupplier = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        contactPerson: data.contactPerson || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
      };
      
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData),
      });
      
      if (!response.ok) throw new Error("Failed to create supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowAddSupplierDialog(false);
      setEditingSupplier(null);
      form.reset();
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add supplier. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingSupplier) throw new Error("No supplier to update");
      
      const supplierData: Partial<InsertSupplier> = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        contactPerson: data.contactPerson || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
      };
      
      const response = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData),
      });
      
      if (!response.ok) throw new Error("Failed to update supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setEditingSupplier(null);
      setShowAddSupplierDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    },
  });

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

  // Event handlers
  const handleAddSupplier = () => {
    setEditingSupplier(null);
    form.reset();
    setShowAddSupplierDialog(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactPerson: supplier.contactPerson || "",
      taxId: supplier.taxId || "",
      paymentTerms: supplier.paymentTerms?.toString() || "30",
      status: supplier.status || "active",
    });
    setShowAddSupplierDialog(true);
  };

  const handleSupplierDoubleClick = (supplier: Supplier) => {
    setSelectedSupplierForReport(supplier);
    setShowSupplierReport(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate(data);
    } else {
      createSupplierMutation.mutate(data);
    }
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
    // Pre-fill form with supplier data for duplication
    form.reset({
      name: `${supplier.name} (Copy)`,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactPerson: supplier.contactPerson || "",
      taxId: "", // Clear tax ID for duplicate
      paymentTerms: supplier.paymentTerms?.toString() || "30",
      status: "active", // Reset to active
    });
    setEditingSupplier(null); // Make sure we're not editing
    setShowAddSupplierDialog(true);
  };

  // Define form sections for the add/edit dialog
  const formSections: FormSection[] = [
    {
      title: "Company Information",
      fields: [
        {
          key: "name",
          label: "Company Name",
          type: "text",
          placeholder: "Enter company name",
          required: true,
          register: form.register("name"),
          error: form.formState.errors.name?.message,
          'data-testid': "input-supplier-name"
        },
        {
          key: "taxId",
          label: "Tax ID",
          type: "text",
          placeholder: "Tax identification number",
          register: form.register("taxId"),
          'data-testid': "input-supplier-tax-id"
        },
        {
          key: "address",
          label: "Address",
          type: "text",
          placeholder: "Company address",
          register: form.register("address"),
          'data-testid': "input-supplier-address"
        }
      ]
    },
    {
      title: "Contact Information",
      fields: [
        {
          key: "contactPerson",
          label: "Contact Person",
          type: "text",
          placeholder: "Main contact person",
          register: form.register("contactPerson"),
          'data-testid': "input-supplier-contact-person"
        },
        {
          key: "email",
          label: "Email Address",
          type: "email",
          placeholder: "company@example.com",
          register: form.register("email"),
          'data-testid': "input-supplier-email"
        },
        {
          key: "phone",
          label: "Phone Number",
          type: "tel",
          placeholder: "+31 20 123 4567",
          register: form.register("phone"),
          'data-testid': "input-supplier-phone"
        }
      ]
    },
    {
      title: "Business Settings",
      fields: [
        {
          key: "paymentTerms",
          label: "Payment Terms",
          type: "select",
          required: true,
          options: [
            { value: "0", label: "Immediate payment" },
            { value: "14", label: "14 days" },
            { value: "30", label: "30 days" },
            { value: "60", label: "60 days" },
            { value: "90", label: "90 days" }
          ],
          setValue: (value: string) => form.setValue("paymentTerms", value),
          error: form.formState.errors.paymentTerms?.message,
          'data-testid': "select-supplier-payment-terms"
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "prospect", label: "Prospect" }
          ],
          setValue: (value: string) => form.setValue("status", value),
          'data-testid': "select-supplier-status"
        }
      ]
    }
  ];

  return (
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
          icon: <Plus size={16} />,
          onClick: handleAddSupplier,
          variant: 'default'
        }
      ]}
      
      // Dialogs
      addEditDialog={{
        isOpen: showAddSupplierDialog,
        onOpenChange: setShowAddSupplierDialog,
        title: editingSupplier ? "Edit Supplier" : "Add New Supplier",
        content: (
          <FormLayout
            sections={formSections}
            onSubmit={form.handleSubmit(onSubmit)}
            onCancel={() => setShowAddSupplierDialog(false)}
            submitLabel={editingSupplier 
              ? (updateSupplierMutation.isPending ? "Updating..." : "Update Supplier")
              : (createSupplierMutation.isPending ? "Adding..." : "Add Supplier")
            }
            isSubmitting={createSupplierMutation.isPending || updateSupplierMutation.isPending}
          />
        )
      }}
      
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
                    <span>{selectedSupplierForReport.createdAt ? new Date(selectedSupplierForReport.createdAt).toLocaleDateString('en-US') : '-'}</span>
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
      onRowDoubleClick={handleSupplierDoubleClick}
      
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
  );
}