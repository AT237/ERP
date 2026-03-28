import React from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PrintLayoutDialog } from "@/components/layouts/PrintLayoutDialog";
import { exportTableToCSV } from "@/lib/exportTable";
import type { Quotation, Customer } from "@shared/schema";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Eye, Printer, Mail, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuotationsProps {
  onCreateNew?: (formInfo: {id: string, name: string, formType: string, parentId?: string}) => void;
}

export default function Quotations({ onCreateNew }: QuotationsProps) {
  const { toast } = useToast();

  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    staleTime: 60000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
  });

  const isLoading = quotationsLoading || customersLoading;

  const enrichedQuotations = React.useMemo(() =>
    quotations.map(q => ({
      ...q,
      customerName: customers.find(c => c.id === q.customerId)?.name || 'Unknown',
    })), [quotations, customers]);

  const columns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('quotationNumber', 'Quotation Number'),
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
      key: 'quotationDate', 
      label: 'Quotation Date', 
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
      sortable: true
    },
  ], [customers]);

  const tableState = useDataTable({ 
    defaultColumns: columns,
    tableKey: 'quotations-simple'
  });

  const del = useEntityDelete<Quotation>({
    entityName: 'quotation',
    entityNamePlural: 'quotations',
    apiEndpoint: '/api/quotations',
    queryKey: '/api/quotations',
    getItemId: (q) => q.id,
    getItemName: (q) => q.quotationNumber || 'Quotation',
  });

  const openFormTab = (formInfo: {id: string, name: string, formType: string, parentId?: string}) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
  };

  const handleAdd = () => {
    const formInfo = {
      id: 'new-quotation',
      name: 'New Quotation',
      formType: 'quotation',
      parentId: 'quotations'
    };
    if (onCreateNew) {
      onCreateNew(formInfo);
    } else {
      openFormTab(formInfo);
    }
  };

  const handleView = React.useCallback((quotation: Quotation) => {
    const formInfo = {
      id: `edit-quotation-${quotation.id}`,
      name: `${quotation.quotationNumber} ${quotation.revisionNumber || 'V1.0'}`,
      formType: 'quotation',
      parentId: 'quotations'
    };
    if (onCreateNew) {
      onCreateNew(formInfo);
    } else {
      openFormTab(formInfo);
    }
  }, [onCreateNew]);

  const handleEdit = React.useCallback((quotation: Quotation) => {
    handleView(quotation);
  }, [handleView]);

  const [printDialogOpen, setPrintDialogOpen] = React.useState(false);
  const [printQuotationId, setPrintQuotationId] = React.useState<string | undefined>();

  const handlePrintQuotation = React.useCallback((quotation: Quotation) => {
    setPrintQuotationId(quotation.id);
    setPrintDialogOpen(true);
  }, []);

  const handleDuplicateQuotation = React.useCallback(async (quotation: Quotation) => {
    try {
      const res = await fetch(`/api/quotations/${quotation.id}`);
      if (!res.ok) throw new Error('Failed to fetch quotation');
      const data = await res.json();
      const { id, quotationNumber, createdAt, updatedAt, ...duplicateData } = data;
      const response = await apiRequest("POST", "/api/quotations", {
        ...duplicateData,
        quotationNumber: `${duplicateData.quotationNumber || ''}-COPY`,
        status: 'draft',
      });
      const copy = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Offerte gedupliceerd", description: `Kopie aangemaakt: ${copy.quotationNumber}` });
      openFormTab({
        id: `edit-quotation-${copy.id}`,
        name: `Edit ${copy.quotationNumber}`,
        formType: 'quotation',
        parentId: copy.id
      });
    } catch {
      toast({ title: "Fout", description: "Dupliceren mislukt.", variant: "destructive" });
    }
  }, [toast]);

  return (
    <div className="p-6">
      <DataTableLayout
        data={enrichedQuotations}
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
          const allIds = enrichedQuotations.map(q => q.id);
          tableState.toggleAllRows(allIds);
        }, [enrichedQuotations, tableState.toggleAllRows])}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enrichedQuotations),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleView}
        getRowId={(quotation: Quotation) => quotation.id}
        entityName="Quotation"
        entityNamePlural="Quotations"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        onExport={() => exportTableToCSV(enrichedQuotations, tableState.columns, 'offertes')}
        onDuplicate={handleDuplicateQuotation}
        headerActions={React.useMemo(() => {
          const selectedQuotation = tableState.selectedRows.length === 1
            ? enrichedQuotations.find(q => q.id === tableState.selectedRows[0])
            : undefined;
          return [
            {
              key: 'print',
              label: 'Afdrukken',
              icon: <Printer className="h-4 w-4" />,
              onClick: () => selectedQuotation && handlePrintQuotation(selectedQuotation),
              disabled: !selectedQuotation,
            },
            {
              key: 'email',
              label: 'E-mail versturen',
              icon: <Mail className="h-4 w-4" />,
              onClick: () => {},
              disabled: !selectedQuotation,
            },
            {
              key: 'add',
              label: 'Add Quotation',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleAdd,
            },
          ];
        }, [handleAdd, tableState.selectedRows, enrichedQuotations, handlePrintQuotation])}
        rowActions={React.useCallback((quotation: Quotation) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleView(quotation),
            variant: 'outline' as const
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(quotation),
            variant: 'outline' as const
          },
          {
            key: 'print',
            label: 'Print',
            icon: <Printer className="h-4 w-4" />,
            onClick: () => handlePrintQuotation(quotation),
            variant: 'outline' as const
          },
          {
            key: 'duplicate',
            label: 'Dupliceren',
            icon: <CopyPlus className="h-4 w-4" />,
            onClick: () => handleDuplicateQuotation(quotation),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(quotation),
            variant: 'destructive' as const
          }
        ], [handleView, handleEdit, handlePrintQuotation, handleDuplicateQuotation, del.handleDeleteRow])}
      />
      {del.renderDeleteDialogs()}
      <PrintLayoutDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        documentType="quotation"
        entityId={printQuotationId}
      />
    </div>
  );
}
