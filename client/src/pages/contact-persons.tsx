import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type CustomerContact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Mail, Phone } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

// Default column configuration for contact persons
const defaultColumns: ColumnConfig[] = [
  { key: 'firstName', label: 'First Name', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'lastName', label: 'Last Name', visible: true, width: 120, filterable: true, sortable: true },
  { 
    key: 'email', 
    label: 'Email', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a 
        href={`mailto:${value}`} 
        className="text-blue-600 hover:text-blue-800 underline"
        data-testid={`link-email-${value}`}
      >
        {value}
      </a>
    ) : '-'
  },
  { 
    key: 'phone', 
    label: 'Phone', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a 
        href={`tel:${value}`} 
        className="text-blue-600 hover:text-blue-800 underline"
        data-testid={`link-phone-${value}`}
      >
        {value}
      </a>
    ) : '-'
  },
  { key: 'position', label: 'Position', visible: true, width: 150, filterable: true, sortable: true },
  { 
    key: 'isPrimary', 
    label: 'Primary', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: boolean) => (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
        value 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {value ? 'Primary' : 'Secondary'}
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

export default function ContactPersons() {
  const { toast } = useToast();
  
  // Use our data table hook
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'lastName', direction: 'asc' },
    tableKey: 'contact-persons'
  });
  
  // Data fetching
  const { data: contacts = [], isLoading } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customer-contacts"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customer-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      toast({
        title: "Success",
        description: "Contact person deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete contact person",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (contact: CustomerContact) => {
    // Dispatch custom event to open contact person edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-contact-person-${contact.id}`,
        name: `${contact.firstName} ${contact.lastName}`,
        formType: 'contact-person',
        parentId: contact.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (contact: CustomerContact) => {
    handleEdit(contact);
  };

  const handleNewItem = () => {
    // Dispatch custom event to open new contact person form in new tab  
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-contact-person',
        name: 'New Contact Person',
        formType: 'contact-person'
      }
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (contact: CustomerContact) => {
    if (confirm(`Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`)) {
      deleteMutation.mutate(contact.id);
    }
  };

  const headerActions = [
    {
      key: 'new',
      label: 'Add Contact Person',
      icon: <Plus className="h-4 w-4" />,
      onClick: handleNewItem,
      variant: 'default' as const
    }
  ];

  const rowActions = (row: CustomerContact) => [
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
      onClick: () => handleDelete(row),
      variant: 'outline' as const
    }
  ];

  return (
    <DataTableLayout
      title="Contact Persons"
      description="Manage contact persons associated with customers"
      data={contacts}
      columns={dataTableState.columns}
      isLoading={isLoading}
      searchTerm={dataTableState.searchTerm}
      onSearchChange={dataTableState.setSearchTerm}
      filters={dataTableState.filters}
      onFiltersChange={dataTableState.setFilters}
      sortConfig={dataTableState.sortConfig}
      onSort={dataTableState.handleSort}
      selectedRows={dataTableState.selectedRows}
      onSelectionChange={dataTableState.setSelectedRows}
      headerActions={headerActions}
      rowActions={rowActions}
      onRowDoubleClick={handleRowDoubleClick}
      onColumnsChange={dataTableState.setColumns}
      getRowId={(row) => row.id}
      dataTestId="contact-persons-table"
      
      // Entity names for proper UI labels
      entityName="Contact Person"
      entityNamePlural="Contact Persons"
      
      // Filter and search functions - CRITICAL MISSING PROPS!
      applyFiltersAndSearch={dataTableState.applyFiltersAndSearch}
      applySorting={dataTableState.applySorting}
    />
  );
}