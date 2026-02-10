import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Minus, User, Phone } from "lucide-react";
import { insertCustomerContactSchema, type InsertCustomerContact, type CustomerContact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { z } from "zod";
import { 
  LayoutForm2, 
  type FormSection2, 
  createFieldRow, 
  createSectionHeaderRow 
} from './LayoutForm2';
import type { InfoField } from './InfoHeaderLayout';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Form schema with enhanced validation
const formSchema = insertCustomerContactSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional field
      
      // Check DD-MM-YYYY format
      const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
      const match = val.match(dateRegex);
      if (!match) return false;
      
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Check if date is valid
      if (date.getDate() !== parseInt(day) || 
          date.getMonth() !== parseInt(month) - 1 || 
          date.getFullYear() !== parseInt(year)) {
        return false;
      }
      
      // Check age limit (max 120 years)
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      const dayDiff = today.getDate() - date.getDate();
      
      const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
      
      return actualAge <= 120 && date <= today;
    }, "Please enter a valid date in DD-MM-YYYY format (max age 120 years)")
}).omit({ customerId: true });

type FormData = z.infer<typeof formSchema>;

interface ContactPersonFormLayoutProps {
  onSave: () => void;
  contactPersonId?: string;
}

export default function ContactPersonFormLayout({ onSave, contactPersonId }: ContactPersonFormLayoutProps) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("personal");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([""]);

  const isEditing = !!contactPersonId;

  // Fetch contact person data if editing
  const { data: contactPerson, isLoading: isLoadingContact } = useQuery<CustomerContact>({
    queryKey: ["/api/customer-contacts", contactPersonId],
    queryFn: async () => {
      const response = await fetch(`/api/customer-contacts/${contactPersonId}`);
      if (!response.ok) throw new Error("Failed to fetch contact person");
      return response.json();
    },
    enabled: !!contactPersonId,
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      mobile: [],
      position: "",
      dateOfBirth: "",
    }
  });

  // Load existing data into form
  useEffect(() => {
    if (contactPerson && isEditing) {
      const mobilesArray = Array.isArray(contactPerson.mobile) 
        ? contactPerson.mobile 
        : contactPerson.mobile ? [contactPerson.mobile] : [];
      
      setMobileNumbers(mobilesArray.length > 0 ? mobilesArray : [""]);
      
      const formData = {
        firstName: contactPerson.firstName || "",
        lastName: contactPerson.lastName || "",
        email: contactPerson.email || "",
        phone: contactPerson.phone || "",
        mobile: mobilesArray,
        position: contactPerson.position || "",
        dateOfBirth: contactPerson.dateOfBirth ? formatDateString(contactPerson.dateOfBirth) : "",
      };
      
      form.reset(formData);
      setHasUnsavedChanges(false);
    }
  }, [contactPerson, form, isEditing]);

  // Track form changes for unsaved changes indicator
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = contactPersonId ? `edit-contact-person-${contactPersonId}` : 'new-contact-person';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, contactPersonId]);

  // Helper functions
  const convertDateString = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return undefined;
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatDateString = (date: Date | string | null): string => {
    if (!date) return "";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Mobile number management
  const addMobileNumber = () => {
    const newNumbers = [...mobileNumbers, ""];
    setMobileNumbers(newNumbers);
    form.setValue("mobile", newNumbers.filter(n => n.trim() !== ""));
  };

  const removeMobileNumber = (index: number) => {
    const newNumbers = mobileNumbers.filter((_, i) => i !== index);
    setMobileNumbers(newNumbers);
    form.setValue("mobile", newNumbers.filter(n => n.trim() !== ""));
  };

  const updateMobileNumber = (index: number, value: string) => {
    let formattedValue = value.replace(/[^\d+]/g, ''); // Keep only digits and +
    if (formattedValue && !formattedValue.startsWith('+')) {
      formattedValue = '+' + formattedValue;
    }
    
    const newNumbers = [...mobileNumbers];
    newNumbers[index] = formattedValue;
    setMobileNumbers(newNumbers);
    
    const validNumbers = newNumbers.filter(n => n.trim() !== "");
    form.setValue("mobile", validNumbers);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData = {
        ...data,
        customerId: null, // Independent contacts
        dateOfBirth: convertDateString(data.dateOfBirth)
      };
      return await apiRequest("POST", "/api/customer-contacts", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Contact person created successfully",
      });
      setHasUnsavedChanges(false);
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contact person",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData = {
        ...data,
        customerId: contactPerson?.customerId || null,
        dateOfBirth: convertDateString(data.dateOfBirth)
      };
      return await apiRequest("PATCH", `/api/customer-contacts/${contactPersonId}`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts", contactPersonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Contact person updated successfully",
      });
      setHasUnsavedChanges(false);
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact person",
        variant: "destructive",
      });
    },
  });

  // Form submit handler
  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Header fields removed per user request

  // Form sections
  const formSections: FormSection2<FormData>[] = [
    {
      id: "personal",
      label: "Personal Info",
      icon: <User className="h-4 w-4" />,
      rows: [
        createSectionHeaderRow("Basic Information"),
        createFieldRow({
          key: "firstName",
          label: "First Name",
          type: "text",
          register: form.register("firstName"),
          validation: {
            isRequired: true,
            error: form.formState.errors.firstName?.message
          },
          testId: "input-first-name"
        }),
        createFieldRow({
          key: "lastName",
          label: "Last Name",
          type: "text",
          register: form.register("lastName"),
          validation: {
            isRequired: true,
            error: form.formState.errors.lastName?.message
          },
          testId: "input-last-name"
        }),
        createFieldRow({
          key: "dateOfBirth",
          label: "Date of Birth",
          type: "text",
          placeholder: "DD-MM-YYYY",
          register: form.register("dateOfBirth"),
          validation: {
            error: form.formState.errors.dateOfBirth?.message
          },
          testId: "input-date-of-birth"
        }),
        createFieldRow({
          key: "position",
          label: "Position",
          type: "text",
          placeholder: "e.g. Manager, Director",
          register: form.register("position"),
          testId: "input-position"
        }),
      ]
    },
    {
      id: "contact",
      label: "Contact Info",
      icon: <Phone className="h-4 w-4" />,
      rows: [
        createSectionHeaderRow("Contact Details"),
        createFieldRow({
          key: "email",
          label: "Email Address",
          type: "email",
          register: form.register("email"),
          validation: {
            error: form.formState.errors.email?.message
          },
          testId: "input-email"
        }),
        createFieldRow({
          key: "phone",
          label: "Phone Number",
          type: "tel",
          register: form.register("phone"),
          validation: {
            error: form.formState.errors.phone?.message
          },
          testId: "input-phone"
        }),
        createFieldRow({
          key: "mobile",
          label: "Mobile Numbers",
          type: "custom",
          validation: {
            error: form.formState.errors.mobile?.message
          },
          testId: "input-mobile-numbers",
          customComponent: (
            <div className="space-y-2">
              {mobileNumbers.map((number, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    type="text"
                    value={number}
                    onChange={(e) => updateMobileNumber(index, e.target.value)}
                    placeholder="+0031612345678"
                    data-testid={`input-mobile-${index}`}
                    className="flex-1"
                  />
                  {mobileNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeMobileNumber(index)}
                      data-testid={`button-remove-mobile-${index}`}
                      className="shrink-0"
                    >
                      <Minus size={16} />
                    </Button>
                  )}
                  {index === mobileNumbers.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addMobileNumber}
                      data-testid="button-add-mobile"
                      className="shrink-0"
                    >
                      <Plus size={16} />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.mobile && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.mobile.message}
                </p>
              )}
            </div>
          )
        }),
      ]
    },
  ];

  const toolbar = useFormToolbar({
    entityType: "contact_person",
    entityId: contactPersonId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  return (
    <LayoutForm2
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      toolbar={toolbar}
      documentType="contact_person"
      entityId={contactPersonId}
      changeTracking={{
        enabled: true,
        onChangesDetected: (hasChanges) => setHasUnsavedChanges(hasChanges)
      }}
      originalValues={contactPerson ? {
        firstName: contactPerson.firstName || "",
        lastName: contactPerson.lastName || "",
        email: contactPerson.email || "",
        phone: contactPerson.phone || "",
        mobile: Array.isArray(contactPerson.mobile) ? contactPerson.mobile : [],
        position: contactPerson.position || "",
        dateOfBirth: contactPerson.dateOfBirth ? formatDateString(contactPerson.dateOfBirth) : "",
      } : undefined}
      isLoading={isLoadingContact}
    />
  );
}