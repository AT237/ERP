import { useQuery } from "@tanstack/react-query";
import { Printer, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PdfArchiveEntry } from "@shared/schema";
import { DataTableLayout, ColumnConfig } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import { useEntityDelete } from "@/hooks/useEntityDelete";

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Factuur",
  quotation: "Offerte",
  packing_list: "Paklijst",
  "packing-list": "Paklijst",
  work_order: "Werkbon",
  "work-order": "Werkbon",
  purchase_order: "Inkooporder",
  "purchase-order": "Inkooporder",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-700",
  quotation: "bg-green-100 text-green-700",
  packing_list: "bg-purple-100 text-purple-700",
  "packing-list": "bg-purple-100 text-purple-700",
  work_order: "bg-orange-100 text-orange-700",
  "work-order": "bg-orange-100 text-orange-700",
  purchase_order: "bg-gray-100 text-gray-700",
  "purchase-order": "bg-gray-100 text-gray-700",
};

const defaultColumns: ColumnConfig[] = [
  {
    key: "printedAt",
    label: "Datum",
    visible: true,
    width: 150,
    filterable: true,
    sortable: true,
    renderCell: (value: string) =>
      value ? format(new Date(value), "dd-MM-yyyy HH:mm", { locale: nl }) : "—",
  },
  {
    key: "documentType",
    label: "Type",
    visible: true,
    width: 110,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          DOC_TYPE_COLORS[value] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {DOC_TYPE_LABELS[value] ?? value}
      </span>
    ),
  },
  {
    key: "documentNumber",
    label: "Nummer",
    visible: true,
    width: 130,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-mono text-xs font-semibold">{value ?? "—"}</span>
    ),
  },
  {
    key: "customerName",
    label: "Klant",
    visible: true,
    width: 200,
    filterable: true,
    sortable: true,
    renderCell: (value: string) =>
      value ? (
        <span className="font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "projectName",
    label: "Project",
    visible: true,
    width: 180,
    filterable: true,
    sortable: true,
    renderCell: (value: string) =>
      value || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "workOrderNumbers",
    label: "Werkbon nr.",
    visible: true,
    width: 130,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-mono text-xs">
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    key: "layoutName",
    label: "Lay-out",
    visible: true,
    width: 160,
    filterable: true,
    sortable: true,
    renderCell: (value: string) =>
      value || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "notes",
    label: "Notities",
    visible: false,
    width: 200,
    filterable: true,
    sortable: false,
  },
];

export default function PdfArchivePage() {
  const { toast } = useToast();

  const tableState = useDataTable({
    defaultColumns,
    tableKey: "pdf-archive",
  });

  const del = useEntityDelete<PdfArchiveEntry>({
    endpoint: "/api/pdf-archive",
    queryKeys: ["/api/pdf-archive"],
    getName: (row) => row.documentNumber || row.documentType || "PDF",
    entityLabel: "PDF archief entry",
    checkUsages: false,
  });

  const { data: entries = [], isLoading } = useQuery<PdfArchiveEntry[]>({
    queryKey: ["/api/pdf-archive"],
  });

  const handleReprint = (entry: PdfArchiveEntry) => {
    if (entry.printUrl) {
      window.open(entry.printUrl, "_blank");
    } else {
      toast({ title: "Geen URL", description: "Geen print URL beschikbaar.", variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="PDF"
        entityNamePlural="PDF Database"
        data={entries}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        tableKey="pdf-archive"
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
          const allIds = entries.map((e) => e.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={(entry: PdfArchiveEntry) => handleReprint(entry)}
        getRowId={(row: PdfArchiveEntry) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => {
            del.handleBulkDelete(tableState.selectedRows, entries);
            tableState.clearSelection();
          },
          itemCount: tableState.selectedRows.length,
        }}
        headerActions={[]}
        rowActions={(row: PdfArchiveEntry) => [
          {
            key: "reprint",
            label: "Opnieuw printen",
            icon: <Printer className="h-4 w-4" />,
            onClick: () => handleReprint(row),
            variant: "outline" as const,
          },
          {
            key: "delete",
            label: "Verwijderen",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(row),
            variant: "destructive" as const,
          },
        ]}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
