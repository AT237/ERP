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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddressSelectWithAdd } from "@/components/ui/address-select-with-add";
import { ContactPersonSelectWithAdd } from "@/components/ui/contact-person-select-with-add";
import { CountrySelectWithAdd } from "@/components/ui/country-select-with-add";
import { LanguageSelectWithAdd } from "@/components/ui/language-select-with-add";
import { PaymentDaySelectWithAdd } from "@/components/ui/payment-day-select-with-add";
import { VatRateSelectWithAdd } from "@/components/ui/vat-rate-select-with-add";
import { RateSelectWithAdd } from "@/components/ui/rate-select-with-add";
import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Users, User, Building, CreditCard, FileText, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { Customer, InsertCustomer, Country } from "@shared/schema";
import { z } from "zod";

// Base form schema for customer data - include all fields from insertCustomerSchema
const baseCustomerFormSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined), // Keep for backward compatibility
  paymentDaysId: z.string().optional(),
  rateId: z.string().optional().nullable(),
  vatRateId: z.string().optional().nullable(),
  discountPercent: z.string().optional().nullable(),
  kvkNummer: z.string().optional().refine((val) => !val || /^\d{8}$/.test(val), {
    message: "C.o.C. number must contain 8 digits"
  }),
  countryCode: z.string().optional(),
  areaCode: z.string().optional(),
  memo: z.string().optional(),
  languageCode: z.string().optional(),
});

// Create dynamic schema based on country requirements
const createCustomerFormSchema = (countryRequirements?: { requiresBtw?: boolean; requiresAreaCode?: boolean }) => {
  // Start with base schema, but override specific fields based on requirements
  const schemaFields = {
    ...baseCustomerFormSchema.shape,
    taxId: z.string().optional().nullable(),
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

// Field label mapping for validation dialog
const fieldLabelMap: Record<string, { label: string; section: string }> = {
  name: { label: "Company Name", section: "general" },
  kvkNummer: { label: "C.o.C. Number", section: "general" },
  countryCode: { label: "Country", section: "general" },
  areaCode: { label: "Area Code", section: "general" },
  taxId: { label: "BTW Number", section: "general" },
  email: { label: "Email", section: "general" },
  phone: { label: "Phone", section: "general" },
  mobile: { label: "Mobile", section: "general" },
  addressId: { label: "Address", section: "general" },
  languageCode: { label: "Language", section: "general" },
  paymentTerms: { label: "Payment Terms", section: "payment" },
  paymentDaysId: { label: "Payment Day", section: "payment" },
  invoiceEmail: { label: "Invoice Email", section: "invoicing" },
  invoiceNotes: { label: "Invoice Notes", section: "invoicing" },
  bankAccount: { label: "Bank Account", section: "payment" },
  status: { label: "Status", section: "general" },
};

interface ValidationError {
  field: string;
  label: string;
  message: string;
  section: string;
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
  
  // Validation dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
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
      contactPerson2Email: "",
      taxId: "",
      bankAccount: "",
      invoiceEmail: "",
      invoiceNotes: "",
      memo: "",
      languageCode: "nl",
      paymentTerms: "30", // Keep for backward compatibility
      paymentDaysId: "",
      rateId: "",
      vatRateId: "",
      discountPercent: "0",
      status: "active",
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

  // Update tab name with customer number when data is loaded
  useEffect(() => {
    if (customer && customerId) {
      window.dispatchEvent(new CustomEvent('update-tab-name', {
        detail: {
          tabId: `customer-${customerId}`,
          name: customer.customerNumber
        }
      }));
    }
  }, [customer, customerId]);

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

  const { data: ratesAndCharges } = useQuery<Array<{ id: string; code: string; name: string; rate: string; unit: string | null; description: string | null }>>({
    queryKey: ["/api/masterdata/rates-and-charges"],
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
        contactPerson2Email: customer.contactPerson2Email || "",
        taxId: customer.taxId || "",
        bankAccount: customer.bankAccount || "",
        invoiceEmail: customer.invoiceEmail || "",
        invoiceNotes: customer.invoiceNotes || "",
        memo: customer.memo || "",
        languageCode: customer.languageCode || "nl",
        paymentTerms: customer.paymentTerms?.toString() || "30",
        paymentDaysId: customer.paymentDaysId || "",
        rateId: (customer as any).rateId || "",
        vatRateId: (customer as any).vatRateId || "",
        discountPercent: (customer as any).discountPercent?.toString() || "0",
        status: customer.status || "active",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else if (!isEditing) {
      const emptyFormData = {
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
        contactPerson2Email: "",
        taxId: "",
        bankAccount: "",
        invoiceEmail: "",
        invoiceNotes: "",
        memo: "",
        languageCode: "nl",
        paymentTerms: "30",
        paymentDaysId: "",
        rateId: "",
        vatRateId: "",
        discountPercent: "0",
        status: "active",
      };
      form.reset(emptyFormData);
      setOriginalValues(emptyFormData);
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
  const languageValue = form.watch("languageCode");
  const areaCodeValue = form.watch("areaCode");
  const addressIdValue = form.watch("addressId");
  const bankAccountValue = form.watch("bankAccount");
  const paymentTermsValue = form.watch("paymentTerms");
  const statusValue = form.watch("status");
  const emailValue = form.watch("email");
  const phoneValue = form.watch("phone");
  const mobileValue = form.watch("mobile");
  const contactPersonEmailValue = form.watch("contactPersonEmail");
  const contactPerson2EmailValue = form.watch("contactPerson2Email");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [nameValue, kvkNummerValue, taxIdValue, languageValue, areaCodeValue, addressIdValue, bankAccountValue, paymentTermsValue, statusValue, emailValue, phoneValue, mobileValue, contactPersonEmailValue, contactPerson2EmailValue, scheduleChangeCheck]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-customer', hasUnsavedChanges: false }
      }));
      toast({
        title: "Succes",
        description: "Klant toegevoegd",
      });
      
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'customer',
          entity: newCustomer,
          parentId: parentId
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
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      const tabId = customerId ? `edit-customer-${customerId}` : 'new-customer';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
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

  // Handler for validation errors - shows dialog instead of toast
  const onInvalid = (errors: FieldErrors) => {
    const errorList: ValidationError[] = [];
    
    for (const [field, error] of Object.entries(errors)) {
      const fieldInfo = fieldLabelMap[field] || { label: field, section: "general" };
      errorList.push({
        field,
        label: fieldInfo.label,
        message: (error as any)?.message || "Dit veld is verplicht",
        section: fieldInfo.section,
      });
    }
    
    setValidationErrors(errorList);
    setValidationDialogOpen(true);
  };

  // Handle "Show fields" action - navigate to first invalid field
  const handleShowFields = () => {
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0];
      // Navigate to the section containing the first error
      setActiveSection(firstError.section);
      setActiveTab(firstError.section);
      
      // Try to focus the field after a short delay for DOM update
      setTimeout(() => {
        const fieldElement = document.querySelector(`[name="${firstError.field}"], [data-testid="input-customer-${firstError.field}"], [data-testid="select-${firstError.field}"]`) as HTMLElement;
        if (fieldElement) {
          fieldElement.focus();
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    setValidationDialogOpen(false);
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

  const toolbar = useFormToolbar({
    entityType: "customer",
    entityId: customerId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

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
          // Positie 3: Language
          {
            key: "languageCode",
            label: "Language",
            type: "custom",
            customComponent: (
              <LanguageSelectWithAdd
                value={form.watch("languageCode") || ""}
                onValueChange={(value) => form.setValue("languageCode", value)}
                placeholder="Select language..."
                testId="select-customer-language"
                className={getFieldClassName("languageCode")}
              />
            )
          } as FormField2<CustomerFormData>,
          // Positie 4: KVK-nummer
          {
            key: "kvkNummer",
            label: "C.o.C. Number",
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
          // Positie 9-12: reserveren voor memo veld (wordt apart geïmplementeerd)
        ]),
        // Speciale rij voor memo veld dat over de gehele breedte loopt
        {
          type: 'custom',
          customContent: (
            <div className="grid grid-cols-[130px_1fr] items-start gap-3 mt-4">
              <Label 
                htmlFor="memo" 
                className="text-sm font-medium text-right pt-2"
              >
                Memo
              </Label>
              <div>
                <Textarea
                  id="memo"
                  {...form.register("memo")}
                  placeholder="Notities en memo's..."
                  className={`min-h-[80px] ${getFieldClassName("memo")}`}
                  data-testid="textarea-customer-memo"
                />
                {form.formState.errors.memo && (
                  <span className="text-sm text-red-600 mt-1 block">
                    {form.formState.errors.memo.message}
                  </span>
                )}
              </div>
            </div>
          )
        }
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
          // Positie 5: Contact Person 2
          {
            key: "contactPerson2Email",
            label: "Contact Person 2",
            type: "custom",
            customComponent: (
              <ContactPersonSelectWithAdd
                value={form.watch("contactPerson2Email") || ""}
                onValueChange={(value) => form.setValue("contactPerson2Email", value)}
                placeholder="Select contact person 2..."
                testId="select-customer-contact-person-2"
              />
            )
          } as FormField2<CustomerFormData>
        ])
      ]
    },
    {
      id: "rates",
      label: "Rates",
      icon: <CreditCard className="h-4 w-4" />,
      rows: [
        {
          type: 'custom',
          customContent: (() => {
            const selectedRateId = form.watch("rateId" as any);
            const discountStr = form.watch("discountPercent" as any) || "0";
            const selectedRate = ratesAndCharges?.find(r => r.id === selectedRateId);
            const rateAmount = selectedRate ? Number(selectedRate.rate) : 0;
            const discount = Number(discountStr) || 0;
            const calculatedAmount = rateAmount * (1 - discount / 100);
            const unitLabel = selectedRate?.unit || "";

            return (
              <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                <Label className="text-sm font-medium text-right">Rate</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <RateSelectWithAdd
                      value={selectedRateId || ""}
                      onValueChange={(value) => form.setValue("rateId" as any, value)}
                      placeholder="Select rate..."
                      testId="select-customer-rate"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Discount %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register("discountPercent" as any)}
                      className="h-10 w-20"
                      data-testid="input-customer-discount-percent"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 h-10 px-3 rounded-md border bg-muted/50 shrink-0">
                    <span className="font-medium text-sm whitespace-nowrap">
                      € {calculatedAmount.toFixed(2)}
                    </span>
                    {unitLabel && (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        / {unitLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        }
      ]
    },
    {
      id: "financial",
      label: "Financial",
      icon: <FileText className="h-4 w-4" />,
      rows: [
        createFieldsRow([
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
          {
            key: "paymentDaysId",
            label: "Payment Days",
            type: "custom",
            customComponent: (
              <PaymentDaySelectWithAdd
                value={form.watch("paymentDaysId") || ""}
                onValueChange={(value) => form.setValue("paymentDaysId", value)}
                language={form.watch("languageCode") || "nl"}
                placeholder="Select payment days..."
                testId="select-customer-payment-days"
              />
            )
          } as FormField2<CustomerFormData>,
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
          {
            key: "vatRateId",
            label: "VAT Rate",
            type: "custom",
            customComponent: (
              <VatRateSelectWithAdd
                value={form.watch("vatRateId" as any) || ""}
                onValueChange={(value) => form.setValue("vatRateId" as any, value)}
                placeholder="Select VAT rate..."
                testId="select-customer-vat-rate"
              />
            ),
            testId: "select-customer-vat-rate"
          } as FormField2<CustomerFormData>
        ]),
        {
          type: 'custom',
          customContent: (
            <div className="grid grid-cols-[130px_1fr] items-start gap-3 mt-4">
              <Label 
                htmlFor="invoiceNotes" 
                className="text-sm font-medium text-right pt-2"
              >
                Invoice Notes
              </Label>
              <div>
                <Textarea
                  id="invoiceNotes"
                  {...form.register("invoiceNotes")}
                  placeholder="Invoice notes..."
                  className={`min-h-[80px] ${getFieldClassName("invoiceNotes")}`}
                  data-testid="textarea-customer-invoice-notes"
                />
                {form.formState.errors.invoiceNotes && (
                  <span className="text-sm text-red-600 mt-1 block">
                    {form.formState.errors.invoiceNotes.message}
                  </span>
                )}
              </div>
            </div>
          )
        }
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
        toolbar={toolbar}
        changeTracking={{
          enabled: !suppressTracking,
          onChangesDetected: (hasChanges) => setHasUnsavedChanges(hasChanges)
        }}
        documentType="customer"
        entityId={customerId}
        persistence={{
          formType: 'customer',
          entityId: customerId
        }}
        isLoading={isLoadingCustomer}
      />

      {/* Validation Error Dialog */}
      <AlertDialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Verplichte velden ontbreken
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>De volgende velden moeten nog ingevuld worden:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">{error.label}</span>
                      {error.message !== "Dit veld is verplicht" && (
                        <span className="text-muted-foreground"> - {error.message}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setValidationDialogOpen(false)}>
              Negeren
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleShowFields} className="bg-orange-600 hover:bg-orange-700">
              Toon velden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}