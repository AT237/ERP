import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout } from './BaseFormLayout';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer, QuickAddProject } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPackingListSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Box, Package, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PackingList, InsertPackingList, Customer, Invoice, Project } from "@shared/schema";
import { z } from "zod";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow } from './LayoutForm2';

const formSchema = insertPackingListSchema.extend({
  weight: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

interface PackingListFormLayoutProps {
  onSave: () => void;
  packingListId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function PackingListFormLayout({ onSave, packingListId, parentId }: PackingListFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("basic");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [suppressTracking, setSuppressTracking] = useState(true);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    packingNumber: { label: "Paklijst nummer" },
    customerId: { label: "Klant" },
  });
  const [currentPackingListId, setCurrentPackingListId] = useState<string | undefined>(packingListId);
  const isEditing = !!currentPackingListId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      packingNumber: "",
      customerId: "",
      invoiceId: "",
      projectId: "",
      status: "pending",
      shippingAddress: "",
      shippingMethod: "",
      trackingNumber: "",
      weight: "",
      dimensions: "",
      notes: "",
    },
  });

  // Change tracking helpers
  const compareValues = (original: any, current: any) => {
    const isEmpty = (v: any) => v === null || v === undefined || v === "";
    if (isEmpty(original) && isEmpty(current)) return true;
    if (typeof original !== typeof current) return false;
    if (original === null || current === null) return original === current;
    return String(original).trim() === String(current).trim();
  };

  const checkForChanges = () => {
    const currentValues = form.getValues();
    const modifiedFieldsSet = new Set<string>();
    let hasChanges = false;

    // Compare each field with original values
    Object.keys(originalValues).forEach(fieldName => {
      const originalValue = originalValues[fieldName];
      const currentValue = currentValues[fieldName as keyof typeof currentValues];
      
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
    if (suppressTracking) return baseClassName;
    
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  // Load packing list data if editing
  const { data: packingList, isLoading: isLoadingPackingList } = useQuery<PackingList>({
    queryKey: ["/api/packing-lists", packingListId],
    enabled: !!packingListId,
  });

  // Data queries
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Update form when packing list data loads and store original values for change tracking
  useEffect(() => {
    setSuppressTracking(true);
    
    if (packingList) {
      const formData = {
        packingNumber: packingList.packingNumber || "",
        customerId: packingList.customerId || "",
        invoiceId: packingList.invoiceId || "",
        projectId: packingList.projectId || "",
        status: packingList.status || "pending",
        shippingAddress: packingList.shippingAddress || "",
        shippingMethod: packingList.shippingMethod || "",
        trackingNumber: packingList.trackingNumber || "",
        weight: packingList.weight || "",
        dimensions: packingList.dimensions || "",
        notes: packingList.notes || "",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new packing list, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
    
    // Re-enable tracking after form is stable
    setTimeout(() => setSuppressTracking(false), 100);
  }, [packingList, form]);

  // Throttled change checking - only when tracking is enabled
  const [checkScheduled, setCheckScheduled] = useState(false);
  const scheduleChangeCheck = useCallback(() => {
    if (suppressTracking || checkScheduled) return;
    
    setCheckScheduled(true);
    setTimeout(() => {
      if (!suppressTracking && Object.keys(originalValues).length > 0) {
        checkForChanges();
      }
      setCheckScheduled(false);
    }, 200);
  }, [suppressTracking, checkScheduled, originalValues, checkForChanges]);

  // Watch for changes in specific form values and update change tracking (throttled)
  const packingNumberValue = form.watch("packingNumber");
  const customerIdValue = form.watch("customerId");
  const invoiceIdValue = form.watch("invoiceId");
  const projectIdValue = form.watch("projectId");
  const statusValue = form.watch("status");
  const shippingAddressValue = form.watch("shippingAddress");
  const shippingMethodValue = form.watch("shippingMethod");
  const trackingNumberValue = form.watch("trackingNumber");
  const weightValue = form.watch("weight");
  const dimensionsValue = form.watch("dimensions");
  const notesValue = form.watch("notes");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [packingNumberValue, customerIdValue, invoiceIdValue, projectIdValue, statusValue, shippingAddressValue, shippingMethodValue, trackingNumberValue, weightValue, dimensionsValue, notesValue, scheduleChangeCheck]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = packingListId ? `edit-packing-list-${packingListId}` : 'new-packing-list';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, packingListId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertPackingList) => {
      const response = await apiRequest("POST", "/api/packing-lists", data);
      return response.json();
    },
    onSuccess: (newPackingList) => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-packing-list', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Packing list created successfully",
      });
      
      // Dispatch scoped entity-created event
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'packing-list',
          entity: newPackingList,
          parentId: parentId // Scope to originating component
        }
      }));
      
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create packing list",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertPackingList>) => {
      const response = await apiRequest("PUT", `/api/packing-lists/${packingListId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      const tabId = packingListId ? `edit-packing-list-${packingListId}` : 'new-packing-list';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Packing list updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update packing list",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: FormData) => {
    const submitData: InsertPackingList = {
      ...data,
      weight: data.weight || undefined,
      invoiceId: data.invoiceId || undefined,
      projectId: data.projectId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Custom select components
  const renderCustomerSelect = () => (
    <SelectWithAdd
      value={form.watch("customerId") || ""}
      onValueChange={(value) => form.setValue("customerId", value)}
      placeholder="Select customer"
      addFormTitle="Add New Customer"
      testId="select-customer"
      addFormContent={
        <QuickAddCustomer 
          onSuccess={(customerId) => {
            form.setValue("customerId", customerId);
          }}
        />
      }
    >
      {customers?.map((customer) => (
        <SelectItem key={customer.id} value={customer.id}>
          {customer.name}
        </SelectItem>
      ))}
    </SelectWithAdd>
  );

  const renderInvoiceSelect = () => (
    <Select 
      value={form.watch("invoiceId") || ""} 
      onValueChange={(value) => form.setValue("invoiceId", value)}
    >
      <SelectTrigger data-testid="select-invoice">
        <SelectValue placeholder="Select invoice" />
      </SelectTrigger>
      <SelectContent>
        {invoices?.map((invoice) => (
          <SelectItem key={invoice.id} value={invoice.id}>
            {invoice.invoiceNumber}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderProjectSelect = () => (
    <SelectWithAdd
      value={form.watch("projectId") || ""}
      onValueChange={(value) => form.setValue("projectId", value)}
      placeholder="Select project"
      addFormTitle="Add New Project"
      testId="select-project"
      addFormContent={
        <QuickAddProject 
          onSuccess={(projectId) => {
            form.setValue("projectId", projectId);
          }}
        />
      }
    >
      {projects?.map((project) => (
        <SelectItem key={project.id} value={project.id}>
          {project.name}
        </SelectItem>
      ))}
    </SelectWithAdd>
  );

  // Create form sections
  const createFormSections = (): FormSection2<FormData>[] => [
    {
      id: "basic",
      label: "Basic Info",
      icon: <Box className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "packingNumber",
            label: "Packing Number",
            type: "text",
            placeholder: "PL-2024-0001",
            register: form.register("packingNumber"),
            validation: {
              error: form.formState.errors.packingNumber?.message,
              isRequired: true
            },
            testId: "input-packing-number",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pending", label: "Pending" },
              { value: "packed", label: "Packed" },
              { value: "shipped", label: "Shipped" },
              { value: "delivered", label: "Delivered" }
            ],
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            testId: "select-status",
            width: "50%"
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "customerId",
          label: "Customer",
          type: "custom",
          customComponent: renderCustomerSelect(),
          validation: {
            error: form.formState.errors.customerId?.message,
            isRequired: true
          },
          testId: "select-customer"
        } as FormField2<FormData>)
      ]
    },
    {
      id: "relations",
      label: "Relations",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "invoiceId",
            label: "Invoice (Optional)",
            type: "custom",
            customComponent: renderInvoiceSelect(),
            testId: "select-invoice",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "projectId",
            label: "Project (Optional)",
            type: "custom",
            customComponent: renderProjectSelect(),
            testId: "select-project",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "shipping",
      label: "Shipping",
      icon: <Truck className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "shippingAddress",
          label: "Shipping Address",
          type: "textarea",
          placeholder: "Enter shipping address...",
          register: form.register("shippingAddress"),
          testId: "textarea-shipping-address",
          rows: 3
        } as FormField2<FormData>),
        createFieldsRow([
          {
            key: "shippingMethod",
            label: "Shipping Method",
            type: "select",
            options: [
              { value: "standard", label: "Standard Shipping" },
              { value: "express", label: "Express Shipping" },
              { value: "overnight", label: "Overnight" },
              { value: "freight", label: "Freight" },
              { value: "pickup", label: "Customer Pickup" }
            ],
            setValue: (value) => form.setValue("shippingMethod", value),
            watch: () => form.watch("shippingMethod"),
            testId: "select-shipping-method",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "trackingNumber",
            label: "Tracking Number",
            type: "text",
            placeholder: "Tracking number",
            register: form.register("trackingNumber"),
            testId: "input-tracking-number",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "details",
      label: "Details",
      icon: <span className="text-xs font-bold">⚙</span>,
      rows: [
        createFieldsRow([
          {
            key: "weight",
            label: "Weight (kg)",
            type: "number",
            placeholder: "0.00",
            register: form.register("weight"),
            testId: "input-weight",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "dimensions",
            label: "Dimensions",
            type: "text",
            placeholder: "L x W x H",
            register: form.register("dimensions"),
            testId: "input-dimensions",
            width: "50%"
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "notes",
          label: "Notes",
          type: "textarea",
          placeholder: "Additional notes...",
          register: form.register("notes"),
          testId: "textarea-notes",
          rows: 3
        } as FormField2<FormData>)
      ]
    }
  ];

  const toolbar = useFormToolbar({
    entityType: "packing_list",
    entityId: packingListId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Convert LayoutForm2 sections to BaseFormLayout tabs
  const tabs = createFormSections().map(section => ({
    id: section.id,
    label: section.label,
    content: (
      <div className="space-y-6 p-6">
        {section.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="space-y-4">
            {row.fields?.map((field, fieldIndex) => (
              <div key={fieldIndex} className={`${field.width === "50%" ? "grid grid-cols-2 gap-4" : ""}`}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.validation?.isRequired && <span className="text-red-600 ml-1">*</span>}
                  </label>
                  {field.type === "custom" ? (
                    field.customComponent
                  ) : field.type === "select" ? (
                    <Select 
                      value={field.watch ? field.watch() : ""}
                      onValueChange={field.setValue}
                    >
                      <SelectTrigger data-testid={field.testId}>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      {...(field.register || {})}
                      placeholder={field.placeholder}
                      rows={field.rows || 3}
                      data-testid={field.testId}
                    />
                  ) : (
                    <Input
                      {...(field.register || {})}
                      type={field.type}
                      placeholder={field.placeholder}
                      data-testid={field.testId}
                    />
                  )}
                  {field.validation?.error && (
                    <p className="text-sm text-red-600">{field.validation.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }));

  // Create header fields for BaseFormLayout
  const headerFields: InfoField[] = [
    { 
      label: "Packing Number", 
      value: isEditing ? (packingList?.packingNumber || "-") : "New Packing List"
    },
    { 
      label: "Status", 
      value: isEditing ? (packingList?.status || "pending") : "pending"
    },
  ];

  return (
    <BaseFormLayout
      headerFields={headerFields}
      toolbar={toolbar}
      tabs={tabs}
      activeTab={activeSection}
      onTabChange={setActiveSection}
      isLoading={isLoadingPackingList || createMutation.isPending || updateMutation.isPending}
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