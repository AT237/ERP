import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Search, Filter, Check, X, Loader2, CopyPlus, PenLine, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineItemComponent, InventoryItem } from "@shared/schema";

interface SupplierOption {
  id: string;
  name: string;
  supplierNumber: string;
}

interface PendingRow {
  tempId: string;
  componentType: "standard" | "unique" | "charge" | "text";
  componentItemId: string;
  componentName: string;
  quantity: string;
  unitPrice: string;
  costPrice: string;
  supplierId: string;
  componentUnit: string;
  notes: string;
}

const TYPE_LABELS: Record<string, string> = {
  standard: "Std",
  unique: "Uni",
  charge: "Tosl",
  text: "Txt",
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  standard: "bg-blue-50 text-blue-700 border-blue-200",
  unique: "bg-purple-50 text-purple-700 border-purple-200",
  charge: "bg-amber-50 text-amber-700 border-amber-200",
  text: "bg-gray-50 text-gray-600 border-gray-200",
};

const TYPE_FULL_LABELS: Record<string, string> = {
  standard: "Standaard",
  unique: "Uniek",
  charge: "Toeslagen",
  text: "Tekst",
};

interface ComponentRowProps {
  component: LineItemComponent;
  inventoryItems: InventoryItem[];
  suppliers: SupplierOption[];
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: (componentId: string) => void;
}

function LICComponentRow({ component, inventoryItems, suppliers, selected, onToggleSelect, onOpen }: ComponentRowProps) {
  const linkedItem = inventoryItems.find(i => i.id === component.componentItemId);
  const isStandard = component.componentType === "standard";
  const isText = component.componentType === "text";
  const lineTotal = isText ? 0 : (parseFloat(component.quantity ?? "0") * parseFloat(component.unitPrice ?? "0"));
  const supplier = suppliers.find(s => s.id === component.supplierId);

  return (
    <tr
      className={cn("border-b border-gray-100 hover:bg-slate-50 group cursor-pointer", selected && "bg-orange-50/50")}
      style={{ height: '32px', lineHeight: '1.2' }}
      onDoubleClick={() => onOpen?.(component.id)}
    >
      <td className="p-2 border-r border-gray-100" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }} onDoubleClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          className="rounded border-gray-300 accent-orange-500 h-4 w-4"
          checked={!!selected}
          onChange={() => onToggleSelect?.()}
        />
      </td>

      <td className="p-2 border-r border-gray-100 w-16 text-center">
        <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5 py-0", TYPE_BADGE_STYLES[component.componentType] || TYPE_BADGE_STYLES.standard)}>
          {TYPE_LABELS[component.componentType] || component.componentType}
        </Badge>
      </td>

      <td className="p-2 border-r border-gray-100">
        <span className="text-sm text-slate-700">
          {isStandard
            ? linkedItem
              ? <><span className="font-mono text-xs text-slate-400 mr-2">{linkedItem.sku}</span>{linkedItem.name}</>
              : <span className="text-slate-400 italic">—</span>
            : component.componentName || <span className="text-slate-400 italic">—</span>
          }
        </span>
      </td>

      <td className="p-2 border-r border-gray-100">
        <span className="text-sm text-slate-500 line-clamp-1">{component.notes ?? ""}</span>
      </td>

      <td className="p-2 border-r border-gray-100 w-16 text-right">
        {!isText && <span className="text-sm font-mono">{component.quantity}</span>}
      </td>

      <td className="p-2 border-r border-gray-100 w-20">
        <span className="text-sm text-slate-500">
          {isStandard ? (linkedItem?.unit ?? "") : (component.componentUnit ?? "")}
        </span>
      </td>

      <td className="p-2 border-r border-gray-100 w-24 text-right">
        {!isText && <span className="text-sm font-mono">€ {parseFloat(component.unitPrice ?? "0").toFixed(2)}</span>}
      </td>

      <td className="p-2 border-r border-gray-100 w-24 text-right">
        <span className="text-sm font-mono">€ {parseFloat(component.costPrice ?? "0").toFixed(2)}</span>
      </td>

      <td className="p-2 border-r border-gray-100 w-24 text-right">
        {!isText && <span className="text-sm font-mono font-medium">€ {lineTotal.toFixed(2)}</span>}
      </td>

      <td className="p-2 w-10 text-center" onDoubleClick={e => e.stopPropagation()}>
        <button
          onClick={() => onOpen?.(component.id)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Bewerken"
        >
          <PenLine className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

interface LineItemComponentsPanelProps {
  parentLineItemId: string;
  parentLineItemType: string;
  onCostPriceChanged?: (total: number) => void;
  enableNavigation?: boolean;
}

export function LineItemComponentsPanel({ parentLineItemId, parentLineItemType, onCostPriceChanged, enableNavigation = true }: LineItemComponentsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const handleOpenComponent = (componentId: string) => {
    if (!enableNavigation) return;
    navigate(`/components/${parentLineItemId}/${parentLineItemType}/${componentId}`);
  };

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
  const [typeFilter, setTypeFilter] = useState<"all" | "standard" | "unique" | "charge" | "text">("all");
  const [articleSearch, setArticleSearch] = useState<Record<string, string>>({});

  const totalCostPrice = [
    ...components.map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0"))),
    ...pendingRows.map(r => (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0)),
  ].reduce((sum, v) => sum + v, 0);

  const totalLineTotal = components
    .filter(c => c.componentType !== "text")
    .map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0")))
    .reduce((sum, v) => sum + v, 0);

  const totalCost = components
    .map(c => parseFloat(c.costPrice ?? "0"))
    .reduce((sum, v) => sum + v, 0);

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

  function addRow(type: "standard" | "unique" | "charge" | "text") {
    setPendingRows(prev => [...prev, {
      tempId: `temp-${Date.now()}`,
      componentType: type,
      componentItemId: "",
      componentName: "",
      quantity: type === "text" ? "0" : "1",
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
      if (row.componentType === "text") {
        payload.quantity = "0";
        payload.unitPrice = "0";
        payload.costPrice = "0";
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
      return apiRequest("POST", `/api/line-item-components/${parentLineItemId}`, {
        parentLineItemId,
        parentLineItemType,
        componentType: comp.componentType,
        componentItemId: comp.componentItemId,
        componentName: comp.componentName,
        componentUnit: comp.componentUnit,
        quantity: comp.quantity,
        unitPrice: comp.unitPrice,
        costPrice: comp.costPrice,
        supplierId: comp.supplierId,
        notes: comp.notes,
        sortOrder: components.length,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      setSelectedRows([]);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  function savePending(row: PendingRow) {
    createMutation.mutate(row);
  }

  function toggleRowSelection(id: string) {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  const filteredComponents = useMemo(() => {
    let result = components;
    if (typeFilter !== "all") {
      result = result.filter(c => c.componentType === typeFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => {
        const name = c.componentName?.toLowerCase() ?? "";
        const notes = c.notes?.toLowerCase() ?? "";
        const linked = allInventoryItems.find(i => i.id === c.componentItemId);
        const sku = linked?.sku?.toLowerCase() ?? "";
        const itemName = linked?.name?.toLowerCase() ?? "";
        return name.includes(lower) || notes.includes(lower) || sku.includes(lower) || itemName.includes(lower);
      });
    }
    return result;
  }, [components, typeFilter, searchTerm, allInventoryItems]);

  const hasSelection = selectedRows.length > 0;
  const hasSingleSelection = selectedRows.length === 1;

  const getFilteredInventory = (tempId: string) => {
    const term = (articleSearch[tempId] || "").toLowerCase();
    if (!term) return allInventoryItems.filter(i => i.id);
    return allInventoryItems.filter(i => {
      if (!i.id) return false;
      const sku = i.sku?.toLowerCase() ?? "";
      const name = i.name?.toLowerCase() ?? "";
      return sku.includes(term) || name.includes(term);
    });
  };

  return (
    <div className="pl-8 pr-6 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">Onderdelen</h3>
        <span className="text-xs text-slate-400">({components.length})</span>
        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" />
          <Input
            placeholder="Zoek onderdelen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-8 text-sm pl-8 w-48 border-orange-200 focus:border-orange-400"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", typeFilter !== "all" ? 'ring-1 ring-orange-400 text-orange-600' : '')}
              title="Filter op type"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")} className={cn("text-xs", typeFilter === "all" && "font-bold")}>
              Alle types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("standard")} className={cn("text-xs", typeFilter === "standard" && "font-bold")}>
              Standard Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("charge")} className={cn("text-xs", typeFilter === "charge" && "font-bold")}>
              Charge
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("unique")} className={cn("text-xs", typeFilter === "unique" && "font-bold")}>
              Unique Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("text")} className={cn("text-xs", typeFilter === "text" && "font-bold")}>
              Text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
              title="Onderdeel toevoegen"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => addRow("standard")} className="text-xs">
              Standard Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addRow("charge")} className="text-xs">
              Charge
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addRow("unique")} className="text-xs">
              Unique Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addRow("text")} className="text-xs">
              Text
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
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-16">Type</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50">Artikel / Naam</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50">Omschrijving</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-16">Aantal</th>
                <th className="p-2 text-left text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-20">Eenh.</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-24">Prijs</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-24">Kostprijs</th>
                <th className="p-2 text-right text-[11px] font-semibold text-orange-700 uppercase tracking-wider border-r border-orange-200/50 w-24">Bedrag</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {filteredComponents.map(c => (
                <LICComponentRow
                  key={c.id}
                  component={c}
                  inventoryItems={allInventoryItems}
                  suppliers={allSuppliers}
                  selected={selectedRows.includes(c.id)}
                  onToggleSelect={() => toggleRowSelection(c.id)}
                  onOpen={handleOpenComponent}
                />
              ))}

              {pendingRows.map(row => {
                const isStd = row.componentType === "standard";
                const isTxt = row.componentType === "text";
                const pendingTotal = isTxt ? 0 : (parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0);
                const filteredInv = getFilteredInventory(row.tempId);

                return (
                  <tr key={row.tempId} className="border-b border-green-200 bg-green-50/40">
                    <td className="p-2 border-r border-gray-100 text-center text-green-600 font-bold" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
                      +
                    </td>

                    <td className="p-2 border-r border-gray-100 w-16">
                      <Select value={row.componentType} onValueChange={v => updatePending(row.tempId, "componentType", v)}>
                        <SelectTrigger className="h-7 text-[10px] w-full bg-white border-green-200 px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standaard</SelectItem>
                          <SelectItem value="charge">Toeslagen</SelectItem>
                          <SelectItem value="unique">Uniek</SelectItem>
                          <SelectItem value="text">Tekst</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-2 border-r border-gray-100">
                      {isStd ? (
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                          <Input
                            value={articleSearch[row.tempId] ?? ""}
                            onChange={e => {
                              setArticleSearch(prev => ({ ...prev, [row.tempId]: e.target.value }));
                            }}
                            placeholder="Zoek artikel..."
                            className="h-7 text-xs pl-7 bg-white border-green-200"
                          />
                          {(articleSearch[row.tempId] ?? "").length > 0 && !row.componentItemId && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {filteredInv.slice(0, 20).map(item => (
                                <button
                                  key={item.id}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-orange-50 border-b border-gray-50 last:border-0"
                                  onClick={() => {
                                    setPendingRows(prev => prev.map(r => r.tempId === row.tempId ? {
                                      ...r,
                                      componentItemId: item.id,
                                      unitPrice: item.sellingPrice ?? item.unitPrice ?? r.unitPrice,
                                      costPrice: item.costPrice ?? r.costPrice,
                                      componentUnit: item.unit ?? r.componentUnit,
                                    } : r));
                                    setArticleSearch(prev => ({ ...prev, [row.tempId]: `${item.sku} - ${item.name}` }));
                                  }}
                                >
                                  <span className="font-mono text-slate-400 mr-2">{item.sku}</span>
                                  {item.name}
                                </button>
                              ))}
                              {filteredInv.length === 0 && (
                                <div className="px-3 py-2 text-xs text-slate-400 italic">Geen resultaten</div>
                              )}
                            </div>
                          )}
                          {row.componentItemId && (
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                              onClick={() => {
                                setPendingRows(prev => prev.map(r => r.tempId === row.tempId ? { ...r, componentItemId: "", unitPrice: "0", costPrice: "0" } : r));
                                setArticleSearch(prev => ({ ...prev, [row.tempId]: "" }));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={row.componentName}
                          onChange={e => updatePending(row.tempId, "componentName", e.target.value)}
                          placeholder={isTxt ? "Tekst..." : "Naam onderdeel..."}
                          className="h-7 text-xs bg-white border-green-200"
                          autoFocus
                        />
                      )}
                    </td>

                    <td className="p-2 border-r border-gray-100">
                      <Input
                        value={row.notes}
                        onChange={e => updatePending(row.tempId, "notes", e.target.value)}
                        placeholder="Omschrijving..."
                        className="h-7 text-xs bg-white border-green-200"
                      />
                    </td>

                    <td className="p-2 border-r border-gray-100 w-16">
                      {!isTxt && (
                        <Input
                          value={row.quantity}
                          onChange={e => updatePending(row.tempId, "quantity", e.target.value)}
                          type="number" min="0" step="0.001"
                          className="h-7 text-xs text-right bg-white border-green-200"
                        />
                      )}
                    </td>

                    <td className="p-2 border-r border-gray-100 w-20">
                      {!isTxt && (
                        <Input
                          value={row.componentUnit}
                          onChange={e => updatePending(row.tempId, "componentUnit", e.target.value)}
                          placeholder="Pcs."
                          className="h-7 text-xs bg-white border-green-200"
                        />
                      )}
                    </td>

                    <td className="p-2 border-r border-gray-100 w-24">
                      {!isTxt && (
                        <Input
                          value={row.unitPrice}
                          onChange={e => updatePending(row.tempId, "unitPrice", e.target.value)}
                          type="number" min="0" step="0.01"
                          className="h-7 text-xs text-right bg-white border-green-200"
                          placeholder="0,00"
                        />
                      )}
                    </td>

                    <td className="p-2 border-r border-gray-100 w-24">
                      {!isTxt && (
                        <Input
                          value={row.costPrice}
                          onChange={e => updatePending(row.tempId, "costPrice", e.target.value)}
                          type="number" min="0" step="0.01"
                          className="h-7 text-xs text-right bg-white border-green-200"
                          placeholder="0,00"
                        />
                      )}
                    </td>

                    <td className="p-2 border-r border-gray-100 w-24 text-right">
                      {!isTxt && (
                        <span className="text-xs font-mono font-medium">€ {pendingTotal.toFixed(2)}</span>
                      )}
                    </td>

                    <td className="p-2 w-10">
                      <div className="flex items-center gap-0.5 justify-center">
                        <button
                          onClick={() => savePending(row)}
                          disabled={createMutation.isPending}
                          className="p-1 rounded hover:bg-green-100 text-green-600"
                          title="Opslaan"
                        >
                          {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => {
                            setPendingRows(prev => prev.filter(r => r.tempId !== row.tempId));
                            setArticleSearch(prev => { const copy = { ...prev }; delete copy[row.tempId]; return copy; });
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400"
                          title="Annuleren"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {(components.length > 0 || pendingRows.length > 0) && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={6} className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Totaal:
                  </td>
                  <td className="px-2 py-2 w-24 text-right">
                    <span className="text-xs font-mono font-bold text-slate-600">
                      € {totalLineTotal.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-2 w-24 text-right">
                    <span className="text-xs font-mono font-bold text-slate-600">
                      € {totalCost.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-2 w-24 text-right">
                    <span className="text-xs font-mono font-bold text-orange-700">
                      € {totalCostPrice.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 w-10" />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
