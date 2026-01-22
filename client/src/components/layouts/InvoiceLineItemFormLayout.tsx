import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow, createFieldsRow, createCustomRow, createSectionHeaderRow } from './LayoutForm2';
import type { ActionButton } from './BaseFormLayout';
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
import { insertInvoiceItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Package, FileText, Search, Library, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceItem, InsertInvoiceItem, TextSnippet } from "@shared/schema";
import { z } from "zod";

const lineItemFormSchema = insertInvoiceItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  position: z.number().min(1, "Positie is verplicht").optional(),
  positionNo: z.string().optional(),
  descriptionInternal: z.string().optional(),
  descriptionExternal: z.string().optional(),
  sourceSnippetId: z.string().optional(),
  sourceSnippetVersion: z.number().optional(),
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
  sourceSnippetId?: string;
  sourceSnippetVersion?: number;
};

interface InvoiceLineItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  invoiceId?: string;
  parentId?: string;
}

export function InvoiceLineItemFormLayout({ onSave, lineItemId, invoiceId, parentId }: InvoiceLineItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");
  
  const { toast } = useToast();
  const isEditing = !!lineItemId;

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      invoiceId: invoiceId || "",
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
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean, modifiedFields: Set<string>) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<InvoiceItem>({
    queryKey: ["/api/invoice-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: invoiceDetails } = useQuery<{ invoice: any; items: InvoiceItem[]; customer: any }>({
    queryKey: ["/api/invoices", invoiceId, "details"],
    enabled: !!invoiceId && !isEditing,
  });

  useEffect(() => {
    if (!isEditing && invoiceDetails?.items) {
      let maxNumber = 0;
      for (const item of invoiceDetails.items) {
        if ((item as any).positionNo) {
          const num = parseInt((item as any).positionNo, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
      const nextNumber = maxNumber + 10;
      const nextPositionNo = nextNumber.toString().padStart(3, '0');
      form.setValue('positionNo', nextPositionNo);
    }
  }, [isEditing, invoiceDetails, form]);

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
        invoiceId: lineItem.invoiceId || invoiceId || "",
        description: lineItem.description || "",
        quantity: lineItem.quantity || 1,
        unitPrice: lineItem.unitPrice?.toString() || "0.00",
        lineTotal: lineItem.lineTotal?.toString() || "0.00",
        lineType: lineItem.lineType || "standard",
        itemId: lineItem.itemId || undefined,
        position: 1,
        positionNo: (lineItem as any).positionNo || "",
        descriptionInternal: lineItem.description || "",
        descriptionExternal: lineItem.description || "",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, invoiceId]);

  const lineTypeValue = form.watch("lineType");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const lineTotalValue = form.watch("lineTotal");

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
    const lineTotal = (quantity * unitPrice).toFixed(2);
    form.setValue("lineTotal", lineTotal);
  }, [quantityValue, unitPriceValue, form]);

  useEffect(() => {
    const tabId = lineItemId ? `edit-invoice-line-item-${lineItemId}` : 'new-invoice-line-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId]);

  const recordSnippetUsageMutation = useMutation({
    mutationFn: async (data: { snippetId: string; invoiceId: string; usageType: string }) => {
      const response = await apiRequest("POST", `/api/text-snippets/${data.snippetId}/use`, {
        invoiceId: data.invoiceId,
        usageType: data.usageType,
        usageContext: 'invoice-item'
      });
      return response.json();
    },
    onError: (error) => {
      console.warn("Failed to record snippet usage:", error);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/items`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot add line");
      }
      return response.json();
    },
    onSuccess: (newLineItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      toast({
        title: "Success",
        description: "Line added",
      });
      
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'invoice-item',
          entity: newLineItem,
          parentId: parentId
        }
      }));
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Cannot add line",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("PUT", `/api/invoice-items/${lineItemId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot update line");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      toast({
        title: "Success",
        description: "Line updated",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Cannot update line",
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
    
    if (invoiceId) {
      recordSnippetUsageMutation.mutate({
        snippetId: snippet.id,
        invoiceId: invoiceId,
        usageType: 'invoice-line-item'
      });
    }
    
    toast({
      title: "Snippet Added",
      description: `Text from "${snippet.title}" has been added to the line.`,
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
      value: lineTypeValue || 'standard'
    },
    {
      label: 'Totaal',
      value: `€${lineTotalValue || '0.00'}`
    },
  ];

  const actionButtons: ActionButton[] = [
    {
      key: 'cancel',
      label: 'Cancel',
      icon: <ArrowLeft className="h-4 w-4" />,
      onClick: onSave,
      variant: 'outline',
      testId: 'button-cancel'
    },
    {
      key: 'save',
      label: isEditing ? 'Update' : 'Save',
      icon: <Save className="h-4 w-4" />,
      onClick: form.handleSubmit(onSubmit),
      variant: 'default',
      disabled: !hasUnsavedChanges,
      loading: createMutation.isPending || updateMutation.isPending,
      testId: 'button-save'
    },
  ];

  const lineTypeOptions = [
    { value: 'standard', label: 'Standard Item' },
    { value: 'unique', label: 'Unique Item' },
    { value: 'text', label: 'Text' },
    { value: 'charges', label: 'Charges' },
  ];

  const formFields: FormField2<LineItemFormData>[] = [
    {
      key: 'lineType',
      label: 'Line Type',
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
      label: 'Pos. No.',
      type: 'text',
      register: form.register('positionNo'),
      placeholder: 'e.g. 010',
      validation: {
        error: form.formState.errors.positionNo?.message
      },
      testId: 'input-position-no'
    },
    {
      key: 'quantity',
      label: 'Quantity',
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
      label: 'Unit Price',
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
      label: 'Line Total',
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
      label: 'Internal Description',
      type: 'textarea',
      placeholder: 'Internal description (not visible on invoice)',
      rows: 3,
      register: form.register('descriptionInternal'),
      validation: {
        error: form.formState.errors.descriptionInternal?.message
      },
      testId: 'textarea-description-internal'
    },
    {
      key: 'descriptionExternal',
      label: 'External Description',
      type: 'textarea',
      placeholder: 'External description (visible on invoice)',
      rows: 3,
      register: form.register('descriptionExternal'),
      validation: {
        error: form.formState.errors.descriptionExternal?.message
      },
      testId: 'textarea-description-external'
    }
  ];

  const formSections: FormSection2<LineItemFormData>[] = [
    {
      id: 'general',
      label: 'General',
      rows: [
        createFieldRow(formFields[0]), // lineType
        createFieldRow(formFields[1]), // positionNo
        createFieldRow(formFields[2]), // quantity
        createFieldRow(formFields[3]), // unitPrice
        createFieldRow(formFields[4]), // lineTotal
        createFieldRow(formFields[5]), // descriptionInternal
        createFieldRow(formFields[6]) // descriptionExternal
      ]
    }
  ];

  const snippetSelectionDialog = (
    <Dialog open={showSnippetDialog} onOpenChange={setShowSnippetDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Select text from library
          </DialogTitle>
          <DialogDescription>
            Choose a text block from the library to add to this line. The text will be copied and is independent from the original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search text blocks..."
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
                <SelectValue placeholder="All categories" />
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
                <p>No text blocks found</p>
                {snippetSearchTerm && (
                  <p className="text-sm mt-1">Try a different search term</p>
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
                            <span>Version: {snippet.version}</span>
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
            Cancel
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
        actionButtons={actionButtons}
        infoFields={headerFields}
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
