import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LayoutForm2, buildFormPersistenceKey, type FormSection2, type FormField2, createTwoColumnRow, createFieldRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { InfoField } from './InfoHeaderLayout';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { InventorySelect } from "@/components/ui/inventory-select";
import { EntitySelect } from "@/components/ui/entity-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { LineItemComponent, InventoryItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface SupplierOption {
  id: string;
  name: string;
  supplierNumber: string;
}

const componentFormSchema = z.object({
  parentLineItemId: z.string(),
  parentLineItemType: z.string(),
  componentType: z.string().min(1, "Type is verplicht"),
  quantity: z.string().default("1"),
  unitPrice: z.string().default("0"),
  costPrice: z.string().default("0"),
  componentName: z.string().optional().nullable(),
  componentUnit: z.string().optional().nullable(),
  componentItemId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
      componentType: "standard",
      quantity: "1",
      unitPrice: "0.00",
      costPrice: "0.00",
      componentName: "",
      componentUnit: "",
      componentItemId: undefined,
      supplierId: undefined,
      notes: "",
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

  const { data: allSuppliers = [] } = useQuery<SupplierOption[]>({
    queryKey: ["/api/suppliers"],
    staleTime: 30000,
  });

  useEffect(() => {
    if (component && componentId) {
      const vals: Partial<ComponentFormData> = {
        parentLineItemId: component.parentLineItemId,
        parentLineItemType: component.parentLineItemType,
        componentType: component.componentType,
        quantity: String(Math.round(parseFloat(component.quantity ?? "1"))),
        unitPrice: component.unitPrice ?? "0",
        costPrice: component.costPrice ?? "0",
        componentName: component.componentName ?? "",
        componentUnit: component.componentUnit ?? "",
        componentItemId: component.componentItemId ?? undefined,
        supplierId: component.supplierId ?? undefined,
        notes: component.notes ?? "",
        sortOrder: component.sortOrder ?? 0,
      };
      form.reset(vals);
      setOriginalValues(vals);
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
    const transformedData = {
      ...data,
      componentName: data.componentName || null,
      componentUnit: data.componentUnit || null,
      componentItemId: data.componentItemId || null,
      supplierId: data.supplierId || null,
      notes: data.notes || null,
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
  const isStandard = componentTypeValue === "standard";
  const isText = componentTypeValue === "text";

  const lineTotal = isText ? 0 : (parseFloat(quantityValue || "0") * parseFloat(unitPriceValue || "0"));

  useEffect(() => {
    const qty = parseFloat(form.getValues("quantity") || "0");
    const price = parseFloat(form.getValues("unitPrice") || "0");
    form.setValue("lineTotal" as any, (qty * price).toFixed(2));
  }, [quantityValue, unitPriceValue]);

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

  const typeOptions = [
    { value: "standard", label: "Standard Item" },
    { value: "charge", label: "Charge" },
    { value: "unique", label: "Unique Item" },
    { value: "text", label: "Text" },
  ];

  const fieldType: FormField2<ComponentFormData> = {
    key: 'componentType',
    label: 'Type',
    type: 'select',
    options: typeOptions,
    setValue: (value: string) => { form.setValue('componentType', value); setHasUnsavedChanges(true); },
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
        }}
        onItemRefreshed={(freshItem) => {
          const price = freshItem.sellingPrice || freshItem.unitPrice;
          if (price) { form.setValue("unitPrice", Number(price).toFixed(2)); setHasUnsavedChanges(true); }
          if (freshItem.unit) form.setValue("componentUnit", freshItem.unit);
          if (freshItem.description) form.setValue("componentName", freshItem.description);
          if (freshItem.costPrice) form.setValue("costPrice", Number(freshItem.costPrice).toFixed(2));
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
    validation: { isRequired: !isStandard },
  };

  const fieldDescription: FormField2<ComponentFormData> = {
    key: 'notes',
    label: 'Omschrijving / Notities',
    type: 'textarea',
    placeholder: 'Omschrijving of notities...',
    rows: 4,
    register: form.register('notes'),
  };

  const fieldQuantity: FormField2<ComponentFormData> = {
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
      <Select
        value={form.watch("supplierId") || "__none__"}
        onValueChange={(v) => { form.setValue("supplierId", v === "__none__" ? null : v); setHasUnsavedChanges(true); }}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Geen leverancier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Geen</SelectItem>
          {allSuppliers.map(s => (
            <SelectItem key={s.id} value={s.id}>
              <span className="font-mono text-xs text-slate-500 mr-1">{s.supplierNumber}</span>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
  };

  const getLeftColumnFields = (): FormField2<ComponentFormData>[] => {
    const fields: FormField2<ComponentFormData>[] = [fieldType];
    if (isStandard) {
      fields.push(fieldStockItem);
    } else {
      fields.push(fieldComponentName);
    }
    fields.push(fieldDescription);
    if (!isStandard) {
      fields.push(fieldSupplier);
    }
    return fields;
  };

  const getRightColumnFields = (): FormField2<ComponentFormData>[] => {
    if (isText) return [];
    const fields: FormField2<ComponentFormData>[] = [fieldQuantity, fieldUnit, fieldUnitPrice, fieldCostPrice, fieldLineTotal];
    return fields;
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
