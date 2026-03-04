import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Box, Truck, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import type { PackingList, Customer, Invoice, Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

// Default column configuration for packing lists
const defaultColumns: ColumnConfig[] = [
  createIdColumn('packingNumber', 'Packing Number'),
  { 
    key: 'customerName', 
    label: 'Customer', 
    visible: true, 
    width: 180, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PackingList & { customerName?: string }) => (
      <span data-testid={`text-customer-${row.id}`}>{value || "Unknown Customer"}</span>
    )
  },
  { 
    key: 'invoiceNumber', 
    label: 'Invoice Number', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PackingList & { invoiceNumber?: string }) => (
      <span data-testid={`text-invoice-${row.id}`}>{value || "—"}</span>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PackingList) => (
      <Badge variant={value === 'Shipped' ? 'default' : value === 'Packed' ? 'secondary' : 'outline'} data-testid={`badge-status-${row.id}`}>
        {value || 'Unknown'}
      </Badge>
    )
  },
  { 
    key: 'shippingDate', 
    label: 'Shipping Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: PackingList) => (
      <div className="flex items-center space-x-2" data-testid={`text-shipping-date-${row.id}`}>
        {value ? (
          <>
            <Truck size={14} />
            <span>{format(new Date(value), "MMM dd, yyyy")}</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>
    )
  },
];

export default function PackingLists() {
  const { toast } = useToast();

  // Optimized data fetching with stable loading state
  const { data: packingLists = [], isLoading: packingLoading } = useQuery<PackingList[]>({
    queryKey: ["/api/packing-lists"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    staleTime: 60000,
    gcTime: 600000,
  });

  // Combined loading state
  const isLoading = packingLoading || customersLoading || invoicesLoading;

  // Lookup functions - memoized to prevent re-creation
  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  const getInvoiceNumber = React.useCallback((invoiceId: string) => {
    const invoice = invoices?.find((i: Invoice) => i.id === invoiceId);
    return invoice?.invoiceNumber || '';
  }, [invoices]);

  // Enhanced data with related names - stabilized with useMemo
  const enhancedPackingLists = React.useMemo(() => {
    return packingLists.map(list => ({
      ...list,
      customerName: getCustomerName(list.customerId || ''),
      invoiceNumber: getInvoiceNumber(list.invoiceId || '')
    }));
  }, [packingLists, getCustomerName, getInvoiceNumber]);

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'createdAt', direction: 'desc' },
    tableKey: 'packing-lists'
  });

  const del = useEntityDelete<PackingList>({
    endpoint: '/api/packing-lists',
    queryKeys: ['/api/packing-lists'],
    entityLabel: 'Packing List',
    checkUsages: false,
    getName: (row) => row.packingNumber
  });

  const handleEdit = (packingList: PackingList) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-packing-list-${packingList.id}`,
        name: `${packingList.packingNumber}`,
        formType: 'packing-list',
        parentId: packingList.id
      }
    }));
  };

  const handleRowDoubleClick = (packingList: PackingList) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-packing-list-${packingList.id}`,
        name: `${packingList.packingNumber}`,
        formType: 'packing-list',
        parentId: packingList.id
      }
    }));
  };

  const handleNewPackingList = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-packing-list',
        name: 'New Packing List',
        formType: 'packing-list'
      }
    }));
  };

  const handleToggleAllRows = () => {
    const allRowIds = enhancedPackingLists.map(list => list.id);
    tableState.toggleAllRows(allRowIds);
  };


  return (
    <div className="p-6">
      <DataTableLayout
        // Data
        data={enhancedPackingLists}
        isLoading={isLoading}
        tableKey="packing-lists"
        getRowId={(list) => list.id}
        
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
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enhancedPackingLists),
          itemCount: tableState.selectedRows.length
        }}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        
        // Actions
        headerActions={[
          {
            key: 'add-packing-list',
            label: 'Add Packing List',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewPackingList,
            variant: 'default' as const
          }
        ]}
        
        rowActions={(row: PackingList) => [
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
        entityName="Packing List"
        entityNamePlural="Packing Lists"
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}