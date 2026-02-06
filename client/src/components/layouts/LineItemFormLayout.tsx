import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow, createCustomRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
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
import { Save, ArrowLeft, Package, FileText, Search, Library, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { QuotationItem, InsertQuotationItem, TextSnippet, Supplier } from "@shared/schema";
import { z } from "zod";

// Form schema for line item data
const lineItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  position: z.number().min(1, "Positie is verplicht").optional(),
  positionNo: z.string().optional(),
  descriptionInternal: z.string().optional(),
  descriptionExternal: z.string().optional(),
  sourceSnippetId: z.string().optional(),
  sourceSnippetVersion: z.number().optional(),
  // Delivery fields
  deliveryDate: z.string().optional(),
  supplierId: z.string().optional(),
  hsCode: z.string().optional(),
  countryOfOrigin: z.string().optional(),
}).refine((data) => {
  // For standard and unique line types, quantity must be at least 1
  if ((data.lineType === 'standard' || data.lineType === 'unique') && data.quantity < 1) {
    return false;
  }
  return true;
}, {
  message: "Aantal moet minimaal 1 zijn voor standaard en unieke artikelen",
  path: ["quantity"],
});

// Add virtual fields for internal tracking
type LineItemFormData = z.infer<typeof lineItemFormSchema> & {
  position?: number;
  positionNo?: string;
  descriptionInternal?: string;
  descriptionExternal?: string;
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
  parentId?: string; // ID of the parent tab that opened this form
}

export function LineItemFormLayout({ onSave, lineItemId, quotationId, parentId }: LineItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Snippet selection state
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");
  
  const { toast } = useToast();
  const isEditing = !!lineItemId;

  // Form setup
  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      quotationId: quotationId || "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
      lineType: "standard",
      itemId: undefined,
      position: 1,
      positionNo: "",
      descriptionInternal: "",
      descriptionExternal: "",
      sourceSnippetId: undefined,
      sourceSnippetVersion: undefined,
      deliveryDate: undefined,
      supplierId: undefined,
      hsCode: "",
      countryOfOrigin: "",
    },
  });

  // Change tracking callback
  const handleChangesDetected = useCallback((hasChanges: boolean, modifiedFields: Set<string>) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  // Load line item data if editing
  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<QuotationItem>({
    queryKey: ["/api/quotation-items", lineItemId],
    enabled: !!lineItemId,
  });

  // Load existing quotation items to calculate next positionNo for new items
  const { data: quotationDetails } = useQuery<{ quotation: any; items: QuotationItem[]; customer: any }>({
    queryKey: ["/api/quotations", quotationId, "details"],
    enabled: !!quotationId && !isEditing,
  });

  // Load suppliers for dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Calculate next position number for new items
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
      const nextNumber = maxNumber + 10;
      const nextPositionNo = nextNumber.toString().padStart(3, '0');
      form.setValue('positionNo', nextPositionNo);
    }
  }, [isEditing, quotationDetails, form]);

  // Load text snippets for snippet library
  const { data: textSnippets = [], isLoading: isLoadingSnippets } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets"],
    enabled: showSnippetDialog,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Search snippets when search term changes
  const { data: searchedSnippets = [], isLoading: isSearchingSnippets } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets/search", snippetSearchTerm],
    queryFn: async () => {
      if (!snippetSearchTerm.trim()) return [];
      const response = await fetch(`/api/text-snippets/search?q=${encodeURIComponent(snippetSearchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!snippetSearchTerm.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Update form when line item data loads
  useEffect(() => {
    if (lineItem) {
      const formData: LineItemFormData = {
        quotationId: lineItem.quotationId || quotationId || "",
        description: lineItem.description || "",
        quantity: lineItem.quantity || 1,
        unitPrice: lineItem.unitPrice?.toString() || "0.00",
        lineTotal: lineItem.lineTotal?.toString() || "0.00",
        lineType: lineItem.lineType || "standard",
        itemId: lineItem.itemId || undefined,
        position: 1, // Will be calculated based on quotation items
        positionNo: lineItem.positionNo || "",
        descriptionInternal: lineItem.description || "",
        descriptionExternal: lineItem.description || "",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
        // Delivery fields
        deliveryDate: (lineItem as any).deliveryDate ? new Date((lineItem as any).deliveryDate).toISOString().split('T')[0] : undefined,
        supplierId: (lineItem as any).supplierId || undefined,
        hsCode: (lineItem as any).hsCode || "",
        countryOfOrigin: (lineItem as any).countryOfOrigin || "",
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    } else {
      // For new line item, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, quotationId]);

  // Watch form values for calculations and change tracking
  const lineTypeValue = form.watch("lineType");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const lineTotalValue = form.watch("lineTotal");

  // Available snippet categories
  const SNIPPET_CATEGORIES = [
    { value: "all", label: "All Categories" },
    { value: "general", label: "General" },
    { value: "header", label: "Header" },
    { value: "footer", label: "Footer" },
    { value: "disclaimer", label: "Disclaimer" },
    { value: "terms", label: "Terms & Conditions" },
    { value: "warranty", label: "Warranty" },
    { value: "delivery", label: "Delivery" },
    { value: "payment", label: "Payment" },
    { value: "contact", label: "Contact" },
    { value: "signature", label: "Signature" },
  ];

  // Filter snippets based on search and category
  const filteredSnippets = useMemo(() => {
    let snippets = snippetSearchTerm.trim() ? searchedSnippets : textSnippets;
    
    if (selectedSnippetCategory && selectedSnippetCategory !== "all") {
      snippets = snippets.filter(snippet => snippet.category === selectedSnippetCategory);
    }
    
    // Only show active snippets
    snippets = snippets.filter(snippet => snippet.isActive);
    
    return snippets;
  }, [textSnippets, searchedSnippets, snippetSearchTerm, selectedSnippetCategory]);

  // Calculate line total when quantity or unit price changes
  useEffect(() => {
    const quantity = form.getValues("quantity");
    const unitPrice = parseFloat(form.getValues("unitPrice")) || 0;
    const lineTotal = (quantity * unitPrice).toFixed(2);
    form.setValue("lineTotal", lineTotal);
  }, [quantityValue, unitPriceValue, form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = lineItemId ? `edit-line-item-${lineItemId}` : 'new-line-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId]);

  // Snippet usage tracking mutation
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
      // Non-blocking - don't show error to user
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("POST", "/api/quotation-items", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kan regel niet toevoegen");
      }
      return response.json();
    },
    onSuccess: (newLineItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", quotationId, "details"] });
      toast({
        title: "Succes",
        description: "Regel toegevoegd",
      });
      
      // Dispatch scoped entity-created event
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
      toast({
        title: "Fout",
        description: error.message || "Kan regel niet toevoegen",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("PUT", `/api/quotation-items/${lineItemId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kan regel niet bijwerken");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", quotationId, "details"] });
      toast({
        title: "Succes",
        description: "Regel bijgewerkt",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message || "Kan regel niet bijwerken",
        variant: "destructive",
      });
    },
  });

  // Snippet selection handlers
  const handleSelectSnippet = (snippet: TextSnippet) => {
    console.log("📚 Selecting snippet:", snippet);
    
    // Create snapshot by copying snippet content to form
    form.setValue("descriptionExternal", snippet.body);
    form.setValue("sourceSnippetId", snippet.id);
    form.setValue("sourceSnippetVersion", snippet.version || undefined);
    
    // Set lineType to text if not already
    if (form.getValues("lineType") !== "text") {
      form.setValue("lineType", "text");
    }
    
    // Set quantity to 0 for text lines
    form.setValue("quantity", 0);
    form.setValue("unitPrice", "0.00");
    form.setValue("lineTotal", "0.00");
    
    // Close dialog
    setShowSnippetDialog(false);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("");
    
    // Record usage asynchronously
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

  // Form handlers
  const onSubmit = (data: LineItemFormData) => {
    console.log("💾 Line item form submission data:", data);
    
    // Transform the data to match expected types
    const transformedData = {
      ...data,
      quantity: Number(data.quantity),
      // Use descriptionExternal as the main description if provided, otherwise descriptionInternal
      description: data.descriptionExternal || data.descriptionInternal || data.description,
      sourceSnippetId: data.sourceSnippetId || undefined,
      sourceSnippetVersion: data.sourceSnippetVersion || undefined,
      // Delivery fields
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString() : undefined,
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

  // Header info fields
  const headerFields: InfoField[] = [
    {
      label: 'Type',
      value: lineTypeValue || 'standard'
    },
    {
      label: 'Totaal',
      value: `€${lineTotalValue || '0.00'}`
    },
  ];

  const toolbar = useFormToolbar({
    entityType: "line_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Line type options
  const lineTypeOptions = [
    { value: 'standard', label: 'Standaard artikel' },
    { value: 'unique', label: 'Uniek artikel' },
    { value: 'text', label: 'Tekst' },
    { value: 'charges', label: 'Toeslag' },
  ];

  // Form field definitions
  const formFields: FormField2<LineItemFormData>[] = [
    {
      key: 'lineType',
      label: 'Regeltype',
      type: 'select',
      options: lineTypeOptions,
      setValue: (value: string) => form.setValue('lineType', value),
      watch: () => form.watch('lineType'),
      validation: {
        isRequired: true,
        error: form.formState.errors.lineType?.message
      },
      testId: 'select-line-type'
    },
    {
      key: 'positionNo',
      label: 'Pos. Nr.',
      type: 'text',
      register: form.register('positionNo'),
      placeholder: 'bijv. 010',
      validation: {
        error: form.formState.errors.positionNo?.message
      },
      testId: 'input-position-no'
    },
    {
      key: 'quantity',
      label: 'Aantal',
      type: 'number',
      register: form.register('quantity', { valueAsNumber: true }),
      validation: {
        isRequired: true,
        error: form.formState.errors.quantity?.message
      },
      testId: 'input-quantity'
    },
    {
      key: 'unitPrice',
      label: 'Prijs per eenheid',
      type: 'number',
      register: form.register('unitPrice'),
      validation: {
        isRequired: true,
        error: form.formState.errors.unitPrice?.message
      },
      testId: 'input-unit-price'
    },
    {
      key: 'lineTotal',
      label: 'Regel totaal',
      type: 'text',
      register: form.register('lineTotal'),
      disabled: true,
      className: 'bg-gray-50 dark:bg-gray-800',
      validation: {
        error: form.formState.errors.lineTotal?.message
      },
      testId: 'input-line-total'
    },
    {
      key: 'descriptionInternal',
      label: 'Beschrijving intern',
      type: 'textarea',
      placeholder: 'Interne beschrijving (niet zichtbaar op offerte)',
      rows: 3,
      register: form.register('descriptionInternal'),
      validation: {
        error: form.formState.errors.descriptionInternal?.message
      },
      testId: 'textarea-description-internal'
    }
  ];

  // Create custom description external field with snippet integration
  const createDescriptionExternalField = (): FormField2<LineItemFormData> => ({
    key: 'descriptionExternal',
    label: 'Beschrijving extern',
    type: 'custom',
    labelExtra: form.watch("lineType") === "text" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenSnippetLibrary}
        className="text-xs h-6 px-2"
        data-testid="button-from-library"
      >
        <Library className="h-3 w-3 mr-1" />
        Uit bibliotheek
      </Button>
    ) : undefined,
    validation: {
      error: form.formState.errors.descriptionExternal?.message
    },
    customComponent: (
      <div className="space-y-2">
        <Textarea
          id="descriptionExternal"
          {...form.register("descriptionExternal")}
          placeholder={form.watch("lineType") === "text" ? "Tekst (gebruik \"Uit bibliotheek\" voor herbruikbare tekstblokken)" : "Externe beschrijving (zichtbaar op offerte)"}
          className="min-h-[100px]"
          data-testid="textarea-description-external"
        />
        {form.watch("sourceSnippetId") && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Tekst overgenomen uit bibliotheek (versie {form.watch("sourceSnippetVersion")})</span>
          </div>
        )}
      </div>
    ),
    testId: 'field-description-external'
  });

  // Delivery fields
  const deliveryFields: FormField2<LineItemFormData>[] = [
    {
      key: 'deliveryDate',
      label: 'Leverdatum',
      type: 'date',
      register: form.register('deliveryDate'),
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
      placeholder: 'Bijv. Nederland, China',
      register: form.register('countryOfOrigin'),
      validation: {
        error: form.formState.errors.countryOfOrigin?.message
      },
      testId: 'input-country-of-origin'
    }
  ];

  // Form sections
  const formSections: FormSection2<LineItemFormData>[] = [
    {
      id: 'general',
      label: 'Algemeen',
      rows: [
        createFieldRow(formFields[0]), // lineType
        createFieldRow(formFields[1]), // positionNo
        createFieldRow(formFields[2]), // quantity
        createFieldRow(formFields[3]), // unitPrice
        createFieldRow(formFields[4]), // lineTotal
        createFieldRow(formFields[5]), // descriptionInternal
        createFieldRow(createDescriptionExternalField()) // descriptionExternal with snippet integration
      ]
    },
    {
      id: 'delivery',
      label: 'Levering',
      rows: [
        createFieldRow(deliveryFields[0]), // deliveryDate
        createFieldRow(deliveryFields[1]), // supplierId
        createFieldRow(deliveryFields[2]), // hsCode
        createFieldRow(deliveryFields[3]), // countryOfOrigin
      ]
    }
  ];


  // Snippet Selection Dialog
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
          {/* Search and Category Filter */}
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

          {/* Snippets List */}
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
    </>
  );
}