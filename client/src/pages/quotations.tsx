import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import type { Quotation, Customer } from "@shared/schema";
import { format } from "date-fns";


interface QuotationsProps {}

export default function Quotations({}: QuotationsProps) {
  const { toast } = useToast();

  // Optimized data fetching with stable loading state
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    staleTime: 30000, // Prevent refetch for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000, // Customers change less frequently
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  // Combined loading state to prevent partial renders
  const isLoading = quotationsLoading || customersLoading;

  // Customer name lookup - memoized to prevent re-creation
  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  // Stabilized column configuration for quotations table - prevents flicker  
  const baseColumns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('quotationNumber', 'Quotation Number'),
    { 
      key: 'customerId', 
      label: 'Customer', 
      visible: true, 
      width: 200, 
      filterable: true, 
      sortable: true,
      renderCell: getCustomerName
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
      key: 'quotationDate', 
      label: 'Quotation Date', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'validUntil', 
      label: 'Valid Until', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'totalAmount', 
      label: 'Total Amount', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => `€${value || "0.00"}`
    },
    { 
      key: 'status', 
      label: 'Status', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => (
        <Badge variant={value === 'draft' ? 'secondary' : value === 'sent' ? 'default' : 'outline'}>
          {value || 'draft'}
        </Badge>
      )
    },
    { 
      key: 'revisionNumber', 
      label: 'Revision', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true 
    },
  ], [getCustomerName]); // Stable dependency

  // Use base columns directly - no need for additional processing
  const defaultColumns = baseColumns;

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'quotations'
  });

  const del = useEntityDelete<Quotation>({
    endpoint: '/api/quotations',
    queryKeys: ['/api/quotations'],
    entityLabel: 'Quotation',
    checkUsages: false,
    getName: (row) => row.quotationNumber || row.description || ''
  });

  // Event handlers - memoized to prevent flicker
  const handleAddQuotation = React.useCallback(() => {
    const formInfo = {
      id: 'new-quotation',
      name: 'New Quotation',
      formType: 'quotation',
      parentId: 'quotations'
    };
    
    try {
      // Dispatch event to open new quotation form tab
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      console.error('Failed to open quotation form via tab system:', error);
      toast({
        title: "Error",
        description: "Failed to open quotation form",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleEditQuotation = React.useCallback((quotation: Quotation) => {
    const formInfo = {
      id: `edit-quotation-${quotation.id}`,
      name: `Edit ${quotation.quotationNumber}`,
      formType: 'quotation',
      parentId: quotation.id
    };
    
    try {
      // Dispatch event to open quotation edit form tab
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      console.error('Failed to open quotation edit form via tab system:', error);
      toast({
        title: "Error",
        description: "Failed to open quotation form",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleViewQuotation = React.useCallback((quotation: Quotation) => {
    // Primary approach: Use global tab system via event dispatch
    const formInfo = {
      id: `view-quotation-${quotation.id}`,
      name: `View ${quotation.quotationNumber}`,
      formType: 'quotation',
      parentId: quotation.id
    };
    
    try {
      // Dispatch event to open quotation view tab
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      // Log error and show toast if tab system fails
      console.error('Failed to open quotation via tab system:', error);
      toast({
        title: "Error",
        description: "Failed to open quotation view",
        variant: "destructive",
      });
    }
  }, [toast]);






  // Debug removed - component should now be stable

  return (
    <div className="p-6">
      <DataTableLayout
        data={quotations}
        isLoading={isLoading}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
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
        onToggleAllRows={React.useCallback(() => {
          const allIds = quotations.map(quotation => quotation.id);
          tableState.toggleAllRows(allIds);
        }, [quotations, tableState.toggleAllRows])}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, quotations),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleViewQuotation}
        getRowId={(quotation: Quotation) => quotation.id}
        entityName="Quotation"
        entityNamePlural="Quotations"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={React.useMemo(() => [{
          key: 'add',
          label: 'Add Quotation',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleAddQuotation,
          variant: 'default'
        }], [handleAddQuotation])}
        rowActions={React.useCallback((quotation: Quotation) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleViewQuotation(quotation),
            variant: 'outline' as const
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditQuotation(quotation),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(quotation),
            variant: 'destructive' as const
          }
        ], [handleViewQuotation, handleEditQuotation, del.handleDeleteRow])}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}