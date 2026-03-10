import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { DataTableLayout, type ColumnConfig } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import { useEntityDelete } from "@/hooks/useEntityDelete";
import type { InventoryCategory } from "@shared/schema";

// ── columns ────────────────────────────────────────────────────────────────

const defaultColumns: ColumnConfig[] = [
  {
    key: "code",
    label: "Code",
    visible: true,
    width: 100,
    filterable: true,
    sortable: true,
  },
  {
    key: "name",
    label: "Naam",
    visible: true,
    width: 250,
    filterable: true,
    sortable: true,
  },
  {
    key: "description",
    label: "Omschrijving",
    visible: true,
    width: 300,
    filterable: true,
    sortable: false,
  },
  {
    key: "isActiveLabel",
    label: "Actief",
    visible: true,
    width: 80,
    filterable: false,
    sortable: true,
  },
];

// ── helpers ─────────────────────────────────────────────────────────────────

function openTab(id?: string) {
  window.dispatchEvent(new CustomEvent("open-form-tab", {
    detail: {
      id: id ? `edit-masterdata-inventory-categories-${id}` : `new-masterdata-inventory-categories`,
      name: id ? "Categorie bewerken" : "Nieuwe categorie",
      formType: "masterdata-inventory-categories",
      entityId: id,
    },
  }));
}

// ── main page ───────────────────────────────────────────────────────────────

type EnrichedCategory = InventoryCategory & { isActiveLabel: string };

export default function MasterDataCategories() {
  const { data: records = [], isLoading } = useQuery<InventoryCategory[]>({
    queryKey: ["/api/masterdata/inventory-categories"],
  });

  const enriched: EnrichedCategory[] = records.map(r => ({
    ...r,
    isActiveLabel: r.isActive ? "Ja" : "Nee",
  }));

  const tableState = useDataTable({
    defaultColumns,
    defaultSort: { column: "code", direction: "asc" },
    tableKey: "masterdata-categories",
  });

  const del = useEntityDelete<EnrichedCategory>({
    endpoint: "/api/masterdata/inventory-categories",
    queryKeys: ["/api/masterdata/inventory-categories"],
    entityLabel: "Categorie",
    checkUsages: false,
    getName: r => `${r.code} – ${r.name}`,
  });

  const handleToggleAllRows = () => {
    tableState.toggleAllRows(enriched.map(r => r.id));
  };

  return (
    <div className="p-6">
      <DataTableLayout
        data={enriched}
        isLoading={isLoading}
        tableKey="masterdata-categories"
        getRowId={(r: EnrichedCategory) => r.id}

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
        onToggleAllRows={handleToggleAllRows}

        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enriched),
          itemCount: tableState.selectedRows.length,
        }}

        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}

        entityName="Categorie"
        entityNamePlural="Categorieën"

        headerActions={[
          {
            key: "add",
            label: "Toevoegen",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openTab(),
            variant: "default" as const,
          },
        ]}

        rowActions={(r: EnrichedCategory) => [
          {
            key: "edit",
            label: "Bewerken",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => openTab(r.id),
            variant: "outline" as const,
          },
          {
            key: "delete",
            label: "Verwijderen",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(r),
            variant: "destructive" as const,
          },
        ]}

        onRowDoubleClick={(r: EnrichedCategory) => openTab(r.id)}
      />

      {del.renderDeleteDialogs()}
    </div>
  );
}
