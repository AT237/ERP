import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow, createTwoColumnRow } from './LayoutForm2';
import type { ActionButton } from './BaseFormLayout';
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddressSelectWithAdd } from "@/components/ui/address-select-with-add";
import { ContactPersonSelectWithAdd } from "@/components/ui/contact-person-select-with-add";
import { CountrySelectWithAdd } from "@/components/ui/country-select-with-add";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Users, User, Building, CreditCard, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer, InsertCustomer, Country } from "@shared/schema";
import { z } from "zod";

// Base form schema for customer data - include all fields from insertCustomerSchema
const baseCustomerFormSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().min(1, "Betalingsvoorwaarden zijn verplicht").transform(val => parseInt(val, 10)),
  kvkNummer: z.string().optional().refine((val) => !val || /^\d{8}$/.test(val), {
    message: "KVK nummer moet 8 cijfers bevatten"
  }),
  countryCode: z.string().optional(),
  areaCode: z.string().optional(),
  memo: z.string().optional(),
});

// Create dynamic schema based on country requirements
const createCustomerFormSchema = (countryRequirements?: { requiresBtw?: boolean; requiresAreaCode?: boolean }) => {
  // Start with base schema, but override specific fields based on requirements
  const schemaFields = {
    ...baseCustomerFormSchema.shape,
    taxId: countryRequirements?.requiresBtw 
      ? z.string().min(1, "BTW nummer is verplicht voor dit land")
      : z.string().optional().nullable(),
    areaCode: countryRequirements?.requiresAreaCode
      ? z.string().min(1, "Area code is verplicht voor dit land")
      : z.string().optional(),
  };
  
  return z.object(schemaFields);
};

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

interface CustomerFormLayoutProps {
  onSave: () => void;
  customerId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

// Form data type for LayoutForm2
type CustomerFormData = z.infer<typeof baseCustomerFormSchema>;

interface Memo {
  id: string;
  title: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export function CustomerFormLayout({ onSave, customerId, parentId }: CustomerFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [activeSection, setActiveSection] = useState("general");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState({ title: "", content: "", isInternal: false });
  const [currentCountryRequirements, setCurrentCountryRequirements] = useState<{ requiresBtw?: boolean; requiresAreaCode?: boolean }>({});
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const isEditing = !!customerId;

  // Create schema dynamically based on current country requirements
  const customerFormSchema = useMemo(() => {
    return createCustomerFormSchema(currentCountryRequirements);
  }, [currentCountryRequirements]);

  // Form setup with dynamic resolver - use key to force recreation when schema changes
  const formKey = useMemo(() => {
    return `form-${JSON.stringify(currentCountryRequirements)}`;
  }, [currentCountryRequirements]);

  const form = useForm({
    resolver: zodResolver(customerFormSchema as any),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      name: "",
      kvkNummer: "",
      countryCode: "",
      areaCode: "",
      generalEmail: "",
      email: "",
      phone: "",
      mobile: "",
      addressId: "",
      contactPersonEmail: "",
      taxId: "",
      bankAccount: "",
      invoiceEmail: "",
      invoiceNotes: "",
      memo: "",
      language: "nl",
      paymentTerms: "30",
      status: "active",
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

  // Get CSS class for field based on whether it's modified - only when tracking enabled
  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    if (suppressTracking) return baseClassName;
    
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  // Load customer data if editing
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    enabled: !!customerId,
  });

  // Fetch country data when countryCode changes - use specific field watch
  const currentCountryCode = form.watch("countryCode");
  const { data: countryData, isLoading: isLoadingCountry } = useQuery({
    queryKey: ["/api/countries/by-code", currentCountryCode],
    queryFn: async () => {
      if (!currentCountryCode) return null;
      const response = await fetch(`/api/countries/by-code/${currentCountryCode}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentCountryCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update validation schema when country changes - no imperative triggers, rely on remount
  useEffect(() => {
    if (countryData) {
      const newRequirements = {
        requiresBtw: countryData.requiresBtw || false,
        requiresAreaCode: countryData.requiresAreaCode || false,
      };
      
      // Only update if requirements actually changed
      const currentReq = JSON.stringify(currentCountryRequirements);
      const newReq = JSON.stringify(newRequirements);
      if (currentReq !== newReq) {
        setSuppressTracking(true);
        setCurrentCountryRequirements(newRequirements);
        // Tracking will be re-enabled when formKey changes (handled in separate effect)
      }
    } else if (!currentCountryCode) {
      // Reset to base schema when no country selected - only if not already empty
      const isEmpty = Object.keys(currentCountryRequirements).length === 0;
      if (!isEmpty) {
        setSuppressTracking(true);
        setCurrentCountryRequirements({});
        // Tracking will be re-enabled when formKey changes (handled in separate effect)
      }
    }
  }, [countryData, currentCountryCode]);

  // Update form when customer data loads and store original values for change tracking
  useEffect(() => {
    setSuppressTracking(true);
    
    if (customer) {
      const formData = {
        name: customer.name || "",
        kvkNummer: customer.kvkNummer || "",
        countryCode: customer.countryCode || "",
        areaCode: customer.areaCode || "",
        generalEmail: customer.generalEmail || "",
        email: customer.email || "",
        phone: customer.phone || "",
        mobile: customer.mobile || "",
        addressId: customer.addressId || "",
        contactPersonEmail: customer.contactPersonEmail || "",
        taxId: customer.taxId || "",
        bankAccount: customer.bankAccount || "",
        invoiceEmail: customer.invoiceEmail || "",
        invoiceNotes: customer.invoiceNotes || "",
        memo: customer.memo || "",
        language: customer.language || "nl",
        paymentTerms: customer.paymentTerms?.toString() || "30",
        status: customer.status || "active",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new customer, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
    
    // Re-enable tracking after form is stable
    setTimeout(() => setSuppressTracking(false), 100);
  }, [customer, form]);

  // Add suppression flag for tracking during initialization
  const [suppressTracking, setSuppressTracking] = useState(true);
  
  // Re-enable tracking when formKey changes (after form remount)
  useEffect(() => {
    // Skip initial mount
    if (Object.keys(originalValues).length === 0) return;
    
    setSuppressTracking(true);
    // Re-enable tracking after remount is complete
    const timeout = setTimeout(() => {
      setSuppressTracking(false);
    }, 150);
    
    return () => clearTimeout(timeout);
  }, [formKey]);
  
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
  // Use specific field subscriptions to avoid re-rendering on every field change
  const nameValue = form.watch("name");
  const kvkNummerValue = form.watch("kvkNummer");
  const taxIdValue = form.watch("taxId");
  const languageValue = form.watch("language");
  const areaCodeValue = form.watch("areaCode");
  const addressIdValue = form.watch("addressId");
  const bankAccountValue = form.watch("bankAccount");
  const paymentTermsValue = form.watch("paymentTerms");
  const statusValue = form.watch("status");
  const emailValue = form.watch("email");
  const phoneValue = form.watch("phone");
  const mobileValue = form.watch("mobile");
  const contactPersonEmailValue = form.watch("contactPersonEmail");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [nameValue, kvkNummerValue, taxIdValue, languageValue, areaCodeValue, addressIdValue, bankAccountValue, paymentTermsValue, statusValue, emailValue, phoneValue, mobileValue, contactPersonEmailValue, scheduleChangeCheck]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = customerId ? `edit-customer-${customerId}` : 'new-customer';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, customerId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succes",
        description: "Klant toegevoegd",
      });
      
      // Dispatch scoped entity-created event for CustomerSelect to auto-select the new customer
      // Include parentId to scope this event to the originating CustomerSelect component
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'customer',
          entity: newCustomer,
          parentId: parentId // Scope to originating component
        }
      }));
      
      onSave();
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet toevoegen",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/customers/${customerId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succes",
        description: "Klant bijgewerkt",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet bijwerken",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: any) => {
    console.log("💾 Form submission data before transformation:", data);
    
    // Transform the data to match expected types
    const transformedData = {
      ...data,
      // Ensure paymentTerms is a number (schema should handle this, but be explicit)
      paymentTerms: typeof data.paymentTerms === 'string' ? parseInt(data.paymentTerms, 10) : data.paymentTerms,
    };
    
    console.log("💾 Form submission data after transformation:", transformedData);
    console.log("💾 paymentTerms type:", typeof transformedData.paymentTerms, "value:", transformedData.paymentTerms);
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const handleAddMemo = () => {
    if (newMemo.title.trim() && newMemo.content.trim()) {
      const memo: Memo = {
        id: Date.now().toString(),
        title: newMemo.title,
        content: newMemo.content,
        isInternal: newMemo.isInternal,
        createdAt: new Date(),
      };
      setMemos([...memos, memo]);
      setNewMemo({ title: "", content: "", isInternal: false });
    }
  };

  const handleDeleteMemo = (id: string) => {
    setMemos(memos.filter(memo => memo.id !== id));
  };

  // Old manual HTML form code removed - using LayoutForm2 unified system

  // Header fields removed per user request

  // Create action buttons for BaseFormLayout
  const actionButtons: ActionButton[] = [
    {
      key: 'cancel',
      label: 'Cancel',
      icon: <ArrowLeft size={14} />,
      onClick: onSave,
      variant: 'outline',
      testId: 'button-cancel'
    },
    {
      key: 'save',
      label: isEditing ? 'Update Customer' : 'Save Customer',
      icon: <Save size={14} />,
      onClick: form.handleSubmit(onSubmit),
      variant: 'default',
      disabled: createMutation.isPending || updateMutation.isPending,
      loading: createMutation.isPending || updateMutation.isPending,
      testId: 'button-save'
    }
  ];

  // Re-enable tracking when form key changes (remount)
  useEffect(() => {
    setTimeout(() => setSuppressTracking(false), 50);
  }, [formKey]);

  // Form sections for LayoutForm2
  const formSections: FormSection2<CustomerFormData>[] = [
    {
      id: "general",
      label: "General", 
      icon: <Building className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          // Positie 1: Bedrijfsnaam
          {
            key: "name",
            label: "Company Name",
            type: "text",
            register: form.register("name"),
            validation: {
              isRequired: true,
              error: form.formState.errors.name?.message
            },
            testId: "input-customer-name"
          } as FormField2<CustomerFormData>,
          // Positie 2: Adres
          {
            key: "addressId",
            label: "Address",
            type: "custom",
            customComponent: (
              <AddressSelectWithAdd
                value={form.watch("addressId") || ""}
                onValueChange={(value) => form.setValue("addressId", value)}
                placeholder="Selecteer adres..."
                testId="select-customer-address"
              />
            )
          } as FormField2<CustomerFormData>,
          // Positie 3: Taal
          {
            key: "language",
            label: "Language",
            type: "select",
            options: [
              { value: "nl", label: "Nederlands" },
              { value: "en", label: "English" },
              { value: "de", label: "Deutsch" },
              { value: "fr", label: "Français" }
            ],
            setValue: (value) => form.setValue("language", value),
            watch: () => form.watch("language") || "nl",
            testId: "select-customer-language"
          } as FormField2<CustomerFormData>,
          // Positie 4: Contact Person
          {
            key: "contactPersonEmail",
            label: "Contact Person",
            type: "custom",
            customComponent: (
              <ContactPersonSelectWithAdd
                value={form.watch("contactPersonEmail") || ""}
                onValueChange={(value) => form.setValue("contactPersonEmail", value)}
                placeholder="Select contact person..."
                testId="select-customer-contact-person"
              />
            )
          } as FormField2<CustomerFormData>,
          // Positie 5: KVK-nummer
          {
            key: "kvkNummer",
            label: "KVK Number",
            type: "text",
            register: form.register("kvkNummer"),
            validation: {
              error: form.formState.errors.kvkNummer?.message
            },
            testId: "input-customer-kvk-nummer"
          } as FormField2<CustomerFormData>,
          // Positie 6: leeg (wordt automatisch opgevuld met undefined)
          
          // Positie 7: Country
          {
            key: "countryCode",
            label: "Country",
            type: "custom",
            customComponent: (
              <CountrySelectWithAdd
                value={form.watch("countryCode") || ""}
                onValueChange={(value) => form.setValue("countryCode", value)}
                placeholder="Selecteer land..."
                testId="select-customer-country"
              />
            )
          } as FormField2<CustomerFormData>,
          // Positie 8: BTW-nummer
          {
            key: "taxId",
            label: "VAT Number",
            type: "text",
            register: form.register("taxId"),
            validation: {
              error: form.formState.errors.taxId?.message
            },
            testId: "input-customer-tax-id"
          } as FormField2<CustomerFormData>,
          // Positie 9: Memo (zal over meerdere posities lopen door colspan styling)
          {
            key: "memo",
            label: "Memo",
            type: "textarea",
            register: form.register("memo"),
            validation: {
              error: form.formState.errors.memo?.message
            },
            wrapperClassName: "col-span-2", // Neemt beide kolommen in (spanning over positie 9-10)
            testId: "textarea-customer-memo"
          } as FormField2<CustomerFormData>
          // Positie 10-12: automatisch leeg
        ])
      ]
    },
    {
      id: "contact",
      label: "Contact",
      icon: <User className="h-4 w-4" />,
      rows: [
        createSectionHeaderRow("Contact Information"),
        createFieldsRow([
          // Positie 1: General Email
          {
            key: "generalEmail",
            label: "General Email",
            type: "email",
            register: form.register("generalEmail"),
            validation: {
              error: form.formState.errors.generalEmail?.message
            },
            testId: "input-customer-general-email"
          } as FormField2<CustomerFormData>,
          // Positie 2: Phone
          {
            key: "phone",
            label: "Phone",
            type: "text",
            register: form.register("phone"),
            validation: {
              error: form.formState.errors.phone?.message
            },
            testId: "input-customer-phone"
          } as FormField2<CustomerFormData>,
          // Positie 3: Mobile
          {
            key: "mobile",
            label: "Mobile",
            type: "text",
            register: form.register("mobile"),
            validation: {
              error: form.formState.errors.mobile?.message
            },
            testId: "input-customer-mobile"
          } as FormField2<CustomerFormData>
          // Positie 4-12: automatisch leeg
        ])
      ]
    },
    {
      id: "financial",
      label: "Financial",
      icon: <CreditCard className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          // Positie 1: Bank Account
          {
            key: "bankAccount",
            label: "Bank Account",
            type: "text",
            register: form.register("bankAccount"),
            validation: {
              error: form.formState.errors.bankAccount?.message
            },
            testId: "input-customer-bank-account"
          } as FormField2<CustomerFormData>,
          // Positie 2: Payment Terms
          {
            key: "paymentTerms",
            label: "Payment Terms",
            type: "select",
            options: [
              { value: "0", label: "Direct" },
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
              { value: "60", label: "60 days" },
              { value: "90", label: "90 days" }
            ],
            setValue: (value) => form.setValue("paymentTerms", value),
            watch: () => form.watch("paymentTerms") || "30",
            validation: {
              isRequired: true,
              error: form.formState.errors.paymentTerms?.message
            },
            testId: "select-customer-payment-terms"
          } as FormField2<CustomerFormData>,
          // Positie 3: Invoice Email
          {
            key: "invoiceEmail",
            label: "Invoice Email",
            type: "email",
            register: form.register("invoiceEmail"),
            validation: {
              error: form.formState.errors.invoiceEmail?.message
            },
            testId: "input-customer-invoice-email"
          } as FormField2<CustomerFormData>,
          // Positie 4: Status
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "prospect", label: "Prospect" }
            ],
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status") || "active",
            testId: "select-customer-status"
          } as FormField2<CustomerFormData>,
          // Positie 5: Invoice Notes
          {
            key: "invoiceNotes",
            label: "Invoice Notes",
            type: "textarea",
            register: form.register("invoiceNotes"),
            validation: {
              error: form.formState.errors.invoiceNotes?.message
            },
            testId: "textarea-customer-invoice-notes"
          } as FormField2<CustomerFormData>
          // Positie 6-12: automatisch leeg
        ])
      ]
    }
  ];

  return (
    <div key={formKey}>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={onSubmit}
        actionButtons={actionButtons}
        changeTracking={{
          enabled: !suppressTracking,
          onChangesDetected: (hasChanges) => setHasUnsavedChanges(hasChanges)
        }}
        isLoading={isLoadingCustomer}
      />
    </div>
  );
}