import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { EntitySelect } from "@/components/ui/entity-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Package, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { z } from "zod";
import { 
  LayoutForm2, 
  type FormSection2, 
  type FormField2, 
  createFieldRow, 
  createFieldsRow, 
  createSectionHeaderRow,
  createCustomRow,
  type ChangeTrackingConfig 
} from './LayoutForm2';
import type { InfoField } from './InfoHeaderLayout';

const inventoryFormSchema = insertInventoryItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  margin: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

interface InventoryFormLayoutProps {
  onSave: () => void;
  inventoryId?: string;
  parentId?: string;
}

export function InventoryFormLayout({ onSave, inventoryId, parentId }: InventoryFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<InventoryFormData>({} as InventoryFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    sku: { label: "Artikelcode (SKU)" },
    name: { label: "Productnaam" },
    unitPrice: { label: "Verkoopprijs" },
    costPrice: { label: "Kostprijs" },
  });
  const [currentInventoryId, setCurrentInventoryId] = useState<string | undefined>(inventoryId);
  const isEditing = !!currentInventoryId;

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      category: "",
      unitPrice: "",
      costPrice: "",
      margin: "",
      currentStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      unit: "",
      location: "",
      barcode: "",
      isComposite: false,
      status: "active",
      imageUrl: "",
      brand: "",
      manufacturerPartNumber: "",
    },
  });

  const categoryValue = form.watch("category");

  // Load inventory item data if editing
  const { data: inventoryItem, isLoading: isLoadingInventory } = useQuery<InventoryItem>({
    queryKey: ["/api/inventory", inventoryId],
    enabled: !!inventoryId,
  });

  // Update form when inventory data loads
  useEffect(() => {
    if (inventoryItem) {
      const formData = {
        sku: inventoryItem.sku || "",
        name: inventoryItem.name || "",
        description: inventoryItem.description || "",
        category: inventoryItem.category || "",
        unitPrice: inventoryItem.unitPrice?.toString() || "",
        costPrice: inventoryItem.costPrice?.toString() || "",
        margin: inventoryItem.margin?.toString() || "",
        currentStock: inventoryItem.currentStock || 0,
        minimumStock: inventoryItem.minimumStock || 0,
        maximumStock: inventoryItem.maximumStock || 0,
        unit: inventoryItem.unit || "",
        location: inventoryItem.location || "",
        barcode: inventoryItem.barcode || "",
        isComposite: inventoryItem.isComposite || false,
        status: inventoryItem.status || "active",
        imageUrl: inventoryItem.imageUrl || "",
        brand: (inventoryItem as any).brand || "",
        manufacturerPartNumber: (inventoryItem as any).manufacturerPartNumber || "",
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
      
      if (inventoryItem.imageUrl) {
        setImagePreview(inventoryItem.imageUrl);
      }
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [inventoryItem, form]);

  // Calculate margin when prices change
  useEffect(() => {
    const subscription = form.watch((values) => {
      const unitPrice = parseFloat(values.unitPrice || "0");
      const costPrice = parseFloat(values.costPrice || "0");
      
      if (unitPrice && costPrice && costPrice > 0) {
        const newMargin = ((unitPrice - costPrice) / costPrice * 100).toFixed(2);
        // Only set if value changed — prevents infinite watch→setValue→watch loop
        if (newMargin !== values.margin) {
          form.setValue("margin", newMargin, { shouldDirty: false, shouldValidate: false });
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = inventoryId ? `edit-inventory-${inventoryId}` : 'new-inventory';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, inventoryId]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/inventory", data);
      return response.json();
    },
    onSuccess: (newItem) => {
      setCurrentInventoryId(newItem.id);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-inventory', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Inventory item added successfully",
      });
      
      // Dispatch entity-created event for potential auto-selection
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'inventory',
          entity: newItem,
          parentId: parentId
        }
      }));
      
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add inventory item",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/inventory/${currentInventoryId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", currentInventoryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      const tabId = currentInventoryId ? `edit-inventory-${currentInventoryId}` : 'new-inventory';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InventoryFormData) => {
    const transformedData = {
      ...data,
      unitPrice: String(parseFloat(data.unitPrice) || 0),
      costPrice: String(parseFloat(data.costPrice || "0") || 0),
      margin: data.margin != null && data.margin !== "" ? String(parseFloat(data.margin) || 0) : null,
    };
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  // Change tracking configuration
  const changeTrackingConfig: ChangeTrackingConfig = {
    enabled: true,
    suppressTracking: false,
    onChangesDetected: (hasChanges, modifiedFields) => {
      setHasUnsavedChanges(hasChanges);
    }
  };

  // Header fields
  const headerFields: InfoField[] = isEditing && inventoryItem ? [
    { key: 'sku', label: 'SKU', value: inventoryItem.sku || 'N/A' },
    { key: 'status', label: 'Status', value: inventoryItem.status || 'active' },
    { key: 'stock', label: 'Stock', value: inventoryItem.currentStock?.toString() || '0' },
  ] : [];

  const toolbar = useFormToolbar({
    entityType: "inventory",
    entityId: currentInventoryId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Custom image upload component
  const imageUploadComponent = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Item preview" 
              className="w-24 h-24 object-cover rounded-lg border"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-lg border flex items-center justify-center">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            data-testid="input-inventory-image"
          />
          <p className="text-xs text-gray-500 mt-1">Upload an image (JPG, PNG, max 5MB)</p>
        </div>
      </div>
    </div>
  );

  // Form sections
  const formSections: FormSection2<InventoryFormData>[] = [
    {
      id: "general",
      label: "General Information",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "sku",
            label: "Artikelcode (SKU) *",
            type: "text",
            placeholder: "Voer artikelcode in",
            layout: "single",
            register: form.register("sku"),
            validation: {
              error: form.formState.errors.sku?.message,
              isRequired: true
            },
            testId: "input-inventory-sku"
          } as FormField2<InventoryFormData>,
          {
            key: "category",
            label: "Categorie",
            type: "custom",
            layout: "single",
            customComponent: (
              <EntitySelect
                endpoint="inventory-categories"
                formType="masterdata-inventory-categories"
                labelField="name"
                secondaryField="code"
                value={categoryValue || ""}
                onValueChange={(val) => { form.setValue("category", val); setHasUnsavedChanges(true); }}
                placeholder="Selecteer categorie..."
                testId="select-inventory-category"
              />
            ),
            testId: "select-inventory-category"
          } as FormField2<InventoryFormData>
        ]),
        
        createFieldRow({
          key: "name",
          label: "Product Name *",
          type: "text",
          placeholder: "Enter product name",
          register: form.register("name"),
          validation: {
            error: form.formState.errors.name?.message,
            isRequired: true
          },
          testId: "input-inventory-name"
        } as FormField2<InventoryFormData>),

        createFieldsRow([
          {
            key: "brand",
            label: "Merk",
            type: "text",
            layout: "single",
            placeholder: "Bijv. Bosch, Siemens...",
            register: form.register("brand" as any),
            testId: "input-inventory-brand"
          } as FormField2<InventoryFormData>,
          {
            key: "manufacturerPartNumber",
            label: "Fabrikant type nr.",
            type: "text",
            layout: "single",
            placeholder: "Bijv. MPN-12345",
            register: form.register("manufacturerPartNumber" as any),
            testId: "input-inventory-manufacturer-part-number"
          } as FormField2<InventoryFormData>
        ]),

        createFieldRow({
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Enter product description",
          rows: 3,
          register: form.register("description"),
          validation: {
            error: form.formState.errors.description?.message
          },
          testId: "input-inventory-description"
        } as FormField2<InventoryFormData>),

        createCustomRow(imageUploadComponent, "border-t pt-4")
      ]
    },
    {
      id: "pricing",
      label: "Pricing",
      rows: [
        createFieldsRow([
          {
            key: "costPrice",
            label: "Cost Price",
            type: "decimal",
            placeholder: "0,00",
            layout: "single",
            setValue: (value) => form.setValue("costPrice", value),
            watch: () => form.watch("costPrice"),
            validation: {
              error: form.formState.errors.costPrice?.message,
              isRequired: true
            },
            testId: "input-inventory-cost-price"
          } as FormField2<InventoryFormData>,
          {
            key: "unitPrice",
            label: "Selling Price",
            type: "decimal",
            placeholder: "0,00",
            layout: "single",
            setValue: (value) => form.setValue("unitPrice", value),
            watch: () => form.watch("unitPrice"),
            validation: {
              error: form.formState.errors.unitPrice?.message,
              isRequired: true
            },
            testId: "input-inventory-unit-price"
          } as FormField2<InventoryFormData>
        ]),

        createFieldRow({
          key: "margin",
          label: "Margin %",
          type: "display",
          displayValue: form.watch("margin") ? `${String(form.watch("margin")).replace('.', ',')}%` : "0%",
          displayClassName: "text-lg font-semibold text-green-600"
        } as FormField2<InventoryFormData>)
      ]
    },
    {
      id: "inventory",
      label: "Inventory Management",
      rows: [
        createFieldsRow([
          {
            key: "currentStock",
            label: "Current Stock",
            type: "number",
            placeholder: "0",
            layout: "single",
            register: form.register("currentStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.currentStock?.message
            },
            testId: "input-inventory-current-stock"
          } as FormField2<InventoryFormData>,
          {
            key: "unit",
            label: "Unit",
            type: "select",
            options: [
              { value: "pcs", label: "Pieces" },
              { value: "kg", label: "Kilograms" },
              { value: "m", label: "Meters" },
              { value: "l", label: "Liters" },
              { value: "box", label: "Boxes" }
            ],
            layout: "single",
            setValue: (value) => form.setValue("unit", value),
            watch: () => form.watch("unit"),
            validation: {
              error: form.formState.errors.unit?.message
            },
            testId: "select-inventory-unit"
          } as FormField2<InventoryFormData>
        ]),

        createFieldsRow([
          {
            key: "minimumStock",
            label: "Minimum Stock",
            type: "number",
            placeholder: "0",
            layout: "single",
            register: form.register("minimumStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.minimumStock?.message
            },
            testId: "input-inventory-minimum-stock"
          } as FormField2<InventoryFormData>,
          {
            key: "maximumStock",
            label: "Maximum Stock",
            type: "number",
            placeholder: "0",
            layout: "single",
            register: form.register("maximumStock", { valueAsNumber: true }),
            validation: {
              error: form.formState.errors.maximumStock?.message
            },
            testId: "input-inventory-maximum-stock"
          } as FormField2<InventoryFormData>
        ]),

        createFieldsRow([
          {
            key: "location",
            label: "Storage Location",
            type: "text",
            placeholder: "Warehouse A-1-B",
            layout: "single",
            register: form.register("location"),
            validation: {
              error: form.formState.errors.location?.message
            },
            testId: "input-inventory-location"
          } as FormField2<InventoryFormData>,
          {
            key: "barcode",
            label: "Barcode",
            type: "text",
            placeholder: "Barcode/EAN",
            layout: "single",
            register: form.register("barcode"),
            validation: {
              error: form.formState.errors.barcode?.message
            },
            testId: "input-inventory-barcode"
          } as FormField2<InventoryFormData>
        ]),

        createFieldsRow([
          {
            key: "isComposite",
            label: "Is Composite Item",
            type: "custom",
            customComponent: (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...form.register("isComposite")}
                  className="rounded border-gray-300"
                  data-testid="checkbox-inventory-is-composite"
                />
                <span className="text-sm text-gray-600">This item is made of multiple components</span>
              </div>
            ),
            layout: "single"
          } as FormField2<InventoryFormData>,
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "discontinued", label: "Discontinued" }
            ],
            layout: "single",
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            validation: {
              error: form.formState.errors.status?.message
            },
            testId: "select-inventory-status"
          } as FormField2<InventoryFormData>
        ])
      ]
    }
  ];

  return (
    <LayoutForm2
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      toolbar={toolbar}
      headerFields={headerFields}
      documentType="inventory"
      entityId={currentInventoryId}
      changeTracking={changeTrackingConfig}
      originalValues={originalValues}
      isLoading={isLoadingInventory}
      validationErrorDialog={
        <ValidationErrorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          errors={validErrors}
          onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
        />
      }
    />
  );
}