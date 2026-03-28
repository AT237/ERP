import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import { useEntityDelete } from "@/hooks/useEntityDelete";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportTableToCSV } from "@/lib/exportTable";
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

export default function MasterDataCategories() {
  const { toast } = useToast();
  const { data: records = [], isLoading } = useQuery<InventoryCategory[]>({
    queryKey: ["/api/masterdata/inventory-categories"],
  });

  const enriched = records;

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

  const handleDuplicate = async (category: EnrichedCategory) => {
    try {
      const { id, createdAt, updatedAt, ...duplicateData } = category as any;
      const response = await apiRequest("POST", "/api/masterdata/inventory-categories", {
        ...duplicateData,
        code: `${duplicateData.code || ''}-COPY`,
        name: `${duplicateData.name || ''} (Copy)`,
      });
      const copy = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/inventory-categories"] });
      toast({ title: "Categorie gedupliceerd" });
      openTab(copy.id);
    } catch {
      toast({ title: "Fout", description: "Dupliceren mislukt.", variant: "destructive" });
    }
  };

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
        onExport={() => exportTableToCSV(enriched, tableState.columns, 'categorieen')}
        onDuplicate={handleDuplicate}

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
            key: "duplicate",
            label: "Dupliceren",
            icon: <CopyPlus className="h-4 w-4" />,
            onClick: () => handleDuplicate(r),
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
