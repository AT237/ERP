import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { Supplier, InsertSupplier } from "@shared/schema";
import { z } from "zod";
import { 
  LayoutForm2, 
  type FormSection2, 
  type FormField2, 
  createFieldRow, 
  createFieldsRow, 
  createSectionHeaderRow,
  type ChangeTrackingConfig 
} from './LayoutForm2';
import type { InfoField } from './InfoHeaderLayout';

const supplierFormSchema = insertSupplierSchema.extend({
  paymentTerms: z.string().min(1, "Payment terms is required").transform(val => parseInt(val, 10)),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormLayoutProps {
  onSave: () => void;
  supplierId?: string;
  parentId?: string;
}

export function SupplierFormLayout({ onSave, supplierId, parentId }: SupplierFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<SupplierFormData>({} as SupplierFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const isEditing = !!supplierId;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
      taxId: "",
      paymentTerms: "30",
      status: "active",
    },
  });

  // Load supplier data if editing
  const { data: supplier, isLoading: isLoadingSupplier } = useQuery<Supplier>({
    queryKey: ["/api/suppliers", supplierId],
    enabled: !!supplierId,
  });

  // Update form when supplier data loads
  useEffect(() => {
    if (supplier) {
      const formData = {
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        city: supplier.city || "",
        postalCode: supplier.postalCode || "",
        country: supplier.country || "",
        taxId: supplier.taxId || "",
        paymentTerms: supplier.paymentTerms?.toString() || "30",
        status: supplier.status || "active",
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [supplier, form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = supplierId ? `edit-supplier-${supplierId}` : 'new-supplier';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, supplierId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-supplier', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
      
      // Dispatch entity-created event for potential auto-selection
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'supplier',
          entity: newSupplier,
          parentId: parentId
        }
      }));
      
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/suppliers/${supplierId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      const tabId = supplierId ? `edit-supplier-${supplierId}` : 'new-supplier';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    const transformedData = {
      ...data,
      paymentTerms: typeof data.paymentTerms === 'string' ? parseInt(data.paymentTerms, 10) : data.paymentTerms,
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
  const headerFields: InfoField[] = isEditing && supplier ? [
    { key: 'supplier-number', label: 'Supplier ID', value: supplier.supplierNumber || 'N/A' },
    { key: 'status', label: 'Status', value: supplier.status || 'active' },
  ] : [];

  const toolbar = useFormToolbar({
    entityType: "supplier",
    entityId: supplierId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Form sections
  const formSections: FormSection2<SupplierFormData>[] = [
    {
      id: "general",
      label: "General Information",
      icon: <Building2 className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "name",
          label: "Company Name *",
          type: "text",
          placeholder: "Enter supplier company name",
          register: form.register("name"),
          validation: {
            error: form.formState.errors.name?.message,
            isRequired: true
          },
          testId: "input-supplier-name"
        } as FormField2<SupplierFormData>),
        
        createFieldRow({
          key: "contactPerson",
          label: "Contact Person",
          type: "text",
          placeholder: "Primary contact name",
          register: form.register("contactPerson"),
          validation: {
            error: form.formState.errors.contactPerson?.message
          },
          testId: "input-supplier-contact-person"
        } as FormField2<SupplierFormData>),

        createFieldsRow([
          {
            key: "email",
            label: "Email *",
            type: "email",
            placeholder: "supplier@example.com",
            layout: "single",
            register: form.register("email"),
            validation: {
              error: form.formState.errors.email?.message,
              isRequired: true
            },
            testId: "input-supplier-email"
          } as FormField2<SupplierFormData>,
          {
            key: "phone",
            label: "Phone",
            type: "tel",
            placeholder: "+31 20 123 4567",
            layout: "single",
            register: form.register("phone"),
            validation: {
              error: form.formState.errors.phone?.message
            },
            testId: "input-supplier-phone"
          } as FormField2<SupplierFormData>
        ])
      ]
    },
    {
      id: "address",
      label: "Address",
      rows: [
        createFieldRow({
          key: "address",
          label: "Address",
          type: "text",
          placeholder: "Street address",
          register: form.register("address"),
          validation: {
            error: form.formState.errors.address?.message
          },
          testId: "input-supplier-address"
        } as FormField2<SupplierFormData>),

        createFieldsRow([
          {
            key: "city",
            label: "City",
            type: "text",
            placeholder: "City",
            layout: "single",
            register: form.register("city"),
            validation: {
              error: form.formState.errors.city?.message
            },
            testId: "input-supplier-city"
          } as FormField2<SupplierFormData>,
          {
            key: "postalCode",
            label: "Postal Code",
            type: "text",
            placeholder: "1000 AB",
            layout: "single",
            register: form.register("postalCode"),
            validation: {
              error: form.formState.errors.postalCode?.message
            },
            testId: "input-supplier-postal-code"
          } as FormField2<SupplierFormData>
        ]),

        createFieldRow({
          key: "country",
          label: "Country",
          type: "text",
          placeholder: "Netherlands",
          register: form.register("country"),
          validation: {
            error: form.formState.errors.country?.message
          },
          testId: "input-supplier-country"
        } as FormField2<SupplierFormData>)
      ]
    },
    {
      id: "financial",
      label: "Financial Information", 
      rows: [
        createFieldsRow([
          {
            key: "taxId",
            label: "Tax ID",
            type: "text",
            placeholder: "NL123456789B01",
            layout: "single",
            register: form.register("taxId"),
            validation: {
              error: form.formState.errors.taxId?.message
            },
            testId: "input-supplier-tax-id"
          } as FormField2<SupplierFormData>,
          {
            key: "paymentTerms",
            label: "Payment Terms *",
            type: "select",
            options: [
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
              { value: "45", label: "45 days" },
              { value: "60", label: "60 days" }
            ],
            layout: "single",
            setValue: (value) => form.setValue("paymentTerms", value),
            watch: () => form.watch("paymentTerms"),
            validation: {
              error: form.formState.errors.paymentTerms?.message,
              isRequired: true
            },
            testId: "select-supplier-payment-terms"
          } as FormField2<SupplierFormData>
        ]),

        createFieldRow({
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" }
          ],
          setValue: (value) => form.setValue("status", value),
          watch: () => form.watch("status"),
          validation: {
            error: form.formState.errors.status?.message
          },
          testId: "select-supplier-status"
        } as FormField2<SupplierFormData>)
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
      infoFields={headerFields}
      changeTracking={changeTrackingConfig}
      originalValues={originalValues}
      documentType="supplier"
      entityId={supplierId}
      persistence={{
        formType: 'supplier',
        entityId: supplierId
      }}
      isLoading={isLoadingSupplier}
    />
  );
}