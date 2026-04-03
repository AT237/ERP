import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { exportTableToCSV } from '@/lib/exportTable';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { QuotationRequest, Supplier } from "@shared/schema";
import { format } from "date-fns";

const defaultColumns: ColumnConfig[] = [
  createIdColumn('requestNumber', 'Request Number'),
  { 
    key: 'supplierName', 
    label: 'Supplier', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: QuotationRequest & { supplierName?: string }) => (
      <span data-testid={`text-supplier-${row.id}`}>{value || "—"}</span>
    )
  },
  { 
    key: 'title', 
    label: 'Title', 
    visible: true, 
    width: 250, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: QuotationRequest) => (
      <span data-testid={`text-title-${row.id}`}>{value || "—"}</span>
    )
  },
  { 
    key: 'requestDate', 
    label: 'Request Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: QuotationRequest) => (
      <div className="flex items-center space-x-2" data-testid={`text-date-${row.id}`}>
        <Calendar size={14} />
        <span>{value ? format(new Date(value), "dd-MM-yyyy") : "—"}</span>
      </div>
    )
  },
  { 
    key: 'dueDate', 
    label: 'Due Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: QuotationRequest) => (
      <div className="flex items-center space-x-2" data-testid={`text-due-${row.id}`}>
        {value ? (
          <>
            <Calendar size={14} />
            <span>{format(new Date(value), "dd-MM-yyyy")}</span>
          </>
        ) : <span>—</span>}
      </div>
    )
  },
  { 
    key: 'totalAmount', 
    label: 'Total', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: string, row: QuotationRequest) => (
      <span data-testid={`text-total-${row.id}`}>€ {Number(value || 0).toFixed(2)}</span>
    )
  },
  { 
    key: 'priority', 
    label: 'Priority', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => {
      const colors: Record<string, string> = { high: 'destructive', medium: 'outline', low: 'secondary' };
      return <Badge variant={(colors[value || ''] || 'outline') as any}>{value || 'medium'}</Badge>;
    }
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: QuotationRequest) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "approved": return "default";
          case "sent": return "secondary";
          case "concept": return "outline";
          case "pending": return "outline";
          case "rejected": return "destructive";
          case "cancelled": return "destructive";
          case "converted": return "default";
          default: return "outline";
        }
      };
      return (
        <Badge variant={getStatusVariant(value || "")} data-testid={`badge-status-${row.id}`}>
          {value || "concept"}
        </Badge>
      );
    }
  },
];

export default function QuotationRequests() {
  const { toast } = useToast();

  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'requestDate', direction: 'desc' },
    tableKey: 'quotation-requests'
  });

  const { data: quotationRequests = [], isLoading: qrLoading } = useQuery<QuotationRequest[]>({
    queryKey: ["/api/quotation-requests"],
    refetchOnMount: 'always',
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const isLoading = qrLoading || suppliersLoading;

  const getSupplierName = React.useCallback((supplierId: string) => {
    const supplier = suppliers?.find((s: Supplier) => s.id === supplierId);
    return supplier?.name || '';
  }, [suppliers]);

  const enhancedData = React.useMemo(() => {
    return quotationRequests.map(qr => ({
      ...qr,
      supplierName: getSupplierName(qr.supplierId || '')
    }));
  }, [quotationRequests, getSupplierName]);

  const del = useEntityDelete<QuotationRequest>({
    endpoint: '/api/quotation-requests',
    queryKeys: ['/api/quotation-requests'],
    entityLabel: 'Quotation Request',
    checkUsages: false,
    getName: (row) => row.requestNumber
  });

  const handleEdit = (qr: QuotationRequest) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-quotation-request-${qr.id}`,
        name: `${qr.requestNumber}`,
        formType: 'quotation-request',
        parentId: qr.id
      }
    }));
  };

  const handleRowDoubleClick = (qr: QuotationRequest) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-quotation-request-${qr.id}`,
        name: `${qr.requestNumber}`,
        formType: 'quotation-request',
        parentId: qr.id
      }
    }));
  };

  const handleNew = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-quotation-request',
        name: 'New Quotation Request',
        formType: 'quotation-request'
      }
    }));
  };

  const handleDuplicate = async (row: any) => {
    const { id, requestNumber, createdAt, updatedAt, supplierName, ...rest } = row;
    await apiRequest('POST', '/api/quotation-requests', { ...rest, requestNumber: `${requestNumber}-COPY`, title: `${rest.title} (copy)` });
    queryClient.invalidateQueries({ queryKey: ['/api/quotation-requests'] });
  };

  const handleToggleAllRows = () => {
    const allRowIds = enhancedData.map(qr => qr.id);
    tableState.toggleAllRows(allRowIds);
  };

  return (
    <div className="p-6">
      <DataTableLayout
        data={enhancedData}
        isLoading={isLoading}
        getRowId={(qr) => qr.id}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        tableKey="quotation-requests"
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
        onToggleAllRows={handleToggleAllRows}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enhancedData),
          itemCount: tableState.selectedRows.length
        }}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        onExport={() => exportTableToCSV(enhancedData, tableState.columns, 'inkoopoffertes')}
        onDuplicate={handleDuplicate}
        headerActions={[
          {
            key: 'add-quotation-request',
            label: 'Add Quotation Request',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNew,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: QuotationRequest) => [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(row),
            variant: 'outline' as const
          },
          {
            key: 'duplicate',
            label: 'Duplicate',
            icon: <Copy className="h-4 w-4" />,
            onClick: () => handleDuplicate(row),
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
        onRowDoubleClick={handleRowDoubleClick}
        entityName="Quotation Request"
        entityNamePlural="Quotation Requests"
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
