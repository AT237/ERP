import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { PurchaseOrder, Supplier } from "@shared/schema";
import { format } from "date-fns";

// Default column configuration for purchase orders
const defaultColumns: ColumnConfig[] = [
  createIdColumn('orderNumber', 'Order Number'),
  { 
    key: 'supplierName', 
    label: 'Supplier', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PurchaseOrder & { supplierName?: string }) => (
      <span data-testid={`text-supplier-${row.id}`}>{value || "Unknown Supplier"}</span>
    )
  },
  { 
    key: 'orderDate', 
    label: 'Order Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PurchaseOrder) => (
      <div className="flex items-center space-x-2" data-testid={`text-order-date-${row.id}`}>
        <Calendar size={14} />
        <span>{value ? format(new Date(value), "MMM dd, yyyy") : "-"}</span>
      </div>
    )
  },
  { 
    key: 'expectedDate', 
    label: 'Expected Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PurchaseOrder) => (
      <div className="flex items-center space-x-2" data-testid={`text-expected-date-${row.id}`}>
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
    key: 'totalAmount', 
    label: 'Total Amount', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: number, row: PurchaseOrder) => (
      <div className="flex items-center space-x-2" data-testid={`text-total-${row.id}`}>
        <DollarSign size={14} />
        <span>${value}</span>
      </div>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PurchaseOrder) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "completed": return "default";
          case "received": return "secondary";
          case "pending": return "outline";
          case "cancelled": return "destructive";
          default: return "outline";
        }
      };
      return (
        <Badge variant={getStatusVariant(value || "")} data-testid={`badge-status-${row.id}`}>
          {value}
        </Badge>
      );
    }
  },
];

export default function PurchaseOrders() {
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'orderDate', direction: 'desc' },
    tableKey: 'purchase-orders'
  });

  // Optimized data fetching with stable loading state
  const { data: purchaseOrders = [], isLoading: ordersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  // Combined loading state
  const isLoading = ordersLoading || suppliersLoading;

  // Supplier name lookup - memoized to prevent re-creation
  const getSupplierName = React.useCallback((supplierId: string) => {
    const supplier = suppliers?.find((s: Supplier) => s.id === supplierId);
    return supplier?.name || 'Unknown Supplier';
  }, [suppliers]);

  // Enhanced data with supplier names - stabilized with useMemo
  const enhancedPurchaseOrders = React.useMemo(() => {
    return purchaseOrders.map(order => ({
      ...order,
      supplierName: getSupplierName(order.supplierId || '')
    }));
  }, [purchaseOrders, getSupplierName]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (purchaseOrder: PurchaseOrder) => {
    // Dispatch custom event to open purchase order edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-purchase-order-${purchaseOrder.id}`,
        name: `${purchaseOrder.orderNumber}`,
        formType: 'purchase-order',
        parentId: purchaseOrder.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (purchaseOrder: PurchaseOrder) => {
    // Dispatch custom event to open purchase order edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-purchase-order-${purchaseOrder.id}`,
        name: `${purchaseOrder.orderNumber}`,
        formType: 'purchase-order',
        parentId: purchaseOrder.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleNewPurchaseOrder = () => {
    // Dispatch custom event to open purchase order form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-purchase-order',
        name: 'New Purchase Order',
        formType: 'purchase-order'
      }
    });
    window.dispatchEvent(event);
  };

  const handleToggleAllRows = () => {
    const allRowIds = enhancedPurchaseOrders.map(order => order.id);
    tableState.toggleAllRows(allRowIds);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = (orderIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${orderIds.length} purchase orders?`)) {
      orderIds.forEach(id => deleteMutation.mutate(id));
      tableState.setSelectedRows([]);
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={enhancedPurchaseOrders}
        isLoading={isLoading}
        getRowId={(order) => order.id}
        
        // Table configuration
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        tableKey="purchase-orders"
        
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
            key: 'add-purchase-order',
            label: 'Add Purchase Order',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewPurchaseOrder,
            variant: 'default' as const
          }
        ]}
        
        rowActions={(row: PurchaseOrder) => [
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
        entityName="Purchase Order"
        entityNamePlural="Purchase Orders"
        searchPlaceholder="Search purchase orders..."
      />
    </div>
  );
}