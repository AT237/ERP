import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCompanyProfileSchema, type CompanyProfile } from "@shared/schema";
import { LayoutForm2, type FormSection2, type FormField2 } from "@/components/layouts/LayoutForm2";
import type { ActionButton } from "@/components/layouts/BaseFormLayout";
import { Building, Mail, MapPin, Landmark } from "lucide-react";

// Form schema based on insertCompanyProfileSchema
const companyDetailsFormSchema = insertCompanyProfileSchema.extend({
  // All fields are optional for the form since we might not have data yet
});

type CompanyDetailsFormData = z.infer<typeof companyDetailsFormSchema>;

export default function CompanyDetailsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch active company profile
  const { data: companyProfile, isLoading: isLoadingProfile } = useQuery<CompanyProfile>({
    queryKey: ["/api/masterdata/company-profiles/active"],
    retry: false // Don't retry if no active profile exists
  });

  const form = useForm<CompanyDetailsFormData>({
    resolver: zodResolver(companyDetailsFormSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "Netherlands",
      phone: "",
      email: "",
      website: "",
      kvkNummer: "",
      btwNummer: "",
      bankAccount: "",
      bankName: "",
      isActive: true
    }
  });

  // Populate form when profile is loaded
  useEffect(() => {
    if (companyProfile) {
      form.reset({
        name: companyProfile.name || "",
        logoUrl: companyProfile.logoUrl || "",
        street: companyProfile.street || "",
        houseNumber: companyProfile.houseNumber || "",
        postalCode: companyProfile.postalCode || "",
        city: companyProfile.city || "",
        country: companyProfile.country || "Netherlands",
        phone: companyProfile.phone || "",
        email: companyProfile.email || "",
        website: companyProfile.website || "",
        kvkNummer: companyProfile.kvkNummer || "",
        btwNummer: companyProfile.btwNummer || "",
        bankAccount: companyProfile.bankAccount || "",
        bankName: companyProfile.bankName || "",
        isActive: companyProfile.isActive ?? true
      });
    }
  }, [companyProfile, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CompanyDetailsFormData) => {
      return await apiRequest("POST", "/api/masterdata/company-profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/company-profiles/active"] });
      toast({
        title: "Success",
        description: "Company details saved successfully",
      });
      setHasUnsavedChanges(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save company details",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CompanyDetailsFormData) => {
      if (!companyProfile?.id) throw new Error("No profile ID");
      return await apiRequest("PUT", `/api/masterdata/company-profiles/${companyProfile.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/company-profiles/active"] });
      toast({
        title: "Success",
        description: "Company details updated successfully",
      });
      setHasUnsavedChanges(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update company details",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: CompanyDetailsFormData) => {
    if (companyProfile?.id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Helper to create a fields row (simplified version)
  const createFieldsRow = (fields: FormField2<CompanyDetailsFormData>[]) => ({
    type: "fields" as const,
    fields
  });

  // Form sections configuration
  const formSections: FormSection2<CompanyDetailsFormData>[] = [
    {
      id: "general",
      label: "General",
      icon: <Building className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "name",
            label: "Company Name",
            type: "text",
            register: form.register("name"),
            validation: {
              isRequired: true,
              error: form.formState.errors.name?.message
            },
            testId: "input-company-name"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "kvkNummer",
            label: "KVK Number",
            type: "text",
            register: form.register("kvkNummer"),
            testId: "input-company-kvk"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "btwNummer",
            label: "BTW Number",
            type: "text",
            register: form.register("btwNummer"),
            testId: "input-company-btw"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "logoUrl",
            label: "Logo URL",
            type: "text",
            register: form.register("logoUrl"),
            testId: "input-company-logo"
          } as FormField2<CompanyDetailsFormData>
        ])
      ]
    },
    {
      id: "contact",
      label: "Contact",
      icon: <Mail className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "phone",
            label: "Phone",
            type: "text",
            register: form.register("phone"),
            testId: "input-company-phone"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "email",
            label: "Email",
            type: "text",
            register: form.register("email"),
            testId: "input-company-email"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "website",
            label: "Website",
            type: "text",
            register: form.register("website"),
            testId: "input-company-website"
          } as FormField2<CompanyDetailsFormData>
        ])
      ]
    },
    {
      id: "address",
      label: "Address",
      icon: <MapPin className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "street",
            label: "Street",
            type: "text",
            register: form.register("street"),
            testId: "input-company-street"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "houseNumber",
            label: "House Number",
            type: "text",
            register: form.register("houseNumber"),
            testId: "input-company-house-number"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "postalCode",
            label: "Postal Code",
            type: "text",
            register: form.register("postalCode"),
            testId: "input-company-postal-code"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "city",
            label: "City",
            type: "text",
            register: form.register("city"),
            testId: "input-company-city"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "country",
            label: "Country",
            type: "text",
            register: form.register("country"),
            testId: "input-company-country"
          } as FormField2<CompanyDetailsFormData>
        ])
      ]
    },
    {
      id: "financial",
      label: "Financial",
      icon: <Landmark className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "bankAccount",
            label: "Bank Account (IBAN)",
            type: "text",
            register: form.register("bankAccount"),
            testId: "input-company-bank-account"
          } as FormField2<CompanyDetailsFormData>,
          {
            key: "bankName",
            label: "Bank Name",
            type: "text",
            register: form.register("bankName"),
            testId: "input-company-bank-name"
          } as FormField2<CompanyDetailsFormData>
        ])
      ]
    }
  ];

  // Action buttons
  const actionButtons: ActionButton[] = [
    {
      key: "save",
      label: companyProfile ? "Update" : "Save",
      onClick: form.handleSubmit(onSubmit),
      variant: "default",
      disabled: createMutation.isPending || updateMutation.isPending,
      loading: createMutation.isPending || updateMutation.isPending,
      testId: "button-save-company-details"
    }
  ];

  return (
    <LayoutForm2
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      actionButtons={actionButtons}
      changeTracking={{
        enabled: true,
        onChangesDetected: (hasChanges) => setHasUnsavedChanges(hasChanges)
      }}
      persistence={{
        formType: 'company-details',
        entityId: companyProfile?.id
      }}
      isLoading={isLoadingProfile}
    />
  );
}
