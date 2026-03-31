import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutForm2, buildFormPersistenceKey, type FormSection2, type FormField2, createFieldRow, createFieldsRow, createTwoColumnRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { InventorySelect } from "@/components/ui/inventory-select";
import { EntitySelect } from "@/components/ui/entity-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPackingListItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, Package, FileText, Search, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PackingListItem, PackingList, InventoryItem, TextSnippet } from "@shared/schema";
import { z } from "zod";
import { LINE_ITEM_TYPES } from "@shared/line-item-types";

const packingListItemFormSchema = insertPackingListItemSchema.extend({
  unitPrice: z.string().optional(),
  lineTotal: z.string().optional(),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  unit: z.string().optional(),
  position: z.number().min(1, "Positie is verplicht").optional(),
  positionNo: z.string().optional(),
  descriptionInternal: z.string().optional(),
  discountPercent: z.string().optional(),
  packedQuantity: z.string().optional(),
}).refine((data) => {
  if ((data.lineType === 'standard' || data.lineType === 'unique') && data.quantity <= 0) {
    return false;
  }
  return true;
}, {
  message: "Aantal moet groter zijn dan 0 voor standaard en unieke artikelen",
  path: ["quantity"],
});

type PackingListItemFormData = z.infer<typeof packingListItemFormSchema> & {
  position?: number;
  positionNo?: string;
  descriptionInternal?: string;
  discountPercent?: string;
  packedQuantity?: string;
};

interface PackingListItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  packingListId?: string;
}

export function PackingListItemFormLayout({ onSave, lineItemId, packingListId }: PackingListItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");

  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    description: { label: "Omschrijving" },
  });
  const isEditing = !!lineItemId;

  const form = useForm<PackingListItemFormData>({
    resolver: zodResolver(packingListItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      packingListId: packingListId || "",
      description: "",
      quantity: 1,
      unit: "Pcs.",
      unitPrice: "0.00",
      lineTotal: "0.00",
      lineType: "",
      itemId: undefined,
      position: 1,
      positionNo: "",
      descriptionInternal: "",
      discountPercent: "0",
      costPrice: "0.00",
      hsCode: "",
      countryOfOrigin: "",
      packedQuantity: "0",
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<PackingListItem>({
    queryKey: ["/api/packing-list-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: packingListData } = useQuery<PackingList>({
    queryKey: ["/api/packing-lists", packingListId],
    enabled: !!packingListId,
  });

  const { data: packingListDetails } = useQuery<{ items: PackingListItem[] }>({
    queryKey: ["/api/packing-lists", packingListId, "items"],
    enabled: !!packingListId && !isEditing,
  });

  const itemIdValue = form.watch("itemId");
  const prevItemIdRef = useRef<string>("");

  const { data: selectedInventoryItem } = useQuery<any>({
    queryKey: ["/api/inventory", itemIdValue],
    enabled: !!itemIdValue,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const currentItemId = itemIdValue || "";
    if (selectedInventoryItem && currentItemId && currentItemId !== prevItemIdRef.current) {
      prevItemIdRef.current = currentItemId;
      form.setValue("description", selectedInventoryItem.description || selectedInventoryItem.name || "");
      const unit = selectedInventoryItem.unit;
      if (unit) form.setValue("unit" as any, unit);
      if ((selectedInventoryItem as any).hsCode) form.setValue("hsCode" as any, (selectedInventoryItem as any).hsCode);
      setHasUnsavedChanges(true);
    }
  }, [selectedInventoryItem, itemIdValue, form]);

  useEffect(() => {
    if (!isEditing && packingListDetails) {
      const items = Array.isArray(packingListDetails) ? packingListDetails : (packingListDetails as any)?.items || packingListDetails;
      if (Array.isArray(items)) {
        let maxNumber = 0;
        for (const item of items) {
          if ((item as any).positionNo) {
            const num = parseInt((item as any).positionNo, 10);
            if (!isNaN(num) && num > maxNumber) maxNumber = num;
          }
        }
        const nextNumber = Math.ceil((maxNumber + 1) / 10) * 10;
        form.setValue('positionNo', nextNumber.toString().padStart(3, '0'));
      }
    }
  }, [isEditing, packingListDetails, form]);

  const { data: textSnippets = [], isLoading: isLoadingSnippets } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets"],
    enabled: showSnippetDialog,
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchedSnippets = [], isLoading: isSearchingSnippets } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets/search", snippetSearchTerm],
    queryFn: async () => {
      if (!snippetSearchTerm.trim()) return [];
      const response = await fetch(`/api/text-snippets/search?q=${encodeURIComponent(snippetSearchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!snippetSearchTerm.trim(),
    staleTime: 1 * 60 * 1000,
  });

  useEffect(() => {
    if (lineItem) {
      const formData: PackingListItemFormData = {
        packingListId: lineItem.packingListId || packingListId || "",
        description: (lineItem as any).description || "",
        quantity: parseFloat(String(lineItem.quantity || 1)),
        unit: (lineItem as any).unit || "",
        unitPrice: (lineItem as any).unitPrice?.toString() || "0.00",
        lineTotal: (lineItem as any).lineTotal?.toString() || "0.00",
        lineType: (lineItem as any).lineType || "standard",
        itemId: lineItem.itemId || undefined,
        position: 1,
        positionNo: (lineItem as any).positionNo || "",
        descriptionInternal: (lineItem as any).descriptionInternal || "",
        discountPercent: (lineItem as any).discountPercent?.toString() || "0",
        costPrice: (lineItem as any).costPrice?.toString() || "0.00",
        hsCode: (lineItem as any).hsCode || "",
        countryOfOrigin: (lineItem as any).countryOfOrigin || "",
        packedQuantity: (lineItem as any).packedQuantity?.toString() || "0",
      };
      
      form.reset(formData);
      setHasUnsavedChanges(false);
      prevItemIdRef.current = lineItem.itemId || "";
    }
  }, [lineItem, form, packingListId]);

  const lineTypeValue = form.watch("lineType");
  const prevLineTypeRef = useRef<string>("");

  const SNIPPET_CATEGORIES = [
    { value: "all", label: "Alle categorieën" },
    { value: "general", label: "Algemeen" },
    { value: "header", label: "Koptekst" },
    { value: "footer", label: "Voettekst" },
    { value: "disclaimer", label: "Disclaimer" },
    { value: "terms", label: "Voorwaarden" },
    { value: "delivery", label: "Levering" },
  ];

  const filteredSnippets = useMemo(() => {
    let snippets = snippetSearchTerm.trim() ? searchedSnippets : textSnippets;
    if (selectedSnippetCategory && selectedSnippetCategory !== "all") {
      snippets = snippets.filter(snippet => snippet.category === selectedSnippetCategory);
    }
    snippets = snippets.filter(snippet => snippet.isActive);
    return snippets;
  }, [textSnippets, searchedSnippets, snippetSearchTerm, selectedSnippetCategory]);

  useEffect(() => {
    if (!lineTypeValue) return;
    const prev = prevLineTypeRef.current;
    prevLineTypeRef.current = lineTypeValue;

    if (lineTypeValue === 'text') {
      if (prev && prev !== 'text') form.setValue("unit" as any, "");
    } else {
      const currentUnit = form.getValues("unit" as any);
      if (!currentUnit) form.setValue("unit" as any, "Pcs.");
    }
  }, [lineTypeValue]);

  useEffect(() => {
    const tabId = lineItemId ? `edit-packing-list-item-${lineItemId}` : 'new-packing-list-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId]);

  const handleSelectSnippet = (snippet: TextSnippet) => {
    form.setValue("description", snippet.body);
    if (form.getValues("lineType") !== "text") {
      form.setValue("lineType", "text");
    }
    form.setValue("quantity", 0);
    form.setValue("unitPrice", "0.00");
    form.setValue("lineTotal", "0.00");
    setShowSnippetDialog(false);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("");
    toast({ title: "Tekst toegevoegd", description: `Tekst van "${snippet.title}" is toegevoegd.` });
  };

  const createMutation = useMutation({
    mutationFn: async (data: PackingListItemFormData) => {
      const response = await apiRequest("POST", `/api/packing-lists/${packingListId}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId] });
      setHasUnsavedChanges(false);
      const newKey = buildFormPersistenceKey({ formType: "packing-list-item", entityId: undefined, scope: packingListId });
      localStorage.removeItem(newKey);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-packing-list-item', hasUnsavedChanges: false }
      }));
      toast({ title: "Regel toegevoegd" });
      onSave();
    },
    onError: (error: Error) => {
      let message = "Kan regel niet toevoegen";
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart >= 0) {
          const parsed = JSON.parse(error.message.slice(jsonStart));
          if (parsed?.message) message = parsed.message;
        }
      } catch {}
      toast({ title: "Fout", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PackingListItemFormData) => {
      const response = await apiRequest("PUT", `/api/packing-list-items/${lineItemId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-list-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId] });
      setHasUnsavedChanges(false);
      toast({ title: "Regel bijgewerkt" });
    },
    onError: (error: Error) => {
      let message = "Kan regel niet bijwerken";
      try {
        const jsonStart = error.message.indexOf('{');
        if (jsonStart >= 0) {
          const parsed = JSON.parse(error.message.slice(jsonStart));
          if (parsed?.message) message = parsed.message;
        }
      } catch {}
      toast({ title: "Fout", description: message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PackingListItemFormData) => {
    const description = data.description || '';
    const transformedData = {
      ...data,
      description,
      quantity: Number(data.quantity),
      descriptionInternal: data.descriptionInternal || undefined,
      discountPercent: data.discountPercent || "0",
      packedQuantity: data.packedQuantity || "0",
    };

    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const headerFields: InfoField[] = [
    { label: 'Type', value: lineTypeValue || 'standard' },
  ];

  const handleClose = useCallback(() => {
    if (!lineItemId) {
      const key = buildFormPersistenceKey({ formType: "packing-list-item", entityId: undefined, scope: packingListId });
      localStorage.removeItem(key);
    }
    onSave();
  }, [lineItemId, packingListId, onSave]);

  const toolbar = useFormToolbar({
    entityType: "packing_list_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: handleClose,
    saveDisabled: !form.formState.isDirty && !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    extraQueryKeysToInvalidate: packingListId ? [["/api/packing-lists", packingListId, "items"], ["/api/packing-lists", packingListId]] : [],
    navigationListQueryKey: packingListId ? ["/api/packing-lists", packingListId, "items"] : undefined,
    navigationParentId: packingListId,
  });

  const lineTypeOptions = LINE_ITEM_TYPES.map(t => ({ value: t.value, label: t.label }));

  const fieldPosNo: FormField2<PackingListItemFormData> = {
    key: 'positionNo',
    label: 'Pos. No.',
    type: 'text',
    register: form.register('positionNo'),
    placeholder: 'bijv. 010',
    validation: { error: form.formState.errors.positionNo?.message },
    testId: 'input-position-no',
  };

  const fieldLineType: FormField2<PackingListItemFormData> = {
    key: 'lineType',
    label: 'Line Type',
    type: 'select',
    options: lineTypeOptions,
    setValue: (value: string) => { form.setValue('lineType', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('lineType'),
    validation: { isRequired: true, error: form.formState.errors.lineType?.message },
    testId: 'select-line-type',
  };

  const fieldDescriptionInternal: FormField2<PackingListItemFormData> = {
    key: 'descriptionInternal',
    label: 'Interne omschrijving',
    type: 'textarea',
    placeholder: 'Interne omschrijving (niet zichtbaar op paklijst)',
    rows: 3,
    register: form.register('descriptionInternal'),
    validation: { error: form.formState.errors.descriptionInternal?.message },
    testId: 'textarea-description-internal',
  };

  const fieldQuantity: FormField2<PackingListItemFormData> = {
    key: 'quantity',
    label: 'Aantal',
    type: 'number',
    register: form.register('quantity', { valueAsNumber: true }),
    validation: { isRequired: true, error: form.formState.errors.quantity?.message },
    testId: 'input-quantity',
  };

  const fieldPackedQuantity: FormField2<PackingListItemFormData> = {
    key: 'packedQuantity',
    label: 'Ingepakt',
    type: 'text',
    register: form.register('packedQuantity'),
    placeholder: '0',
    testId: 'input-packed-quantity',
  };

  const fieldUnit: FormField2<PackingListItemFormData> = {
    key: 'unit',
    label: 'Eenheid',
    type: 'custom',
    customComponent: (
      <EntitySelect
        endpoint="units-of-measure"
        formType="masterdata-units-of-measure"
        labelField="name"
        secondaryField="code"
        value={form.watch("unit" as any) || ""}
        onValueChange={(val) => { form.setValue("unit" as any, val); setHasUnsavedChanges(true); }}
        placeholder="Selecteer eenheid..."
        testId="select-unit"
      />
    ),
  };

  const fieldDescription: FormField2<PackingListItemFormData> = {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Description (zichtbaar op paklijst)',
    rows: 3,
    register: form.register('description'),
    validation: { error: form.formState.errors.description?.message },
    testId: 'textarea-description',
  };

  const fieldStockItem: FormField2<PackingListItemFormData> = {
    key: 'itemId',
    label: 'Stock item',
    type: 'custom',
    customComponent: (
      <InventorySelect
        value={form.watch("itemId" as any) || ""}
        onValueChange={(val) => { form.setValue("itemId" as any, val); setHasUnsavedChanges(true); }}
        onItemRefreshed={(freshItem) => {
          if (freshItem.unit) { form.setValue("unit" as any, freshItem.unit); }
          if ((freshItem as any).hsCode) { form.setValue("hsCode" as any, (freshItem as any).hsCode); }
          setHasUnsavedChanges(true);
        }}
        placeholder="Artikel zoeken in catalogus..."
        testId="select-inventory-item"
      />
    ),
  };

  const fieldDescriptionWithLookup: FormField2<PackingListItemFormData> = {
    key: 'description',
    label: 'Description',
    type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <textarea
          {...form.register('description')}
          placeholder="Description (zichtbaar op paklijst)..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          data-testid="textarea-description"
        />
        {form.formState.errors.description?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>
    ),
  };

  const fieldTextContent: FormField2<PackingListItemFormData> = {
    key: 'description',
    label: 'Tekst',
    type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setShowSnippetDialog(true); setSnippetSearchTerm(""); setSelectedSnippetCategory(""); }}
          className="flex items-center gap-2"
          data-testid="button-open-snippet-library"
        >
          <Library className="h-4 w-4" />
          Kies uit tekstbibliotheek
        </Button>
        <textarea
          {...form.register('description')}
          placeholder="Tekst inhoud (zichtbaar op paklijst)..."
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          data-testid="textarea-text-content"
        />
      </div>
    ),
  };

  const getRightColumnFields = (): FormField2<PackingListItemFormData>[] => {
    switch (lineTypeValue) {
      case 'unique':
        return [fieldDescription, fieldQuantity, fieldPackedQuantity, fieldUnit];
      case 'standard':
        return [fieldStockItem, fieldDescriptionWithLookup, fieldQuantity, fieldPackedQuantity, fieldUnit];
      case 'text':
        return [fieldTextContent];
      case 'charges':
        return [fieldDescription, fieldQuantity, fieldUnit];
      default:
        return [];
    }
  };

  const leftFields = [fieldPosNo, fieldLineType, fieldDescriptionInternal];
  const rightFields = getRightColumnFields();

  const deliveryFields = [
    {
      key: 'hsCode',
      label: 'HS Code',
      type: 'text',
      placeholder: 'Bijv. 8471.30.00',
      register: form.register('hsCode'),
      validation: { error: form.formState.errors.hsCode?.message },
      testId: 'input-hs-code'
    } as FormField2<PackingListItemFormData>,
    {
      key: 'countryOfOrigin',
      label: 'Land van herkomst',
      type: 'text',
      placeholder: 'Bijv. Nederland',
      register: form.register('countryOfOrigin'),
      validation: { error: form.formState.errors.countryOfOrigin?.message },
      testId: 'input-country-of-origin'
    } as FormField2<PackingListItemFormData>,
  ];

  const formSections: FormSection2<PackingListItemFormData>[] = [
    {
      id: 'general',
      label: 'General',
      rows: [
        createTwoColumnRow(leftFields, rightFields),
      ],
    },
    {
      id: 'delivery',
      label: 'Levering',
      rows: [
        createFieldRow(deliveryFields[0]),
        createFieldRow(deliveryFields[1]),
      ]
    },
  ];

  const snippetSelectionDialog = (
    <Dialog open={showSnippetDialog} onOpenChange={setShowSnippetDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Selecteer tekst uit bibliotheek
          </DialogTitle>
          <DialogDescription>
            Kies een tekstblok uit de bibliotheek om aan deze regel toe te voegen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek tekstblokken..."
                  value={snippetSearchTerm}
                  onChange={(e) => setSnippetSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-snippet-search"
                />
              </div>
            </div>
            <Select value={selectedSnippetCategory} onValueChange={setSelectedSnippetCategory}>
              <SelectTrigger className="w-48" data-testid="select-snippet-category">
                <SelectValue placeholder="Alle categorieën" />
              </SelectTrigger>
              <SelectContent>
                {SNIPPET_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            {(isLoadingSnippets || isSearchingSnippets) ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredSnippets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen tekstblokken gevonden</p>
              </div>
            ) : (
              <div className="divide-y max-h-[50vh] overflow-y-auto">
                {filteredSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="p-4 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectSnippet(snippet)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{snippet.title}</h4>
                      {snippet.category && (
                        <Badge variant="secondary" className="text-xs">
                          {snippet.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{snippet.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        toolbar={toolbar}
        documentType="packing-list-item"
        entityId={lineItemId}
        isLoading={isEditing && isLoadingLineItem}
        headerFields={isEditing ? headerFields : undefined}
        formPersistence={{
          formType: "packing-list-item",
          entityId: lineItemId,
          scope: packingListId,
          onChangesDetected: handleChangesDetected,
        }}
      />
      {snippetSelectionDialog}
      <ValidationErrorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        errors={validErrors}
        onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
      />
    </div>
  );
}
