import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Building, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useLocation } from 'wouter';

const defaultColumns: ColumnConfig[] = [
  createIdColumn('id', 'Customer ID'),
  { 
    key: 'name', 
    label: 'Company Name', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => (
      <div className="flex items-center space-x-2">
        <Building size={14} className="text-blue-500" />
        <span className="font-medium">{value}</span>
      </div>
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
  { key: 'countryCode', label: 'Country', visible: true, width: 100, filterable: true, sortable: true },
  { key: 'generalEmail', label: 'General Email', visible: false, width: 200, filterable: true, sortable: true },
  { key: 'mobile', label: 'Mobile', visible: false, width: 140, filterable: true, sortable: true },
  { key: 'language', label: 'Language', visible: false, width: 100, filterable: true, sortable: true },
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
];

export default function CustomersTable() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns
  });

  // Data fetching
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
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

  const handleEdit = (customer: Customer) => {
    // Navigate directly to customer edit form route (no popup)
    setLocation(`/customer-form/${customer.id}`);
  };

  const handleRowDoubleClick = (customer: Customer) => {
    // Open edit form on double click
    handleEdit(customer);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCustomer = () => {
    // Navigate directly to customer form route (no popup)
    setLocation('/customer-form');
  };

  // Render table data with proper formatting
  const renderTableData = (customers: Customer[]) => {
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
      language: customer.language || '',
      status: customer.status || 'active',
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
        actionButtons={[
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: (row: Customer) => handleEdit(row),
            variant: 'ghost' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: (row: Customer) => handleDelete(row.id),
            variant: 'destructive' as const
          }
        ]}
      />
    </div>
  );
}