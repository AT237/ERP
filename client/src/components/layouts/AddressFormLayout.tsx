import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, Building, Globe } from "lucide-react";
import { insertAddressSchema, type InsertAddress, type Address } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { 
  LayoutForm2, 
  type FormSection2, 
  createFieldRow, 
  createFieldsRow,
  createSectionHeaderRow,
  type FormField2
} from './LayoutForm2';
import type { InfoField } from './InfoHeaderLayout';
import { Input } from "@/components/ui/input";
import { CountrySelectWithAdd } from "@/components/ui/country-select-with-add";

// Form schema with enhanced validation
const formSchema = insertAddressSchema.extend({
  street: z.string().min(1, "Street is required"),
  houseNumber: z.string().min(1, "House number is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required")
});

type FormData = z.infer<typeof formSchema>;

interface AddressFormLayoutProps {
  onSave: () => void;
  addressId?: string;
}

export default function AddressFormLayout({ onSave, addressId }: AddressFormLayoutProps) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("address");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isEditing = !!addressId;

  // Fetch address data if editing
  const { data: address, isLoading: isLoadingAddress } = useQuery<Address>({
    queryKey: ["/api/addresses", addressId],
    queryFn: async () => {
      const response = await fetch(`/api/addresses/${addressId}`);
      if (!response.ok) throw new Error("Failed to fetch address");
      return response.json();
    },
    enabled: !!addressId,
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: ""
    }
  });

  // Load existing data into form
  useEffect(() => {
    if (address && isEditing) {
      const formData = {
        street: address.street || "",
        houseNumber: address.houseNumber || "",
        postalCode: address.postalCode || "",
        city: address.city || "",
        country: address.country || ""
      };
      
      form.reset(formData);
      setHasUnsavedChanges(false);
    }
  }, [address, form, isEditing]);

  // Track form changes for unsaved changes indicator
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = addressId ? `edit-address-${addressId}` : 'new-address';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, addressId]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/addresses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Address created successfully",
      });
      setHasUnsavedChanges(false);
      // Dispatch event synchronously before closing tab to prevent race condition
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-address', hasUnsavedChanges: false }
      }));
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create address",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("PATCH", `/api/addresses/${addressId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses", addressId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Address updated successfully",
      });
      setHasUnsavedChanges(false);
      // Dispatch event synchronously before closing tab to prevent race condition
      const tabId = addressId ? `edit-address-${addressId}` : 'new-address';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update address",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Check for validation errors
  const hasValidationErrors = Object.keys(form.formState.errors).length > 0;

  // Get form data for display
  const watchedValues = form.watch();

  // Info fields for header
  const infoFields: InfoField[] = [
    { 
      label: "Full Address", 
      value: `${watchedValues.street || ''} ${watchedValues.houseNumber || ''}, ${watchedValues.postalCode || ''} ${watchedValues.city || ''}, ${watchedValues.country || ''}`.trim()
    }
  ];

  // Form sections
  const sections: FormSection2<FormData>[] = [
    {
      id: "address",
      label: "Address Information",
      icon: <Building className="h-4 w-4" />,
      rows: [
        createSectionHeaderRow("Basic Information"),
        createFieldsRow([
          {
            key: "street",
            label: "Street",
            type: "text",
            placeholder: "Enter street name",
            register: form.register("street"),
            validation: {
              error: form.formState.errors.street?.message,
              isRequired: true
            },
            testId: "input-street",
            className: form.formState.errors.street ? "border-red-500" : ""
          },
          {
            key: "houseNumber",
            label: "House Number", 
            type: "text",
            placeholder: "123A",
            register: form.register("houseNumber"),
            validation: {
              error: form.formState.errors.houseNumber?.message,
              isRequired: true
            },
            testId: "input-house-number",
            className: form.formState.errors.houseNumber ? "border-red-500" : ""
          }
        ]),
        createFieldsRow([
          {
            key: "postalCode",
            label: "Postal Code",
            type: "text",
            placeholder: "1234 AB",
            register: form.register("postalCode"),
            validation: {
              error: form.formState.errors.postalCode?.message,
              isRequired: true
            },
            testId: "input-postal-code",
            className: form.formState.errors.postalCode ? "border-red-500" : ""
          },
          {
            key: "city",
            label: "City",
            type: "text",
            placeholder: "Enter city",
            register: form.register("city"),
            validation: {
              error: form.formState.errors.city?.message,
              isRequired: true
            },
            testId: "input-city",
            className: form.formState.errors.city ? "border-red-500" : ""
          },
          {
            key: "country",
            label: "Country",
            type: "custom",
            customComponent: (
              <CountrySelectWithAdd
                value={form.watch("country") || ""}
                onValueChange={(value) => form.setValue("country", value)}
                placeholder="Selecteer land..."
                testId="select-address-country"
              />
            ),
            validation: {
              error: form.formState.errors.country?.message,
              isRequired: true
            }
          } as FormField2<FormData>
        ])
      ]
    }
  ];

  return (
    <LayoutForm2
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      actionButtons={[
        {
          key: "submit",
          label: isEditing ? "Update Address" : "Create Address",
          onClick: () => form.handleSubmit(onSubmit)(),
          variant: "default",
          disabled: createMutation.isPending || updateMutation.isPending || hasValidationErrors,
          loading: createMutation.isPending || updateMutation.isPending
        }
      ]}
      infoFields={infoFields}
      persistence={{
        formType: 'address',
        entityId: addressId
      }}
      isLoading={isLoadingAddress}
    />
  );
}