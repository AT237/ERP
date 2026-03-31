import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow, createCustomRow, createTwoColumnRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Package, FileText, Search, Library, Check, ImagePlus, X as XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { QuotationItem, InsertQuotationItem, TextSnippet, Supplier } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDateString } from "@/lib/date-utils";
import { EntitySelect } from "@/components/ui/entity-select";
import { InventorySelect } from "@/components/ui/inventory-select";

const lineItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  unit: z.string().optional(),
  position: z.number().min(1, "Positie is verplicht").optional(),
  positionNo: z.string().optional(),
  descriptionInternal: z.string().optional(),
  descriptionExternal: z.string().optional(),
  discountPercent: z.string().optional(),
  sourceSnippetId: z.string().optional(),
  sourceSnippetVersion: z.number().optional(),
  deliveryDate: z.string().optional(),
  supplierId: z.string().optional(),
  hsCode: z.string().optional(),
  countryOfOrigin: z.string().optional(),
}).refine((data) => {
  if ((data.lineType === 'standard' || data.lineType === 'unique') && data.quantity < 1) {
    return false;
  }
  return true;
}, {
  message: "Aantal moet minimaal 1 zijn voor standaard en unieke artikelen",
  path: ["quantity"],
});

type LineItemFormData = z.infer<typeof lineItemFormSchema> & {
  position?: number;
  positionNo?: string;
  descriptionInternal?: string;
  descriptionExternal?: string;
  discountPercent?: string;
  sourceSnippetId?: string;
  sourceSnippetVersion?: number;
  deliveryDate?: string;
  supplierId?: string;
  hsCode?: string;
  countryOfOrigin?: string;
};

interface LineItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  quotationId?: string;
  parentId?: string;
}

export function LineItemFormLayout({ onSave, lineItemId, quotationId, parentId }: LineItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");
  const [lineImage, setLineImage] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    description: { label: "Omschrijving" },
    unitPrice: { label: "Eenheidsprijs" },
  });
  const isEditing = !!lineItemId;

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      quotationId: quotationId || "",
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
      descriptionExternal: "",
      discountPercent: "0",
      sourceSnippetId: undefined,
      sourceSnippetVersion: undefined,
      deliveryDate: undefined,
      supplierId: undefined,
      hsCode: "",
      countryOfOrigin: "",
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean, modifiedFields: Set<string>) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<QuotationItem>({
    queryKey: ["/api/quotation-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: quotationDetails } = useQuery<{ quotation: any; items: QuotationItem[]; customer: any }>({
    queryKey: ["/api/quotations", quotationId, "details"],
    enabled: !!quotationId && !isEditing,
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  useEffect(() => {
    if (!isEditing && quotationDetails?.items) {
      let maxNumber = 0;
      for (const item of quotationDetails.items) {
        if (item.positionNo) {
          const num = parseInt(item.positionNo, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
      const nextNumber = Math.ceil((maxNumber + 1) / 10) * 10;
      const nextPositionNo = nextNumber.toString().padStart(3, '0');
      form.setValue('positionNo', nextPositionNo);
    }
  }, [isEditing, quotationDetails, form]);

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
      const formData: LineItemFormData = {
        quotationId: lineItem.quotationId || quotationId || "",
        description: lineItem.description || "",
        quantity: lineItem.quantity || 1,
        unit: (lineItem as any).unit || "Pcs.",
        unitPrice: lineItem.unitPrice?.toString() || "0.00",
        lineTotal: lineItem.lineTotal?.toString() || "0.00",
        lineType: lineItem.lineType || "",
        itemId: lineItem.itemId || undefined,
        position: 1,
        positionNo: lineItem.positionNo || "",
        descriptionInternal: lineItem.description || "",
        descriptionExternal: lineItem.description || "",
        discountPercent: (lineItem as any).discountPercent?.toString() || "0",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
        deliveryDate: (lineItem as any).deliveryDate ? toDisplayDate((lineItem as any).deliveryDate) : undefined,
        supplierId: (lineItem as any).supplierId || undefined,
        hsCode: (lineItem as any).hsCode || "",
        countryOfOrigin: (lineItem as any).countryOfOrigin || "",
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, quotationId]);

  const lineTypeValue = form.watch("lineType");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const lineTotalValue = form.watch("lineTotal");
  const discountPercentValue = form.watch("discountPercent");

  const discountedUnitPrice = useMemo(() => {
    const price = parseFloat(unitPriceValue || "0");
    const discount = parseFloat(discountPercentValue || "0");
    if (discount > 0 && price > 0) {
      return (price * (1 - discount / 100)).toFixed(2);
    }
    return null;
  }, [unitPriceValue, discountPercentValue]);

  const SNIPPET_CATEGORIES = [
    { value: "all", label: "Alle categorieën" },
    { value: "general", label: "Algemeen" },
    { value: "header", label: "Kop" },
    { value: "footer", label: "Voet" },
    { value: "disclaimer", label: "Disclaimer" },
    { value: "terms", label: "Voorwaarden" },
    { value: "warranty", label: "Garantie" },
    { value: "delivery", label: "Levering" },
    { value: "payment", label: "Betaling" },
    { value: "contact", label: "Contact" },
    { value: "signature", label: "Handtekening" },
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
    const quantity = form.getValues("quantity");
    const unitPrice = parseFloat(form.getValues("unitPrice")) || 0;
    const discount = parseFloat(form.getValues("discountPercent") || "0") || 0;
    const effectivePrice = discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice;
    const lineTotal = (quantity * effectivePrice).toFixed(2);
    form.setValue("lineTotal", lineTotal);
  }, [quantityValue, unitPriceValue, discountPercentValue, form]);

  useEffect(() => {
    const tabId = lineItemId ? `edit-line-item-${lineItemId}` : 'new-line-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId]);

  const recordSnippetUsageMutation = useMutation({
    mutationFn: async (data: { snippetId: string; quotationId: string; usageType: string }) => {
      const response = await apiRequest("POST", `/api/text-snippets/${data.snippetId}/use`, {
        quotationId: data.quotationId,
        usageType: data.usageType,
        usageContext: 'quotation-item'
      });
      return response.json();
    },
    onError: (error) => {
      console.warn("Failed to record snippet usage:", error);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const qId = data.quotationId || quotationId;
      const response = await apiRequest("POST", `/api/quotations/${qId}/items`, data);
      return response.json();
    },
    onSuccess: (newLineItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", quotationId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", quotationId] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-line-item', hasUnsavedChanges: false }
      }));
      toast({
        title: "Succes",
        description: "Regel toegevoegd",
      });
      
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'quotation-item',
          entity: newLineItem,
          parentId: parentId
        }
      }));
      
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
      toast({
        title: "Fout",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("PUT", `/api/quotation-items/${lineItemId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", quotationId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", quotationId] });
      setHasUnsavedChanges(false);
      const tabId = lineItemId ? `edit-line-item-${lineItemId}` : 'new-line-item';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Succes",
        description: "Regel bijgewerkt",
      });
      window.dispatchEvent(new CustomEvent('entity-updated', {
        detail: { entityType: 'quotation-item', entityId: lineItemId, parentId: quotationId }
      }));
      onSave();
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
      toast({
        title: "Fout",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSelectSnippet = (snippet: TextSnippet) => {
    form.setValue("descriptionExternal", snippet.body);
    form.setValue("sourceSnippetId", snippet.id);
    form.setValue("sourceSnippetVersion", snippet.version || undefined);
    
    if (form.getValues("lineType") !== "text") {
      form.setValue("lineType", "text");
    }
    
    form.setValue("quantity", 0);
    form.setValue("unitPrice", "0.00");
    form.setValue("lineTotal", "0.00");
    
    setShowSnippetDialog(false);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("");
    setHasUnsavedChanges(true);
    
    if (quotationId) {
      recordSnippetUsageMutation.mutate({
        snippetId: snippet.id,
        quotationId: quotationId,
        usageType: 'quotation-line-item'
      });
    }
    
    toast({
      title: "Snippet Toegevoegd",
      description: `Tekst uit "${snippet.title}" is toegevoegd aan de regel.`,
    });
  };

  const handleOpenSnippetLibrary = () => {
    setShowSnippetDialog(true);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("");
  };

  const getCategoryLabel = (categoryValue: string) => {
    const category = SNIPPET_CATEGORIES.find(cat => cat.value === categoryValue);
    return category?.label || categoryValue;
  };

  const onSubmit = (data: LineItemFormData) => {
    const transformedData = {
      ...data,
      quantity: Number(data.quantity),
      description: data.descriptionExternal || data.descriptionInternal || data.description,
      sourceSnippetId: data.sourceSnippetId || undefined,
      sourceSnippetVersion: data.sourceSnippetVersion || undefined,
      deliveryDate: data.deliveryDate ? (toStorageDateString(data.deliveryDate) || undefined) : undefined,
      supplierId: data.supplierId || undefined,
      hsCode: data.hsCode || undefined,
      countryOfOrigin: data.countryOfOrigin || undefined,
    };
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const headerFields: InfoField[] = [
    {
      label: 'Type',
      value: lineTypeValue || '—'
    },
    {
      label: 'Totaal',
      value: `€${lineTotalValue || '0.00'}`
    },
  ];

  const toolbar = useFormToolbar({
    entityType: "line_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: !form.formState.isDirty && !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    extraQueryKeysToInvalidate: quotationId ? [["/api/quotations", quotationId, "details"], ["/api/quotations", quotationId]] : [],
    navigationListQueryKey: quotationId ? ["/api/quotations", quotationId, "items"] : undefined,
    navigationParentId: quotationId,
  });

  const lineTypeOptions = [
    { value: 'standard', label: 'Standaard artikel' },
    { value: 'unique', label: 'Uniek artikel' },
    { value: 'text', label: 'Tekst' },
    { value: 'charges', label: 'Toeslag' },
  ];

  const fieldPosNo: FormField2<LineItemFormData> = {
    key: 'positionNo',
    label: 'Pos. No.',
    type: 'text',
    register: form.register('positionNo'),
    placeholder: 'bijv. 010',
    validation: { error: form.formState.errors.positionNo?.message },
    testId: 'input-position-no',
  };

  const fieldLineType: FormField2<LineItemFormData> = {
    key: 'lineType',
    label: 'Line Type',
    type: 'select',
    options: lineTypeOptions,
    setValue: (value: string) => { form.setValue('lineType', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('lineType'),
    validation: { isRequired: true, error: form.formState.errors.lineType?.message },
    testId: 'select-line-type',
  };

  const fieldDescriptionInternal: FormField2<LineItemFormData> = {
    key: 'descriptionInternal',
    label: 'Interne omschrijving',
    type: 'textarea',
    placeholder: 'Interne omschrijving (niet zichtbaar op offerte)',
    rows: 3,
    register: form.register('descriptionInternal'),
    validation: { error: form.formState.errors.descriptionInternal?.message },
    testId: 'textarea-description-internal',
  };

  const fieldLineTotal: FormField2<LineItemFormData> = {
    key: 'lineTotal',
    label: 'Regel totaal',
    type: 'text',
    register: form.register('lineTotal'),
    disabled: true,
    className: 'bg-gray-50 dark:bg-gray-800',
    validation: { error: form.formState.errors.lineTotal?.message },
    testId: 'input-line-total',
  };

  const fieldStockItem: FormField2<LineItemFormData> = {
    key: 'itemId',
    label: 'Stock item',
    type: 'custom',
    customComponent: (
      <InventorySelect
        value={form.watch("itemId" as any) || ""}
        onValueChange={(val) => { form.setValue("itemId" as any, val); setHasUnsavedChanges(true); }}
        onItemRefreshed={(freshItem) => {
          const price = freshItem.sellingPrice || freshItem.unitPrice;
          if (price) { form.setValue("unitPrice", Number(price).toFixed(2)); setHasUnsavedChanges(true); }
          if (freshItem.unit) { form.setValue("unit" as any, freshItem.unit); }
          if (freshItem.description) { form.setValue("descriptionExternal", freshItem.description); setHasUnsavedChanges(true); }
          if (freshItem.name && !form.getValues("descriptionInternal")) { form.setValue("descriptionInternal", freshItem.name); }
          if ((freshItem as any).hsCode) { form.setValue("hsCode" as any, (freshItem as any).hsCode); }
          const qty = form.getValues("quantity") || 1;
          if (price) {
            form.setValue("lineTotal", (qty * Number(price)).toFixed(2));
          }
        }}
        placeholder="Artikel zoeken in catalogus..."
        testId="select-inventory-item"
      />
    ),
  };

  const fieldDescription: FormField2<LineItemFormData> = {
    key: 'descriptionExternal',
    label: 'Description',
    type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <textarea
          {...form.register('descriptionExternal')}
          placeholder="Description (zichtbaar op offerte)..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          data-testid="textarea-description-external"
        />
        {form.formState.errors.descriptionExternal?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.descriptionExternal.message}</p>
        )}
      </div>
    ),
  };

  const fieldQuantity: FormField2<LineItemFormData> = {
    key: 'quantity',
    label: 'Aantal',
    type: 'number',
    register: form.register('quantity', { valueAsNumber: true }),
    validation: { isRequired: true, error: form.formState.errors.quantity?.message },
    testId: 'input-quantity',
  };

  const fieldUnit: FormField2<LineItemFormData> = {
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

  const fieldUnitPrice: FormField2<LineItemFormData> = {
    key: 'unitPrice',
    label: 'Prijs per eenheid',
    type: 'decimal',
    prefix: '€',
    placeholder: '0,00',
    setValue: (value: string) => { form.setValue('unitPrice', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('unitPrice'),
    validation: { isRequired: true, error: form.formState.errors.unitPrice?.message },
    testId: 'input-unit-price',
  };

  const fieldDiscount: FormField2<LineItemFormData> = {
    key: 'discountPercent',
    label: 'Korting %',
    type: 'decimal',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('discountPercent', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('discountPercent'),
    validation: { error: form.formState.errors.discountPercent?.message },
    testId: 'input-discount-percent',
  };

  const fieldDiscountedPrice: FormField2<LineItemFormData> = {
    key: 'discountedUnitPrice' as any,
    label: 'Prijs na korting',
    type: 'custom',
    customComponent: (
      <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm" data-testid="discounted-unit-price">
        {discountedUnitPrice ? `€ ${discountedUnitPrice.replace('.', ',')}` : '—'}
      </div>
    ),
  };

  const fieldTextContent: FormField2<LineItemFormData> = {
    key: 'descriptionExternal',
    label: 'Tekst',
    type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenSnippetLibrary}
          className="flex items-center gap-2"
          data-testid="button-open-snippet-library"
        >
          <Library className="h-4 w-4" />
          Kies uit tekstbibliotheek
        </Button>
        <textarea
          {...form.register('descriptionExternal')}
          placeholder="Tekst inhoud (zichtbaar op offerte)..."
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          data-testid="textarea-text-content"
        />
        {form.watch("sourceSnippetId") && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Tekst overgenomen uit bibliotheek (versie {form.watch("sourceSnippetVersion")})</span>
          </div>
        )}
      </div>
    ),
  };

  const getRightColumnFields = (): FormField2<LineItemFormData>[] => {
    switch (lineTypeValue) {
      case 'charges':
        return [fieldDescription, fieldQuantity, fieldUnit, fieldUnitPrice];
      case 'unique':
        return [fieldDescription, fieldQuantity, fieldUnit, fieldUnitPrice];
      case 'standard':
        return [fieldStockItem, fieldDescription, fieldQuantity, fieldUnit, fieldUnitPrice, fieldDiscount, fieldDiscountedPrice];
      case 'text':
        return [fieldTextContent];
      default:
        return [];
    }
  };

  const leftFields = [fieldPosNo, fieldLineType, fieldDescriptionInternal, fieldLineTotal];
  const rightFields = getRightColumnFields();

  const deliveryFields: FormField2<LineItemFormData>[] = [
    {
      key: 'deliveryDate',
      label: 'Leverdatum',
      type: 'date',
      placeholder: 'dd-mm-yyyy',
      setValue: (value) => form.setValue('deliveryDate', value),
      watch: () => form.watch('deliveryDate'),
      validation: {
        error: form.formState.errors.deliveryDate?.message
      },
      testId: 'input-delivery-date'
    },
    {
      key: 'supplierId',
      label: 'Leverancier',
      type: 'select',
      options: [
        { value: '', label: 'Selecteer leverancier...' },
        ...suppliers.map(s => ({ value: s.id, label: `${s.supplierNumber} - ${s.name}` }))
      ],
      setValue: (value: string) => form.setValue('supplierId', value || undefined),
      watch: () => form.watch('supplierId') || '',
      validation: {
        error: form.formState.errors.supplierId?.message
      },
      testId: 'select-supplier'
    },
    {
      key: 'hsCode',
      label: 'HS Code',
      type: 'text',
      placeholder: 'Bijv. 8471.30.00',
      register: form.register('hsCode'),
      validation: {
        error: form.formState.errors.hsCode?.message
      },
      testId: 'input-hs-code'
    },
    {
      key: 'countryOfOrigin',
      label: 'Land van oorsprong',
      type: 'text',
      placeholder: 'Bijv. Nederland',
      register: form.register('countryOfOrigin'),
      validation: {
        error: form.formState.errors.countryOfOrigin?.message
      },
      testId: 'input-country-of-origin'
    }
  ];

  const formSections: FormSection2<LineItemFormData>[] = [
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
        createFieldRow(deliveryFields[2]),
        createFieldRow(deliveryFields[3]),
      ]
    }
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
            Kies een tekstblok uit de bibliotheek om toe te voegen aan deze regel. De tekst wordt gekopieerd en is onafhankelijk van het origineel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek in tekstblokken..."
                  value={snippetSearchTerm}
                  onChange={(e) => setSnippetSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-snippet-search"
                />
              </div>
            </div>
            <Select
              value={selectedSnippetCategory}
              onValueChange={setSelectedSnippetCategory}
            >
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
                {snippetSearchTerm && (
                  <p className="text-sm mt-1">Probeer een andere zoekterm</p>
                )}
              </div>
            ) : (
              <Command>
                <CommandList className="max-h-[400px] overflow-y-auto">
                  <CommandGroup>
                    {filteredSnippets.map((snippet) => (
                      <CommandItem
                        key={snippet.id}
                        onSelect={() => handleSelectSnippet(snippet)}
                        className="p-4 cursor-pointer hover:bg-muted/50"
                        data-testid={`snippet-item-${snippet.id}`}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{snippet.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(snippet.category || 'general')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {snippet.locale?.toUpperCase() || 'NL'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {snippet.body}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Code: {snippet.code}</span>
                            <span>Versie: {snippet.version}</span>
                          </div>
                        </div>
                        <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSnippetDialog(false)}
            data-testid="button-cancel-snippet"
          >
            Annuleren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={onSubmit}
        toolbar={toolbar}
        infoFields={headerFields}
        documentType="line_item"
        entityId={lineItemId}
        changeTracking={{
          enabled: true,
          onChangesDetected: handleChangesDetected
        }}
        originalValues={originalValues}
        isLoading={isLoadingLineItem}
      />
      {snippetSelectionDialog}
      <ValidationErrorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        errors={validErrors}
        onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
      />
    </>
  );
}
