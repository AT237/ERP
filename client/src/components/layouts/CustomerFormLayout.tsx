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
import { AddressSelectWithAdd } from "@/components/ui/address-select-with-add";
import { ContactPersonSelectWithAdd } from "@/components/ui/contact-person-select-with-add";
import { CountrySelectWithAdd } from "@/components/ui/country-select-with-add";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Users } from "lucide-react";
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
}

interface Memo {
  id: string;
  title: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export function CustomerFormLayout({ onSave, customerId }: CustomerFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succes",
        description: "Klant toegevoegd",
      });
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

  // Tab content
  const tabs = [
    {
      id: "general",
      label: "General",
      content: (
        <div key={formKey} className="space-y-6">
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <div className="text-sm font-medium text-right pt-2">
              <span>Bedrijfsnaam *</span>
              <span className="ml-12">Land</span>
            </div>
            <div className="grid grid-cols-[30%_1fr] gap-6">
              <div>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Bedrijfsnaam"
                  autoComplete="off"
                  data-testid="input-customer-name"
                  className={getFieldClassName("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <CountrySelectWithAdd
                  value={form.watch("countryCode") || ""}
                  onValueChange={(value) => form.setValue("countryCode", value)}
                  placeholder="Selecteer land..."
                  testId="select-customer-country"
                />
              </div>
            </div>

            <Label htmlFor="kvkNummer" className="text-sm font-medium text-right pt-2">KVK-nummer</Label>
            <div>
              <Input
                id="kvkNummer"
                {...form.register("kvkNummer")}
                placeholder="12345678"
                maxLength={8}
                data-testid="input-customer-kvk-nummer"
                className={getFieldClassName("kvkNummer")}
              />
              {form.formState.errors.kvkNummer && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.kvkNummer.message}</p>
              )}
            </div>

            <Label htmlFor="language" className="text-sm font-medium text-right pt-2">Taal</Label>
            <div>
              <Select 
                onValueChange={(value) => form.setValue("language", value)}
                value={form.watch("language") || "nl"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">Nederlands</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Label htmlFor="taxId" className="text-sm font-medium text-right pt-2">
              BTW-nummer
              {currentCountryRequirements.requiresBtw && (
                <span className="text-red-600 ml-1">*</span>
              )}
            </Label>
            <div>
              <Input
                id="taxId"
                {...form.register("taxId")}
                placeholder="NL123456789B01"
                data-testid="input-customer-taxId"
                className={getFieldClassName("taxId", currentCountryRequirements.requiresBtw ? "border-orange-300 focus:border-orange-500" : "")}
              />
              {currentCountryRequirements.requiresBtw && (
                <p className="text-sm text-orange-600 mt-1">
                  BTW nummer is verplicht voor {countryData?.name || 'dit land'}
                </p>
              )}
              {form.formState.errors.taxId && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.taxId.message}</p>
              )}
            </div>

            <Label htmlFor="areaCode" className="text-sm font-medium text-right pt-2">
              Area Code
              {currentCountryRequirements.requiresAreaCode && (
                <span className="text-red-600 ml-1">*</span>
              )}
            </Label>
            <div>
              <Input
                id="areaCode"
                {...form.register("areaCode")}
                placeholder={currentCountryCode === 'ET' ? '+251' : '+31'}
                data-testid="input-customer-areaCode"
                className={currentCountryRequirements.requiresAreaCode ? "border-orange-300 focus:border-orange-500" : ""}
              />
              {currentCountryRequirements.requiresAreaCode && (
                <p className="text-sm text-orange-600 mt-1">
                  Area code is verplicht voor {countryData?.name || 'dit land'}
                </p>
              )}
              {form.formState.errors.areaCode && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.areaCode.message}</p>
              )}
            </div>

            <Label htmlFor="generalEmail" className="text-sm font-medium text-right pt-2">Algemene email</Label>
            <div>
              <Input
                id="generalEmail"
                type="email"
                {...form.register("generalEmail")}
                placeholder="algemeen@bedrijf.nl"
                data-testid="input-customer-general-email"
                className={getFieldClassName("generalEmail")}
              />
            </div>

            <Label htmlFor="addressId" className="text-sm font-medium text-right pt-2">Adres</Label>
            <div>
              <AddressSelectWithAdd
                value={form.watch("addressId") || ""}
                onValueChange={(value) => form.setValue("addressId", value)}
                placeholder="Selecteer adres..."
                testId="select-customer-address"
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: "financial",
      label: "Financial",
      content: (
        <div key={formKey} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Financiële informatie</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bankrekeningnummer</Label>
                <Input
                  id="bankAccount"
                  {...form.register("bankAccount")}
                  placeholder="NL91ABNA0417164300"
                  data-testid="input-customer-bankAccount"
                  className={getFieldClassName("bankAccount")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceEmail">Email voor facturen</Label>
                <Input
                  id="invoiceEmail"
                  type="email"
                  {...form.register("invoiceEmail")}
                  placeholder="facturen@bedrijf.nl"
                  data-testid="input-customer-invoice-email"
                  className={getFieldClassName("invoiceEmail")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNotes">Notities voor facturatie</Label>
                <Textarea
                  id="invoiceNotes"
                  {...form.register("invoiceNotes")}
                  placeholder="Opmerkingen en notities voor factuurbehandeling..."
                  rows={3}
                  data-testid="textarea-customer-invoice-notes"
                  className={getFieldClassName("invoiceNotes")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Betalingsvoorwaarden *</Label>
                <Select 
                  onValueChange={(value) => form.setValue("paymentTerms", value)}
                  value={form.watch("paymentTerms") || "30"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dagen</SelectItem>
                    <SelectItem value="14">14 dagen</SelectItem>
                    <SelectItem value="30">30 dagen</SelectItem>
                    <SelectItem value="45">45 dagen</SelectItem>
                    <SelectItem value="60">60 dagen</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.paymentTerms && (
                  <p className="text-sm text-red-600">{form.formState.errors.paymentTerms.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  onValueChange={(value) => form.setValue("status", value)}
                  value={form.watch("status") || "active"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="inactive">Inactief</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="archived">Gearchiveerd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Openstaande posten informatieveld */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openstaandePosten">Openstaande posten voor deze klant</Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-openstaande-posten">
                    {isEditing ? "€ 0,00 (wordt geladen uit externe tabel)" : "€ 0,00 (geen openstaande posten voor nieuwe klant)"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "contact",
      label: "Contact",
      content: (
        <div key={formKey} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Contactinformatie</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="info@bedrijf.nl"
                  data-testid="input-customer-email"
                  className={getFieldClassName("email")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+31 20 123 4567"
                  data-testid="input-customer-phone"
                  className={getFieldClassName("phone")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobiel</Label>
                <Input
                  id="mobile"
                  {...form.register("mobile")}
                  placeholder="+31 6 12345678"
                  data-testid="input-customer-mobile"
                  className={getFieldClassName("mobile")}
                />
              </div>
            </div>

            {/* Contact Person Selection */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPersonEmail">Contactpersoon</Label>
                <ContactPersonSelectWithAdd
                  value={form.watch("contactPersonEmail") || ""}
                  onValueChange={(value) => form.setValue("contactPersonEmail", value)}
                  customerId={customerId}
                  placeholder="Selecteer contactpersoon..."
                  testId="select-customer-contact-person"
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "memo",
      label: "Memo",
      content: (
        <div key={formKey} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Notities</h3>
            
            {/* Add new memo */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memo-title">Titel</Label>
                <Input
                  id="memo-title"
                  value={newMemo.title}
                  onChange={(e) => setNewMemo({ ...newMemo, title: e.target.value })}
                  placeholder="Notitie titel"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="memo-content">Inhoud</Label>
                <Textarea
                  id="memo-content"
                  value={newMemo.content}
                  onChange={(e) => setNewMemo({ ...newMemo, content: e.target.value })}
                  placeholder="Notitie inhoud..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="memo-internal"
                  checked={newMemo.isInternal}
                  onChange={(e) => setNewMemo({ ...newMemo, isInternal: e.target.checked })}
                />
                <Label htmlFor="memo-internal">Interne notitie</Label>
              </div>
              
              <Button onClick={handleAddMemo} className="bg-orange-600 hover:bg-orange-700">
                Notitie toevoegen
              </Button>
            </div>

            {/* Display existing memos */}
            <div className="space-y-3">
              {memos.map((memo) => (
                <div key={memo.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{memo.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMemo(memo.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Verwijderen
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{memo.content}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{memo.isInternal ? 'Interne notitie' : 'Externe notitie'}</span>
                    <span>{memo.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              
              {memos.length === 0 && (
                <p className="text-gray-500 text-center py-4">Geen notities toegevoegd</p>
              )}
            </div>
          </div>
        </div>
      )
    }
  ];


  // Create header fields for BaseFormLayout
  const headerFields: InfoField[] = [
    {
      label: "Customer ID",
      value: customerId ? customer?.customerNumber || customerId.slice(0, 8) : 'New customer'
    },
    {
      label: "Status", 
      value: isEditing ? "Edit" : "Draft"
    }
  ];

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

  return (
    <div key={formKey}>
      <BaseFormLayout
        headerFields={headerFields}
        actionButtons={actionButtons}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLoading={isLoadingCustomer}
      />
    </div>
  );
}