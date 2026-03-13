import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutForm2, buildFormPersistenceKey, type FormSection2, type FormField2, createFieldRow, createTwoColumnRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkOrderItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Search, Library, Check, CalendarIcon } from "lucide-react";
import { EmployeeSelectWithAdd } from "@/components/ui/employee-select-with-add";
import { useToast } from "@/hooks/use-toast";
import type { WorkOrderItem, InsertWorkOrderItem, TextSnippet, Employee } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LINE_ITEM_TYPES } from "@shared/line-item-types";
import { EntitySelect } from "@/components/ui/entity-select";
import { InventorySelect } from "@/components/ui/inventory-select";

const lineItemFormSchema = insertWorkOrderItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  unit: z.string().optional(),
  position: z.number().min(1, "Positie is verplicht").optional(),
  positionNo: z.string().optional(),
  descriptionInternal: z.string().optional(),
  discountPercent: z.string().optional(),
  sourceSnippetId: z.string().optional(),
  sourceSnippetVersion: z.number().optional(),
  workDate: z.any().optional(),
  technicianNames: z.string().optional(),
  technicianIds: z.string().optional(),
}).refine((data) => {
  if ((data.lineType === 'standard' || data.lineType === 'unique') && data.quantity <= 0) {
    return false;
  }
  return true;
}, {
  message: "Aantal moet groter zijn dan 0 voor standaard en unieke artikelen",
  path: ["quantity"],
});

type LineItemFormData = z.infer<typeof lineItemFormSchema> & {
  position?: number;
  positionNo?: string;
  descriptionInternal?: string;
  discountPercent?: string;
  sourceSnippetId?: string;
  sourceSnippetVersion?: number;
  workDate?: any;
  technicianNames?: string;
  technicianIds?: string;
};

interface WorkOrderLineItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  workOrderId?: string;
  parentId?: string;
}

export function WorkOrderLineItemFormLayout({ onSave, lineItemId, workOrderId, parentId }: WorkOrderLineItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const [, navigate] = useLocation();
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
      workOrderId: workOrderId || "",
      description: "",
      quantity: 1,
      unit: "pcs",
      unitPrice: "0.00",
      lineTotal: "0.00",
      lineType: "",
      itemId: undefined,
      position: 1,
      positionNo: "",
      descriptionInternal: "",
      discountPercent: "0",
      sourceSnippetId: undefined,
      sourceSnippetVersion: undefined,
      workDate: undefined,
      technicianNames: "",
      technicianIds: "",
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<WorkOrderItem>({
    queryKey: ["/api/work-order-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: workOrderDetails } = useQuery<{ workOrder: any; items: WorkOrderItem[] }>({
    queryKey: ["/api/work-orders", workOrderId, "items"],
    enabled: !!workOrderId && !isEditing,
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const itemIdValue = form.watch("itemId");

  const { data: selectedInventoryItem } = useQuery<any>({
    queryKey: ["/api/inventory", itemIdValue],
    enabled: !!itemIdValue,
    staleTime: 5 * 60 * 1000,
  });

  const prevItemIdRef = useRef<string>("");

  useEffect(() => {
    const currentItemId = itemIdValue || "";
    if (selectedInventoryItem && currentItemId && currentItemId !== prevItemIdRef.current) {
      prevItemIdRef.current = currentItemId;
      form.setValue("description", selectedInventoryItem.description || selectedInventoryItem.name || "");
      const unit = selectedInventoryItem.unit;
      if (unit) form.setValue("unit" as any, unit);
      const price = selectedInventoryItem.sellingPrice || selectedInventoryItem.unitPrice;
      if (price) form.setValue("unitPrice", Number(price).toFixed(2));
      setHasUnsavedChanges(true);
    }
  }, [selectedInventoryItem, itemIdValue, form]);

  useEffect(() => {
    if (!isEditing && workOrderDetails) {
      const items = Array.isArray(workOrderDetails) ? workOrderDetails : (workOrderDetails as any)?.items || [];
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
  }, [isEditing, workOrderDetails, form]);

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
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (lineItem) {
      const formData: LineItemFormData = {
        workOrderId: (lineItem as any).workOrderId || workOrderId || "",
        description: lineItem.description || "",
        quantity: parseFloat(String(lineItem.quantity || 1)),
        unit: (lineItem as any).unit || "",
        unitPrice: lineItem.unitPrice?.toString() || "0.00",
        lineTotal: lineItem.lineTotal?.toString() || "0.00",
        lineType: lineItem.lineType || "standard",
        itemId: lineItem.itemId || undefined,
        position: 1,
        positionNo: (lineItem as any).positionNo || "",
        descriptionInternal: (lineItem as any).descriptionInternal || "",
        discountPercent: (lineItem as any).discountPercent?.toString() || "0",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
        workDate: (lineItem as any).workDate || undefined,
        technicianNames: (lineItem as any).technicianNames || "",
        technicianIds: (lineItem as any).technicianIds || "",
      };

      if ((lineItem as any).workDate) setSelectedDate(new Date((lineItem as any).workDate));
      if ((lineItem as any).technicianIds) setSelectedEmployeeId(((lineItem as any).technicianIds as string).trim());

      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
      prevItemIdRef.current = lineItem.itemId || "";
    } else {
      setOriginalValues(form.getValues());
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, workOrderId]);

  const lineTypeValue = form.watch("lineType");
  const prevLineTypeRef = useRef<string>("");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const discountPercentValue = form.watch("discountPercent");
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
      snippets = snippets.filter(s => s.category === selectedSnippetCategory);
    }
    return snippets.filter(s => s.isActive);
  }, [textSnippets, searchedSnippets, snippetSearchTerm, selectedSnippetCategory]);

  useEffect(() => {
    const quantity = form.getValues("quantity");
    const unitPrice = parseFloat(form.getValues("unitPrice")) || 0;
    const discount = parseFloat(form.getValues("discountPercent") || "0") || 0;
    const discountedPrice = unitPrice * (1 - discount / 100);
    form.setValue("lineTotal", (quantity * discountedPrice).toFixed(2));
  }, [quantityValue, unitPriceValue, discountPercentValue, form]);

  useEffect(() => {
    if (!lineTypeValue) return;
    const prev = prevLineTypeRef.current;
    prevLineTypeRef.current = lineTypeValue;
    if (lineTypeValue === 'text') {
      if (prev && prev !== 'text') form.setValue("unit" as any, "");
    } else if (lineTypeValue === 'charges') {
      if (prev && prev !== 'charges') {
        form.setValue("unit" as any, "hrs");
        form.setValue("description", "");
      }
    } else {
      const currentUnit = form.getValues("unit" as any);
      if (!currentUnit) form.setValue("unit" as any, "pcs");
    }
  }, [lineTypeValue]);

  useEffect(() => {
    const tabId = lineItemId ? `edit-work-order-line-item-${lineItemId}` : 'new-work-order-line-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', { detail: { tabId, hasUnsavedChanges } }));
  }, [hasUnsavedChanges, lineItemId]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    form.setValue("workDate", date ? date.toISOString() : undefined);
    setHasUnsavedChanges(true);
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = allEmployees.find(e => e.id === employeeId);
    const prefix = emp ? ((emp as any).firstInitial || emp.firstName) : "";
    const fullName = emp ? `${prefix} ${emp.lastName}` : "";
    form.setValue("technicianNames", fullName);
    form.setValue("technicianIds", employeeId);
    setHasUnsavedChanges(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("POST", `/api/work-orders/${workOrderId}/items`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot add line");
      }
      return response.json();
    },
    onSuccess: (newLineItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "items"] });
      setHasUnsavedChanges(false);
      // Clear the "new" persistence key so data doesn't bleed into the next new item
      const newKey = buildFormPersistenceKey({ formType: "work-order-line-item", entityId: undefined, scope: workOrderId });
      localStorage.removeItem(newKey);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-work-order-line-item', hasUnsavedChanges: false }
      }));
      toast({ title: "Succes", description: "Regel toegevoegd" });
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: { entityType: 'work-order-item', entity: newLineItem, parentId }
      }));
      if (workOrderId && newLineItem?.id) {
        navigate(`/work-orders/${workOrderId}/items/${newLineItem.id}`);
      } else {
        onSave();
      }
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message || "Cannot add line", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("PUT", `/api/work-order-items/${lineItemId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot update line");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-order-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-order-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "items"] });
      setHasUnsavedChanges(false);
      const tabId = lineItemId ? `work-order-line-${lineItemId}` : 'new-work-order-line-item';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', { detail: { tabId, hasUnsavedChanges: false } }));
      toast({ title: "Succes", description: "Regel bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message || "Cannot update line", variant: "destructive" });
    },
  });

  const handleSelectSnippet = (snippet: TextSnippet) => {
    form.setValue("description", snippet.body);
    form.setValue("sourceSnippetId", snippet.id);
    form.setValue("sourceSnippetVersion", snippet.version || undefined);
    if (form.getValues("lineType") !== "text") form.setValue("lineType", "text");
    form.setValue("quantity", 0);
    form.setValue("unitPrice", "0.00");
    form.setValue("lineTotal", "0.00");
    setShowSnippetDialog(false);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("all");
    toast({ title: "Snippet Toegevoegd", description: `Tekst uit "${snippet.title}" toegevoegd.` });
  };

  const onSubmit = (data: LineItemFormData) => {
    const emp = allEmployees.find(e => e.id === selectedEmployeeId);
    const techPrefix = emp ? ((emp as any).firstInitial || emp.firstName) : "";
    const techName = emp ? `${techPrefix} ${emp.lastName}` : undefined;

    const transformedData = {
      ...data,
      description: data.description || '',
      quantity: Number(data.quantity),
      descriptionInternal: data.descriptionInternal || undefined,
      discountPercent: data.discountPercent || "0",
      sourceSnippetId: data.sourceSnippetId || undefined,
      sourceSnippetVersion: data.sourceSnippetVersion || undefined,
      workDate: selectedDate ? selectedDate.toISOString() : undefined,
      technicianNames: techName || undefined,
      technicianIds: selectedEmployeeId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const headerFields: InfoField[] = [
    { label: 'Type', value: lineTypeValue || 'standard' },
    { label: 'Totaal', value: `€${lineTotalValue || '0.00'}` },
  ];

  const handleClose = useCallback(() => {
    if (!lineItemId) {
      const key = buildFormPersistenceKey({ formType: "work-order-line-item", entityId: undefined, scope: workOrderId });
      localStorage.removeItem(key);
    }
    onSave();
  }, [lineItemId, workOrderId, onSave]);

  const toolbar = useFormToolbar({
    entityType: "work_order_line_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: handleClose,
    saveDisabled: !form.formState.isDirty && !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    extraQueryKeysToInvalidate: workOrderId ? [["/api/work-orders", workOrderId, "items"]] : [],
    navigationListQueryKey: workOrderId ? ["/api/work-orders", workOrderId, "items"] : undefined,
    navigationParentId: workOrderId,
  });

  const lineTypeOptions = LINE_ITEM_TYPES.map(t => ({ value: t.value, label: t.label }));

  // ─── Left column fields ────────────────────────────────────────────────────
  const fieldPosNo: FormField2<LineItemFormData> = {
    key: 'positionNo', label: 'Pos. No.', type: 'text',
    register: form.register('positionNo'),
    placeholder: 'bijv. 010',
    validation: { error: form.formState.errors.positionNo?.message },
    testId: 'input-position-no',
  };

  const fieldLineType: FormField2<LineItemFormData> = {
    key: 'lineType', label: 'Line Type', type: 'select',
    options: lineTypeOptions,
    setValue: (value: string) => form.setValue('lineType', value),
    watch: () => form.watch('lineType'),
    validation: { isRequired: true, error: form.formState.errors.lineType?.message },
    testId: 'select-line-type',
  };

  const fieldDescriptionInternal: FormField2<LineItemFormData> = {
    key: 'descriptionInternal', label: 'Interne omschrijving', type: 'textarea',
    placeholder: 'Interne omschrijving (niet zichtbaar op werkbon)',
    rows: 3,
    register: form.register('descriptionInternal'),
    validation: { error: form.formState.errors.descriptionInternal?.message },
    testId: 'textarea-description-internal',
  };

  const fieldLineTotal: FormField2<LineItemFormData> = {
    key: 'lineTotal', label: 'Regel totaal', type: 'text',
    register: form.register('lineTotal'),
    disabled: true,
    className: 'bg-gray-50 dark:bg-gray-800',
    validation: { error: form.formState.errors.lineTotal?.message },
    testId: 'input-line-total',
  };

  // ─── Right column fields ────────────────────────────────────────────────────
  const fieldTechnician: FormField2<LineItemFormData> = {
    key: 'technicianNames', label: 'Technician', type: 'custom',
    customComponent: (
      <EmployeeSelectWithAdd value={selectedEmployeeId} onValueChange={handleEmployeeChange} testId="select-technician" />
    ),
    testId: 'select-technician',
  };

  const fieldWorkDate: FormField2<LineItemFormData> = {
    key: 'workDate', label: 'Work Date', type: 'custom',
    customComponent: (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal h-10", !selectedDate && "text-muted-foreground")}
            data-testid="input-work-date"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "dd-MM-yy") : "Selecteer datum..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={handleDateChange} initialFocus />
        </PopoverContent>
      </Popover>
    ),
    testId: 'input-work-date',
  };

  const fieldQuantity: FormField2<LineItemFormData> = {
    key: 'quantity', label: 'Aantal', type: 'number',
    register: form.register('quantity', { valueAsNumber: true }),
    validation: { isRequired: true, error: form.formState.errors.quantity?.message },
    testId: 'input-quantity',
  };

  const fieldUnitPrice: FormField2<LineItemFormData> = {
    key: 'unitPrice', label: 'Prijs per eenheid', type: 'decimal',
    placeholder: '0,00',
    setValue: (value) => form.setValue('unitPrice', value),
    watch: () => form.watch('unitPrice'),
    validation: { isRequired: true, error: form.formState.errors.unitPrice?.message },
    testId: 'input-unit-price',
  };

  const fieldUnit: FormField2<LineItemFormData> = {
    key: 'unit', label: 'Eenheid', type: 'custom',
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

  const fieldDiscount: FormField2<LineItemFormData> = {
    key: 'discountPercent', label: 'Korting %', type: 'decimal',
    placeholder: '0,00',
    setValue: (value) => form.setValue('discountPercent', value),
    watch: () => form.watch('discountPercent'),
    validation: { error: form.formState.errors.discountPercent?.message },
    testId: 'input-discount-percent',
  };

  const fieldDescriptionWithLookup: FormField2<LineItemFormData> = {
    key: 'description', label: 'Omschrijving', type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <InventorySelect
          value={form.watch("itemId" as any) || ""}
          onValueChange={(val) => { form.setValue("itemId" as any, val); setHasUnsavedChanges(true); }}
          onItemRefreshed={(freshItem) => {
            const price = freshItem.sellingPrice || freshItem.unitPrice;
            if (price) { form.setValue("unitPrice", Number(price).toFixed(2)); setHasUnsavedChanges(true); }
            if (freshItem.unit) { form.setValue("unit" as any, freshItem.unit); }
          }}
          placeholder="Artikel zoeken in catalogus..."
          testId="select-inventory-item"
        />
        <textarea
          {...form.register('description')}
          placeholder="Omschrijving (zichtbaar op werkbon)..."
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

  const fieldDescription: FormField2<LineItemFormData> = {
    key: 'description', label: 'Omschrijving', type: 'textarea',
    placeholder: 'Omschrijving (zichtbaar op werkbon)',
    rows: 3,
    register: form.register('description'),
    validation: { error: form.formState.errors.description?.message },
    testId: 'textarea-description',
  };

  const fieldTextContent: FormField2<LineItemFormData> = {
    key: 'description', label: 'Tekst', type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <Button
          type="button" variant="outline" size="sm"
          onClick={() => { setShowSnippetDialog(true); setSnippetSearchTerm(""); setSelectedSnippetCategory("all"); }}
          className="flex items-center gap-2"
          data-testid="button-open-snippet-library"
        >
          <Library className="h-4 w-4" />
          Kies uit tekstbibliotheek
        </Button>
        <textarea
          {...form.register('description')}
          placeholder="Tekst inhoud (zichtbaar op werkbon)..."
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          data-testid="textarea-text-content"
        />
      </div>
    ),
  };

  const getRightColumnFields = (): FormField2<LineItemFormData>[] => {
    switch (lineTypeValue) {
      case 'charges': return [fieldTechnician, fieldWorkDate, fieldDescription, fieldQuantity, fieldUnitPrice, fieldUnit];
      case 'unique':  return [fieldDescription, fieldQuantity, fieldUnit, fieldUnitPrice];
      case 'standard': return [fieldDescriptionWithLookup, fieldQuantity, fieldUnit, fieldUnitPrice, fieldDiscount];
      case 'text':    return [fieldTextContent];
      default:        return [];
    }
  };

  const leftFields = [fieldPosNo, fieldLineType, fieldDescriptionInternal, fieldLineTotal];
  const rightFields = getRightColumnFields();

  const formSections: FormSection2<LineItemFormData>[] = [
    {
      id: 'general',
      label: 'General',
      rows: [createTwoColumnRow(leftFields, rightFields)],
    },
  ];

  const getCategoryLabel = (cat: string) => SNIPPET_CATEGORIES.find(c => c.value === cat)?.label || cat;

  const snippetSelectionDialog = (
    <Dialog open={showSnippetDialog} onOpenChange={setShowSnippetDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Select text from library
          </DialogTitle>
          <DialogDescription>
            Choose a text block from the library to add to this line.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search text blocks..."
                value={snippetSearchTerm}
                onChange={(e) => setSnippetSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSnippetCategory} onValueChange={setSelectedSnippetCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                {SNIPPET_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
                <p>No text blocks found</p>
              </div>
            ) : (
              <Command>
                <CommandList className="max-h-[400px] overflow-y-auto">
                  <CommandGroup>
                    {filteredSnippets.map(snippet => (
                      <CommandItem
                        key={snippet.id}
                        onSelect={() => handleSelectSnippet(snippet)}
                        className="p-4 cursor-pointer hover:bg-muted/50"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{snippet.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{getCategoryLabel(snippet.category || 'general')}</Badge>
                              <Badge variant="secondary" className="text-xs">{snippet.locale?.toUpperCase() || 'NL'}</Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-3">{snippet.body}</div>
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
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => setShowSnippetDialog(false)}>Annuleren</Button>
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
        documentType="work_order_line_item"
        entityId={lineItemId}
        persistence={{
          formType: "work-order-line-item",
          entityId: lineItemId,
          scope: workOrderId
        }}
        changeTracking={{ enabled: true, onChangesDetected: handleChangesDetected }}
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
