import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableLayout, ColumnConfig, createIdColumn } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import { useEntityDelete } from "@/hooks/useEntityDelete";
import type { EmailTemplate } from "@shared/schema";

const TEMPLATE_TYPES: Record<string, string> = {
  invoice: "Factuur",
  quotation: "Offerte",
  purchase_order: "Inkooporder",
  packing_list: "Paklijst",
  work_order: "Werkbon",
  general: "Algemeen",
};

const defaultColumns: ColumnConfig[] = [
  createIdColumn("id", "ID"),
  {
    key: "name",
    label: "Naam",
    visible: true,
    width: 220,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => <span className="font-medium">{value}</span>,
  },
  {
    key: "templateType",
    label: "Type",
    visible: true,
    width: 140,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <Badge variant="outline">{TEMPLATE_TYPES[value] ?? value}</Badge>
    ),
  },
  {
    key: "subject",
    label: "Onderwerp",
    visible: true,
    width: 300,
    filterable: true,
    sortable: false,
    renderCell: (value: string) => (
      <span className="text-sm text-muted-foreground truncate block max-w-xs" title={value}>
        {value && value.length > 60 ? `${value.substring(0, 60)}…` : value}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Aangemaakt",
    visible: true,
    width: 120,
    filterable: false,
    sortable: true,
    renderCell: (value: string | Date) =>
      value ? new Date(value).toLocaleDateString("nl-NL") : "",
  },
];

export default function EmailTemplatesTable() {
  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    refetchOnMount: 'always',
    staleTime: 30000,
    gcTime: 300000,
  });

  const tableState = useDataTable({ defaultColumns, tableKey: "email-templates" });

  const del = useEntityDelete<EmailTemplate>({
    endpoint: "/api/email-templates",
    queryKeys: ["/api/email-templates"],
    entityLabel: "E-mailtemplate",
    checkUsages: false,
    getName: (row) => row.name || "",
  });

  const openForm = (id?: string) => {
    window.dispatchEvent(
      new CustomEvent("open-form-tab", {
        detail: {
          id: id ? `email-template-${id}` : "new-email-template",
          name: id ? "E-mailtemplate bewerken" : "Nieuw e-mailtemplate",
          formType: "email-template",
          parentId: id,
        },
      })
    );
  };

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="E-mailtemplate"
        entityNamePlural="E-mailtemplates"
        data={templates}
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
        onToggleAllRows={() =>
          tableState.toggleAllRows(templates.map((t) => t.id))
        }
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, templates),
          itemCount: tableState.selectedRows.length,
        }}
        onRowDoubleClick={(row: EmailTemplate) => openForm(row.id)}
        getRowId={(row: EmailTemplate) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: "add",
            label: "Nieuw template",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openForm(),
            variant: "default" as const,
          },
        ]}
        rowActions={(row: EmailTemplate) => [
          {
            key: "edit",
            label: "Bewerken",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => openForm(row.id),
          },
          {
            key: "delete",
            label: "Verwijderen",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(row),
            className: "text-red-600 hover:text-red-700",
          },
        ]}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
