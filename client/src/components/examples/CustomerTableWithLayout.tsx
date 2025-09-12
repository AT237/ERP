import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus, Mail } from "lucide-react";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig } from '@/components/layouts/DataTableLayout';
import { FormLayout, FormSection } from '@/components/layouts/FormLayout';
import { useDataTable } from '@/hooks/useDataTable';

// Form schema
const formSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().min(1, "Payment terms is required"),
});

type FormData = z.infer<typeof formSchema>;

// Default column configuration for customers
const defaultColumns: ColumnConfig[] = [
  { key: 'customerNumber', label: 'Customer #', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'name', label: 'Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'email', label: 'Email', visible: true, width: 180, filterable: true, sortable: true },
  { key: 'phone', label: 'Phone', visible: true, width: 140, filterable: true, sortable: true },
  { key: 'mobile', label: 'Mobile', visible: false, width: 140, filterable: true, sortable: true },
  { key: 'taxId', label: 'Tax ID', visible: false, width: 120, filterable: true, sortable: true },
  { key: 'bankAccount', label: 'Bank Account', visible: false, width: 150, filterable: true, sortable: true },
  { key: 'language', label: 'Language', visible: false, width: 100, filterable: true, sortable: true },
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
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? new Date(value).toLocaleDateString('nl-NL') : ''
  },
];

export default function CustomerTableWithLayout() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use our data table hook
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'name', direction: 'asc' }
  });
  
  // Dialog states
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showCustomerReport, setShowCustomerReport] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForReport, setSelectedCustomerForReport] = useState<Customer | null>(null);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobile: "",
      taxId: "",
      paymentTerms: "30",
      status: "active",
      bankAccount: "",
      language: "en",
    }
  });

  // Data fetching
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const customerData: InsertCustomer = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
        bankAccount: data.bankAccount || null,
        language: data.language,
      };
      
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      
      if (!response.ok) throw new Error("Failed to create customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowAddCustomerDialog(false);
      setEditingCustomer(null);
      form.reset();
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingCustomer) throw new Error("No customer to update");
      
      const customerData: Partial<InsertCustomer> = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
        bankAccount: data.bankAccount || null,
        language: data.language,
      };
      
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      
      if (!response.ok) throw new Error("Failed to update customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      setShowAddCustomerDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
  });

  const deleteCustomersMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      for (const customerId of customerIds) {
        const response = await fetch(`/api/customers/${customerId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`Failed to delete customer ${customerId}`);
        }
      }
    },
    onSuccess: (_, customerIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      dataTableState.setSelectedRows([]);
      setShowDeleteConfirmDialog(false);
      toast({
        title: "Success",
        description: `${customerIds.length} ${customerIds.length === 1 ? 'customer' : 'customers'} deleted`,
      });
    },
  });

  // Event handlers
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    form.reset();
    setShowAddCustomerDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      mobile: customer.mobile || "",
      taxId: customer.taxId || "",
      paymentTerms: customer.paymentTerms?.toString() || "30",
      status: customer.status || "active",
      bankAccount: customer.bankAccount || "",
      language: customer.language || "en",
    });
    setShowAddCustomerDialog(true);
  };

  const handleCustomerDoubleClick = (customer: Customer) => {
    setSelectedCustomerForReport(customer);
    setShowCustomerReport(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate(data);
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleToggleAllRows = () => {
    const allRowIds = customers.map(customer => customer.id);
    dataTableState.toggleAllRows(allRowIds);
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
          'data-testid': "input-customer-name"
        },
        {
          key: "taxId",
          label: "Tax ID",
          type: "text",
          placeholder: "Tax identification number",
          register: form.register("taxId"),
          'data-testid': "input-customer-tax-id"
        }
      ]
    },
    {
      title: "Contact Information",
      fields: [
        {
          key: "email",
          label: "Email Address",
          type: "email",
          placeholder: "company@example.com",
          register: form.register("email"),
          'data-testid': "input-customer-email"
        },
        {
          key: "phone",
          label: "Phone Number",
          type: "tel",
          placeholder: "+31 20 123 4567",
          register: form.register("phone"),
          'data-testid': "input-customer-phone"
        },
        {
          key: "mobile",
          label: "Mobile Number",
          type: "tel",
          placeholder: "+31 6 12 34 56 78",
          register: form.register("mobile"),
          'data-testid': "input-customer-mobile"
        },
        {
          key: "bankAccount",
          label: "Bank Account",
          type: "text",
          placeholder: "NL91 ABNA 0417 1643 00",
          register: form.register("bankAccount"),
          'data-testid': "input-customer-bank-account"
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
          'data-testid': "select-payment-terms"
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
          'data-testid': "select-customer-status"
        },
        {
          key: "language",
          label: "Language",
          type: "select",
          options: [
            { value: "en", label: "English" },
            { value: "nl", label: "Dutch" },
            { value: "de", label: "German" },
            { value: "fr", label: "French" }
          ],
          setValue: (value: string) => form.setValue("language", value),
          'data-testid': "select-customer-language"
        }
      ]
    }
  ];

  return (
    <DataTableLayout
      // Data
      data={customers}
      isLoading={isLoading}
      getRowId={(customer) => customer.id}
      
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
          key: 'add-customer',
          label: 'Add Customer',
          icon: <Plus size={16} />,
          onClick: handleAddCustomer,
          variant: 'default'
        }
      ]}
      
      // Dialogs
      addEditDialog={{
        isOpen: showAddCustomerDialog,
        onOpenChange: setShowAddCustomerDialog,
        title: editingCustomer ? "Edit Customer" : "Add New Customer",
        content: (
          <FormLayout
            sections={formSections}
            onSubmit={form.handleSubmit(onSubmit)}
            onCancel={() => setShowAddCustomerDialog(false)}
            submitLabel={editingCustomer 
              ? (updateCustomerMutation.isPending ? "Updating..." : "Update Customer")
              : (createCustomerMutation.isPending ? "Adding..." : "Add Customer")
            }
            isSubmitting={createCustomerMutation.isPending || updateCustomerMutation.isPending}
          />
        )
      }}
      
      detailDialog={selectedCustomerForReport ? {
        isOpen: showCustomerReport,
        onOpenChange: setShowCustomerReport,
        title: "Customer Report",
        content: (
          <div className="space-y-6">
            {/* Customer Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-800">{selectedCustomerForReport.name}</h2>
              <p className="text-sm text-gray-600">Customer ID: {selectedCustomerForReport.customerNumber}</p>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span>{selectedCustomerForReport.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Phone:</span>
                    <span>{selectedCustomerForReport.phone || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                  Business Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Tax ID:</span>
                    <span>{selectedCustomerForReport.taxId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Payment Terms:</span>
                    <span>{selectedCustomerForReport.paymentTerms} days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      } : undefined}
      
      deleteConfirmDialog={{
        isOpen: showDeleteConfirmDialog,
        onOpenChange: setShowDeleteConfirmDialog,
        onConfirm: () => deleteCustomersMutation.mutate(dataTableState.selectedRows),
        itemCount: dataTableState.selectedRows.length
      }}
      
      // Event handlers
      onRowDoubleClick={handleCustomerDoubleClick}
      
      // Customization
      entityName="Customer"
      entityNamePlural="Customers"
      
      // Filter and search functions
      applyFiltersAndSearch={dataTableState.applyFiltersAndSearch}
      applySorting={dataTableState.applySorting}
    />
  );
}