import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';


const defaultColumns: ColumnConfig[] = [
  createIdColumn('customerNumber', 'Customer ID'),
  { key: 'name', label: 'Company Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'email', label: 'Email', visible: true, width: 180, filterable: true, sortable: true },
  { key: 'phone', label: 'Phone', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'mobile', label: 'Mobile', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'taxId', label: 'Tax ID', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'paymentTerms', label: 'Payment Terms', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true },
];

export default function Customers() {
  const { toast } = useToast();

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
        title: "Succes",
        description: "Klant verwijderd",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet verwijderen",
        variant: "destructive",
      });
    },
  });


  const handleEdit = (customer: Customer) => {
    // Dispatch custom event to open customer edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-customer-${customer.id}`,
        name: `${formatCustomerNumber(customer.customerNumber)}`,
        formType: 'customer',
        parentId: customer.id
      }
    });
    window.dispatchEvent(event);
  };

  // Format customer number to DEB-XXXX format
  const formatCustomerNumber = (customerNumber: string) => {
    // Extract number from customerNumber if it exists, otherwise use a default
    const num = customerNumber ? customerNumber.replace(/\D/g, '') : '0001';
    return `DEB-${num.padStart(4, '0')}`;
  };

  const handleRowDoubleClick = (customer: Customer) => {
    // Dispatch custom event to open customer edit form in new tab with DEB formatting
    const formattedNumber = formatCustomerNumber(customer.customerNumber);
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-customer-${customer.id}`,
        name: `${formattedNumber}`,
        formType: 'customer',
        parentId: customer.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je deze klant wilt verwijderen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCustomer = () => {
    // Dispatch custom event to open customer form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-customer',
        name: 'New Customer',
        formType: 'customer'
      }
    });
    window.dispatchEvent(event);
  };

  // Render table data with proper formatting
  const renderTableData = (customers: Customer[]) => {
    return customers.map((customer) => ({
      ...customer,
      customerNumber: formatCustomerNumber(customer.customerNumber),
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      taxId: customer.taxId || '',
      paymentTerms: customer.paymentTerms || 30,
      status: customer.status || 'actief',
    }));
  };


  return (
    <div className="p-6">
      <DataTableLayout
      title="Customer Management"
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
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      headerActions={[
        {
          key: 'add-customer',
          label: 'Add Customer',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleNewCustomer,
          variant: 'default' as const
        }
      ]}
      rowActions={(row: Customer) => [
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