import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LayoutForm2, buildFormPersistenceKey, type FormSection2, type FormField2, createTwoColumnRow, createFieldRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { InfoField } from './InfoHeaderLayout';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, RefreshCw, ExternalLink } from "lucide-react";
import { InventorySelect } from "@/components/ui/inventory-select";
import { EntitySelect } from "@/components/ui/entity-select";
import { EmployeeSelectWithAdd } from "@/components/ui/employee-select-with-add";
import { SupplierSelect } from "@/components/ui/supplier-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { LineItemComponent, InventoryItem, CustomerRate, RateAndCharge, Employee, Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


const componentFormSchema = z.object({
  parentLineItemId: z.string(),
  parentLineItemType: z.string(),
  positionNo: z.string().optional().nullable(),
  componentType: z.string().min(1, "Type is verplicht"),
  quantity: z.string().default("1"),
  unitPrice: z.string().default("0"),
  costPrice: z.string().default("0"),
  componentName: z.string().optional().nullable(),
  componentUnit: z.string().optional().nullable(),
  componentItemId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  technicianNames: z.string().optional().nullable(),
  technicianIds: z.string().optional().nullable(),
  workDate: z.string().optional().nullable(),
  customerRateId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

type ComponentFormData = z.infer<typeof componentFormSchema>;

interface ComponentFormLayoutProps {
  onSave: () => void;
  parentLineItemId: string;
  parentLineItemType: string;
  componentId?: string;
  contextPath?: string;
}

export function ComponentFormLayout({ onSave, parentLineItemId, parentLineItemType, componentId, contextPath }: ComponentFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<Partial<ComponentFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [margin, setMargin] = useState<string>("");
  const { toast } = useToast();
  const isEditing = !!componentId;
  const hasClearedRef = useRef(false);

  if (!isEditing && !hasClearedRef.current) {
    hasClearedRef.current = true;
    const persistKey = buildFormPersistenceKey({
      formType: "component",
      entityId: undefined,
      scope: parentLineItemId,
    });
    try { localStorage.removeItem(persistKey); } catch (_) {}
  }

  const form = useForm<ComponentFormData>({
    resolver: zodResolver(componentFormSchema),
    mode: 'onBlur',
    defaultValues: {
      parentLineItemId,
      parentLineItemType,
      positionNo: "",
      componentType: "standard",
      quantity: "1",
      unitPrice: "0.00",
      costPrice: "0.00",
      componentName: "",
      componentUnit: "",
      componentItemId: undefined,
      supplierId: undefined,
      notes: "",
      description: "",
      technicianNames: "",
      technicianIds: "",
      workDate: undefined,
      customerRateId: "",
      sortOrder: 0,
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: component, isLoading: isLoadingComponent } = useQuery<LineItemComponent>({
    queryKey: ["/api/line-item-components", parentLineItemId, componentId],
    queryFn: () => fetch(`/api/line-item-components/${parentLineItemId}`).then(r => r.json()).then((list: LineItemComponent[]) => list.find(c => c.id === componentId)),
    enabled: !!componentId,
  });


  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    staleTime: 30000,
  });

  const { data: allRates = [] } = useQuery<RateAndCharge[]>({
    queryKey: ["/api/masterdata/rates-and-charges"],
    staleTime: 30000,
  });

  const parentEndpoint = useMemo(() => {
    switch (parentLineItemType) {
      case 'invoice_item': return `/api/invoice-items/${parentLineItemId}`;
      case 'quotation_item': return `/api/quotation-items/${parentLineItemId}`;
      case 'proforma_invoice_item': return `/api/proforma-invoice-items/${parentLineItemId}`;
      default: return `/api/project-items/${parentLineItemId}`;
    }
  }, [parentLineItemId, parentLineItemType]);

  const { data: parentLineItem } = useQuery<any>({
    queryKey: ["parent-line-item", parentLineItemType, parentLineItemId],
    queryFn: () => fetch(parentEndpoint).then(r => {
      if (!r.ok) return null;
      return r.json();
    }),
    enabled: !!parentLineItemId,
    staleTime: 60000,
  });

  const parentProjectId = parentLineItem?.projectId;

  const { data: parentProject } = useQuery<any>({
    queryKey: ["/api/projects", parentProjectId],
    enabled: !!parentProjectId,
    staleTime: 60000,
  });

  const parentDocId = parentLineItem?.invoiceId || parentLineItem?.quotationId || parentLineItem?.proformaInvoiceId;
  const parentDocEndpoint = useMemo(() => {
    if (parentLineItem?.invoiceId) return `/api/invoices/${parentLineItem.invoiceId}`;
    if (parentLineItem?.quotationId) return `/api/quotations/${parentLineItem.quotationId}`;
    if (parentLineItem?.proformaInvoiceId) return `/api/proforma-invoices/${parentLineItem.proformaInvoiceId}`;
    return null;
  }, [parentLineItem]);

  const { data: parentDoc } = useQuery<any>({
    queryKey: ["parent-doc", parentDocEndpoint],
    queryFn: () => parentDocEndpoint ? fetch(parentDocEndpoint).then(r => r.ok ? r.json() : null) : null,
    enabled: !!parentDocEndpoint,
    staleTime: 60000,
  });

  const customerId = parentLineItem?.customerId || parentDoc?.customerId || parentProject?.customerId;

  const { data: customerData } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    enabled: !!customerId,
    staleTime: 60000,
  });

  const refreshCustomerData = useCallback(() => {
    if (customerId) {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: [`/api/customer-rates/${customerId}`] });
    }
    queryClient.invalidateQueries({ queryKey: ["parent-line-item", parentLineItemType, parentLineItemId] });
    queryClient.invalidateQueries({ queryKey: ["parent-doc", parentDocEndpoint] });
    if (parentProjectId) {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", parentProjectId] });
    }
    toast({ title: "Vernieuwd", description: "Klantgegevens vernieuwd" });
  }, [customerId, parentLineItemType, parentLineItemId, parentDocEndpoint, parentProjectId]);

  const { data: customerRates = [] } = useQuery<CustomerRate[]>({
    queryKey: [`/api/customer-rates/${customerId}`],
    enabled: !!customerId,
    staleTime: 30000,
  });

  const customerRateOptions = useMemo(() => {
    const customerRateMap = new Map<string, CustomerRate>();
    customerRates.forEach(cr => customerRateMap.set(cr.rateId, cr));

    return allRates
      .filter(r => (r as any).isActive !== false && customerRateMap.has(r.id))
      .map(r => {
        const customerRate = customerRateMap.get(r.id);
        const discount = customerRate ? Number(customerRate.discountPercent) || 0 : 0;
        const baseRate = Number(r.rate) || 0;
        const discountedPrice = discount > 0 ? baseRate * (1 - discount / 100) : baseRate;
        return {
          rateId: r.id,
          label: `${r.code} — ${r.name} (€ ${discountedPrice.toFixed(2)}${discount > 0 ? ` / -${discount}%` : ''})`,
          unit: r.unit || "hrs",
          discountedPrice,
        };
      });
  }, [customerRates, allRates]);

  useEffect(() => {
    if (component && componentId) {
      const vals: Partial<ComponentFormData> = {
        parentLineItemId: component.parentLineItemId,
        parentLineItemType: component.parentLineItemType,
        positionNo: (component as any).positionNo ?? "",
        componentType: component.componentType,
        quantity: component.componentType === 'charge'
          ? String(parseFloat(component.quantity ?? "1"))
          : String(Math.round(parseFloat(component.quantity ?? "1"))),
        unitPrice: component.unitPrice ?? "0",
        costPrice: component.costPrice ?? "0",
        componentName: component.componentName ?? "",
        componentUnit: component.componentUnit ?? "",
        componentItemId: component.componentItemId ?? undefined,
        supplierId: component.supplierId ?? undefined,
        notes: component.notes ?? "",
        description: component.description ?? "",
        technicianNames: component.technicianNames ?? "",
        technicianIds: component.technicianIds ?? "",
        workDate: component.workDate ? new Date(component.workDate).toISOString() : undefined,
        customerRateId: component.customerRateId ?? "",
        sortOrder: component.sortOrder ?? 0,
      };
      form.reset(vals);
      setOriginalValues(vals);

      if (component.workDate) {
        setSelectedDate(new Date(component.workDate));
      }
      if (component.technicianIds) {
        setSelectedEmployeeId(component.technicianIds);
      }
    }
  }, [component, componentId]);

  useEffect(() => {
    const tabId = componentId
      ? `component-${componentId}`
      : `component-new-${parentLineItemId}`;
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, componentId, parentLineItemId]);

  const createMutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      const response = await apiRequest("POST", `/api/line-item-components/${parentLineItemId}`, data);
      return response.json();
    },
    onSuccess: (newComp) => {
      queryClient.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      setHasUnsavedChanges(false);
      toast({ title: "Opgeslagen", description: "Onderdeel toegevoegd" });
      onSave();
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message || "Kan onderdeel niet toevoegen", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      const response = await apiRequest("PATCH", `/api/line-item-components/${parentLineItemId}/${componentId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId, componentId] });
      setHasUnsavedChanges(false);
      toast({ title: "Opgeslagen", description: "Onderdeel bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message || "Kan onderdeel niet bijwerken", variant: "destructive" });
    },
  });

  const onSubmit = (data: ComponentFormData) => {
    const transformedData: any = {
      ...data,
      positionNo: data.positionNo || null,
      componentName: data.componentName || null,
      componentUnit: data.componentUnit || null,
      componentItemId: data.componentItemId || null,
      supplierId: data.supplierId || null,
      notes: data.notes || null,
      description: data.description || null,
      technicianNames: data.technicianNames || null,
      technicianIds: data.technicianIds || null,
      workDate: data.workDate || null,
      customerRateId: data.customerRateId || null,
    };

    if (data.componentType === "text") {
      transformedData.quantity = "0";
      transformedData.unitPrice = "0";
      transformedData.costPrice = "0";
    }

    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const componentTypeValue = form.watch("componentType");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const customerRateIdValue = form.watch("customerRateId");
  const isStandard = componentTypeValue === "standard";
  const isCharge = componentTypeValue === "charge";
  const isText = componentTypeValue === "text";

  const lineTotal = isText ? 0 : (parseFloat(quantityValue || "0") * parseFloat(unitPriceValue || "0"));

  useEffect(() => {
    const qty = parseFloat(form.getValues("quantity") || "0");
    const price = parseFloat(form.getValues("unitPrice") || "0");
    form.setValue("lineTotal" as any, (qty * price).toFixed(2));
  }, [quantityValue, unitPriceValue]);

  const handleCustomerRateChange = (rateId: string) => {
    form.setValue("customerRateId", rateId);
    const rateOpt = customerRateOptions.find(opt => opt.rateId === rateId);
    if (rateOpt) {
      form.setValue("unitPrice", rateOpt.discountedPrice.toFixed(2));
      form.setValue("componentUnit", rateOpt.unit || "hrs");
    }
    setHasUnsavedChanges(true);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date && !(date instanceof Date)) {
      date = new Date(date);
    }
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

  const componentTypeLabel = () => {
    switch (componentTypeValue) {
      case "standard": return "Standard Item";
      case "unique": return "Unique Item";
      case "charge": return "Charge";
      case "text": return "Text";
      default: return componentTypeValue;
    }
  };

  const headerFields: InfoField[] = [
    { label: 'Type', value: componentTypeLabel() },
    ...(isText ? [] : [{ label: 'Totaal', value: `€ ${lineTotal.toFixed(2)}` }]),
  ];

  const handleClose = useCallback(() => {
    onSave();
  }, [onSave]);

  const toolbar = useFormToolbar({
    entityType: "component",
    entityId: componentId,
    onSave: form.handleSubmit(onSubmit),
    onClose: handleClose,
    saveDisabled: !form.formState.isDirty && !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    extraQueryKeysToInvalidate: [["/api/line-item-components", parentLineItemId]],
  });

  const fieldPositionNo: FormField2<ComponentFormData> = {
    key: 'positionNo',
    label: 'Pos. No.',
    type: 'text',
    register: form.register('positionNo'),
    placeholder: 'bijv. 010',
  };

  const fieldCustomerDisplay: FormField2<ComponentFormData> = {
    key: 'customerId' as any,
    label: 'Klant',
    type: 'custom',
    customComponent: (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-10 px-3 py-2 rounded-md border bg-muted/30 text-sm flex items-center text-muted-foreground">
          {customerData ? customerData.name : (customerId ? "Laden..." : "Geen klant gevonden")}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={refreshCustomerData}
          title="Klantgegevens vernieuwen"
        >
          <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
        </Button>
        {customerId && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-tab', {
                detail: { path: `/customers/${customerId}` }
              }));
            }}
            title="Klant openen"
          >
            <ExternalLink className="h-3.5 w-3.5 text-orange-500" />
          </Button>
        )}
      </div>
    ),
  };

  const typeOptions = [
    { value: "standard", label: "Standard Item" },
    { value: "charge", label: "Charges" },
    { value: "unique", label: "Unique Item" },
    { value: "text", label: "Text" },
  ];

  const fieldType: FormField2<ComponentFormData> = {
    key: 'componentType',
    label: 'Type',
    type: 'select',
    options: typeOptions,
    setValue: (value: string) => {
      form.setValue('componentType', value);
      if (value === 'charge') {
        form.setValue('componentUnit', 'hrs');
      }
      setHasUnsavedChanges(true);
    },
    watch: () => form.watch('componentType'),
    validation: { isRequired: true },
  };

  const fieldStockItem: FormField2<ComponentFormData> = {
    key: 'componentItemId' as any,
    label: 'Artikel uit catalogus',
    type: 'custom',
    customComponent: (
      <InventorySelect
        value={form.watch("componentItemId") || ""}
        onValueChange={(val) => {
          form.setValue("componentItemId", val);
          setHasUnsavedChanges(true);
          fetch(`/api/inventory/${val}`).then(r => r.json()).then((freshItem: any) => {
            if (!freshItem) return;
            const price = freshItem.sellingPrice || freshItem.unitPrice;
            if (price) form.setValue("unitPrice", Number(price).toFixed(2));
            if (freshItem.unit) form.setValue("componentUnit", freshItem.unit);
            if (freshItem.description) form.setValue("componentName", freshItem.description);
            const cp = freshItem.costPrice;
            if (cp !== null && cp !== undefined) form.setValue("costPrice", Number(cp).toFixed(2));
          }).catch(() => {});
        }}
        placeholder="Artikel zoeken..."
      />
    ),
  };

  const fieldComponentName: FormField2<ComponentFormData> = {
    key: 'componentName',
    label: 'Naam',
    type: 'text',
    register: form.register('componentName'),
    placeholder: 'Naam onderdeel...',
    validation: { isRequired: !isStandard && !isCharge },
  };

  const fieldInternalNotes: FormField2<ComponentFormData> = {
    key: 'notes',
    label: 'Interne omschrijving',
    type: 'textarea',
    placeholder: 'Interne omschrijving (niet zichtbaar op factuur)',
    rows: 4,
    register: form.register('notes'),
  };

  const fieldDescription: FormField2<ComponentFormData> = {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Description (zichtbaar op factuur)',
    rows: 3,
    register: form.register('description'),
  };

  const fieldNotesGeneral: FormField2<ComponentFormData> = {
    key: 'notes',
    label: 'Omschrijving / Notities',
    type: 'textarea',
    placeholder: 'Omschrijving of notities...',
    rows: 4,
    register: form.register('notes'),
  };

  const fieldTechnician: FormField2<ComponentFormData> = {
    key: 'technicianNames',
    label: 'Technician',
    type: 'custom',
    customComponent: (
      <EmployeeSelectWithAdd
        value={selectedEmployeeId}
        onValueChange={handleEmployeeChange}
      />
    ),
  };

  const fieldWorkDate: FormField2<ComponentFormData> = {
    key: 'workDate',
    label: 'Work Date',
    type: 'custom',
    customComponent: (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal h-10", !selectedDate && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate instanceof Date ? selectedDate : new Date(selectedDate), "dd-MM-yy") : "Selecteer datum..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate instanceof Date ? selectedDate : selectedDate ? new Date(selectedDate) : undefined} onSelect={handleDateChange} initialFocus />
        </PopoverContent>
      </Popover>
    ),
  };

  const fieldRate: FormField2<ComponentFormData> = {
    key: 'customerRateId',
    label: 'Tarief',
    type: 'custom',
    customComponent: (
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <Select
            value={customerRateIdValue || ""}
            onValueChange={(value) => handleCustomerRateChange(value === "__none__" ? "" : value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecteer tarief..." />
            </SelectTrigger>
            <SelectContent>
              {customerRateIdValue && (
                <SelectItem value="__none__" className="text-muted-foreground italic">
                  — Selectie wissen —
                </SelectItem>
              )}
              {customerRateOptions.map(opt => (
                <SelectItem key={opt.rateId} value={opt.rateId}>
                  {opt.label}
                </SelectItem>
              ))}
              {customerRateOptions.length === 0 && (
                <SelectItem value="__none__" disabled className="text-muted-foreground italic text-xs">
                  Geen tarieven beschikbaar
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => {
            if (customerId) {
              queryClient.invalidateQueries({ queryKey: [`/api/customer-rates/${customerId}`] });
              queryClient.invalidateQueries({ queryKey: ["/api/masterdata/rates-and-charges"] });
            }
            toast({ title: "Vernieuwd", description: "Tarieven vernieuwd" });
          }}
          title="Tarieven vernieuwen"
        >
          <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
        </Button>
        {customerRateIdValue && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => {
              const rateOpt = customerRateOptions.find(o => o.rateId === customerRateIdValue);
              if (rateOpt) {
                window.dispatchEvent(new CustomEvent('open-tab', {
                  detail: { path: `/masterdata/rates-and-charges/${customerRateIdValue}` }
                }));
              }
            }}
            title="Tarief openen"
          >
            <ExternalLink className="h-3.5 w-3.5 text-orange-500" />
          </Button>
        )}
      </div>
    ),
  };

  const fieldQuantity: FormField2<ComponentFormData> = isCharge ? {
    key: 'quantity',
    label: 'Aantal',
    type: 'decimal',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('quantity', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('quantity'),
    validation: { isRequired: true },
  } : {
    key: 'quantity',
    label: 'Aantal',
    type: 'number',
    placeholder: '1',
    register: form.register('quantity'),
    validation: { isRequired: true },
  };

  const fieldUnit: FormField2<ComponentFormData> = {
    key: 'componentUnit',
    label: 'Eenheid',
    type: 'custom',
    customComponent: (
      <EntitySelect
        endpoint="units-of-measure"
        formType="masterdata-units-of-measure"
        labelField="name"
        secondaryField="code"
        value={form.watch("componentUnit") || ""}
        onValueChange={(val) => { form.setValue("componentUnit", val); setHasUnsavedChanges(true); }}
        placeholder="Selecteer eenheid..."
      />
    ),
  };

  const fieldUnitPrice: FormField2<ComponentFormData> = {
    key: 'unitPrice',
    label: 'Prijs per eenheid',
    type: 'decimal',
    prefix: '€',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('unitPrice', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('unitPrice'),
    validation: { isRequired: true },
  };

  const fieldCostPrice: FormField2<ComponentFormData> = {
    key: 'costPrice',
    label: 'Kostprijs',
    type: 'decimal',
    prefix: '€',
    placeholder: '0,00',
    setValue: (value) => { form.setValue('costPrice', value); setHasUnsavedChanges(true); },
    watch: () => form.watch('costPrice'),
  };

  const fieldLineTotal: FormField2<ComponentFormData> = {
    key: 'lineTotal' as any,
    label: 'Regeltotaal',
    type: 'custom',
    customComponent: (
      <div className="mt-1 px-3 py-2 rounded-md border bg-muted/50 text-sm font-mono">
        € {lineTotal.toFixed(2)}
      </div>
    ),
  };

  const fieldSupplier: FormField2<ComponentFormData> = {
    key: 'supplierId',
    label: 'Leverancier',
    type: 'custom',
    customComponent: (
      <SupplierSelect
        value={form.watch("supplierId") || ""}
        onValueChange={(v) => { form.setValue("supplierId", v || null); setHasUnsavedChanges(true); }}
        placeholder="Selecteer leverancier..."
        testId="select-component-supplier"
      />
    ),
  };

  const getLeftColumnFields = (): FormField2<ComponentFormData>[] => {
    if (isCharge) {
      return [fieldPositionNo, fieldType, fieldInternalNotes];
    }
    const fields: FormField2<ComponentFormData>[] = [fieldPositionNo, fieldType];
    if (isStandard) {
      fields.push(fieldStockItem);
    } else {
      fields.push(fieldComponentName);
    }
    fields.push(fieldNotesGeneral);
    if (!isStandard) {
      fields.push(fieldSupplier);
    }
    return fields;
  };

  const getRightColumnFields = (): FormField2<ComponentFormData>[] => {
    if (isText) return [];
    if (isCharge) {
      return [fieldTechnician, fieldWorkDate, fieldRate, fieldDescription, fieldQuantity, fieldUnitPrice, fieldUnit];
    }
    return [fieldQuantity, fieldUnit, fieldUnitPrice, fieldCostPrice, fieldLineTotal];
  };

  const formSections: FormSection2<ComponentFormData>[] = [
    {
      id: 'general',
      label: 'Algemeen',
      rows: [
        createTwoColumnRow(getLeftColumnFields(), getRightColumnFields()),
      ],
    },
  ];

  return (
    <LayoutForm2
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      toolbar={toolbar}
      infoFields={headerFields}
      documentType="component"
      entityId={componentId}
      persistence={{
        formType: "component",
        entityId: componentId,
        scope: parentLineItemId
      }}
      changeTracking={{
        enabled: true,
        onChangesDetected: handleChangesDetected
      }}
      originalValues={originalValues}
      isLoading={isLoadingComponent}
    />
  );
}
