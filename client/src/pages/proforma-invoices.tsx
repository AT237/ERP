import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye, Printer, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PrintLayoutDialog } from "@/components/layouts/PrintLayoutDialog";
import { exportTableToCSV } from "@/lib/exportTable";
import type { ProformaInvoice, Customer } from "@shared/schema";
import { format } from "date-fns";

export default function ProformaInvoices() {
  const { toast } = useToast();
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false);
  const [printInvoiceId, setPrintInvoiceId] = React.useState<string | undefined>();

  const handlePrintInvoice = React.useCallback((invoice: ProformaInvoice) => {
    setPrintInvoiceId(invoice.id);
    setPrintDialogOpen(true);
  }, []);

  const { data: proformaInvoices = [], isLoading: invoicesLoading } = useQuery<ProformaInvoice[]>({
    queryKey: ["/api/proforma-invoices"],
    refetchOnMount: 'always',
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
    return proformaInvoices.map(invoice => ({
      ...invoice,
      customerName: getCustomerName(invoice.customerId || ''),
    }));
  }, [proformaInvoices, getCustomerName]);

  const baseColumns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('proformaNumber', 'Proforma Nr.'),
    { 
      key: 'customerName', 
      label: 'Klant', 
      visible: true, 
      width: 200, 
      filterable: true, 
      sortable: true,
    },
    { 
      key: 'description', 
      label: 'Omschrijving', 
      visible: true, 
      width: 250, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value || ''
    },
    { 
      key: 'invoiceDate', 
      label: 'Factuurdatum', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'dueDate', 
      label: 'Vervaldatum', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    createCurrencyColumn('totalAmount', 'Totaalbedrag'),
    createCurrencyColumn('paidAmount', 'Betaald'),
    { 
      key: 'status', 
      label: 'Status', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => {
        const getStatusStyle = (status: string): { bg: string; text: string; border: string } => {
          switch (status) {
            case "concept": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
            case "sent": case "pending": return { bg: "bg-green-100", text: "text-green-600", border: "border-green-300" };
            case "paid": return { bg: "bg-green-200", text: "text-green-800", border: "border-green-500" };
            case "overdue": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
            case "cancelled": return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" };
            default: return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
          }
        };
        const style = getStatusStyle(value || "concept");
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
            {value || 'concept'}
          </span>
        );
      }
    },
  ], []);

  const tableState = useDataTable({ 
    defaultColumns: baseColumns,
    tableKey: 'proforma-invoices',
    data: enrichedInvoices,
  });

  const del = useEntityDelete<ProformaInvoice>({
    endpoint: '/api/proforma-invoices',
    queryKeys: ['/api/proforma-invoices'],
    entityLabel: 'Proforma Factuur',
    checkUsages: false,
    getName: (row) => row.proformaNumber || row.description || ''
  });

  const handleAddInvoice = React.useCallback(() => {
    const formInfo = {
      id: 'new-proforma-invoice',
      name: 'Nieuwe Proforma Factuur',
      formType: 'proforma-invoice',
      parentId: 'proforma-invoices'
    };
    try {
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      toast({ title: "Fout", description: "Kan formulier niet openen", variant: "destructive" });
    }
  }, [toast]);

  const handleEditInvoice = React.useCallback((invoice: ProformaInvoice) => {
    const formInfo = {
      id: `edit-proforma-invoice-${invoice.id}`,
      name: `Bewerk ${invoice.proformaNumber}`,
      formType: 'proforma-invoice',
      parentId: invoice.id
    };
    try {
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      toast({ title: "Fout", description: "Kan formulier niet openen", variant: "destructive" });
    }
  }, [toast]);

  const handleDuplicateInvoice = React.useCallback(async (invoice: ProformaInvoice) => {
    try {
      const response = await apiRequest("POST", `/api/proforma-invoices/${invoice.id}/duplicate`);
      const copy = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      toast({ title: "Proforma factuur gedupliceerd", description: `Kopie aangemaakt: ${copy.proformaNumber}` });
      const formInfo = {
        id: `edit-proforma-invoice-${copy.id}`,
        name: `Bewerk ${copy.proformaNumber}`,
        formType: 'proforma-invoice',
        parentId: copy.id
      };
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch {
      toast({ title: "Fout", description: "Dupliceren mislukt.", variant: "destructive" });
    }
  }, [toast]);

  const handleViewInvoice = React.useCallback((invoice: ProformaInvoice) => {
    const formInfo = {
      id: `view-proforma-invoice-${invoice.id}`,
      name: `Bekijk ${invoice.proformaNumber}`,
      formType: 'proforma-invoice',
      parentId: invoice.id
    };
    try {
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      toast({ title: "Fout", description: "Kan niet openen", variant: "destructive" });
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
        getRowId={(invoice: ProformaInvoice) => invoice.id}
        entityName="Proforma Factuur"
        entityNamePlural="Proforma Facturen"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        onExport={() => exportTableToCSV(enrichedInvoices, tableState.columns, 'proforma-facturen')}
        onDuplicate={handleDuplicateInvoice}
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
              key: 'add',
              label: 'Proforma Factuur Toevoegen',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleAddInvoice,
            },
          ];
        }, [handleAddInvoice, tableState.selectedRows, enrichedInvoices, handlePrintInvoice])}
        rowActions={React.useCallback((invoice: ProformaInvoice) => [
          {
            key: 'view',
            label: 'Bekijken',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleViewInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'edit',
            label: 'Bewerken',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'print',
            label: 'Afdrukken',
            icon: <Printer className="h-4 w-4" />,
            onClick: () => handlePrintInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'duplicate',
            label: 'Dupliceren',
            icon: <CopyPlus className="h-4 w-4" />,
            onClick: () => handleDuplicateInvoice(invoice),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Verwijderen',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(invoice),
            variant: 'destructive' as const
          }
        ], [handleViewInvoice, handleEditInvoice, handlePrintInvoice, handleDuplicateInvoice, del.handleDeleteRow])}
      />
      {del.renderDeleteDialogs()}
      <PrintLayoutDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        documentType="proforma-invoice"
        entityId={printInvoiceId}
      />
    </div>
  );
}
