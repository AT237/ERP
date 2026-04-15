import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Building2, CreditCard, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { AddressSelectWithAdd } from "@/components/ui/address-select-with-add";
import { CountrySelectWithAdd } from "@/components/ui/country-select-with-add";
import { LanguageSelectWithAdd } from "@/components/ui/language-select-with-add";
import { PaymentDaySelectWithAdd } from "@/components/ui/payment-day-select-with-add";
import { PaymentTermsSelect } from "@/components/ui/payment-terms-select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier, InsertSupplier } from "@shared/schema";
import { z } from "zod";
import { 
  LayoutForm2, 
  type FormSection2, 
  type FormField2, 
  createFieldRow, 
  createFieldsRow, 
  createSectionHeaderRow,
  createTwoColumnRow,
  type ChangeTrackingConfig 
} from './LayoutForm2';
import type { InfoField } from './InfoHeaderLayout';

const supplierFormSchema = insertSupplierSchema.extend({
  paymentTerms: z.string().optional().transform(val => val ? parseInt(val, 10) : 30),
  paymentDaysId: z.string().optional(),
  countryCode: z.string().optional(),
  addressId: z.string().optional(),
  languageCode: z.string().optional(),
  kvkNummer: z.string().optional(),
  bankAccount: z.string().optional(),
  website: z.string().optional(),
  memo: z.string().optional(),
  mobile: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  discountPercent: z.string().optional().nullable(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormLayoutProps {
  onSave: () => void;
  supplierId?: string;
  parentId?: string;
}

const supplierFieldLabels: Record<string, { label: string; section?: string }> = {
  name: { label: "Bedrijfsnaam", section: "general" },
  email: { label: "E-mail", section: "general" },
  phone: { label: "Telefoon", section: "general" },
  mobile: { label: "Mobiel", section: "general" },
  contactPerson: { label: "Contactpersoon", section: "general" },
  addressId: { label: "Adres", section: "general" },
  countryCode: { label: "Land", section: "general" },
  kvkNummer: { label: "KvK Nummer", section: "general" },
  taxId: { label: "BTW Nummer", section: "general" },
  languageCode: { label: "Taal", section: "general" },
  paymentTerms: { label: "Betalingstermijn", section: "financial" },
  paymentDaysId: { label: "Betaaldag", section: "financial" },
  bankAccount: { label: "Bankrekening", section: "financial" },
  website: { label: "Website", section: "general" },
  memo: { label: "Memo", section: "general" },
  status: { label: "Status", section: "general" },
};

export function SupplierFormLayout({ onSave, supplierId, parentId }: SupplierFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<SupplierFormData>({} as SupplierFormData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors(supplierFieldLabels);
  const [currentSupplierId, setCurrentSupplierId] = useState<string | undefined>(supplierId);
  const isEditing = !!currentSupplierId;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      mobile: "",
      address: "",
      addressId: "",
      city: "",
      postalCode: "",
      country: "",
      countryCode: "",
      taxId: "",
      kvkNummer: "",
      bankAccount: "",
      website: "",
      memo: "",
      languageCode: "nl",
      paymentTerms: "30",
      paymentDaysId: "",
      status: "active",
    },
  });

  const { data: supplier, isLoading: isLoadingSupplier } = useQuery<Supplier>({
    queryKey: ["/api/suppliers", supplierId],
    enabled: !!supplierId,
  });

  useEffect(() => {
    if (supplier) {
      const formData = {
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        mobile: (supplier as any).mobile || "",
        address: supplier.address || "",
        addressId: (supplier as any).addressId || "",
        city: (supplier as any).city || "",
        postalCode: (supplier as any).postalCode || "",
        country: (supplier as any).country || "",
        countryCode: (supplier as any).countryCode || "",
        taxId: supplier.taxId || "",
        kvkNummer: (supplier as any).kvkNummer || "",
        bankAccount: (supplier as any).bankAccount || "",
        website: (supplier as any).website || "",
        memo: (supplier as any).memo || "",
        languageCode: (supplier as any).languageCode || "nl",
        paymentTerms: supplier.paymentTerms?.toString() || "30",
        paymentDaysId: (supplier as any).paymentDaysId || "",
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

  useEffect(() => {
    if (supplier && supplierId) {
      window.dispatchEvent(new CustomEvent('update-tab-name', {
        detail: {
          tabId: `supplier-${supplierId}`,
          name: supplier.supplierNumber
        }
      }));
    }
  }, [supplier, supplierId]);

  useEffect(() => {
    const tabId = supplierId ? `edit-supplier-${supplierId}` : 'new-supplier';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, supplierId]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: (newSupplier) => {
      setCurrentSupplierId(newSupplier.id);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-supplier', hasUnsavedChanges: false }
      }));
      toast({
        title: "Opgeslagen",
        description: "Leverancier succesvol aangemaakt",
      });
      
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'supplier',
          entity: newSupplier,
          parentId: parentId
        }
      }));
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon leverancier niet aanmaken",
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
        title: "Opgeslagen",
        description: "Leverancier succesvol bijgewerkt",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon leverancier niet bijwerken",
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

  const changeTrackingConfig: ChangeTrackingConfig = {
    enabled: true,
    suppressTracking: false,
    onChangesDetected: (hasChanges, modifiedFields) => {
      setHasUnsavedChanges(hasChanges);
    }
  };

  const headerFields: InfoField[] = isEditing && supplier ? [
    { key: 'supplier-number', label: 'Leverancier ID', value: supplier.supplierNumber || 'N/A' },
    { key: 'status', label: 'Status', value: supplier.status || 'active' },
  ] : [];

  const toolbar = useFormToolbar({
    entityType: "supplier",
    entityId: supplierId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const formSections: FormSection2<SupplierFormData>[] = [
    {
      id: "general",
      label: "Algemeen",
      icon: <Building2 className="h-4 w-4" />,
      rows: [
        createTwoColumnRow([
          {
            key: "name",
            label: "Bedrijfsnaam",
            type: "text",
            placeholder: "Naam van het bedrijf",
            register: form.register("name"),
            validation: {
              error: form.formState.errors.name?.message,
              isRequired: true
            },
            testId: "input-supplier-name"
          } as FormField2<SupplierFormData>,
          {
            key: "addressId",
            label: "Adres",
            type: "custom",
            customComponent: (
              <AddressSelectWithAdd
                value={form.watch("addressId") || ""}
                onValueChange={(value) => form.setValue("addressId", value)}
                placeholder="Selecteer adres..."
                testId="select-supplier-address"
              />
            )
          } as FormField2<SupplierFormData>,
          {
            key: "languageCode",
            label: "Taal",
            type: "custom",
            customComponent: (
              <LanguageSelectWithAdd
                value={form.watch("languageCode") || ""}
                onValueChange={(value) => form.setValue("languageCode", value)}
                placeholder="Selecteer taal..."
                testId="select-supplier-language"
              />
            )
          } as FormField2<SupplierFormData>,
          {
            key: "kvkNummer",
            label: "KvK Nummer",
            type: "text",
            placeholder: "12345678",
            register: form.register("kvkNummer"),
            validation: {
              error: form.formState.errors.kvkNummer?.message
            },
            testId: "input-supplier-kvk"
          } as FormField2<SupplierFormData>,
          {
            key: "countryCode",
            label: "Land",
            type: "custom",
            customComponent: (
              <CountrySelectWithAdd
                value={form.watch("countryCode") || ""}
                onValueChange={(value) => form.setValue("countryCode", value)}
                placeholder="Selecteer land..."
                testId="select-supplier-country"
              />
            )
          } as FormField2<SupplierFormData>,
          {
            key: "taxId",
            label: "BTW Nummer",
            type: "text",
            placeholder: "NL123456789B01",
            register: form.register("taxId"),
            validation: {
              error: form.formState.errors.taxId?.message
            },
            testId: "input-supplier-tax-id"
          } as FormField2<SupplierFormData>,
        ]),
        {
          type: 'custom',
          customContent: (
            <div className="grid grid-cols-[130px_1fr] items-start gap-3 mt-4">
              <Label className="text-sm font-medium text-right pt-2">Memo</Label>
              <Textarea
                placeholder="Notities over deze leverancier..."
                value={form.watch("memo") || ""}
                onChange={(e) => form.setValue("memo", e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          )
        },
        createSectionHeaderRow("Contactgegevens"),
        createFieldsRow([
          {
            key: "contactPerson",
            label: "Contactpersoon",
            type: "text",
            placeholder: "Naam contactpersoon",
            layout: "single",
            register: form.register("contactPerson"),
            validation: {
              error: form.formState.errors.contactPerson?.message
            },
            testId: "input-supplier-contact-person"
          } as FormField2<SupplierFormData>,
          {
            key: "email",
            label: "E-mail",
            type: "email",
            placeholder: "leverancier@voorbeeld.nl",
            layout: "single",
            register: form.register("email"),
            validation: {
              error: form.formState.errors.email?.message
            },
            testId: "input-supplier-email"
          } as FormField2<SupplierFormData>
        ]),
        createFieldsRow([
          {
            key: "phone",
            label: "Telefoon",
            type: "tel",
            placeholder: "+31 20 123 4567",
            layout: "single",
            register: form.register("phone"),
            validation: {
              error: form.formState.errors.phone?.message
            },
            testId: "input-supplier-phone"
          } as FormField2<SupplierFormData>,
          {
            key: "mobile",
            label: "Mobiel",
            type: "tel",
            placeholder: "+31 6 1234 5678",
            layout: "single",
            register: form.register("mobile"),
            validation: {
              error: form.formState.errors.mobile?.message
            },
            testId: "input-supplier-mobile"
          } as FormField2<SupplierFormData>
        ]),
        createFieldRow({
          key: "website",
          label: "Website",
          type: "text",
          placeholder: "https://www.voorbeeld.nl",
          register: form.register("website"),
          validation: {
            error: form.formState.errors.website?.message
          },
          testId: "input-supplier-website"
        } as FormField2<SupplierFormData>),
      ]
    },
    {
      id: "financial",
      label: "Financieel", 
      icon: <CreditCard className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "paymentTerms",
            label: "Betalingstermijn",
            type: "custom",
            layout: "single",
            customComponent: (
              <PaymentTermsSelect
                value={form.watch("paymentTerms") || ""}
                onValueChange={(v) => form.setValue("paymentTerms", v)}
                placeholder="Selecteer betalingstermijn..."
                testId="select-supplier-payment-terms"
              />
            ),
          } as FormField2<SupplierFormData>,
          {
            key: "paymentDaysId",
            label: "Betaaldag",
            type: "custom",
            layout: "single",
            customComponent: (
              <PaymentDaySelectWithAdd
                value={form.watch("paymentDaysId") || ""}
                onValueChange={(value) => form.setValue("paymentDaysId", value)}
                placeholder="Selecteer betaaldag..."
                testId="select-supplier-payment-day"
              />
            )
          } as FormField2<SupplierFormData>
        ]),
        createFieldRow({
          key: "bankAccount",
          label: "Bankrekening",
          type: "text",
          placeholder: "NL00 BANK 0000 0000 00",
          register: form.register("bankAccount"),
          validation: {
            error: form.formState.errors.bankAccount?.message
          },
          testId: "input-supplier-bank-account"
        } as FormField2<SupplierFormData>),

        createFieldRow({
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "Actief" },
            { value: "inactive", label: "Inactief" }
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
