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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { QuotationItem, InsertQuotationItem } from "@shared/schema";
import { z } from "zod";

// Form schema for line item data
const lineItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(1, "Aantal moet minimaal 1 zijn"),
  position: z.number().min(1, "Positie is verplicht").optional(),
  descriptionInternal: z.string().optional(),
  descriptionExternal: z.string().optional(),
});

// Add virtual fields for internal tracking
type LineItemFormData = z.infer<typeof lineItemFormSchema> & {
  position?: number;
  descriptionInternal?: string;
  descriptionExternal?: string;
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

  // Form handlers
  const onSubmit = (data: LineItemFormData) => {
    console.log("💾 Line item form submission data:", data);
    
    // Transform the data to match expected types
    const transformedData = {
      ...data,
      quantity: Number(data.quantity),
      // Use descriptionExternal as the main description if provided, otherwise descriptionInternal
      description: data.descriptionExternal || data.descriptionInternal || data.description,
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
        <Label htmlFor="descriptionExternal">Beschrijving extern</Label>
        <Textarea
          id="descriptionExternal"
          {...form.register("descriptionExternal")}
          placeholder="Externe beschrijving (zichtbaar op offerte)"
          className={getFieldClassName("descriptionExternal")}
          rows={3}
          data-testid="textarea-description-external"
        />
      </div>
    </div>
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
    <BaseFormLayout
      headerFields={headerFields}
      actionButtons={actionButtons}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isLoading={isLoadingLineItem}
    />
  );
}