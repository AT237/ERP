import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
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
import type { QuotationItem, InsertQuotationItem, TextSnippet } from "@shared/schema";
import { z } from "zod";

// Form schema for line item data
const lineItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  position: z.number().min(1, "Positie is verplicht").optional(),
  descriptionInternal: z.string().optional(),
  descriptionExternal: z.string().optional(),
  sourceSnippetId: z.string().optional(),
  sourceSnippetVersion: z.number().optional(),
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
  descriptionInternal?: string;
  descriptionExternal?: string;
  sourceSnippetId?: string;
  sourceSnippetVersion?: number;
};

interface LineItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  quotationId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function LineItemFormLayout({ onSave, lineItemId, quotationId, parentId }: LineItemFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Snippet selection state
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("");
  
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
      descriptionInternal: "",
      descriptionExternal: "",
      sourceSnippetId: undefined,
      sourceSnippetVersion: undefined,
    },
  });

  // Change tracking helpers
  const compareValues = (original: any, current: any) => {
    if (typeof original !== typeof current) return false;
    if (original === null || current === null) return original === current;
    return String(original).trim() === String(current).trim();
  };

  const checkForChanges = () => {
    const currentValues = form.getValues();
    const modifiedFieldsSet = new Set<string>();
    let hasChanges = false;

    Object.keys(originalValues).forEach(fieldName => {
      const originalValue = originalValues[fieldName as keyof LineItemFormData];
      const currentValue = currentValues[fieldName as keyof LineItemFormData];
      
      if (!compareValues(originalValue, currentValue)) {
        modifiedFieldsSet.add(fieldName);
        hasChanges = true;
      }
    });

    setModifiedFields(modifiedFieldsSet);
    setHasUnsavedChanges(hasChanges);
    
    return hasChanges;
  };

  // Get CSS class for field based on whether it's modified
  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  // Load line item data if editing
  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<QuotationItem>({
    queryKey: ["/api/quotation-items", lineItemId],
    enabled: !!lineItemId,
  });

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
        descriptionInternal: lineItem.description || "",
        descriptionExternal: lineItem.description || "",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new line item, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, quotationId]);

  // Watch for form changes and update change tracking
  const descriptionValue = form.watch("description");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const lineTotalValue = form.watch("lineTotal");
  const lineTypeValue = form.watch("lineType");
  const descriptionInternalValue = form.watch("descriptionInternal");
  const descriptionExternalValue = form.watch("descriptionExternal");
  
  useEffect(() => {
    if (Object.keys(originalValues).length > 0) {
      checkForChanges();
    }
  }, [descriptionValue, quantityValue, unitPriceValue, lineTotalValue, lineTypeValue, descriptionInternalValue, descriptionExternalValue]);

  // Available snippet categories
  const SNIPPET_CATEGORIES = [
    { value: "", label: "All Categories" },
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
    
    if (selectedSnippetCategory) {
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
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan regel niet toevoegen",
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
      toast({
        title: "Succes",
        description: "Regel bijgewerkt",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan regel niet bijwerken",
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

  // Action buttons
  const actionButtons: ActionButton[] = [
    {
      key: 'cancel',
      label: 'Annuleren',
      icon: <ArrowLeft className="h-4 w-4" />,
      onClick: onSave,
      variant: 'outline',
      testId: 'button-cancel'
    },
    {
      key: 'save',
      label: isEditing ? 'Bijwerken' : 'Opslaan',
      icon: <Save className="h-4 w-4" />,
      onClick: form.handleSubmit(onSubmit),
      variant: 'default',
      disabled: !hasUnsavedChanges,
      loading: createMutation.isPending || updateMutation.isPending,
      testId: 'button-save'
    },
  ];

  // Line type options
  const lineTypeOptions = [
    { value: 'standard', label: 'Standaard artikel' },
    { value: 'unique', label: 'Uniek artikel' },
    { value: 'text', label: 'Tekst' },
    { value: 'charges', label: 'Toeslag' },
  ];

  // Tab content
  const generalTabContent = (
    <div className="space-y-6">
      {/* Line Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="lineType">Regeltype</Label>
        <Select
          value={form.watch("lineType") || undefined}
          onValueChange={(value) => {
            form.setValue("lineType", value);
            console.log("Selected line type:", value);
          }}
        >
          <SelectTrigger 
            className={getFieldClassName("lineType")}
            data-testid="select-line-type"
          >
            <SelectValue placeholder="Selecteer regeltype" />
          </SelectTrigger>
          <SelectContent>
            {lineTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <Label htmlFor="position">Positie</Label>
        <Input
          id="position"
          type="number"
          {...form.register("position", { valueAsNumber: true })}
          className={getFieldClassName("position")}
          data-testid="input-position"
        />
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">Aantal</Label>
        <Input
          id="quantity"
          type="number"
          {...form.register("quantity", { valueAsNumber: true })}
          className={getFieldClassName("quantity")}
          data-testid="input-quantity"
        />
      </div>

      {/* Unit Price */}
      <div className="space-y-2">
        <Label htmlFor="unitPrice">Prijs per eenheid</Label>
        <Input
          id="unitPrice"
          type="number"
          step="0.01"
          {...form.register("unitPrice")}
          className={getFieldClassName("unitPrice")}
          data-testid="input-unit-price"
        />
      </div>

      {/* Line Total (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="lineTotal">Regel totaal</Label>
        <Input
          id="lineTotal"
          {...form.register("lineTotal")}
          readOnly
          className={`${getFieldClassName("lineTotal")} bg-gray-50 dark:bg-gray-800`}
          data-testid="input-line-total"
        />
      </div>

      {/* Description Internal */}
      <div className="space-y-2">
        <Label htmlFor="descriptionInternal">Beschrijving intern</Label>
        <Textarea
          id="descriptionInternal"
          {...form.register("descriptionInternal")}
          placeholder="Interne beschrijving (niet zichtbaar op offerte)"
          className={getFieldClassName("descriptionInternal")}
          rows={3}
          data-testid="textarea-description-internal"
        />
      </div>

      {/* Description External */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="descriptionExternal">Beschrijving extern</Label>
          {form.watch("lineType") === "text" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenSnippetLibrary}
              className="text-xs h-8"
              data-testid="button-from-library"
            >
              <Library className="h-3 w-3 mr-1" />
              Uit bibliotheek
            </Button>
          )}
        </div>
        <Textarea
          id="descriptionExternal"
          {...form.register("descriptionExternal")}
          placeholder={form.watch("lineType") === "text" ? "Tekst (gebruik \"Uit bibliotheek\" voor herbruikbare tekstblokken)" : "Externe beschrijving (zichtbaar op offerte)"}
          className={getFieldClassName("descriptionExternal")}
          rows={3}
          data-testid="textarea-description-external"
        />
        {form.watch("sourceSnippetId") && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Tekst overgenomen uit bibliotheek (versie {form.watch("sourceSnippetVersion")})</span>
          </div>
        )}
      </div>
    </div>
  );

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

  // Tabs configuration
  const tabs: FormTab[] = [
    {
      id: 'general',
      label: 'Algemeen',
      content: generalTabContent
    },
  ];

  return (
    <>
      <BaseFormLayout
        headerFields={headerFields}
        actionButtons={actionButtons}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLoading={isLoadingLineItem}
      />
      {snippetSelectionDialog}
    </>
  );
}