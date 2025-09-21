import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, FolderOpen, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Project, Customer } from "@shared/schema";
import { format } from "date-fns";


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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });


  const handleEdit = (project: Project) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-project-${project.id}`,
        name: `Edit ${project.name}`,
        formType: 'project',
        projectId: project.id
      }
    }));
  };

  const handleRowDoubleClick = (project: Project) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-project-${project.id}`,
        name: `Edit ${project.name}`,
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = (projectIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${projectIds.length} projects?`)) {
      projectIds.forEach(id => deleteMutation.mutate(id));
      tableState.setSelectedRows([]);
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={enhancedProjects}
        isLoading={isLoading}
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
        
        // Row selection
        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={handleToggleAllRows}
        
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
            onClick: () => handleDelete(row.id),
            variant: 'destructive' as const
          }
        ]}
        
        // Events
        onRowDoubleClick={handleRowDoubleClick}
        
        // Display options
        entityName="Project"
        entityNamePlural="Projects"
        searchPlaceholder="Search projects..."
      />
    </div>
  );
}
