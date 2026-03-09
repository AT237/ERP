import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Printer, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { PrintLayoutDialog } from "@/components/layouts/PrintLayoutDialog";
import { InvoiceEmailPanel } from "@/components/layouts/InvoiceEmailPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Invoice, Customer } from "@shared/schema";
import { format } from "date-fns";

interface InvoicesProps {}

export default function Invoices({}: InvoicesProps) {
  const { toast } = useToast();
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false);
  const [printInvoiceId, setPrintInvoiceId] = React.useState<string | undefined>();
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailInvoiceId, setEmailInvoiceId] = React.useState<string | undefined>();

  const handlePrintInvoice = React.useCallback((invoice: Invoice) => {
    setPrintInvoiceId(invoice.id);
    setPrintDialogOpen(true);
  }, []);

  const handleEmailInvoice = React.useCallback((invoice: Invoice) => {
    setEmailInvoiceId(invoice.id);
    setEmailDialogOpen(true);
  }, []);

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
    return customer?.name || '';
  }, [customers]);

  const enrichedInvoices = React.useMemo(() => {
    return invoices.map(invoice => ({
      ...invoice,
      customerName: getCustomerName(invoice.customerId || ''),
    }));
  }, [invoices, getCustomerName]);

  const baseColumns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('invoiceNumber', 'Invoice Number'),
    { 
      key: 'customerName', 
      label: 'Customer', 
      visible: true, 
      width: 200, 
      filterable: true, 
      sortable: true,
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
  ], []);

  const defaultColumns = baseColumns;

  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'invoices'
  });

  const del = useEntityDelete<Invoice>({
    endpoint: '/api/invoices',
    queryKeys: ['/api/invoices'],
    entityLabel: 'Invoice',
    checkUsages: false,
    getName: (row) => row.invoiceNumber || row.description || ''
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


  return (
    <div className="p-6">
      <DataTableLayout
        data={enrichedInvoices}
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
          const allIds = enrichedInvoices.map(invoice => invoice.id);
          tableState.toggleAllRows(allIds);
        }, [enrichedInvoices, tableState.toggleAllRows])}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enrichedInvoices),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleViewInvoice}
        getRowId={(invoice: Invoice) => invoice.id}
        entityName="Invoice"
        entityNamePlural="Invoices"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={React.useMemo(() => {
          const selectedInvoice = tableState.selectedRows.length === 1
            ? enrichedInvoices.find(inv => inv.id === tableState.selectedRows[0])
            : undefined;
          return [
            {
              key: 'print',
              label: 'Afdrukken',
              icon: <Printer className="h-4 w-4" />,
              onClick: () => selectedInvoice && handlePrintInvoice(selectedInvoice),
              disabled: !selectedInvoice,
            },
            {
              key: 'email',
              label: 'E-mail versturen',
              icon: <Mail className="h-4 w-4" />,
              onClick: () => selectedInvoice && handleEmailInvoice(selectedInvoice),
              disabled: !selectedInvoice,
            },
            {
              key: 'add',
              label: 'Add Invoice',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleAddInvoice,
            },
          ];
        }, [handleAddInvoice, tableState.selectedRows, enrichedInvoices, handlePrintInvoice, handleEmailInvoice])}
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
            key: 'print',
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            onClick: () => handlePrintInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'email',
            label: 'E-mail versturen',
            icon: <Mail className="h-4 w-4" />,
            onClick: () => handleEmailInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(invoice),
            variant: 'destructive' as const
          }
        ], [handleViewInvoice, handleEditInvoice, handlePrintInvoice, handleEmailInvoice, del.handleDeleteRow])}
      />
      {del.renderDeleteDialogs()}
      <PrintLayoutDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        documentType="invoice"
        entityId={printInvoiceId}
      />
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Mail className="h-5 w-5" />
              Factuur versturen
            </DialogTitle>
          </DialogHeader>
          {emailInvoiceId && (
            <InvoiceEmailPanel invoiceId={emailInvoiceId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
