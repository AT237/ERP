import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Invoice, Customer } from "@shared/schema";
import { format } from "date-fns";

interface InvoicesProps {}

export default function Invoices({}: InvoicesProps) {
  const { toast } = useToast();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const isLoading = invoicesLoading || customersLoading;

  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  const baseColumns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('invoiceNumber', 'Invoice Number'),
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
      key: 'invoiceDate', 
      label: 'Invoice Date', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'dueDate', 
      label: 'Due Date', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    createCurrencyColumn('totalAmount', 'Total Amount'),
    createCurrencyColumn('paidAmount', 'Paid Amount'),
    { 
      key: 'status', 
      label: 'Status', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case "paid": return "default";
            case "pending": return "secondary";
            case "overdue": return "destructive";
            case "cancelled": return "outline";
            default: return "secondary";
          }
        };
        return (
          <Badge variant={getStatusVariant(value || "pending")}>
            {value || 'pending'}
          </Badge>
        );
      }
    },
  ], [getCustomerName]);

  const defaultColumns = baseColumns;

  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'invoices'
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleAddInvoice = React.useCallback(() => {
    const formInfo = {
      id: 'new-invoice',
      name: 'New Invoice',
      formType: 'invoice',
      parentId: 'invoices'
    };
    
    try {
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      console.error('Failed to open invoice form via tab system:', error);
      toast({
        title: "Error",
        description: "Failed to open invoice form",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleEditInvoice = React.useCallback((invoice: Invoice) => {
    const formInfo = {
      id: `edit-invoice-${invoice.id}`,
      name: `Edit ${invoice.invoiceNumber}`,
      formType: 'invoice',
      parentId: invoice.id
    };
    
    try {
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      console.error('Failed to open invoice edit form via tab system:', error);
      toast({
        title: "Error",
        description: "Failed to open invoice form",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleViewInvoice = React.useCallback((invoice: Invoice) => {
    const formInfo = {
      id: `view-invoice-${invoice.id}`,
      name: `View ${invoice.invoiceNumber}`,
      formType: 'invoice',
      parentId: invoice.id
    };
    
    try {
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      console.error('Failed to open invoice via tab system:', error);
      toast({
        title: "Error",
        description: "Failed to open invoice view",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDeleteInvoice = React.useCallback((invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  }, [deleteInvoiceMutation]);

  return (
    <div className="p-6">
      <DataTableLayout
        data={invoices}
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
          const allIds = invoices.map(invoice => invoice.id);
          tableState.toggleAllRows(allIds);
        }, [invoices, tableState.toggleAllRows])}
        onRowDoubleClick={handleViewInvoice}
        getRowId={(invoice: Invoice) => invoice.id}
        entityName="Invoice"
        entityNamePlural="Invoices"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={React.useMemo(() => [{
          key: 'add',
          label: 'Add Invoice',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleAddInvoice,
          variant: 'default'
        }], [handleAddInvoice])}
        rowActions={React.useCallback((invoice: Invoice) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleViewInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDeleteInvoice(invoice),
            variant: 'destructive' as const
          }
        ], [handleViewInvoice, handleEditInvoice, handleDeleteInvoice])}
      />
    </div>
  );
}
