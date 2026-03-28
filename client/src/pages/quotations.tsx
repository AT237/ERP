import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Printer, Mail, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { PrintLayoutDialog } from "@/components/layouts/PrintLayoutDialog";
import { exportTableToCSV } from "@/lib/exportTable";
import type { Quotation, Customer } from "@shared/schema";
import { format } from "date-fns";


interface QuotationsProps {}

export default function Quotations({}: QuotationsProps) {
  const { toast } = useToast();

  // Optimized data fetching with stable loading state
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    refetchOnMount: 'always',
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000, // Customers change less frequently
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  // Combined loading state to prevent partial renders
  const isLoading = quotationsLoading || customersLoading;

  // Pre-enrich quotations with resolved customer names (stable, no renderCell dependency)
  const enrichedQuotations = React.useMemo(() => {
    return quotations.map(q => ({
      ...q,
      customerName: customers.find((c: Customer) => c.id === q.customerId)?.name || '',
      quotationDateFormatted: q.quotationDate ? format(new Date(q.quotationDate), 'dd-MM-yyyy') : '',
      validUntilFormatted: (q as any).validUntil ? format(new Date((q as any).validUntil), 'dd-MM-yyyy') : '',
      totalAmountFormatted: `€${q.totalAmount || "0.00"}`,
    }));
  }, [quotations, customers]);

  // Stable column configuration - no renderCell closures, uses pre-resolved fields
  const defaultColumns: ColumnConfig[] = React.useMemo(() => [
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
    },
    { 
      key: 'quotationDateFormatted', 
      label: 'Quotation Date', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
    },
    { 
      key: 'validUntilFormatted', 
      label: 'Valid Until', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
    },
    { 
      key: 'totalAmountFormatted', 
      label: 'Total Amount', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
    },
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
            case "draft": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
            case "sent": return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" };
            case "accepted": case "approved": return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" };
            case "rejected": case "declined": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
            case "expired": return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" };
            default: return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
          }
        };
        const style = getStatusStyle(value || "draft");
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
            {value || 'draft'}
          </span>
        );
      }
    },
    { 
      key: 'revisionNumber', 
      label: 'Revision', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true 
    },
  ], []); // Stable - no dependencies

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
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `edit-quotation-${copy.id}`,
          name: `Edit ${copy.quotationNumber}`,
          formType: 'quotation',
          parentId: copy.id
        }
      }));
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
        onRowDoubleClick={handleViewQuotation}
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
              key: 'duplicate',
              label: 'Dupliceren',
              icon: <CopyPlus className="h-4 w-4" />,
              onClick: () => selectedQuotation && handleDuplicateQuotation(selectedQuotation),
              disabled: !selectedQuotation,
            },
            {
              key: 'add',
              label: 'Add Quotation',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleAddQuotation,
            },
          ];
        }, [handleAddQuotation, handleDuplicateQuotation, tableState.selectedRows, enrichedQuotations, handlePrintQuotation])}
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
        ], [handleViewQuotation, handleEditQuotation, handlePrintQuotation, handleDuplicateQuotation, del.handleDeleteRow])}
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