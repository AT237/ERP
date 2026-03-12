import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Prospect } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Phone, Mail, Building, DollarSign } from "lucide-react";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';

// Default column configuration for prospects
const defaultColumns: ColumnConfig[] = [
  createIdColumn('prospectNumber', 'Prospect #'),
  { key: 'firstName', label: 'First Name', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'lastName', label: 'Last Name', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'companyName', label: 'Company', visible: true, width: 180, filterable: true, sortable: true },
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
  { key: 'position', label: 'Position', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'industry', label: 'Industry', visible: false, width: 120, filterable: true, sortable: true },
  { key: 'source', label: 'Source', visible: false, width: 100, filterable: true, sortable: true },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => {
      const colors = {
        new: 'bg-blue-100 text-blue-800',
        contacted: 'bg-yellow-100 text-yellow-800',
        qualified: 'bg-green-100 text-green-800',
        proposal: 'bg-purple-100 text-purple-800',
        negotiation: 'bg-orange-100 text-orange-800',
        won: 'bg-green-100 text-green-800',
        lost: 'bg-red-100 text-red-800'
      };
      return (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
          {value}
        </span>
      );
    }
  },
  { 
    key: 'priority', 
    label: 'Priority', 
    visible: true, 
    width: 80, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => {
      const colors = {
        low: 'bg-gray-100 text-gray-800',
        medium: 'bg-blue-100 text-blue-800',
        high: 'bg-red-100 text-red-800'
      };
      return (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colors[value as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
          {value}
        </span>
      );
    }
  },
  { 
    key: 'estimatedValue', 
    label: 'Est. Value', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? `€${parseFloat(value).toLocaleString('nl-NL')}` : ''
  },
  { key: 'assignedTo', label: 'Assigned To', visible: false, width: 120, filterable: true, sortable: true },
  { 
    key: 'nextFollowUp', 
    label: 'Next Follow-up', 
    visible: false, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? new Date(value).toLocaleDateString('nl-NL') : ''
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

export default function ProspectsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use our data table hook
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'companyName', direction: 'asc' },
    tableKey: 'prospects'
  });

  const del = useEntityDelete<Prospect>({
    endpoint: '/api/prospects',
    queryKeys: ['/api/prospects'],
    getName: (row) => row.companyName || (row as any).firstName || 'Prospect',
    entityLabel: 'Prospect',
    checkUsages: false,
  });

  // Tab system handlers
  const handleNewProspect = () => {
    // Dispatch custom event to open prospect form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `prospect-new-${Date.now()}`,
        name: 'New Prospect',
        formType: 'prospect',
        parentId: 'prospects'
      }
    });
    window.dispatchEvent(event);
  };

  const handleEditProspect = (prospect: Prospect) => {
    // Dispatch custom event to open prospect edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `prospect-edit-${prospect.id}`,
        name: `Edit ${prospect.companyName}`,
        formType: 'prospect',
        parentId: 'prospects',
        data: prospect
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (prospect: Prospect) => {
    // Same as edit for double-click
    handleEditProspect(prospect);
  };

  // Fetch prospects data
  const { data: prospects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects"],
    refetchOnMount: 'always',
  });

  const handleToggleAllRows = () => {
    const allRowIds = prospects.map(prospect => prospect.id);
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

  const handleDuplicate = async (prospect: Prospect) => {
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`);
      if (!res.ok) throw new Error('Failed to fetch prospect');
      const data = await res.json();
      const { id, prospectNumber, createdAt, updatedAt, ...duplicateData } = data;
      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...duplicateData,
          companyName: `${duplicateData.companyName || ''} (Copy)`,
        }),
      });
      if (!response.ok) throw new Error('Failed to create duplicate');
      const newProspect = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      toast({ title: "Success", description: "Prospect duplicated" });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `prospect-edit-${newProspect.id}`,
          name: `Edit ${newProspect.companyName}`,
          formType: 'prospect',
          parentId: 'prospects',
          data: newProspect,
        }
      }));
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate prospect", variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={prospects}
        isLoading={isLoading}
        getRowId={(prospect) => prospect.id}
        
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
            del.handleBulkDelete(dataTableState.selectedRows, prospects);
            dataTableState.clearSelection();
          },
          itemCount: dataTableState.selectedRows.length
        }}
        
        // Actions
        headerActions={[
          {
            key: 'add-prospect',
            label: "New Prospect",
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewProspect,
            variant: "default" as const
          }
        ]}
        
        rowActions={(prospect: Prospect) => [
          {
            key: 'edit',
            label: "Edit",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditProspect(prospect)
          },
          {
            key: 'delete',
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(prospect),
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
        
        // Event handlers
        onRowDoubleClick={handleRowDoubleClick}
        
        // Customization
        entityName="Prospect"
        entityNamePlural="Prospects"
        
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