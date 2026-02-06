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

// Form schema with enhanced validation - only city and country are required
const formSchema = insertAddressSchema.extend({
  street: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  houseNumber: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
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
      location: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: ""
    }
  });

  // Load existing data into form OR reset for new entry
  useEffect(() => {
    if (address && isEditing) {
      const formData = {
        street: address.street || "",
        location: address.location || "",
        houseNumber: address.houseNumber || "",
        postalCode: address.postalCode || "",
        city: address.city || "",
        country: address.country || ""
      };
      
      form.reset(formData);
      setHasUnsavedChanges(false);
    } else if (!isEditing) {
      // Reset to empty values for new entry
      form.reset({
        street: "",
        location: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        country: ""
      });
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

  // Form sections - All fields in left column (column-first: fill left before using right)
  const sections: FormSection2<FormData>[] = [
    {
      id: "address",
      label: "Address Information",
      icon: <Building className="h-4 w-4" />,
      rows: [
        createSectionHeaderRow("Basic Information"),
        createFieldRow({
          key: "street",
          label: "Street",
          type: "text",
          placeholder: "Enter street name",
          register: form.register("street"),
          validation: {
            error: form.formState.errors.street?.message,
            isRequired: false
          },
          testId: "input-street"
        }),
        createFieldRow({
          key: "location",
          label: "Location",
          type: "text",
          placeholder: "Building, floor, etc.",
          register: form.register("location"),
          validation: {
            error: form.formState.errors.location?.message,
            isRequired: false
          },
          testId: "input-location"
        }),
        createFieldRow({
          key: "houseNumber",
          label: "House Number", 
          type: "text",
          placeholder: "123A",
          register: form.register("houseNumber"),
          validation: {
            error: form.formState.errors.houseNumber?.message,
            isRequired: false
          },
          testId: "input-house-number"
        }),
        createFieldRow({
          key: "postalCode",
          label: "Postal Code",
          type: "text",
          placeholder: "1234 AB",
          register: form.register("postalCode"),
          validation: {
            error: form.formState.errors.postalCode?.message,
            isRequired: false
          },
          testId: "input-postal-code"
        }),
        createFieldRow({
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
        }),
        createFieldRow({
          key: "country",
          label: "Country",
          type: "custom",
          customComponent: (
            <CountrySelectWithAdd
              value={form.watch("country") || ""}
              onValueChange={(value) => form.setValue("country", value)}
              placeholder="Select country..."
              testId="select-address-country"
            />
          ),
          validation: {
            error: form.formState.errors.country?.message,
            isRequired: true
          }
        })
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
      toolbar={{
        onSave: () => form.handleSubmit(onSubmit)(),
        saveDisabled: createMutation.isPending || updateMutation.isPending || hasValidationErrors,
        saveLoading: createMutation.isPending || updateMutation.isPending,
      }}
      infoFields={infoFields}
      persistence={{
        formType: 'address',
        entityId: addressId
      }}
      isLoading={isLoadingAddress}
    />
  );
}