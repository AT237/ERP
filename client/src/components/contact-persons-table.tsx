import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type CustomerContact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Phone, Mail } from "lucide-react";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';

// Default column configuration for contact persons
const defaultColumns: ColumnConfig[] = [
  createIdColumn('id', 'Contact ID'),
  { key: 'firstName', label: 'First Name', visible: true, width: 150, filterable: true, sortable: true },
  { key: 'lastName', label: 'Last Name', visible: true, width: 150, filterable: true, sortable: true },
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
  { key: 'position', label: 'Position', visible: true, width: 140, filterable: true, sortable: true },
  { key: 'department', label: 'Department', visible: false, width: 120, filterable: true, sortable: true },
  { key: 'mobile', label: 'Mobile', visible: false, width: 140, filterable: true, sortable: true },
  { key: 'fax', label: 'Fax', visible: false, width: 140, filterable: true, sortable: true },
  { 
    key: 'customerId', 
    label: 'Customer', 
    visible: true, 
    width: 180, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: CustomerContact) => {
      // You could enhance this to show customer name by joining data
      return value || 'No Customer';
    }
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

export default function ContactPersonsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use our data table hook
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'lastName', direction: 'asc' },
    tableKey: 'contact-persons'
  });

  const del = useEntityDelete<CustomerContact>({
    endpoint: '/api/customer-contacts',
    queryKeys: ['/api/customer-contacts'],
    getName: (row) => (row as any).name || row.firstName,
    entityLabel: 'Contact',
    checkUsages: false,
  });

  // Tab system handlers
  const handleNewContact = () => {
    // Dispatch custom event to open contact form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `contact-person-new-${Date.now()}`,
        name: 'New Contact Person',
        formType: 'contact-person',
        parentId: 'contact-persons'
      }
    });
    window.dispatchEvent(event);
  };

  const handleEditContact = (contact: CustomerContact) => {
    // Dispatch custom event to open contact edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `contact-person-edit-${contact.id}`,
        name: `Edit ${contact.firstName} ${contact.lastName}`,
        formType: 'contact-person',
        parentId: 'contact-persons',
        data: contact
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (contact: CustomerContact) => {
    // Same as edit for double-click
    handleEditContact(contact);
  };

  // Fetch contact persons data
  const { data: contacts = [], isLoading } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customer-contacts"],
  });

  const handleToggleAllRows = () => {
    const allRowIds = contacts.map(contact => contact.id);
    dataTableState.toggleAllRows(allRowIds);
  };

  // Export functionality
  const handleExport = () => {
    // Similar to supplier export functionality
    toast({
      title: "Export functionality",
      description: "Export feature will be implemented here.",
    });
  };

  const handleDuplicate = async (contact: CustomerContact) => {
    try {
      const res = await fetch(`/api/customer-contacts/${contact.id}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      const data = await res.json();
      const { id, createdAt, updatedAt, ...duplicateData } = data;
      const response = await fetch('/api/customer-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...duplicateData,
          firstName: `${duplicateData.firstName || ''} (Copy)`,
        }),
      });
      if (!response.ok) throw new Error('Failed to create duplicate');
      const newContact = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      toast({ title: "Success", description: "Contact person duplicated" });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `contact-person-edit-${newContact.id}`,
          name: `Edit ${newContact.firstName} ${newContact.lastName}`,
          formType: 'contact-person',
          parentId: 'contact-persons',
          data: newContact,
        }
      }));
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate contact", variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={contacts}
        isLoading={isLoading}
        getRowId={(contact) => contact.id}
        
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
        
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => {
            del.handleBulkDelete(dataTableState.selectedRows, contacts);
            dataTableState.clearSelection();
          },
          itemCount: dataTableState.selectedRows.length
        }}
        
        // Actions
        headerActions={[
          {
            key: 'add-contact',
            label: "New Contact Person",
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewContact,
            variant: "default" as const
          }
        ]}
        
        rowActions={(contact: CustomerContact) => [
          {
            key: 'edit',
            label: "Edit",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditContact(contact)
          },
          {
            key: 'delete',
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(contact),
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
        
        // Event handlers
        onRowDoubleClick={handleRowDoubleClick}
        
        // Customization
        entityName="Contact Person"
        entityNamePlural="Contact Persons"
        
        // Filter and search functions
        applyFiltersAndSearch={dataTableState.applyFiltersAndSearch}
        applySorting={dataTableState.applySorting}
        
        // Additional functionality
        onExport={handleExport}
        onDuplicate={handleDuplicate}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}