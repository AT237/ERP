import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, FolderOpen, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import type { Project, Customer } from "@shared/schema";
import { format } from "date-fns";

// Default column configuration for projects
const defaultColumns: ColumnConfig[] = [
  createIdColumn('projectNumber', 'Project Number'),
  { 
    key: 'name', 
    label: 'Name', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Project & { customerName?: string }) => (
      <span data-testid={`text-project-name-${row.id}`}>{value}</span>
    )
  },
  { 
    key: 'description', 
    label: 'Description', 
    visible: true, 
    width: 250, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value || ''
  },
  { 
    key: 'customerName', 
    label: 'Customer', 
    visible: true, 
    width: 180, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Project & { customerName?: string }) => (
      <span data-testid={`text-customer-${row.id}`}>{value || "Unknown Customer"}</span>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Project) => (
      <Badge variant={value === 'Active' ? 'default' : value === 'Completed' ? 'secondary' : 'outline'} data-testid={`badge-status-${row.id}`}>
        {value || 'Unknown'}
      </Badge>
    )
  },
  { 
    key: 'progress', 
    label: 'Progress', 
    visible: true, 
    width: 140, 
    filterable: false, 
    sortable: true,
    renderCell: (value: number, row: Project) => (
      <div className="flex items-center gap-2" data-testid={`progress-${row.id}`}>
        <span className="text-sm whitespace-nowrap w-10">{value || 0}%</span>
        <Progress value={value || 0} className="h-2 flex-1" />
      </div>
    )
  },
  { 
    key: 'startDate', 
    label: 'Start Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Project) => (
      <div className="flex items-center space-x-2" data-testid={`text-start-date-${row.id}`}>
        {value ? (
          <>
            <Calendar size={14} />
            <span>{format(new Date(value), "MMM dd, yyyy")}</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>
    )
  },
  { 
    key: 'endDate', 
    label: 'End Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Project) => (
      <div className="flex items-center space-x-2" data-testid={`text-end-date-${row.id}`}>
        {value ? (
          <>
            <Calendar size={14} />
            <span>{format(new Date(value), "MMM dd, yyyy")}</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>
    )
  },
  createCurrencyColumn('totalValue', 'Total Value'),
];

export default function Projects() {
  const { toast } = useToast();

  // Optimized data fetching with stable loading state
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  // Combined loading state
  const isLoading = projectsLoading || customersLoading;

  // Customer name lookup - memoized to prevent re-creation
  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  // Enhanced data with customer names - stabilized with useMemo
  const enhancedProjects = React.useMemo(() => {
    return projects.map(project => ({
      ...project,
      customerName: getCustomerName(project.customerId || '')
    }));
  }, [projects, getCustomerName]);

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'createdAt', direction: 'desc' },
    tableKey: 'projects'
  });

  const del = useEntityDelete({
    endpoint: '/api/projects',
    queryKeys: ['/api/projects'],
    entityLabel: 'Project',
    checkUsages: false,
    getName: (row) => row.projectNumber || row.name
  });

  const handleEdit = (project: Project) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-project-${project.id}`,
        name: `Edit ${project.projectNumber}`,
        formType: 'project',
        projectId: project.id
      }
    }));
  };

  const handleRowDoubleClick = (project: Project) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-project-${project.id}`,
        name: `Edit ${project.projectNumber}`,
        formType: 'project',
        projectId: project.id
      }
    }));
  };

  const handleNewProject = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-project',
        name: 'New Project',
        formType: 'project'
      }
    }));
  };

  const handleToggleAllRows = () => {
    const allRowIds = enhancedProjects.map(project => project.id);
    tableState.toggleAllRows(allRowIds);
  };


  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={enhancedProjects}
        isLoading={isLoading}
        tableKey="projects"
        getRowId={(project) => project.id}
        
        // Table configuration
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        
        // Search and filtering
        searchTerm={tableState.searchTerm}
        setSearchTerm={tableState.setSearchTerm}
        filters={tableState.filters}
        setFilters={tableState.setFilters}
        onAddFilter={tableState.addFilter}
        onUpdateFilter={tableState.updateFilter}
        onRemoveFilter={tableState.removeFilter}
        
        // Sorting
        sortConfig={tableState.sortConfig}
        onSort={tableState.handleSort}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        
        // Row selection
        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={handleToggleAllRows}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enhancedProjects),
          itemCount: tableState.selectedRows.length
        }}
        
        // Actions
        headerActions={[
          {
            key: 'add-project',
            label: 'Add Project',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewProject,
            variant: 'default' as const
          }
        ]}
        
        rowActions={(row: Project) => [
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
            onClick: () => del.handleDeleteRow(row),
            variant: 'destructive' as const
          }
        ]}
        
        // Events
        onRowDoubleClick={handleRowDoubleClick}
        
        // Display options
        entityName="Project"
        entityNamePlural="Projects"
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
