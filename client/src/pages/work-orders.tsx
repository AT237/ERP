import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ClipboardList, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { WorkOrder, Project } from "@shared/schema";
import { format } from "date-fns";

// Default column configuration for work orders
const defaultColumns: ColumnConfig[] = [
  createIdColumn('orderNumber', 'Order #'),
  { 
    key: 'projectName', 
    label: 'Project', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: WorkOrder & { projectName?: string }) => (
      <span data-testid={`text-project-${row.id}`}>{value || "No Project"}</span>
    )
  },
  { 
    key: 'title', 
    label: 'Title', 
    visible: true, 
    width: 250, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: WorkOrder) => (
      <div data-testid={`text-title-${row.id}`}>
        <div className="font-medium">{value}</div>
        {row.description && (
          <div className="text-sm text-muted-foreground truncate max-w-xs">
            {row.description}
          </div>
        )}
      </div>
    )
  },
  { 
    key: 'assignedTo', 
    label: 'Assigned To', 
    visible: true, 
    width: 150, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: WorkOrder) => (
      <span data-testid={`text-assigned-to-${row.id}`}>{value || "-"}</span>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: WorkOrder) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "completed": return "default";
          case "in-progress": return "secondary";
          case "pending": return "outline";
          case "cancelled": return "destructive";
          default: return "outline";
        }
      };
      return (
        <Badge variant={getStatusVariant(value || "pending")} data-testid={`badge-status-${row.id}`}>
          {value || "pending"}
        </Badge>
      );
    }
  },
  { 
    key: 'priority', 
    label: 'Priority', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: WorkOrder) => {
      const getPriorityVariant = (priority: string) => {
        switch (priority) {
          case "high": return "destructive";
          case "medium": return "secondary";
          case "low": return "outline";
          default: return "secondary";
        }
      };
      return (
        <Badge variant={getPriorityVariant(value || "medium")} data-testid={`badge-priority-${row.id}`}>
          {value || "medium"}
        </Badge>
      );
    }
  },
  { 
    key: 'dueDate', 
    label: 'Due Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: WorkOrder) => (
      <span data-testid={`text-due-date-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'hours', 
    label: 'Hours', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: any, row: WorkOrder) => (
      <div className="flex items-center space-x-1" data-testid={`text-hours-${row.id}`}>
        <Clock size={14} className="text-muted-foreground" />
        <span className="text-sm">
          {row.actualHours || 0}/{row.estimatedHours || 0}
        </span>
      </div>
    )
  },
];

export default function WorkOrders() {
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'dueDate', direction: 'asc' },
    tableKey: 'work-orders'
  });

  const { data: workOrders, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/work-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Success",
        description: "Work order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete work order",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (workOrder: WorkOrder) => {
    // Dispatch event to open edit form tab
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-work-order-${workOrder.id}`,
        name: `${workOrder.orderNumber}`,
        formType: 'work-order',
        parentId: workOrder.id
      }
    }));
  };

  const handleRowDoubleClick = (workOrder: WorkOrder) => {
    // Dispatch event to open edit form tab on double click
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-work-order-${workOrder.id}`,
        name: `${workOrder.orderNumber}`,
        formType: 'work-order',
        parentId: workOrder.id
      }
    }));
  };

  const handleNewWorkOrder = () => {
    // Dispatch event to open new work order form tab
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-work-order',
        name: 'New Work Order',
        formType: 'work-order'
      }
    }));
  };

  const handleToggleAllRows = () => {
    const allRowIds = enhancedWorkOrders.map(order => order.id);
    tableState.toggleAllRows(allRowIds);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = (orderIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${orderIds.length} work orders?`)) {
      orderIds.forEach(id => deleteMutation.mutate(id));
      tableState.setSelectedRows([]);
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={enhancedWorkOrders}
        isLoading={isLoading}
        tableKey="work-orders"
        getRowId={(order) => order.id}
        
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
            key: 'add-work-order',
            label: 'Add Work Order',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewWorkOrder,
            variant: 'default' as const
          }
        ]}
        
        rowActions={(row: WorkOrder) => [
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
        entityName="Work Order"
        entityNamePlural="Work Orders"
        searchPlaceholder="Search work orders..."
      />
    </div>
  );
}