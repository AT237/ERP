import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ClipboardList, Clock, Printer, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PrintLayoutDialog } from "@/components/layouts/PrintLayoutDialog";
import { exportTableToCSV } from "@/lib/exportTable";
import type { WorkOrder, Project } from "@shared/schema";
import { format } from "date-fns";

// Default column configuration for work orders
const defaultColumns: ColumnConfig[] = [
  createIdColumn('orderNumber', 'Order Number'),
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
      <span data-testid={`text-title-${row.id}`} className="font-medium">{value}</span>
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
      const getStatusStyle = (status: string): { bg: string; text: string; border: string } => {
        switch (status) {
          case "completed": return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" };
          case "in-progress": return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" };
          case "pending": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
          case "cancelled": return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" };
          default: return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
        }
      };
      const style = getStatusStyle(value || "pending");
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`} data-testid={`badge-status-${row.id}`}>
          {value || "pending"}
        </span>
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

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
    refetchOnMount: 'always',
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Enhanced data with project names and employee names
  const enhancedWorkOrders = React.useMemo(() => {
    return workOrders.map(order => {
      const project = projects.find(p => p.id === order.projectId);
      const emp = (employees as any[]).find((e: any) => e.id === order.assignedTo);
      return {
        ...order,
        projectName: project?.name || 'No Project',
        assignedTo: emp ? `${emp.firstName} ${emp.lastName}` : order.assignedTo
      };
    });
  }, [workOrders, projects, employees]);

  const del = useEntityDelete<WorkOrder>({
    endpoint: '/api/work-orders',
    queryKeys: ['/api/work-orders'],
    entityLabel: 'Work Order',
    checkUsages: false,
    getName: (row) => row.orderNumber || row.title
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
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-work-order',
        name: 'New Work Order',
        formType: 'work-order'
      }
    }));
  };

  const handleDuplicateWorkOrder = React.useCallback(async (workOrder: WorkOrder) => {
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const { id, orderNumber, createdAt, updatedAt, ...duplicateData } = data;
      const response = await apiRequest("POST", "/api/work-orders", {
        ...duplicateData,
        title: `${duplicateData.title || ''} (Copy)`,
        status: 'pending',
      });
      const copy = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "Werkbon gedupliceerd", description: `Kopie aangemaakt: ${copy.orderNumber}` });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `edit-work-order-${copy.id}`,
          name: `${copy.orderNumber}`,
          formType: 'work-order',
          parentId: copy.id
        }
      }));
    } catch {
      toast({ title: "Fout", description: "Dupliceren mislukt.", variant: "destructive" });
    }
  }, [toast]);

  const [printDialogOpen, setPrintDialogOpen] = React.useState(false);
  const [printWorkOrderId, setPrintWorkOrderId] = React.useState<string | undefined>();

  const handlePrintWorkOrder = React.useCallback((workOrder: WorkOrder) => {
    setPrintWorkOrderId(workOrder.id);
    setPrintDialogOpen(true);
  }, []);

  const handleToggleAllRows = () => {
    const allRowIds = enhancedWorkOrders.map(order => order.id);
    tableState.toggleAllRows(allRowIds);
  };

  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={enhancedWorkOrders}
        isLoading={isLoading}
        tableKey="work-orders"
        getRowId={(order: any) => order.id}
        
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
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enhancedWorkOrders),
          itemCount: tableState.selectedRows.length
        }}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        
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
            onClick: () => del.handleDeleteRow(row),
            variant: 'destructive' as const
          }
        ]}
        
        // Events
        onRowDoubleClick={handleRowDoubleClick}
        
        // Display options
        entityName="Work Order"
        entityNamePlural="Work Orders"
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}