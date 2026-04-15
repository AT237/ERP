import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutForm2, buildFormPersistenceKey, type FormSection2, type FormField2, createFieldRow, createCustomRow, createTwoColumnRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { EntitySelect } from "@/components/ui/entity-select";
import { InventorySelect } from "@/components/ui/inventory-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectItemSchema, type Country, type ProjectItem, type TextSnippet, type Project, type CustomerRate, type RateAndCharge, type Employee } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Package, FileText, Search, Library, Check, CalendarIcon } from "lucide-react";
import { ImageUploadZone } from "@/components/ui/image-upload-zone";
import { LineItemComponentsPanel } from "@/components/ui/line-item-components-panel";
import { EmployeeSelectWithAdd } from "@/components/ui/employee-select-with-add";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LINE_ITEM_TYPES } from "@shared/line-item-types";

const lineItemFormSchema = insertProjectItemSchema.extend({
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
  customerRateId: z.string().optional(),
  technicianNames: z.string().optional(),
  technicianIds: z.string().optional(),
  costPrice: z.string().optional(),
  weight: z.string().optional(),
  collieNumber: z.string().optional(),
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
  customerRateId?: string;
  technicianNames?: string;
  technicianIds?: string;
  costPrice?: string;
  weight?: string;
  collieNumber?: string;
};

interface ProjectLineItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  projectId?: string;
  parentId?: string;
}

export function ProjectLineItemFormLayout({ onSave, lineItemId, projectId, parentId }: ProjectLineItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<Date | undefined>(undefined);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [lineImage, setLineImage] = useState<string | null>(null);

  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    description: { label: "Omschrijving" },
    unitPrice: { label: "Eenheidsprijs" },
  });
  const isEditing = !!lineItemId;

  const [initialCleared] = useState(() => {
    if (!lineItemId) {
      try {
        const key = buildFormPersistenceKey({ formType: "project-line-item", entityId: undefined, scope: projectId });
        localStorage.removeItem(key);
      } catch (e) {}
    }
    return true;
  });

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      projectId: projectId || "",
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
      sourceSnippetId: undefined,
      sourceSnippetVersion: undefined,
      workDate: undefined,
      customerRateId: "",
      technicianNames: "",
      costPrice: "0.00",
      hsCode: "",
      countryOfOrigin: "",
      weight: "0",
      collieNumber: "",
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<ProjectItem>({
    queryKey: ["/api/project-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: projectData } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const customerId = projectData?.customerId;

  const { data: projectDetails } = useQuery<{ project: any; items: ProjectItem[] }>({
    queryKey: ["/api/projects", projectId, "items"],
    queryFn: async () => {
      const itemsRes = await fetch(`/api/projects/${projectId}/items`);
      const items = await itemsRes.json();
      return { project: projectData, items };
    },
    enabled: !!projectId && !isEditing,
  });

  const { data: countriesList = [] } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const { data: customerRates = [] } = useQuery<CustomerRate[]>({
    queryKey: [`/api/customer-rates/${customerId}`],
    enabled: !!customerId,
  });

  const { data: allRates = [] } = useQuery<RateAndCharge[]>({
    queryKey: ["/api/masterdata/rates-and-charges"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
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
      const price = selectedInventoryItem.sellingPrice || selectedInventoryItem.unitPrice;
      if (price) form.setValue("unitPrice", Number(price).toFixed(2));
      if (selectedInventoryItem.costPrice) form.setValue("costPrice", Number(selectedInventoryItem.costPrice).toFixed(2));
      setHasUnsavedChanges(true);
    }
  }, [selectedInventoryItem, itemIdValue, form]);

  const customerRateOptions = useMemo(() => {
    const customerRateMap = new Map<string, CustomerRate>();
    customerRates.forEach(cr => customerRateMap.set(cr.rateId, cr));
    return allRates
      .filter(r => (r as any).isActive !== false && customerRateMap.has(r.id))
      .map(r => {
        const customerRate = customerRateMap.get(r.id);
        const discount = customerRate ? Number(customerRate.discountPercent) || 0 : 0;
        const baseRate = Number(r.rate);
        const discountedPrice = baseRate * (1 - discount / 100);
        return {
          rateId: r.id,
          code: r.code,
          name: r.name,
          unit: r.unit || "",
          baseRate,
          discount,
          discountedPrice,
          label: `${r.code} - ${r.name} (€${discountedPrice.toFixed(2)}${discount > 0 ? ` / ${discount}% disc.` : ''})`,
        };
      });
  }, [customerRates, allRates]);

  useEffect(() => {
    if (!isEditing && projectDetails?.items) {
      const usedNumbers = new Set<number>();
      let maxNumber = 0;
      for (const item of projectDetails.items) {
        if (item.positionNo) {
          const num = parseInt(item.positionNo, 10);
          if (!isNaN(num)) {
            usedNumbers.add(num);
            if (num > maxNumber) maxNumber = num;
          }
        }
      }
      let nextNumber = 10;
      for (let n = 10; n <= maxNumber; n += 10) {
        if (!usedNumbers.has(n)) { nextNumber = n; break; }
        nextNumber = n + 10;
      }
      const nextPositionNo = nextNumber.toString().padStart(3, '0');
      form.setValue('positionNo', nextPositionNo);
      setHasUnsavedChanges(false);
    }
  }, [isEditing, projectDetails, form]);

  const { data: assemblyComponents = [] } = useQuery<any[]>({
    queryKey: ["/api/line-item-components", lineItemId],
    queryFn: () => fetch(`/api/line-item-components/${lineItemId}`).then(r => r.json()),
    enabled: !!lineItemId && lineTypeValue === 'unique',
    staleTime: 10000,
  });

  useEffect(() => {
    if (lineTypeValue === 'unique' && assemblyComponents.length > 0) {
      const totalCost = assemblyComponents.reduce((sum: number, comp: any) => {
        if (comp.componentType === 'text') return sum;
        const qty = parseFloat(comp.quantity || "0") || 0;
        const cost = parseFloat(comp.costPrice || "0") || 0;
        return sum + (qty * cost);
      }, 0);
      form.setValue('costPrice', totalCost.toFixed(2));
    }
  }, [assemblyComponents, lineTypeValue]);

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
        projectId: lineItem.projectId || projectId || "",
        description: lineItem.description || "",
        quantity: parseFloat(String(lineItem.quantity || 1)),
        unit: lineItem.unit || "",
        unitPrice: lineItem.unitPrice?.toString() || "0.00",
        lineTotal: lineItem.lineTotal?.toString() || "0.00",
        lineType: lineItem.lineType || "standard",
        itemId: lineItem.itemId || undefined,
        position: 1,
        positionNo: lineItem.positionNo || "",
        descriptionInternal: lineItem.descriptionInternal || "",
        discountPercent: lineItem.discountPercent?.toString() || "0",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
        workDate: lineItem.workDate || undefined,
        customerRateId: lineItem.customerRateId || "",
        technicianNames: lineItem.technicianNames || "",
        technicianIds: lineItem.technicianIds || "",
        costPrice: lineItem.costPrice?.toString() || "0.00",
        hsCode: lineItem.hsCode || "",
        countryOfOrigin: lineItem.countryOfOrigin || "",
        weight: lineItem.weight?.toString() || "0",
        collieNumber: lineItem.collieNumber || "",
      };

      if (lineItem.workDate) setSelectedDate(new Date(lineItem.workDate));
      if (lineItem.deliveryDate) setSelectedDeliveryDate(new Date(lineItem.deliveryDate));
      if (lineItem.technicianIds) setSelectedEmployeeId((lineItem.technicianIds as string).trim());

      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
      prevItemIdRef.current = lineItem.itemId || "";
      setLineImage(lineItem.lineImage || null);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, projectId]);

  const lineTypeValue = form.watch("lineType");
  const prevLineTypeRef = useRef<string>("");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const discountPercentValue = form.watch("discountPercent");
  const lineTotalValue = form.watch("lineTotal");
  const costPriceValue = form.watch("costPrice");
  const customerRateIdValue = form.watch("customerRateId");

  const marginPercent = useMemo(() => {
    const cost = parseFloat(costPriceValue || "0");
    const price = parseFloat(unitPriceValue || "0");
    if (cost > 0 && price > 0) {
      return (((price - cost) / price) * 100).toFixed(1);
    }
    return null;
  }, [costPriceValue, unitPriceValue]);

  const SNIPPET_CATEGORIES = [
    { value: "all", label: "Alle categorieën" },
    { value: "general", label: "Algemeen" },
    { value: "header", label: "Koptekst" },
    { value: "footer", label: "Voettekst" },
    { value: "disclaimer", label: "Disclaimer" },
    { value: "terms", label: "Voorwaarden" },
    { value: "warranty", label: "Garantie" },
    { value: "delivery", label: "Levering" },
    { value: "payment", label: "Betaling" },
    { value: "contact", label: "Contact" },
    { value: "signature", label: "Ondertekening" },
  ];

  const filteredSnippets = useMemo(() => {
    let snippets = snippetSearchTerm.trim() ? searchedSnippets : textSnippets;
    if (selectedSnippetCategory && selectedSnippetCategory !== "all") {
      snippets = snippets.filter(snippet => snippet.category === selectedSnippetCategory);
    }
    snippets = snippets.filter(snippet => snippet.isActive);
    return snippets;
  }, [textSnippets, searchedSnippets, snippetSearchTerm, selectedSnippetCategory]);

  const discountedUnitPrice = useMemo(() => {
    const unitPrice = parseFloat(unitPriceValue || "0") || 0;
    const discount = parseFloat(discountPercentValue || "0") || 0;
    if (discount > 0) return (unitPrice * (1 - discount / 100)).toFixed(2);
    return null;
  }, [unitPriceValue, discountPercentValue]);

  useEffect(() => {
    const quantity = form.getValues("quantity");
    const unitPrice = parseFloat(form.getValues("unitPrice")) || 0;
    const discount = parseFloat(form.getValues("discountPercent") || "0") || 0;
    const discountedPrice = unitPrice * (1 - discount / 100);
    const lineTotal = (quantity * discountedPrice).toFixed(2);
    form.setValue("lineTotal", lineTotal);
  }, [quantityValue, unitPriceValue, discountPercentValue, form]);

  useEffect(() => {
    if (!lineTypeValue) return;
    const prev = prevLineTypeRef.current;
    prevLineTypeRef.current = lineTypeValue;
    if (lineTypeValue === 'text') {
      if (prev && prev !== 'text') form.setValue("unit" as any, "");
    } else if (lineTypeValue === 'charges') {
      if (prev && prev !== 'charges') {
        const rateOpt = customerRateOptions.find(o => o.rateId === customerRateIdValue);
        form.setValue("unit" as any, rateOpt?.unit || "hrs");
        form.setValue("description", "");
      }
    } else {
      const currentUnit = form.getValues("unit" as any);
      if (!currentUnit) form.setValue("unit" as any, "Pcs.");
    }
  }, [lineTypeValue]);

  useEffect(() => {
    const tabId = lineItemId ? `project-line-${lineItemId}` : `project-line-new-${projectId}`;
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId, projectId]);

  const handleCustomerRateChange = (rateId: string) => {
    form.setValue("customerRateId", rateId);
    const rateOpt = customerRateOptions.find(opt => opt.rateId === rateId);
    if (rateOpt) {
      form.setValue("unitPrice", rateOpt.discountedPrice.toFixed(2));
      form.setValue("unit" as any, rateOpt.unit || "hrs");
    }
    setHasUnsavedChanges(true);
  };

  const handleLineImageChange = useCallback((value: string | null) => {
    setLineImage(value);
    setHasUnsavedChanges(true);
  }, []);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    form.setValue("workDate", date ? date.toISOString() : undefined);
    setHasUnsavedChanges(true);
  };

  const handleDeliveryDateChange = (date: Date | undefined) => {
    setSelectedDeliveryDate(date);
    form.setValue("deliveryDate" as any, date ? date.toISOString() : undefined);
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
      const response = await apiRequest("POST", `/api/projects/${projectId}/items`, data);
      return response.json();
    },
    onSuccess: (newLineItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setHasUnsavedChanges(false);
      const newKey = buildFormPersistenceKey({ formType: "project-line-item", entityId: undefined, scope: projectId });
      localStorage.removeItem(newKey);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: `project-line-new-${projectId}`, hasUnsavedChanges: false }
      }));
      toast({ title: "Opgeslagen", description: "Regel toegevoegd" });
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: { entityType: 'project-item', entity: newLineItem, parentId }
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
      toast({ title: "Fout", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("PUT", `/api/project-items/${lineItemId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setHasUnsavedChanges(false);
      const tabId = lineItemId ? `project-line-${lineItemId}` : `project-line-new-${projectId}`;
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({ title: "Opgeslagen", description: "Regel bijgewerkt" });
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
    setSelectedSnippetCategory("");
    toast({ title: "Snippet toegevoegd", description: `Tekst van "${snippet.title}" is toegevoegd.` });
  };

  const onSubmit = (data: LineItemFormData) => {
    const emp = allEmployees.find(e => e.id === selectedEmployeeId);
    const techPrefix = emp ? ((emp as any).firstInitial || emp.firstName) : "";
    const techName = emp ? `${techPrefix} ${emp.lastName}` : undefined;

    const transformedData = {
      ...data,
      description: data.description || '',
      quantity: Number(data.quantity),
      descriptionInternal: data.descriptionInternal ?? "",
      discountPercent: data.discountPercent || "0",
      sourceSnippetId: data.sourceSnippetId || undefined,
      sourceSnippetVersion: data.sourceSnippetVersion || undefined,
      workDate: selectedDate ? selectedDate.toISOString() : undefined,
      deliveryDate: selectedDeliveryDate ? selectedDeliveryDate.toISOString() : undefined,
      customerRateId: data.customerRateId || undefined,
      technicianNames: techName || undefined,
      technicianIds: selectedEmployeeId || undefined,
      lineImage: lineImage || null,
      weight: data.weight || "0",
      collieNumber: data.collieNumber || "",
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
      const key = buildFormPersistenceKey({ formType: "project-line-item", entityId: undefined, scope: projectId });
      localStorage.removeItem(key);
    }
    onSave();
  }, [lineItemId, projectId, onSave]);

  const toolbar = useFormToolbar({
    entityType: "project_line_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: handleClose,
    saveDisabled: !form.formState.isDirty && !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    extraQueryKeysToInvalidate: projectId ? [["/api/projects", projectId, "items"], ["/api/projects", projectId]] : [],
    navigationListQueryKey: projectId ? ["/api/projects", projectId, "items"] : undefined,
    navigationParentId: projectId,
  });

  const lineTypeOptions = LINE_ITEM_TYPES.map(t => ({ value: t.value, label: t.label }));

  const fieldPosNo: FormField2<LineItemFormData> = {
    key: 'positionNo',
    label: 'Pos. Nr.',
    type: 'text',
    register: form.register('positionNo'),
    placeholder: 'bijv. 010',
    testId: 'input-position-no',
  };

  const fieldLineType: FormField2<LineItemFormData> = {
    key: 'lineType',
    label: 'Type',
    type: 'select',
    options: lineTypeOptions,
    setValue: (value: string) => { form.setValue('lineType', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('lineType'),
    validation: { isRequired: true },
    testId: 'select-line-type',
  };

  const fieldDescriptionInternal: FormField2<LineItemFormData> = {
    key: 'descriptionInternal',
    label: 'Interne omschrijving',
    type: 'textarea',
    placeholder: 'Interne notities...',
    rows: 3,
    register: form.register('descriptionInternal'),
    testId: 'textarea-description-internal',
  };

  const fieldLineTotal: FormField2<LineItemFormData> = {
    key: 'lineTotal',
    label: 'Regeltotaal',
    type: 'text',
    register: form.register('lineTotal'),
    disabled: true,
    className: 'bg-gray-50 dark:bg-gray-800',
    testId: 'input-line-total',
  };

  const fieldCostPrice: FormField2<LineItemFormData> = {
    key: 'costPrice',
    label: 'Kostprijs',
    type: 'decimal',
    prefix: '€',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('costPrice', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('costPrice'),
    testId: 'input-cost-price',
    className: lineTypeValue === 'unique' && assemblyComponents.length > 0 ? 'bg-gray-50 dark:bg-gray-800' : undefined,
    disabled: lineTypeValue === 'unique' && assemblyComponents.length > 0,
  };

  const fieldMargin: FormField2<LineItemFormData> = {
    key: 'margin' as any,
    label: 'Marge',
    type: 'custom',
    customComponent: (
      <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm" data-testid="margin-display">
        {marginPercent ? `${marginPercent.replace('.', ',')}%` : '—'}
      </div>
    ),
  };

  const fieldTechnician: FormField2<LineItemFormData> = {
    key: 'technicianNames',
    label: 'Monteur',
    type: 'custom',
    customComponent: (
      <EmployeeSelectWithAdd
        value={selectedEmployeeId}
        onValueChange={handleEmployeeChange}
        testId="select-technician"
      />
    ),
    testId: 'select-technician',
  };

  const fieldWorkDate: FormField2<LineItemFormData> = {
    key: 'workDate',
    label: 'Werkdatum',
    type: 'custom',
    customComponent: (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal h-10", !selectedDate && "text-muted-foreground")}
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

  const fieldDeliveryDate: FormField2<LineItemFormData> = {
    key: 'deliveryDate' as any,
    label: 'Leverdatum',
    type: 'custom',
    customComponent: (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal h-10", !selectedDeliveryDate && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDeliveryDate ? format(selectedDeliveryDate, "dd-MM-yy") : "Selecteer datum..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDeliveryDate} onSelect={handleDeliveryDateChange} initialFocus />
        </PopoverContent>
      </Popover>
    ),
    testId: 'input-delivery-date',
  };

  const fieldRate: FormField2<LineItemFormData> = {
    key: 'customerRateId',
    label: 'Tarief',
    type: 'custom',
    customComponent: (
      <Select
        value={customerRateIdValue || ""}
        onValueChange={(value) => handleCustomerRateChange(value === "__none__" ? "" : value)}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Selecteer tarief..." />
        </SelectTrigger>
        <SelectContent>
          {customerRateIdValue && (
            <SelectItem value="__none__" className="text-muted-foreground italic">— Selectie wissen —</SelectItem>
          )}
          {customerRateOptions.map(opt => (
            <SelectItem key={opt.rateId} value={opt.rateId}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    testId: 'select-customer-rate',
  };

  const fieldQuantity: FormField2<LineItemFormData> = {
    key: 'quantity',
    label: 'Aantal',
    type: 'number',
    register: form.register('quantity', { valueAsNumber: true }),
    validation: { isRequired: true, error: form.formState.errors.quantity?.message },
    testId: 'input-quantity',
  };

  const fieldUnitPrice: FormField2<LineItemFormData> = {
    key: 'unitPrice',
    label: 'Prijs per eenheid',
    type: 'decimal',
    prefix: '€',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('unitPrice', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('unitPrice'),
    validation: { isRequired: true },
    testId: 'input-unit-price',
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

  const fieldDescription: FormField2<LineItemFormData> = {
    key: 'description',
    label: 'Omschrijving',
    type: 'textarea',
    placeholder: 'Omschrijving...',
    rows: 3,
    register: form.register('description'),
    testId: 'textarea-description',
  };

  const fieldStockItem: FormField2<LineItemFormData> = {
    key: 'itemId',
    label: 'Artikel uit catalogus',
    type: 'custom',
    customComponent: (
      <InventorySelect
        value={form.watch("itemId" as any) || ""}
        onValueChange={(val) => { form.setValue("itemId" as any, val); setHasUnsavedChanges(true); }}
        onItemRefreshed={(freshItem) => {
          const price = freshItem.sellingPrice || freshItem.unitPrice;
          if (price) { form.setValue("unitPrice", Number(price).toFixed(2)); setHasUnsavedChanges(true); }
          if (freshItem.unit) form.setValue("unit" as any, freshItem.unit);
          if (freshItem.description) form.setValue("description", freshItem.description);
          if ((freshItem as any).hsCode) form.setValue("hsCode" as any, (freshItem as any).hsCode);
          if (freshItem.costPrice) form.setValue("costPrice", Number(freshItem.costPrice).toFixed(2));
          if (freshItem.image) { setLineImage(freshItem.image); setHasUnsavedChanges(true); }
          const qty = form.getValues("quantity") || 1;
          if (price) form.setValue("lineTotal", (qty * Number(price)).toFixed(2));
        }}
        placeholder="Artikel zoeken..."
        testId="select-inventory-item"
      />
    ),
  };

  const fieldDescriptionWithLookup: FormField2<LineItemFormData> = {
    key: 'description',
    label: 'Omschrijving',
    type: 'custom',
    customComponent: (
      <div className="space-y-2">
        <textarea
          {...form.register('description')}
          placeholder="Omschrijving..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>
    ),
  };

  const fieldDiscount: FormField2<LineItemFormData> = {
    key: 'discountPercent',
    label: 'Korting %',
    type: 'decimal',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('discountPercent', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('discountPercent'),
    testId: 'input-discount-percent',
  };

  const fieldDiscountedPrice: FormField2<LineItemFormData> = {
    key: 'discountedUnitPrice' as any,
    label: 'Prijs na korting',
    type: 'custom',
    customComponent: (
      <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm">
        {discountedUnitPrice ? `€ ${discountedUnitPrice.replace('.', ',')}` : '—'}
      </div>
    ),
  };

  const fieldTextContent: FormField2<LineItemFormData> = {
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
        >
          <Library className="h-4 w-4" />
          Kies uit tekstbibliotheek
        </Button>
        <textarea
          {...form.register('description')}
          placeholder="Tekst inhoud..."
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>
    ),
  };

  const fieldWeight: FormField2<LineItemFormData> = {
    key: 'weight',
    label: 'Gewicht (kg)',
    type: 'decimal',
    placeholder: '0',
    setValue: (value) => { form.setValue('weight', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('weight'),
    testId: 'input-weight',
  };

  const fieldCollieNumber: FormField2<LineItemFormData> = {
    key: 'collieNumber',
    label: 'Collinummer',
    type: 'text',
    register: form.register('collieNumber'),
    placeholder: 'Bijv. COLLO-001',
    testId: 'input-collie-number',
  };

  const getRightColumnFields = (): FormField2<LineItemFormData>[] => {
    switch (lineTypeValue) {
      case 'charges':
        return [fieldQuantity, fieldUnitPrice, fieldUnit, fieldCostPrice, fieldMargin, fieldLineTotal];
      case 'unique':
        return [fieldQuantity, fieldUnit, fieldUnitPrice, fieldCostPrice, fieldMargin, fieldLineTotal];
      case 'standard':
        return [fieldQuantity, fieldUnit, fieldUnitPrice, fieldDiscount, fieldDiscountedPrice, fieldCostPrice, fieldMargin, fieldLineTotal];
      case 'text':
        return [];
      default:
        return [];
    }
  };

  const getLeftColumnFields = (): FormField2<LineItemFormData>[] => {
    switch (lineTypeValue) {
      case 'charges':
        return [fieldPosNo, fieldLineType, fieldTechnician, fieldWorkDate, fieldRate, fieldDescription];
      case 'unique':
        return [fieldPosNo, fieldLineType, fieldDescription, fieldDescriptionInternal];
      case 'standard':
        return [fieldPosNo, fieldLineType, fieldStockItem, fieldDescriptionWithLookup, fieldDescriptionInternal];
      case 'text':
        return [fieldPosNo, fieldLineType, fieldTextContent];
      default:
        return [fieldPosNo, fieldLineType];
    }
  };

  const leftFields = getLeftColumnFields();
  const rightFields = getRightColumnFields();

  const deliveryFields = [
    {
      key: 'hsCode',
      label: 'HS Code',
      type: 'text',
      placeholder: 'Bijv. 8471.30.00',
      register: form.register('hsCode'),
      testId: 'input-hs-code'
    } as FormField2<LineItemFormData>,
    {
      key: 'countryOfOrigin',
      label: 'Land van herkomst',
      type: 'select',
      options: countriesList.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` })),
      setValue: (value: string) => { form.setValue('countryOfOrigin', value); setHasUnsavedChanges(true); },
      watch: () => form.watch('countryOfOrigin'),
      testId: 'select-country-of-origin'
    } as FormField2<LineItemFormData>,
  ];

  const lineImageField: FormField2<LineItemFormData> = {
    key: 'lineImage' as any,
    label: 'Regelafbeelding',
    type: 'custom',
    customComponent: (
      <ImageUploadZone
        value={lineImage}
        onChange={handleLineImageChange}
        label="Regelafbeelding"
        maxSizeMB={2}
        hint="Klik of sleep een afbeelding · JPG, PNG, max 2MB"
      />
    ),
  };

  const formSections: FormSection2<LineItemFormData>[] = [
    {
      id: 'general',
      label: 'Algemeen',
      rows: [
        createTwoColumnRow(leftFields, rightFields),
      ],
    },
    {
      id: 'image',
      label: 'Afbeelding',
      rows: [
        createFieldRow(lineImageField),
      ],
    },
    {
      id: 'delivery',
      label: 'Levering',
      rows: [
        createFieldRow(deliveryFields[0]),
        createFieldRow(deliveryFields[1]),
        createFieldRow(fieldDeliveryDate),
        createFieldRow(fieldWeight),
        createFieldRow(fieldCollieNumber),
      ]
    },
  ];

  const snippetSelectionDialog = (
    <Dialog open={showSnippetDialog} onOpenChange={setShowSnippetDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Tekst selecteren uit bibliotheek
          </DialogTitle>
          <DialogDescription>
            Kies een tekstblok om toe te voegen aan deze regel.
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
                />
              </div>
            </div>
            <Select value={selectedSnippetCategory} onValueChange={setSelectedSnippetCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Alle categorieën" /></SelectTrigger>
              <SelectContent>
                {SNIPPET_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
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
              <Command>
                <CommandList className="max-h-[400px] overflow-y-auto">
                  <CommandGroup>
                    {filteredSnippets.map((snippet) => (
                      <CommandItem key={snippet.id} onSelect={() => handleSelectSnippet(snippet)} className="p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{snippet.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{snippet.category || 'algemeen'}</Badge>
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
        <div className="flex justify-end gap-2">
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
        documentType="project_line_item"
        entityId={lineItemId}
        persistence={{
          formType: "project-line-item",
          entityId: lineItemId,
          scope: projectId
        }}
        changeTracking={{
          enabled: true,
          onChangesDetected: handleChangesDetected
        }}
        originalValues={originalValues}
        isLoading={isLoadingLineItem}
      />
      {lineTypeValue === 'unique' && isEditing && lineItemId && (
        <LineItemComponentsPanel
          parentLineItemId={lineItemId}
          parentLineItemType="project_item"
        />
      )}
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
