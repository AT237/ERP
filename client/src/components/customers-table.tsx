import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Building, Mail, Phone, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

interface ExtendedCustomer extends Customer {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
}

const defaultColumns: ColumnConfig[] = [
  { key: 'customerNumber', label: 'Customer Number', visible: true, width: 120, filterable: true, sortable: true },
  { 
    key: 'name', 
    label: 'Company Name', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-medium">{value}</span>
    )
  },
  { key: 'kvkNummer', label: 'KVK Number', visible: true, width: 120, filterable: true, sortable: true },
  { 
    key: 'email', 
    label: 'Email', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Mail className="w-3 h-3" />
        {value}
      </a>
    ) : ''
  },
  { 
    key: 'phone', 
    label: 'Phone', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Phone className="w-3 h-3" />
        {value}
      </a>
    ) : ''
  },
  { key: 'taxId', label: 'Tax ID', visible: false, width: 150, filterable: true, sortable: true },
  { key: 'countryCode', label: 'Country Code', visible: false, width: 100, filterable: true, sortable: true },
  { key: 'generalEmail', label: 'General Email', visible: false, width: 200, filterable: true, sortable: true },
  { key: 'mobile', label: 'Mobile', visible: false, width: 140, filterable: true, sortable: true },
  { key: 'languageCode', label: 'Language', visible: false, width: 100, filterable: true, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true,
    renderCell: (value: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === 'active' ? 'bg-green-100 text-green-800' : 
        value === 'inactive' ? 'bg-red-100 text-red-800' : 
        'bg-gray-100 text-gray-800'
      }`}>
        {value || 'Unknown'}
      </span>
    )
  },
  { 
    key: 'createdAt', 
    label: 'Created', 
    visible: false, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: Date | string) => 
      new Date(value).toLocaleDateString('nl-NL')
  },
  // Address fields (from related address)
  { key: 'street', label: 'Street', visible: false, width: 150, filterable: true, sortable: true },
  { key: 'houseNumber', label: 'House Nr', visible: false, width: 80, filterable: true, sortable: true },
  { key: 'postalCode', label: 'Postal Code', visible: false, width: 100, filterable: true, sortable: true },
  { key: 'city', label: 'City', visible: false, width: 120, filterable: true, sortable: true },
  { key: 'country', label: 'Country', visible: false, width: 120, filterable: true, sortable: true },
  // Primary contact fields
  { key: 'primaryContactName', label: 'Contact Person', visible: false, width: 150, filterable: true, sortable: true },
  { 
    key: 'primaryContactEmail', 
    label: 'Contact Email', 
    visible: false, 
    width: 180, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Mail className="w-3 h-3" />
        {value}
      </a>
    ) : ''
  },
  { 
    key: 'primaryContactPhone', 
    label: 'Contact Phone', 
    visible: false, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Phone className="w-3 h-3" />
        {value}
      </a>
    ) : ''
  },
];

export default function CustomersTable() {
  const { toast } = useToast();
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'customers',
  });

  // Data fetching - use extended endpoint for related data
  const { data: customers = [], isLoading } = useQuery<ExtendedCustomer[]>({
    queryKey: ["/api/customers/extended"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Customer deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const deleteCustomersMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/customers/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      tableState.clearSelection();
      setShowDeleteConfirmDialog(false);
      toast({
        title: "Success",
        description: "Customers deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete customers",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (customer: Customer) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `customer-${customer.id}`,
        name: customer.customerNumber || 'Customer',
        formType: 'customer',
        entityId: customer.id,
      }
    }));
  };

  const handleRowDoubleClick = (customer: Customer) => {
    handleEdit(customer);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCustomer = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `new-customer-${Date.now()}`,
        name: 'New Customer',
        formType: 'customer',
      }
    }));
  };

  const handleDuplicate = async (customer: Customer) => {
    try {
      const res = await fetch(`/api/customers/${customer.id}`);
      if (!res.ok) throw new Error('Failed to fetch customer');
      const data = await res.json();
      const { id, customerNumber, createdAt, updatedAt, ...duplicateData } = data;
      const response = await apiRequest("POST", "/api/customers", {
        ...duplicateData,
        name: `${duplicateData.name || ''} (Copy)`,
      });
      const newCustomer = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Success", description: "Customer duplicated" });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `customer-${newCustomer.id}`,
          name: newCustomer.customerNumber || 'Customer',
          formType: 'customer',
          entityId: newCustomer.id,
        }
      }));
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate customer", variant: "destructive" });
    }
  };

  // Render table data with proper formatting
  const renderTableData = (customers: ExtendedCustomer[]) => {
    return customers.map((customer) => ({
      ...customer,
      name: customer.name || '',
      kvkNummer: customer.kvkNummer || '',
      email: customer.email || '',
      phone: customer.phone || '',
      taxId: customer.taxId || '',
      countryCode: customer.countryCode || '',
      generalEmail: customer.generalEmail || '',
      mobile: customer.mobile || '',
      languageCode: customer.languageCode || '',
      status: customer.status || 'active',
      // Extended fields from related tables
      street: customer.street || '',
      houseNumber: customer.houseNumber || '',
      postalCode: customer.postalCode || '',
      city: customer.city || '',
      country: customer.country || '',
      primaryContactName: customer.primaryContactName || '',
      primaryContactEmail: customer.primaryContactEmail || '',
      primaryContactPhone: customer.primaryContactPhone || '',
    }));
  };

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Customer"
        entityNamePlural="Customers"
        data={renderTableData(customers)}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        tableKey="customers"
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
          const allIds = customers.map(c => c.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: Customer) => row.id}
        
        // Filter and search functions
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        deleteConfirmDialog={{
          isOpen: showDeleteConfirmDialog,
          onOpenChange: setShowDeleteConfirmDialog,
          onConfirm: () => deleteCustomersMutation.mutate(tableState.selectedRows),
          itemCount: tableState.selectedRows.length
        }}
        // Header actions
        headerActions={[
          {
            key: 'add-customer',
            label: 'Add Customer',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewCustomer,
            variant: 'default' as const
          }
        ]}
        onDuplicate={handleDuplicate}
        rowActions={(row: Customer) => [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(row),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDelete(row.id),
            variant: 'destructive' as const
          }
        ]}
      />
    </div>
  );
}