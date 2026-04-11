import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Search, Filter, Check, X, Loader2, CopyPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineItemComponent, InventoryItem } from "@shared/schema";

interface SupplierOption {
  id: string;
  name: string;
  supplierNumber: string;
}

interface PendingRow {
  tempId: string;
  componentType: "standard" | "unique";
  componentItemId: string;
  componentName: string;
  quantity: string;
  unitPrice: string;
  costPrice: string;
  supplierId: string;
  componentUnit: string;
  notes: string;
}

interface ComponentRowProps {
  component: LineItemComponent;
  inventoryItems: InventoryItem[];
  suppliers: SupplierOption[];
  parentLineItemId: string;
  onDeleted: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function LICComponentRow({ component, inventoryItems, suppliers, parentLineItemId, onDeleted, selected, onToggleSelect }: ComponentRowProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(component.quantity ?? "1");
  const [unitPrice, setUnitPrice] = useState(component.unitPrice ?? "0");
  const [costPrice, setCostPrice] = useState(component.costPrice ?? "0");
  const [supplierId, setSupplierId] = useState(component.supplierId ?? "");
  const [notes, setNotes] = useState(component.notes ?? "");
  const [selectedItemId, setSelectedItemId] = useState(component.componentItemId ?? "");
  const [uniqueName, setUniqueName] = useState(component.componentName ?? "");
  const [uniqueUnit, setUniqueUnit] = useState(component.componentUnit ?? "");

  const patchMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest("PATCH", `/api/line-item-components/${parentLineItemId}/${component.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/line-item-components/${parentLineItemId}/${component.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
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
      costPrice: costPrice || "0",
      supplierId: supplierId || null,
      notes,
      ...(isStandard
        ? { componentItemId: selectedItemId }
        : { componentName: uniqueName, componentUnit: uniqueUnit }),
    });
  }

  return (
    <tr className={cn("border-b border-gray-100 hover:bg-slate-50 group", selected && "bg-orange-50/50")} style={{ height: '32px', lineHeight: '1.2' }}>
      <td className="p-2 border-r border-gray-100" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
        <input
          type="checkbox"
          className="rounded border-gray-300 accent-orange-500 h-4 w-4"
          checked={!!selected}
          onChange={() => onToggleSelect?.()}
        />
      </td>
      <td className="p-2 border-r border-gray-100 w-24">
        <Badge variant="outline" className={cn(
          "text-xs font-medium",
          isStandard
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-purple-50 text-purple-700 border-purple-200"
        )}>
          {isStandard ? "Standaard" : "Uniek"}
        </Badge>
      </td>

      <td className="p-2 border-r border-gray-100">
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

      <td className="p-2 border-r border-gray-100 w-24">
        {editing ? (
          <Input value={qty} onChange={e => setQty(e.target.value)} className="h-8 text-sm text-right" type="number" min="0" step="0.001" />
        ) : (
          <span className="text-sm text-right block font-mono">{component.quantity}</span>
        )}
      </td>

      <td className="p-2 border-r border-gray-100 w-28">
        {editing && !isStandard ? (
          <Input value={uniqueUnit} onChange={e => setUniqueUnit(e.target.value)} placeholder="stuk, m², kg..." className="h-8 text-sm" />
        ) : (
          <span className="text-sm text-slate-500">
            {isStandard ? (linkedItem?.unit ?? "") : (component.componentUnit ?? "")}
          </span>
        )}
      </td>

      <td className="p-2 border-r border-gray-100 w-28">
        {editing ? (
          <Input value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-8 text-sm text-right" type="number" min="0" step="0.01" />
        ) : (
          <span className="text-sm text-right block font-mono">€ {parseFloat(component.unitPrice ?? "0").toFixed(2)}</span>
        )}
      </td>

      <td className="p-2 border-r border-gray-100 w-28">
        <span className="text-sm text-right block font-mono font-medium">
          € {(editing ? lineTotal : (parseFloat(component.quantity ?? "0") * parseFloat(component.unitPrice ?? "0"))).toFixed(2)}
        </span>
      </td>

      <td className="p-2 border-r border-gray-100 w-28">
        {editing && !isStandard ? (
          <Input value={costPrice} onChange={e => setCostPrice(e.target.value)} className="h-8 text-sm text-right" type="number" min="0" step="0.01" />
        ) : (
          <span className="text-sm text-right block font-mono">
            {!isStandard ? `€ ${parseFloat(component.costPrice ?? "0").toFixed(2)}` : ""}
          </span>
        )}
      </td>

      <td className="p-2 border-r border-gray-100 w-36">
        {editing && !isStandard ? (
          <Select value={supplierId || "_none_"} onValueChange={v => setSupplierId(v === "_none_" ? "" : v)}>
            <SelectTrigger className="h-8 text-sm w-full">
              <SelectValue placeholder="Geen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none_">Geen</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="font-mono text-xs text-slate-500 mr-1">{s.supplierNumber}</span>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-slate-500">
            {!isStandard && component.supplierId ? (suppliers.find(s => s.id === component.supplierId)?.name ?? "") : ""}
          </span>
        )}
      </td>

      <td className="p-2 border-r border-gray-100">
        {editing ? (
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionele notitie..." className="h-8 text-sm" />
        ) : (
          <span className="text-sm text-slate-500">{component.notes ?? ""}</span>
        )}
      </td>

      <td className="p-2 w-20 text-right">
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

interface LineItemComponentsPanelProps {
  parentLineItemId: string;
  parentLineItemType: string;
  onCostPriceChanged?: (total: number) => void;
}

export function LineItemComponentsPanel({ parentLineItemId, parentLineItemType, onCostPriceChanged }: LineItemComponentsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: components = [], isLoading } = useQuery<LineItemComponent[]>({
    queryKey: ["/api/line-item-components", parentLineItemId],
    queryFn: () => fetch(`/api/line-item-components/${parentLineItemId}`).then(r => r.json()),
    enabled: !!parentLineItemId,
  });

  const { data: allInventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 30000,
  });

  const { data: allSuppliers = [] } = useQuery<SupplierOption[]>({
    queryKey: ["/api/suppliers"],
    staleTime: 30000,
  });

  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "standard" | "unique">("all");

  const totalCostPrice = [
    ...components.map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0"))),
    ...pendingRows.map(r => (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0)),
  ].reduce((sum, v) => sum + v, 0);

  const onCostPriceChangedRef = useRef(onCostPriceChanged);
  onCostPriceChangedRef.current = onCostPriceChanged;
  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    const savedTotal = components
      .map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0")))
      .reduce((sum, v) => sum + v, 0);
    if (prevTotalRef.current !== savedTotal) {
      prevTotalRef.current = savedTotal;
      onCostPriceChangedRef.current?.(savedTotal);
    }
  }, [components]);

  function addRow(type: "standard" | "unique") {
    setPendingRows(prev => [...prev, {
      tempId: `temp-${Date.now()}`,
      componentType: type,
      componentItemId: "",
      componentName: "",
      quantity: "1",
      unitPrice: "0",
      costPrice: "0",
      supplierId: "",
      componentUnit: "",
      notes: "",
    }]);
  }

  const createMutation = useMutation({
    mutationFn: (row: PendingRow) => {
      const payload: Record<string, any> = {
        parentLineItemId,
        parentLineItemType,
        componentType: row.componentType,
        quantity: row.quantity,
        unitPrice: row.unitPrice || "0",
        costPrice: row.costPrice || "0",
        supplierId: row.supplierId || null,
        notes: row.notes || null,
        sortOrder: components.length + pendingRows.indexOf(row),
      };
      if (row.componentType === "standard") {
        payload.componentItemId = row.componentItemId || null;
      } else {
        payload.componentName = row.componentName;
        payload.componentUnit = row.componentUnit || null;
      }
      return apiRequest("POST", `/api/line-item-components/${parentLineItemId}`, payload);
    },
    onSuccess: (_data, row) => {
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
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
        await apiRequest("DELETE", `/api/line-item-components/${parentLineItemId}/${id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      setSelectedRows([]);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const comp = components.find(c => c.id === id);
      if (!comp) return;
      const payload: Record<string, any> = {
        parentLineItemId,
        parentLineItemType,
        componentType: comp.componentType,
        quantity: comp.quantity,
        unitPrice: comp.unitPrice || "0",
        costPrice: comp.costPrice || "0",
        supplierId: comp.supplierId || null,
        notes: comp.notes || null,
        sortOrder: components.length,
        componentItemId: comp.componentItemId || null,
        componentName: comp.componentName || null,
        componentUnit: comp.componentUnit || null,
      };
      return apiRequest("POST", `/api/line-item-components/${parentLineItemId}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
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

  const filteredComponents = components.filter(c => {
    if (typeFilter !== "all" && c.componentType !== typeFilter) return false;
    if (searchTerm) {
      const linked = allInventoryItems.find(i => i.id === c.componentItemId);
      const name = c.componentType === "standard" ? (linked?.name ?? "") : (c.componentName ?? "");
      const sku = linked?.sku ?? "";
      const term = searchTerm.toLowerCase();
      if (!name.toLowerCase().includes(term) && !sku.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const hasSelection = selectedRows.length > 0;
  const hasSingleSelection = selectedRows.length === 1;

  return (
    <div className="px-10 mb-6 mt-0 w-full overflow-hidden">
      <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-3">Onderdelen</h3>
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 flex items-center gap-1 mb-3">
        <div className="relative">
          <Input
            placeholder="Zoek onderdelen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm w-64"
          />
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-orange-500" size={14} />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ring-1 ring-orange-400 text-orange-600"
              title="Filter"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")} className={cn("text-xs", typeFilter === "all" && "font-bold")}>
              Alle types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("standard")} className={cn("text-xs", typeFilter === "standard" && "font-bold")}>
              Standaard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("unique")} className={cn("text-xs", typeFilter === "unique" && "font-bold")}>
              Uniek
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Laden…</span>
          </div>
        ) : components.length === 0 && pendingRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <p className="text-sm text-orange-500">Nog geen onderdelen</p>
            <p className="text-xs">Voeg onderdelen toe via de + knop hierboven</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-50 dark:bg-orange-900/20">
                <th className="p-2 w-12 border-r border-orange-200/50" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
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
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-24">Type</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50">Artikel / Naam</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-24">Hoev.</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-28">Eenheid</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-28">Prijs</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-28">Regeltotaal</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-28">Kostprijs</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-36">Leverancier</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50">Notities</th>
                <th className="p-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredComponents.map(c => (
                <LICComponentRow
                  key={c.id}
                  component={c}
                  inventoryItems={allInventoryItems}
                  suppliers={allSuppliers}
                  parentLineItemId={parentLineItemId}
                  onDeleted={() => {}}
                  selected={selectedRows.includes(c.id)}
                  onToggleSelect={() => toggleRowSelection(c.id)}
                />
              ))}

              {pendingRows.map(row => (
                <tr key={row.tempId} className="border-b border-orange-100 bg-orange-50/40">
                  <td className="p-2 border-r border-gray-100" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }} />
                  <td className="p-2 border-r border-gray-100 w-24">
                    <Badge variant="outline" className={cn(
                      "text-xs font-medium",
                      row.componentType === "standard"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    )}>
                      {row.componentType === "standard" ? "Standaard" : "Uniek"}
                    </Badge>
                  </td>
                  <td className="p-2 border-r border-gray-100">
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
                  <td className="p-2 border-r border-gray-100 w-24">
                    <Input
                      value={row.quantity}
                      onChange={e => updatePending(row.tempId, "quantity", e.target.value)}
                      type="number" min="0" step="0.001"
                      className="h-8 text-sm text-right bg-white"
                    />
                  </td>
                  <td className="p-2 border-r border-gray-100 w-28">
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
                  <td className="p-2 border-r border-gray-100 w-28">
                    <Input
                      value={row.unitPrice}
                      onChange={e => updatePending(row.tempId, "unitPrice", e.target.value)}
                      type="number" min="0" step="0.01"
                      className="h-8 text-sm text-right bg-white"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-2 border-r border-gray-100 w-28">
                    <span className="text-sm text-right block font-mono font-medium">
                      € {((parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0)).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 border-r border-gray-100 w-28">
                    {row.componentType === "unique" ? (
                      <Input
                        value={row.costPrice}
                        onChange={e => updatePending(row.tempId, "costPrice", e.target.value)}
                        type="number" min="0" step="0.01"
                        className="h-8 text-sm text-right bg-white"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="text-sm text-slate-400 italic" />
                    )}
                  </td>
                  <td className="p-2 border-r border-gray-100 w-36">
                    {row.componentType === "unique" ? (
                      <Select value={row.supplierId || "_none_"} onValueChange={v => updatePending(row.tempId, "supplierId", v === "_none_" ? "" : v)}>
                        <SelectTrigger className="h-8 text-sm w-full bg-white">
                          <SelectValue placeholder="Geen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">Geen</SelectItem>
                          {allSuppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="font-mono text-xs text-slate-500 mr-1">{s.supplierNumber}</span>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-slate-400 italic" />
                    )}
                  </td>
                  <td className="p-2 border-r border-gray-100">
                    <Input
                      value={row.notes}
                      onChange={e => updatePending(row.tempId, "notes", e.target.value)}
                      placeholder="Optionele notitie..."
                      className="h-8 text-sm bg-white"
                    />
                  </td>
                  <td className="p-2 w-20">
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
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
