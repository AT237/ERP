import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import { useEntityDelete } from "@/hooks/useEntityDelete";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    renderCell: (v: string) => <span className="font-mono text-xs font-semibold text-orange-600">{v}</span>,
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
    renderCell: (v: string) => <span className="text-xs text-slate-500">{v || ""}</span>,
  },
  {
    key: "isActiveLabel",
    label: "Actief",
    visible: true,
    width: 80,
    filterable: false,
    sortable: true,
    renderCell: (v: string) => (
      <span className={`text-xs font-medium ${v === "Ja" ? "text-green-600" : "text-slate-400"}`}>{v}</span>
    ),
  },
];

// ── form sheet ─────────────────────────────────────────────────────────────

interface FormSheetProps {
  open: boolean;
  onClose: () => void;
  record?: InventoryCategory | null;
}

function CategoryFormSheet({ open, onClose, record }: FormSheetProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!record;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [codeManuallyChanged, setCodeManuallyChanged] = useState(false);

  // Fetch next free code for new records
  const { data: nextCodeData } = useQuery<{ code: string }>({
    queryKey: ["/api/masterdata/inventory-categories/next-code"],
    enabled: open && !isEdit,
    staleTime: 0,
  });

  useEffect(() => {
    if (open) {
      if (isEdit && record) {
        setCode(record.code);
        setName(record.name);
        setDescription(record.description ?? "");
        setIsActive(record.isActive ?? true);
        setCodeManuallyChanged(false);
      } else {
        setCode("");
        setName("");
        setDescription("");
        setIsActive(true);
        setCodeManuallyChanged(false);
      }
    }
  }, [open, isEdit, record]);

  // Auto-fill next code for new records
  useEffect(() => {
    if (!isEdit && nextCodeData?.code && !codeManuallyChanged) {
      setCode(nextCodeData.code);
    }
  }, [nextCodeData, isEdit, codeManuallyChanged]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        isActive,
      };
      if (isEdit) return apiRequest("PUT", `/api/masterdata/inventory-categories/${record!.id}`, payload);
      return apiRequest("POST", "/api/masterdata/inventory-categories", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/masterdata/inventory-categories"] });
      qc.invalidateQueries({ queryKey: ["/api/masterdata/inventory-categories/next-code"] });
      toast({ title: isEdit ? "Categorie bijgewerkt" : "Categorie aangemaakt" });
      onClose();
    },
    onError: (e: any) =>
      toast({ title: "Fout", description: e.message ?? "Opslaan mislukt", variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { toast({ title: "Code is verplicht", variant: "destructive" }); return; }
    if (!name.trim()) { toast({ title: "Naam is verplicht", variant: "destructive" }); return; }
    mutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b bg-slate-50">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Tag className="h-5 w-5 text-orange-500" />
            {isEdit ? "Categorie bewerken" : "Nieuwe categorie"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            <div className="space-y-1.5">
              <Label>Code <span className="text-red-500">*</span></Label>
              <Input
                value={code}
                onChange={e => { setCode(e.target.value); setCodeManuallyChanged(true); }}
                placeholder="bijv. 001"
                className="font-mono h-10"
                maxLength={10}
                required
              />
              <p className="text-xs text-slate-400">Automatisch ingevuld, handmatig aan te passen.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Naam <span className="text-red-500">*</span></Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="bijv. Elektronica"
                className="h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Omschrijving</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optionele omschrijving..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Checkbox
                id="cat-is-active"
                checked={isActive}
                onCheckedChange={v => setIsActive(!!v)}
              />
              <Label htmlFor="cat-is-active" className="cursor-pointer">Actief</Label>
            </div>

          </div>

          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isEdit ? "Opslaan" : "Aanmaken"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<InventoryCategory | null>(null);

  function openNew() { setEditRecord(null); setSheetOpen(true); }
  function openEdit(r: EnrichedCategory) { setEditRecord(r); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); setEditRecord(null); }

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
            onClick: openNew,
            variant: "default" as const,
          },
        ]}

        rowActions={(r: EnrichedCategory) => [
          {
            key: "edit",
            label: "Bewerken",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => openEdit(r),
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

        onRowDoubleClick={openEdit}
      />

      <CategoryFormSheet open={sheetOpen} onClose={closeSheet} record={editRecord} />
      {del.renderDeleteDialogs()}
    </div>
  );
}
