import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EntitySelect } from "@/components/ui/entity-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Package, Image, Plus, Trash2, Check, X, Layers, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  componentUnit: string;
  notes: string;
}

interface ComponentRowProps {
  component: InventoryComponent;
  inventoryItems: InventoryItem[];
  parentItemId: string;
  onDeleted: () => void;
}

function ComponentRow({ component, inventoryItems, parentItemId, onDeleted }: ComponentRowProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(component.quantity ?? "1");
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

  function saveRow() {
    patchMutation.mutate({
      quantity: qty,
      notes,
      ...(isStandard
        ? { componentItemId: selectedItemId }
        : { componentName: uniqueName, componentUnit: uniqueUnit }),
    });
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 group">
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
                {inventoryItems.map(item => (
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
}

function CompositeComponentsPanel({ parentItemId }: CompositeComponentsPanelProps) {
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

  function addRow(type: "standard" | "unique") {
    setPendingRows(prev => [...prev, {
      tempId: `temp-${Date.now()}`,
      componentType: type,
      componentItemId: "",
      componentName: "",
      quantity: "1",
      componentUnit: "",
      notes: "",
    }]);
  }

  const createMutation = useMutation({
    mutationFn: (row: PendingRow) => {
      const payload: Record<string, any> = {
        componentType: row.componentType,
        quantity: row.quantity,
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

  return (
    <div className="mx-6 mb-6 mt-0">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* panel header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Samengestelde onderdelen</h3>
              <p className="text-xs text-slate-400">
                {isLoading ? "Laden…" : `${components.length} onderdeel${components.length !== 1 ? "en" : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addRow("standard")}
              className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Standaard artikel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addRow("unique")}
              className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Uniek artikel
            </Button>
          </div>
        </div>

        {/* table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Laden…</span>
          </div>
        ) : components.length === 0 && pendingRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <Layers className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">Nog geen onderdelen</p>
            <p className="text-xs">Klik op "Standaard artikel" of "Uniek artikel" om te beginnen.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Artikel / Naam</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Hoev.</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Eenheid</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notities</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {components.map(c => (
                <ComponentRow
                  key={c.id}
                  component={c}
                  inventoryItems={allInventoryItems}
                  parentItemId={parentItemId}
                  onDeleted={() => {}}
                />
              ))}

              {/* pending (new) rows */}
              {pendingRows.map(row => (
                <tr key={row.tempId} className="border-b border-orange-100 bg-orange-50/40">
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
                      <Select value={row.componentItemId} onValueChange={v => updatePending(row.tempId, "componentItemId", v)}>
                        <SelectTrigger className="h-8 text-sm w-full bg-white">
                          <SelectValue placeholder="Selecteer artikel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allInventoryItems.map(item => (
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  
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
      imageUrl: "",
      brand: "",
      manufacturerPartNumber: "",
    },
  });

  const categoryValue = form.watch("category");
  const watchedIsComposite = form.watch("isComposite");

  // Load inventory item data if editing
  const { data: inventoryItem, isLoading: isLoadingInventory } = useQuery<InventoryItem>({
    queryKey: ["/api/inventory", inventoryId],
    enabled: !!inventoryId,
  });

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
        imageUrl: inventoryItem.imageUrl || "",
        brand: (inventoryItem as any).brand || "",
        manufacturerPartNumber: (inventoryItem as any).manufacturerPartNumber || "",
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
      
      if (inventoryItem.imageUrl) {
        setImagePreview(inventoryItem.imageUrl);
      }
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [inventoryItem, form]);

  // Track which sale-price field the user last edited to determine calculation direction
  const lastSalePriceRef = useRef<'unitPrice' | 'margin'>('unitPrice');
  const isCalculating = useRef(false);

  // Bidirectional calculation:
  // - unitPrice changed (or costPrice with unitPrice leading) → recalculate margin
  // - margin changed (or costPrice with margin leading)       → recalculate unitPrice
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (isCalculating.current) return;
      const costPrice = parseFloat(String(values.costPrice || "0").replace(',', '.'));
      if (!costPrice || costPrice <= 0) return;

      isCalculating.current = true;
      try {
        const leading = name === 'unitPrice' ? 'unitPrice'
          : name === 'margin'     ? 'margin'
          : lastSalePriceRef.current; // costPrice changed — use whichever was last edited

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

        if (name === 'unitPrice') lastSalePriceRef.current = 'unitPrice';
        else if (name === 'margin') lastSalePriceRef.current = 'margin';
      } finally {
        isCalculating.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = inventoryId ? `edit-inventory-${inventoryId}` : 'new-inventory';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, inventoryId]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  // Custom image upload component
  const imageUploadComponent = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Item preview" 
              className="w-24 h-24 object-cover rounded-lg border"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg border flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            data-testid="input-inventory-image"
          />
          <p className="text-xs text-gray-500 mt-1">Upload an image (JPG, PNG, max 5MB)</p>
        </div>
      </div>
    </div>
  );

  // Form sections
  const formSections: FormSection2<InventoryFormData>[] = [
    {
      id: "general",
      label: "General Information",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "sku",
            label: "Artikelcode (SKU)",
            type: "text",
            placeholder: "Voer artikelcode in",
            layout: "single",
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
            layout: "single",
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
          } as FormField2<InventoryFormData>
        ]),
        
        createFieldRow({
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
        } as FormField2<InventoryFormData>),

        createFieldsRow([
          {
            key: "brand",
            label: "Merk",
            type: "text",
            layout: "single",
            placeholder: "Bijv. Bosch, Siemens...",
            register: form.register("brand" as any),
            testId: "input-inventory-brand"
          } as FormField2<InventoryFormData>,
          {
            key: "manufacturerPartNumber",
            label: "Fabrikant type nr.",
            type: "text",
            layout: "single",
            placeholder: "Bijv. MPN-12345",
            register: form.register("manufacturerPartNumber" as any),
            testId: "input-inventory-manufacturer-part-number"
          } as FormField2<InventoryFormData>
        ]),

        createFieldRow({
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
        } as FormField2<InventoryFormData>),

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
        createFieldsRow([
          {
            key: "currentStock",
            label: "Current Stock",
            type: "number",
            placeholder: "0",
            layout: "single",
            register: form.register("currentStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.currentStock?.message
            },
            testId: "input-inventory-current-stock"
          } as FormField2<InventoryFormData>,
          {
            key: "unit",
            label: "Unit",
            type: "select",
            options: [
              { value: "pcs", label: "Pieces" },
              { value: "kg", label: "Kilograms" },
              { value: "m", label: "Meters" },
              { value: "l", label: "Liters" },
              { value: "box", label: "Boxes" }
            ],
            layout: "single",
            setValue: (value) => form.setValue("unit", value),
            watch: () => form.watch("unit"),
            validation: {
              error: form.formState.errors.unit?.message
            },
            testId: "select-inventory-unit"
          } as FormField2<InventoryFormData>
        ]),

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
            key: "isComposite",
            label: "Is Composite Item",
            type: "custom",
            customComponent: (
              <label className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all select-none",
                watchedIsComposite
                  ? "bg-orange-50 border-orange-300 text-orange-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              )}>
                <input
                  type="checkbox"
                  {...form.register("isComposite")}
                  className="rounded border-gray-300 accent-orange-500 h-4 w-4"
                  data-testid="checkbox-inventory-is-composite"
                />
                <div>
                  <span className="text-sm font-medium">Dit artikel bestaat uit meerdere onderdelen</span>
                  {watchedIsComposite && (
                    <p className="text-xs text-orange-600 mt-0.5">↓ Beheer de onderdelen in de tabel hieronder</p>
                  )}
                </div>
              </label>
            ),
            layout: "single"
          } as FormField2<InventoryFormData>,
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
        <CompositeComponentsPanel parentItemId={currentInventoryId} />
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