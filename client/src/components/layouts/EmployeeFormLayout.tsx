import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Minus, User, Phone } from "lucide-react";
import { insertEmployeeSchema, type InsertEmployee, type Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { z } from "zod";
import { 
  LayoutForm2, 
  type FormSection2, 
  createFieldRow, 
  createSectionHeaderRow 
} from './LayoutForm2';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = insertEmployeeSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
      const match = val.match(dateRegex);
      if (!match) return false;
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (date.getDate() !== parseInt(day) || 
          date.getMonth() !== parseInt(month) - 1 || 
          date.getFullYear() !== parseInt(year)) {
        return false;
      }
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      const dayDiff = today.getDate() - date.getDate();
      const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
      return actualAge <= 120 && date <= today;
    }, "Please enter a valid date in DD-MM-YYYY format (max age 120 years)")
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeFormLayoutProps {
  onSave: () => void;
  employeeId?: string;
}

export default function EmployeeFormLayout({ onSave, employeeId }: EmployeeFormLayoutProps) {
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    firstName: { label: "Voornaam" },
    lastName: { label: "Achternaam" },
  });
  const [activeSection, setActiveSection] = useState("personal");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([""]);

  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | undefined>(employeeId);
  const isEditing = !!currentEmployeeId;

  const { data: employee, isLoading: isLoadingEmployee } = useQuery<Employee>({
    queryKey: ["/api/employees", employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/employees/${employeeId}`);
      if (!response.ok) throw new Error("Failed to fetch employee");
      return response.json();
    },
    enabled: !!employeeId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      firstInitial: "",
      lastName: "",
      email: "",
      phone: "",
      mobile: [],
      title: "",
      dateOfBirth: "",
    }
  });

  useEffect(() => {
    if (employee && isEditing) {
      const mobilesArray = Array.isArray(employee.mobile) 
        ? employee.mobile 
        : employee.mobile ? [employee.mobile] : [];
      
      setMobileNumbers(mobilesArray.length > 0 ? mobilesArray : [""]);
      
      const formData = {
        firstName: employee.firstName || "",
        firstInitial: (employee as any).firstInitial || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        mobile: mobilesArray,
        title: employee.title || "",
        dateOfBirth: employee.dateOfBirth ? formatDateString(employee.dateOfBirth) : "",
      };
      
      form.reset(formData);
      setHasUnsavedChanges(false);
    }
  }, [employee, form, isEditing]);

  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const tabId = employeeId ? `employee-edit-${employeeId}` : 'new-employee';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, employeeId]);

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
    let formattedValue = value.replace(/[^\d+]/g, '');
    if (formattedValue && !formattedValue.startsWith('+')) {
      formattedValue = '+' + formattedValue;
    }
    const newNumbers = [...mobileNumbers];
    newNumbers[index] = formattedValue;
    setMobileNumbers(newNumbers);
    const validNumbers = newNumbers.filter(n => n.trim() !== "");
    form.setValue("mobile", validNumbers);
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData = {
        ...data,
        dateOfBirth: convertDateString(data.dateOfBirth)
      };
      return await apiRequest("POST", "/api/employees", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-employee', hasUnsavedChanges: false }
      }));
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const submitData = {
        ...data,
        dateOfBirth: convertDateString(data.dateOfBirth)
      };
      return await apiRequest("PATCH", `/api/employees/${employeeId}`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      setHasUnsavedChanges(false);
      const tabId = employeeId ? `employee-edit-${employeeId}` : 'new-employee';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

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
          key: "firstInitial",
          label: "First Initial",
          type: "text",
          placeholder: "e.g. A.",
          register: form.register("firstInitial"),
          testId: "input-first-initial"
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
          key: "title",
          label: "Title",
          type: "text",
          placeholder: "e.g. Engineer, Manager",
          register: form.register("title"),
          testId: "input-title"
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
    entityType: "employee",
    entityId: employeeId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
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
      documentType="employee"
      entityId={employeeId}
      changeTracking={{
        enabled: true,
        onChangesDetected: (hasChanges) => setHasUnsavedChanges(hasChanges)
      }}
      originalValues={employee ? {
        firstName: employee.firstName || "",
        firstInitial: (employee as any).firstInitial || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        mobile: Array.isArray(employee.mobile) ? employee.mobile : [],
        title: employee.title || "",
        dateOfBirth: employee.dateOfBirth ? formatDateString(employee.dateOfBirth) : "",
      } : undefined}
      isLoading={isLoadingEmployee}
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
