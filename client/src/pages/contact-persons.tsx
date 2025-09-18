import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CustomerContact, Customer } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

const defaultColumns: ColumnConfig[] = [
  createIdColumn('id', 'Contact ID'),
  { 
    key: 'fullName', 
    label: 'Name', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: any, row: CustomerContact) => 
      `${row.firstName} ${row.lastName}`
  },
  { 
    key: 'dateOfBirth', 
    label: 'Date of Birth', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: Date | null) => value ? 
      new Date(value).toLocaleDateString('nl-NL') : "—"
  },
  { 
    key: 'mobile', 
    label: 'Mobile', 
    visible: true, 
    width: 160, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string[] | string | null, row: CustomerContact) => {
      const mobiles = Array.isArray(value) ? value : value ? [value] : [];
      return mobiles.length > 0 ? (
        <div className="space-y-1">
          {mobiles.slice(0, 2).map((mobile, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Phone size={12} className="text-green-500" />
              <a href={`tel:${mobile}`} className="text-blue-600 hover:underline text-xs">
                {mobile}
              </a>
            </div>
          ))}
          {mobiles.length > 2 && (
            <span className="text-xs text-gray-500">+{mobiles.length - 2} more</span>
          )}
        </div>
      ) : "—";
    }
  },
  { key: 'position', label: 'Position', visible: true, width: 150, filterable: true, sortable: true },
  { 
    key: 'email', 
    label: 'Email', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <div className="flex items-center space-x-2">
        <Mail size={14} className="text-orange-500" />
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-sm">
          {value}
        </a>
      </div>
    ) : "—"
  },
  { 
    key: 'phone', 
    label: 'Phone', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <div className="flex items-center space-x-2">
        <Phone size={14} className="text-orange-500" />
        <a href={`tel:${value}`} className="text-blue-600 hover:underline text-sm">
          {value}
        </a>
      </div>
    ) : "—"
  },
  { 
    key: 'isPrimary', 
    label: 'Primary', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: boolean) => (
      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
        value 
          ? 'bg-orange-100 text-orange-800' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {value ? 'Primary' : 'Secondary'}
      </span>
    )
  },
];

export default function ContactPersons() {
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns
  });

  // Data fetching
  const { data: contacts = [], isLoading } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customer-contacts"],
  });

  // Fetch customers for enhanced data
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customer-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Contact person deleted",
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
    // Open edit form on double click
    handleEdit(contact);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this contact person?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewContactPerson = () => {
    // Dispatch custom event to open contact person form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-contact-person',
        name: 'New Contact Person',
        formType: 'contact-person'
      }
    });
    window.dispatchEvent(event);
  };

  // Enhanced contact data with customer name
  const enhancedContacts = contacts.map((contact: CustomerContact) => {
    const customer = customers.find((c: Customer) => c.id === contact.customerId);
    return {
      ...contact,
      customerName: contact.customerId ? (customer?.name || 'Unknown Customer') : 'Independent Contact',
    };
  });

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Contact Person"
        entityNamePlural="Contact Persons"
        data={enhancedContacts}
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
          const allIds = enhancedContacts.map(c => c.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: CustomerContact) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-contact-person',
            label: 'Add Contact Person',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewContactPerson,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: CustomerContact) => [
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
        deleteConfirmDialog={{
          isOpen: false,
          onOpenChange: () => {},
          onConfirm: () => {},
          itemCount: tableState.selectedRows.length
        }}
      />
    </div>
  );
}