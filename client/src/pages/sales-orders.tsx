import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import type { SalesOrder, Customer } from "@shared/schema";
import { format } from "date-fns";


interface SalesOrdersProps {
  onCreateNew?: (formInfo: {id: string, name: string, formType: string, parentId?: string}) => void;
}

const defaultColumns: ColumnConfig[] = [
  createIdColumn('orderNumber', 'Order Number'),
  { 
    key: 'customerName', 
    label: 'Customer', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder & { customerName?: string }) => (
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
    renderCell: (value: string, row: SalesOrder) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "completed": return "default";
          case "shipped": return "secondary";
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
  { 
    key: 'orderDate', 
    label: 'Order Date', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-order-date-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'expectedDeliveryDate', 
    label: 'Expected Delivery Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-expected-delivery-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'totalAmount', 
    label: 'Total Amount', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-total-amount-${row.id}`}>
        €{parseFloat(value).toFixed(2)}
      </span>
    )
  },
];

export default function SalesOrders({ onCreateNew }: SalesOrdersProps) {
  const { toast } = useToast();

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'orderDate', direction: 'desc' },
    tableKey: 'sales-orders'
  });

  // Data fetching
  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery<SalesOrder[]>({
    queryKey: ["/api/sales-orders"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const isLoading = salesOrdersLoading || customersLoading;

  // Enhance sales orders with customer names for display
  const enhancedSalesOrders = salesOrders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    return {
      ...order,
      customerName: customer?.name || "Unknown Customer"
    };
  });

  const del = useEntityDelete({
    endpoint: '/api/sales-orders',
    queryKeys: ['/api/sales-orders'],
    entityLabel: 'Sales Order',
    checkUsages: false,
    getName: (row) => row.orderNumber || row.soNumber
  });

  const handleEdit = (salesOrder: SalesOrder) => {
    const formInfo = {
      id: `edit-sales-order-${salesOrder.id}`,
      name: `Sales Order ${salesOrder.orderNumber}`,
      formType: 'sales-order',
      parentId: salesOrder.id
    };
    
    if (onCreateNew) {
      onCreateNew(formInfo);
    } else {
      // Fallback to event dispatch if no onCreateNew prop
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    }
  };

  const handleView = (salesOrder: SalesOrder) => {
    // For view-only, we can still use edit form but in read-only mode
    handleEdit(salesOrder);
  };


  const handleNewSalesOrder = () => {
    const formInfo = {
      id: 'new-sales-order',
      name: 'New Sales Order',
      formType: 'sales-order'
    };
    
    if (onCreateNew) {
      onCreateNew(formInfo);
    } else {
      // Fallback to event dispatch if no onCreateNew prop
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    }
  };

  const handleRowDoubleClick = (salesOrder: SalesOrder) => {
    handleView(salesOrder);
  };

  // Apply search and filters using the table state
  const filteredAndSortedSalesOrders = tableState.applySorting(
    tableState.applyFiltersAndSearch(enhancedSalesOrders)
  );

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Sales Order"
        entityNamePlural="Sales Orders"
        data={filteredAndSortedSalesOrders}
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
          const allIds = salesOrders.map(so => so.id);
          tableState.toggleAllRows(allIds);
        }}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enhancedSalesOrders),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: SalesOrder & { customerName?: string }) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-sales-order',
            label: 'Add Sales Order',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewSalesOrder,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: SalesOrder & { customerName?: string }) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleView(row),
            variant: 'outline' as const
          },
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
            variant: 'outline' as const,
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
