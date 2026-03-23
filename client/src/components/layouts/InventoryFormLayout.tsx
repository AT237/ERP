import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EntitySelect } from "@/components/ui/entity-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Package, Image, Plus, Trash2, Check, X, Layers, AlertCircle, Loader2, Search, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { InventoryItem, InsertInventoryItem, InventoryComponent } from "@shared/schema";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { 
  LayoutForm2, 
  type FormSection2, 
  type FormField2, 
  createFieldRow, 
  createFieldsRow, 
  createSectionHeaderRow,
  createCustomRow,
  createTwoColumnRow,
  type ChangeTrackingConfig 
} from './LayoutForm2';
import type { InfoField } from './InfoHeaderLayout';

const inventoryFormSchema = insertInventoryItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  margin: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

// ── Composite Components Panel ─────────────────────────────────────────────

interface PendingRow {
  tempId: string;
  componentType: "standard" | "unique";
  componentItemId: string;
  componentName: string;
  quantity: string;
  unitPrice: string;
  componentUnit: string;
  notes: string;
}

interface ComponentRowProps {
  component: InventoryComponent;
  inventoryItems: InventoryItem[];
  parentItemId: string;
  onDeleted: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function ComponentRow({ component, inventoryItems, parentItemId, onDeleted, selected, onToggleSelect }: ComponentRowProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(component.quantity ?? "1");
  const [unitPrice, setUnitPrice] = useState(component.unitPrice ?? "0");
  const [notes, setNotes] = useState(component.notes ?? "");
  const [selectedItemId, setSelectedItemId] = useState(component.componentItemId ?? "");
  const [uniqueName, setUniqueName] = useState(component.componentName ?? "");
  const [uniqueUnit, setUniqueUnit] = useState(component.componentUnit ?? "");

  const patchMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest("PATCH", `/api/inventory/${parentItemId}/components/${component.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory", parentItemId, "components"] });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/inventory/${parentItemId}/components/${component.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory", parentItemId, "components"] });
      onDeleted();
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const linkedItem = inventoryItems.find(i => i.id === component.componentItemId);
  const isStandard = component.componentType === "standard";

  const lineTotal = (parseFloat(qty) || 0) * (parseFloat(unitPrice) || 0);

  function saveRow() {
    patchMutation.mutate({
      quantity: qty,
      unitPrice,
      notes,
      ...(isStandard
        ? { componentItemId: selectedItemId }
        : { componentName: uniqueName, componentUnit: uniqueUnit }),
    });
  }

  return (
    <tr className={cn("border-b border-slate-100 hover:bg-slate-50 group", selected && "bg-orange-50/50")}>
      <td className="px-3 py-2 w-10">
        <input
          type="checkbox"
          className="rounded border-gray-300 accent-orange-500 h-4 w-4"
          checked={!!selected}
          onChange={() => onToggleSelect?.()}
        />
      </td>
      <td className="px-3 py-2 w-24">
        <Badge variant="outline" className={cn(
          "text-xs font-medium",
          isStandard
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-purple-50 text-purple-700 border-purple-200"
        )}>
          {isStandard ? "Standaard" : "Uniek"}
        </Badge>
      </td>

      <td className="px-3 py-2">
        {editing ? (
          isStandard ? (
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="h-8 text-sm w-full">
                <SelectValue placeholder="Selecteer artikel..." />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.filter(item => item.id).map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="font-mono text-xs text-slate-500 mr-2">{item.sku}</span>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={uniqueName}
              onChange={e => setUniqueName(e.target.value)}
              placeholder="Naam component..."
              className="h-8 text-sm"
            />
          )
        ) : (
          <span className="text-sm text-slate-700">
            {isStandard
              ? linkedItem
                ? <><span className="font-mono text-xs text-slate-400 mr-2">{linkedItem.sku}</span>{linkedItem.name}</>
                : <span className="text-slate-400 italic">—</span>
              : component.componentName || <span className="text-slate-400 italic">—</span>
            }
          </span>
        )}
      </td>

      <td className="px-3 py-2 w-28">
        {editing ? (
          <Input value={qty} onChange={e => setQty(e.target.value)} className="h-8 text-sm text-right" type="number" min="0" step="0.001" />
        ) : (
          <span className="text-sm text-right block font-mono">{component.quantity}</span>
        )}
      </td>

      <td className="px-3 py-2 w-28">
        {editing && !isStandard ? (
          <Input value={uniqueUnit} onChange={e => setUniqueUnit(e.target.value)} placeholder="stuk, m², kg..." className="h-8 text-sm" />
        ) : (
          <span className="text-sm text-slate-500">
            {isStandard ? (linkedItem?.unit ?? "") : (component.componentUnit ?? "")}
          </span>
        )}
      </td>

      <td className="px-3 py-2 w-28">
        {editing ? (
          <Input value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-8 text-sm text-right" type="number" min="0" step="0.01" />
        ) : (
          <span className="text-sm text-right block font-mono">€ {parseFloat(component.unitPrice ?? "0").toFixed(2)}</span>
        )}
      </td>

      <td className="px-3 py-2 w-28">
        <span className="text-sm text-right block font-mono font-medium">
          € {(editing ? lineTotal : (parseFloat(component.quantity ?? "0") * parseFloat(component.unitPrice ?? "0"))).toFixed(2)}
        </span>
      </td>

      <td className="px-3 py-2">
        {editing ? (
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionele notitie..." className="h-8 text-sm" />
        ) : (
          <span className="text-sm text-slate-500">{component.notes ?? ""}</span>
        )}
      </td>

      <td className="px-3 py-2 w-20 text-right">
        {editing ? (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={saveRow}
              disabled={patchMutation.isPending}
              className="p-1 rounded hover:bg-green-100 text-green-600"
              title="Opslaan"
            >
              {patchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400" title="Annuleren">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
            >
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

interface CompositeComponentsPanelProps {
  parentItemId: string;
  onCostPriceChanged?: (total: number) => void;
}

function CompositeComponentsPanel({ parentItemId, onCostPriceChanged }: CompositeComponentsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: components = [], isLoading } = useQuery<InventoryComponent[]>({
    queryKey: ["/api/inventory", parentItemId, "components"],
    queryFn: () => fetch(`/api/inventory/${parentItemId}/components`).then(r => r.json()),
    enabled: !!parentItemId,
  });

  const { data: allInventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 30000,
  });

  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const totalCostPrice = [
    ...components.map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0"))),
    ...pendingRows.map(r => (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0)),
  ].reduce((sum, v) => sum + v, 0);

  useEffect(() => {
    if (onCostPriceChanged) {
      const savedTotal = components
        .map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0")))
        .reduce((sum, v) => sum + v, 0);
      onCostPriceChanged(savedTotal);
    }
  }, [components, onCostPriceChanged]);

  function addRow(type: "standard" | "unique") {
    setPendingRows(prev => [...prev, {
      tempId: `temp-${Date.now()}`,
      componentType: type,
      componentItemId: "",
      componentName: "",
      quantity: "1",
      unitPrice: "0",
      componentUnit: "",
      notes: "",
    }]);
  }

  const createMutation = useMutation({
    mutationFn: (row: PendingRow) => {
      const payload: Record<string, any> = {
        componentType: row.componentType,
        quantity: row.quantity,
        unitPrice: row.unitPrice || "0",
        notes: row.notes || null,
        sortOrder: components.length + pendingRows.indexOf(row),
      };
      if (row.componentType === "standard") {
        payload.componentItemId = row.componentItemId || null;
      } else {
        payload.componentName = row.componentName;
        payload.componentUnit = row.componentUnit || null;
      }
      return apiRequest("POST", `/api/inventory/${parentItemId}/components`, payload);
    },
    onSuccess: (_data, row) => {
      qc.invalidateQueries({ queryKey: ["/api/inventory", parentItemId, "components"] });
      setPendingRows(prev => prev.filter(r => r.tempId !== row.tempId));
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  function updatePending(tempId: string, field: keyof PendingRow, value: string) {
    setPendingRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: value } : r));
  }

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await apiRequest("DELETE", `/api/inventory/${parentItemId}/components/${id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory", parentItemId, "components"] });
      setSelectedRows([]);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const comp = components.find(c => c.id === id);
      if (!comp) return;
      const payload: Record<string, any> = {
        componentType: comp.componentType,
        quantity: comp.quantity,
        unitPrice: comp.unitPrice || "0",
        notes: comp.notes || null,
        sortOrder: components.length,
        componentItemId: comp.componentItemId || null,
        componentName: comp.componentName || null,
        componentUnit: comp.componentUnit || null,
      };
      return apiRequest("POST", `/api/inventory/${parentItemId}/components`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/inventory", parentItemId, "components"] });
      setSelectedRows([]);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  function savePending(row: PendingRow) {
    if (row.componentType === "standard" && !row.componentItemId) {
      toast({ title: "Selecteer een artikel", variant: "destructive" });
      return;
    }
    if (row.componentType === "unique" && !row.componentName.trim()) {
      toast({ title: "Vul een naam in", variant: "destructive" });
      return;
    }
    createMutation.mutate(row);
  }

  function toggleRowSelection(id: string) {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  const filteredComponents = searchTerm
    ? components.filter(c => {
        const linked = allInventoryItems.find(i => i.id === c.componentItemId);
        const name = c.componentType === "standard" ? (linked?.name ?? "") : (c.componentName ?? "");
        const sku = linked?.sku ?? "";
        const term = searchTerm.toLowerCase();
        return name.toLowerCase().includes(term) || sku.toLowerCase().includes(term);
      })
    : components;

  const hasSelection = selectedRows.length > 0;
  const hasSingleSelection = selectedRows.length === 1;

  return (
    <div className="px-6 mb-6 mt-0 w-full overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 flex items-center gap-1 mb-3">
        {showSearch ? (
          <div className="relative">
            <Input
              placeholder="Zoek onderdeel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm w-48"
              autoFocus
              onBlur={() => { if (!searchTerm) setShowSearch(false); }}
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-orange-500" size={14} />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 ring-1 ring-orange-400 text-orange-600"
            onClick={() => setShowSearch(true)}
            title="Zoeken"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        <Separator orientation="vertical" className="h-6 mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ring-1 ring-orange-400 text-orange-600"
              title="Onderdeel toevoegen"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addRow("standard")} className="text-xs">
              Standaard artikel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addRow("unique")} className="text-xs">
              Uniek artikel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${hasSingleSelection ? 'ring-1 ring-orange-400 text-orange-600' : 'opacity-30'}`}
          onClick={() => { if (hasSingleSelection) duplicateMutation.mutate(selectedRows[0]); }}
          disabled={!hasSingleSelection || duplicateMutation.isPending}
          title="Dupliceren"
        >
          <CopyPlus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${hasSelection ? 'ring-1 ring-orange-400 text-orange-600' : 'opacity-30'}`}
          onClick={() => { if (hasSelection) deleteManyMutation.mutate(selectedRows); }}
          disabled={!hasSelection || deleteManyMutation.isPending}
          title="Verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Laden…</span>
          </div>
        ) : components.length === 0 && pendingRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <p className="text-sm text-slate-500">Nog geen onderdelen</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 accent-orange-500 h-4 w-4"
                    checked={filteredComponents.length > 0 && selectedRows.length === filteredComponents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(filteredComponents.map(c => c.id));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Artikel / Naam</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Hoev.</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Eenheid</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Inkoopprijs</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Regeltotaal</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notities</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredComponents.map(c => (
                <ComponentRow
                  key={c.id}
                  component={c}
                  inventoryItems={allInventoryItems}
                  parentItemId={parentItemId}
                  onDeleted={() => {}}
                  selected={selectedRows.includes(c.id)}
                  onToggleSelect={() => toggleRowSelection(c.id)}
                />
              ))}

              {/* pending (new) rows */}
              {pendingRows.map(row => (
                <tr key={row.tempId} className="border-b border-orange-100 bg-orange-50/40">
                  <td className="px-3 py-2 w-10" />
                  <td className="px-3 py-2 w-24">
                    <Badge variant="outline" className={cn(
                      "text-xs font-medium",
                      row.componentType === "standard"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    )}>
                      {row.componentType === "standard" ? "Standaard" : "Uniek"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {row.componentType === "standard" ? (
                      <Select value={row.componentItemId} onValueChange={v => {
                        const selectedItem = allInventoryItems.find(i => i.id === v);
                        setPendingRows(prev => prev.map(r => r.tempId === row.tempId ? {
                          ...r,
                          componentItemId: v,
                          unitPrice: selectedItem?.costPrice ?? r.unitPrice,
                        } : r));
                      }}>
                        <SelectTrigger className="h-8 text-sm w-full bg-white">
                          <SelectValue placeholder="Selecteer artikel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allInventoryItems.filter(item => item.id).map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              <span className="font-mono text-xs text-slate-500 mr-2">{item.sku}</span>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={row.componentName}
                        onChange={e => updatePending(row.tempId, "componentName", e.target.value)}
                        placeholder="Naam component..."
                        className="h-8 text-sm bg-white"
                        autoFocus
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 w-28">
                    <Input
                      value={row.quantity}
                      onChange={e => updatePending(row.tempId, "quantity", e.target.value)}
                      type="number" min="0" step="0.001"
                      className="h-8 text-sm text-right bg-white"
                    />
                  </td>
                  <td className="px-3 py-2 w-28">
                    {row.componentType === "unique" ? (
                      <Input
                        value={row.componentUnit}
                        onChange={e => updatePending(row.tempId, "componentUnit", e.target.value)}
                        placeholder="stuk, kg..."
                        className="h-8 text-sm bg-white"
                      />
                    ) : (
                      <span className="text-sm text-slate-400 italic">auto</span>
                    )}
                  </td>
                  <td className="px-3 py-2 w-28">
                    <Input
                      value={row.unitPrice}
                      onChange={e => updatePending(row.tempId, "unitPrice", e.target.value)}
                      type="number" min="0" step="0.01"
                      className="h-8 text-sm text-right bg-white"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 w-28">
                    <span className="text-sm text-right block font-mono font-medium">
                      € {((parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0)).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.notes}
                      onChange={e => updatePending(row.tempId, "notes", e.target.value)}
                      placeholder="Optionele notitie..."
                      className="h-8 text-sm bg-white"
                    />
                  </td>
                  <td className="px-3 py-2 w-20">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => savePending(row)}
                        disabled={createMutation.isPending}
                        className="p-1 rounded hover:bg-green-100 text-green-600"
                        title="Opslaan"
                      >
                        {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setPendingRows(prev => prev.filter(r => r.tempId !== row.tempId))}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400"
                        title="Annuleren"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {(components.length > 0 || pendingRows.length > 0) && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={6} className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Totaal kostprijs
                  </td>
                  <td className="px-3 py-2.5 w-28">
                    <span className="text-sm text-right block font-mono font-bold text-orange-700">
                      € {totalCostPrice.toFixed(2)}
                    </span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}

interface InventoryFormLayoutProps {
  onSave: () => void;
  inventoryId?: string;
  parentId?: string;
}

export function InventoryFormLayout({ onSave, inventoryId, parentId }: InventoryFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<InventoryFormData>({} as InventoryFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>(["", "", "", ""]);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    sku: { label: "Artikelcode (SKU)" },
    name: { label: "Productnaam" },
    unitPrice: { label: "Verkoopprijs" },
    costPrice: { label: "Kostprijs" },
  });
  const [currentInventoryId, setCurrentInventoryId] = useState<string | undefined>(inventoryId);
  const isEditing = !!currentInventoryId;

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      category: "",
      unitPrice: "",
      costPrice: "",
      margin: "",
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      unit: "",
      location: "",
      barcode: "",
      isComposite: false,
      status: "active",
      image: "",
      image2: "",
      image3: "",
      image4: "",
      brand: "",
      manufacturerPartNumber: "",
      hsCode: "",
    },
  });

  const categoryValue = form.watch("category");
  const watchedIsComposite = form.watch("isComposite");

  // Load inventory item data if editing
  const { data: inventoryItem, isLoading: isLoadingInventory } = useQuery<InventoryItem>({
    queryKey: ["/api/inventory", inventoryId],
    enabled: !!inventoryId,
  });

  // Fetch next free SKU for new items
  const { data: nextSkuData } = useQuery<{ sku: string }>({
    queryKey: ["/api/inventory/next-sku"],
    enabled: !inventoryId,
    staleTime: 0,
  });

  // Auto-fill next free SKU when creating a new item
  useEffect(() => {
    if (!inventoryId && nextSkuData?.sku) {
      form.setValue("sku", nextSkuData.sku);
    }
  }, [nextSkuData, inventoryId, form]);

  // Update form when inventory data loads
  useEffect(() => {
    if (inventoryItem) {
      const formData = {
        sku: inventoryItem.sku || "",
        name: inventoryItem.name || "",
        description: inventoryItem.description || "",
        category: inventoryItem.category || "",
        unitPrice: inventoryItem.unitPrice?.toString() || "",
        costPrice: inventoryItem.costPrice?.toString() || "",
        margin: inventoryItem.margin?.toString() || "",
        currentStock: inventoryItem.currentStock || 0,
        minimumStock: inventoryItem.minimumStock || 0,
        maximumStock: inventoryItem.maximumStock || 0,
        unit: inventoryItem.unit || "",
        location: inventoryItem.location || "",
        barcode: inventoryItem.barcode || "",
        isComposite: inventoryItem.isComposite || false,
        status: inventoryItem.status || "active",
        image: inventoryItem.image || "",
        image2: (inventoryItem as any).image2 || "",
        image3: (inventoryItem as any).image3 || "",
        image4: (inventoryItem as any).image4 || "",
        brand: (inventoryItem as any).brand || "",
        manufacturerPartNumber: (inventoryItem as any).manufacturerPartNumber || "",
        hsCode: (inventoryItem as any).hsCode || "",
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
      
      setImagePreviews([
        inventoryItem.image || "",
        (inventoryItem as any).image2 || "",
        (inventoryItem as any).image3 || "",
        (inventoryItem as any).image4 || "",
      ]);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [inventoryItem, form]);

  // Track which sale-price field the user last edited to determine calculation direction
  const lastSalePriceRef = useRef<'unitPrice' | 'margin'>('unitPrice');
  const isCalculating = useRef(false);

  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (isCalculating.current) return;
      if (name === 'unitPrice') lastSalePriceRef.current = 'unitPrice';
      else if (name === 'margin') lastSalePriceRef.current = 'margin';

      if (name !== 'unitPrice' && name !== 'margin' && name !== 'costPrice') return;

      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
      calcTimerRef.current = setTimeout(() => {
        if (isCalculating.current) return;
        const costPrice = parseFloat(String(values.costPrice || "0").replace(',', '.'));
        if (!costPrice || costPrice <= 0) return;

        isCalculating.current = true;
        try {
          const leading = name === 'unitPrice' ? 'unitPrice'
            : name === 'margin'     ? 'margin'
            : lastSalePriceRef.current;

          if (leading === 'unitPrice') {
            const unitPrice = parseFloat(String(values.unitPrice || "0").replace(',', '.'));
            if (unitPrice > 0) {
              const newMargin = ((unitPrice - costPrice) / costPrice * 100).toFixed(2);
              if (newMargin !== String(values.margin)) {
                form.setValue("margin", newMargin, { shouldDirty: false, shouldValidate: false });
              }
            }
          } else {
            const margin = parseFloat(String(values.margin || "0").replace(',', '.'));
            const newUnitPrice = (costPrice * (1 + margin / 100)).toFixed(2);
            if (newUnitPrice !== String(values.unitPrice)) {
              form.setValue("unitPrice", newUnitPrice, { shouldDirty: false, shouldValidate: false });
            }
          }
        } finally {
          isCalculating.current = false;
        }
      }, 500);
    });

    return () => {
      subscription.unsubscribe();
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current);
    };
  }, [form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = inventoryId ? `edit-inventory-${inventoryId}` : 'new-inventory';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, inventoryId]);

  // Image slot helpers
  const imageFieldNames = ["image", "image2", "image3", "image4"] as const;

  const applyImageToSlot = (slot: number, value: string) => {
    setImagePreviews(prev => {
      const next = [...prev];
      next[slot] = value;
      return next;
    });
    form.setValue(imageFieldNames[slot] as any, value);
  };

  const clearImageSlot = (slot: number) => {
    applyImageToSlot(slot, "");
  };

  const applyFileToSlot = (slot: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      applyImageToSlot(slot, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUploadForSlot = (slot: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) applyFileToSlot(slot, file);
    event.target.value = "";
  };

  const handleDragOver = (slot: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(slot);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
  };

  const handleDrop = (slot: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);

    // 1. File drop (from desktop / file manager)
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        applyFileToSlot(slot, file);
        return;
      }
    }

    // 2. Image dragged from a website (URL)
    const uriList = e.dataTransfer.getData("text/uri-list");
    if (uriList) {
      const url = uriList.split("\n").find(u => u.trim() && !u.startsWith("#"));
      if (url) {
        applyImageToSlot(slot, url.trim());
        return;
      }
    }

    // 3. HTML drag (image inside an <img> tag)
    const html = e.dataTransfer.getData("text/html");
    if (html) {
      const match = html.match(/src=["']([^"']+)["']/);
      if (match?.[1]) {
        applyImageToSlot(slot, match[1]);
        return;
      }
    }

    toast({ title: "Niet ondersteund", description: "Sleep een afbeeldingsbestand of een afbeelding van een website.", variant: "destructive" });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/inventory", data);
      return response.json();
    },
    onSuccess: (newItem) => {
      setCurrentInventoryId(newItem.id);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-inventory', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Inventory item added successfully",
      });
      
      // Dispatch entity-created event for potential auto-selection
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'inventory',
          entity: newItem,
          parentId: parentId
        }
      }));
      
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add inventory item",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/inventory/${currentInventoryId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", currentInventoryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      const tabId = currentInventoryId ? `edit-inventory-${currentInventoryId}` : 'new-inventory';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InventoryFormData) => {
    const transformedData = {
      ...data,
      unitPrice: String(parseFloat(data.unitPrice) || 0),
      costPrice: String(parseFloat(data.costPrice || "0") || 0),
      margin: data.margin != null && data.margin !== "" ? String(parseFloat(data.margin) || 0) : null,
    };
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  // Change tracking configuration
  const changeTrackingConfig: ChangeTrackingConfig = {
    enabled: true,
    suppressTracking: false,
    onChangesDetected: (hasChanges, modifiedFields) => {
      setHasUnsavedChanges(hasChanges);
    }
  };

  // Header fields
  const headerFields: InfoField[] = isEditing && inventoryItem ? [
    { key: 'sku', label: 'SKU', value: inventoryItem.sku || 'N/A' },
    { key: 'status', label: 'Status', value: inventoryItem.status || 'active' },
    { key: 'stock', label: 'Stock', value: inventoryItem.currentStock?.toString() || '0' },
  ] : [];

  const toolbar = useFormToolbar({
    entityType: "inventory",
    entityId: currentInventoryId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Custom image upload component with 4 slots
  const imageUploadComponent = (
    <div className="flex items-start gap-3 flex-wrap">
      {[0, 1, 2, 3].map((slot) => {
        const preview = imagePreviews[slot];
        const isOver = dragOverSlot === slot;
        return (
          <div key={slot} className="flex flex-col items-center gap-1.5">
            {/* If filled: show image + trash button below */}
            {preview ? (
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src={preview}
                  alt={`Afbeelding ${slot + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm cursor-zoom-in"
                  onDoubleClick={() => {
                    const tabId = `image-viewer-${slot}-${inventoryId || "new"}`;
                    (window as any).__imageViewerData = (window as any).__imageViewerData || {};
                    (window as any).__imageViewerData[tabId] = preview;
                    window.dispatchEvent(new CustomEvent("open-form-tab", {
                      detail: { id: tabId, name: `Afbeelding ${slot + 1}`, formType: "image-viewer", entityId: tabId }
                    }));
                  }}
                  title="Dubbelklik om te vergroten"
                />
                <button
                  type="button"
                  onClick={() => clearImageSlot(slot)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Verwijderen
                </button>
              </div>
            ) : (
              /* Empty slot: dashed drop zone */
              <div
                onDragOver={handleDragOver(slot)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(slot)}
                className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-colors cursor-default ${
                  isOver
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/40"
                }`}
              >
                {isOver ? (
                  <>
                    <Image className="h-6 w-6 text-orange-500" />
                    <span className="text-xs text-orange-600 font-medium">Loslaten!</span>
                  </>
                ) : (
                  <label className="flex flex-col items-center gap-1 cursor-pointer w-full h-full justify-center">
                    <Plus className="h-5 w-5 text-gray-400" />
                    <span className="text-xs text-gray-400">Afbeelding {slot + 1}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUploadForSlot(slot)}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="w-full text-xs text-gray-400 mt-0.5">
        Klik op een vak of sleep een afbeelding erin · JPG, PNG, max 5MB
      </p>
    </div>
  );

  // Form sections
  const formSections: FormSection2<InventoryFormData>[] = [
    {
      id: "general",
      label: "General Information",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createTwoColumnRow(
          [
            {
              key: "sku",
              label: "Artikelcode (SKU)",
              type: "text",
              placeholder: "Voer artikelcode in",
              register: form.register("sku"),
              validation: {
                error: form.formState.errors.sku?.message,
                isRequired: true
              },
              testId: "input-inventory-sku"
            } as FormField2<InventoryFormData>,
            {
              key: "category",
              label: "Categorie",
              type: "custom",
              customComponent: (
                <EntitySelect
                  endpoint="inventory-categories"
                  formType="masterdata-inventory-categories"
                  labelField="name"
                  secondaryField="code"
                  value={categoryValue || ""}
                  onValueChange={(val) => { form.setValue("category", val); setHasUnsavedChanges(true); }}
                  placeholder="Selecteer categorie..."
                  testId="select-inventory-category"
                />
              ),
              testId: "select-inventory-category"
            } as FormField2<InventoryFormData>,
            {
              key: "name",
              label: "Product Name",
              type: "text",
              placeholder: "Enter product name",
              register: form.register("name"),
              validation: {
                error: form.formState.errors.name?.message,
                isRequired: true
              },
              testId: "input-inventory-name"
            } as FormField2<InventoryFormData>,
            {
              key: "brand",
              label: "Merk",
              type: "custom",
              customComponent: (
                <EntitySelect
                  endpoint="brands"
                  formType="masterdata-brands"
                  labelField="name"
                  secondaryField="code"
                  value={form.watch("brand" as any) || ""}
                  onValueChange={(val) => form.setValue("brand" as any, val)}
                  placeholder="Selecteer merk..."
                  testId="select-inventory-brand"
                />
              ),
              testId: "select-inventory-brand"
            } as FormField2<InventoryFormData>,
            {
              key: "manufacturerPartNumber",
              label: "Fabrikant type nr.",
              type: "text",
              placeholder: "Bijv. MPN-12345",
              register: form.register("manufacturerPartNumber" as any),
              testId: "input-inventory-manufacturer-part-number"
            } as FormField2<InventoryFormData>,
            {
              key: "unit",
              label: "Eenheid",
              type: "custom",
              customComponent: (
                <EntitySelect
                  endpoint="units-of-measure"
                  formType="masterdata-units-of-measure"
                  labelField="name"
                  secondaryField="code"
                  value={form.watch("unit") || ""}
                  onValueChange={(val) => form.setValue("unit", val)}
                  placeholder="Selecteer eenheid..."
                  testId="select-inventory-unit"
                />
              ),
              testId: "select-inventory-unit"
            } as FormField2<InventoryFormData>,
          ],
          [
            {
              key: "description",
              label: "Description",
              type: "textarea",
              placeholder: "Enter product description",
              rows: 3,
              register: form.register("description"),
              validation: {
                error: form.formState.errors.description?.message
              },
              testId: "input-inventory-description"
            } as FormField2<InventoryFormData>,
            {
              key: "hsCode",
              label: "HS Code",
              type: "text",
              placeholder: "Bijv. 8471.30.00",
              register: form.register("hsCode"),
              validation: {
                error: form.formState.errors.hsCode?.message
              },
              testId: "input-inventory-hs-code"
            } as FormField2<InventoryFormData>,
            {
              key: "isComposite",
              label: "Assembly",
              type: "checkbox",
              setValue: (value) => form.setValue("isComposite", value),
              watch: () => form.watch("isComposite"),
              testId: "checkbox-inventory-is-composite",
            } as FormField2<InventoryFormData>,
          ]
        ),
        createCustomRow(imageUploadComponent, "border-t pt-4")
      ]
    },
    {
      id: "pricing",
      label: "Pricing",
      rows: [
        createFieldsRow([
          {
            key: "costPrice",
            label: "Cost Price",
            type: "decimal",
            placeholder: "0,00",
            layout: "single",
            prefix: "€",
            setValue: (value) => form.setValue("costPrice", value),
            watch: () => form.watch("costPrice"),
            validation: {
              error: form.formState.errors.costPrice?.message,
              isRequired: true
            },
            testId: "input-inventory-cost-price"
          } as FormField2<InventoryFormData>,
          {
            key: "unitPrice",
            label: "Selling Price",
            type: "decimal",
            placeholder: "0,00",
            layout: "single",
            prefix: "€",
            setValue: (value) => form.setValue("unitPrice", value),
            watch: () => form.watch("unitPrice"),
            validation: {
              error: form.formState.errors.unitPrice?.message,
              isRequired: true
            },
            testId: "input-inventory-unit-price"
          } as FormField2<InventoryFormData>
        ]),

        createFieldRow({
          key: "margin",
          label: "Margin %",
          type: "decimal",
          placeholder: "0,00",
          setValue: (value) => form.setValue("margin", value),
          watch: () => form.watch("margin"),
          testId: "input-inventory-margin"
        } as FormField2<InventoryFormData>)
      ]
    },
    {
      id: "inventory",
      label: "Inventory Management",
      rows: [
        createFieldRow({
            key: "currentStock",
            label: "Current Stock",
            type: "number",
            placeholder: "0",
            register: form.register("currentStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.currentStock?.message
            },
            testId: "input-inventory-current-stock"
          } as FormField2<InventoryFormData>),

        createFieldsRow([
          {
            key: "minimumStock",
            label: "Minimum Stock",
            type: "number",
            placeholder: "0",
            layout: "single",
            register: form.register("minimumStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.minimumStock?.message
            },
            testId: "input-inventory-minimum-stock"
          } as FormField2<InventoryFormData>,
          {
            key: "maximumStock",
            label: "Maximum Stock",
            type: "number",
            placeholder: "0",
            layout: "single",
            register: form.register("maximumStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.maximumStock?.message
            },
            testId: "input-inventory-maximum-stock"
          } as FormField2<InventoryFormData>
        ]),

        createFieldsRow([
          {
            key: "location",
            label: "Storage Location",
            type: "text",
            placeholder: "Warehouse A-1-B",
            layout: "single",
            register: form.register("location"),
            validation: {
              error: form.formState.errors.location?.message
            },
            testId: "input-inventory-location"
          } as FormField2<InventoryFormData>,
          {
            key: "barcode",
            label: "Barcode",
            type: "text",
            placeholder: "Barcode/EAN",
            layout: "single",
            register: form.register("barcode"),
            validation: {
              error: form.formState.errors.barcode?.message
            },
            testId: "input-inventory-barcode"
          } as FormField2<InventoryFormData>
        ]),

        createFieldsRow([
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "discontinued", label: "Discontinued" }
            ],
            layout: "single",
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            validation: {
              error: form.formState.errors.status?.message
            },
            testId: "select-inventory-status"
          } as FormField2<InventoryFormData>
        ])
      ]
    }
  ];

  return (
    <>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={onSubmit}
        toolbar={toolbar}
        headerFields={headerFields}
        documentType="inventory"
        entityId={currentInventoryId}
        changeTracking={changeTrackingConfig}
        originalValues={originalValues}
        isLoading={isLoadingInventory}
        validationErrorDialog={
          <ValidationErrorDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            errors={validErrors}
            onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
          />
        }
      />

      {watchedIsComposite && currentInventoryId && (
        <CompositeComponentsPanel
          parentItemId={currentInventoryId}
          onCostPriceChanged={(total) => {
            form.setValue("costPrice", total.toFixed(2));
          }}
        />
      )}

      {watchedIsComposite && !currentInventoryId && (
        <div className="mx-6 mb-6 mt-0">
          <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Sla het artikel eerst op om onderdelen toe te voegen.
            </p>
          </div>
        </div>
      )}
    </>
  );
}