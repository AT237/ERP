import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, insertSupplierSchema, insertProjectSchema, insertCustomerContactSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertCustomer, InsertSupplier, InsertProject, InsertCustomerContact } from "@shared/schema";
import { z } from "zod";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';
import { Users, User, Building2, FolderOpen } from 'lucide-react';

// Quick Add Customer Form
const customerFormSchema = insertCustomerSchema.extend({
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface QuickAddCustomerProps {
  onSuccess?: (customerId: string) => void;
  onClose?: () => void;
}

export function QuickAddCustomer({ onSuccess, onClose }: QuickAddCustomerProps) {
  const [activeSection, setActiveSection] = useState("customer");
  const { toast } = useToast();
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
      onSuccess?.(newCustomer.id);
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createMutation.mutate(data);
  };

  // Create form sections for customer
  const createCustomerFormSections = (): FormSection2<CustomerFormData>[] => [
    {
      id: "customer",
      label: "Customer Info",
      icon: <Users className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "name",
          label: "Customer Name",
          type: "text",
          placeholder: "Enter customer name",
          register: form.register("name"),
          validation: {
            error: form.formState.errors.name?.message,
            isRequired: true
          },
          testId: "input-quick-customer-name"
        } as FormField2<CustomerFormData>),
        createFieldRow({
          key: "email",
          label: "Email",
          type: "email",
          placeholder: "customer@example.com",
          register: form.register("email"),
          validation: {
            error: form.formState.errors.email?.message,
            isRequired: true
          },
          testId: "input-quick-customer-email"
        } as FormField2<CustomerFormData>),
        createFieldRow({
          key: "phone",
          label: "Phone",
          type: "text",
          placeholder: "Phone number",
          register: form.register("phone"),
          testId: "input-quick-customer-phone"
        } as FormField2<CustomerFormData>)
      ]
    }
  ];

  // Create action buttons for customer
  const createCustomerActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => onClose?.(),
      disabled: createMutation.isPending
    },
    {
      label: createMutation.isPending ? "Adding..." : "Add Customer",
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending
    }
  ];

  return (
    <LayoutForm2
      sections={createCustomerFormSections()}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      actionButtons={createCustomerActionButtons()}
      isLoading={createMutation.isPending}
    />
  );
}

// Quick Add Contact Person Component
interface QuickAddContactPersonProps {
  onSuccess?: (contactId: string) => void;
  onClose?: () => void;
  customerId?: string;
}

const contactPersonFormSchema = insertCustomerContactSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  position: z.string().optional(),
}).omit({ customerId: true, mobile: true, dateOfBirth: true, isPrimary: true });

type ContactPersonFormData = z.infer<typeof contactPersonFormSchema>;

export function QuickAddContactPerson({ onSuccess, onClose, customerId }: QuickAddContactPersonProps) {
  const [activeSection, setActiveSection] = useState("contact");
  const { toast } = useToast();
  
  const form = useForm<ContactPersonFormData>({
    resolver: zodResolver(contactPersonFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomerContact) => {
      const response = await apiRequest("POST", "/api/customer-contacts", data);
      return response.json();
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      toast({
        title: "Success",
        description: "Contact person added successfully",
      });
      onSuccess?.(newContact.id);
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contact person",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactPersonFormData) => {
    createMutation.mutate({
      ...data,
      customerId: customerId || "",
      isPrimary: false,
      mobile: [],
      dateOfBirth: null,
    });
  };

  // Create form sections for contact person
  const createContactFormSections = (): FormSection2<ContactPersonFormData>[] => [
    {
      id: "contact",
      label: "Contact Info",
      icon: <User className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "firstName",
            label: "First Name",
            type: "text",
            placeholder: "John",
            register: form.register("firstName"),
            validation: {
              error: form.formState.errors.firstName?.message,
              isRequired: true
            },
            testId: "input-quick-contact-first-name",
            width: "50%"
          } as FormField2<ContactPersonFormData>,
          {
            key: "lastName",
            label: "Last Name",
            type: "text",
            placeholder: "Doe",
            register: form.register("lastName"),
            validation: {
              error: form.formState.errors.lastName?.message,
              isRequired: true
            },
            testId: "input-quick-contact-last-name",
            width: "50%"
          } as FormField2<ContactPersonFormData>
        ]),
        createFieldRow({
          key: "email",
          label: "Email",
          type: "email",
          placeholder: "john.doe@company.com",
          register: form.register("email"),
          validation: {
            error: form.formState.errors.email?.message,
            isRequired: true
          },
          testId: "input-quick-contact-email"
        } as FormField2<ContactPersonFormData>),
        createFieldsRow([
          {
            key: "phone",
            label: "Phone",
            type: "text",
            placeholder: "+31 6 12345678",
            register: form.register("phone"),
            testId: "input-quick-contact-phone",
            width: "50%"
          } as FormField2<ContactPersonFormData>,
          {
            key: "position",
            label: "Position",
            type: "text",
            placeholder: "Manager",
            register: form.register("position"),
            testId: "input-quick-contact-position",
            width: "50%"
          } as FormField2<ContactPersonFormData>
        ])
      ]
    }
  ];

  // Create action buttons for contact person
  const createContactActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => onClose?.(),
      disabled: createMutation.isPending
    },
    {
      label: createMutation.isPending ? "Adding..." : "Add Contact Person",
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending
    }
  ];

  return (
    <LayoutForm2
      sections={createContactFormSections()}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      actionButtons={createContactActionButtons()}
      isLoading={createMutation.isPending}
    />
  );
}

// Quick Add Supplier Form
const supplierFormSchema = insertSupplierSchema.extend({
  phone: z.string().optional(),
  address: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface QuickAddSupplierProps {
  onSuccess?: (supplierId: string) => void;
  onClose?: () => void;
}

export function QuickAddSupplier({ onSuccess, onClose }: QuickAddSupplierProps) {
  const [activeSection, setActiveSection] = useState("supplier");
  const { toast } = useToast();
  
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
      onSuccess?.(newSupplier.id);
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    createMutation.mutate(data);
  };

  // Create form sections for supplier
  const createSupplierFormSections = (): FormSection2<SupplierFormData>[] => [
    {
      id: "supplier",
      label: "Supplier Info",
      icon: <Building2 className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "name",
          label: "Supplier Name",
          type: "text",
          placeholder: "Enter supplier name",
          register: form.register("name"),
          validation: {
            error: form.formState.errors.name?.message,
            isRequired: true
          },
          testId: "input-quick-supplier-name"
        } as FormField2<SupplierFormData>),
        createFieldRow({
          key: "email",
          label: "Email",
          type: "email",
          placeholder: "supplier@example.com",
          register: form.register("email"),
          validation: {
            error: form.formState.errors.email?.message,
            isRequired: true
          },
          testId: "input-quick-supplier-email"
        } as FormField2<SupplierFormData>),
        createFieldRow({
          key: "phone",
          label: "Phone",
          type: "text",
          placeholder: "Phone number",
          register: form.register("phone"),
          testId: "input-quick-supplier-phone"
        } as FormField2<SupplierFormData>)
      ]
    }
  ];

  // Create action buttons for supplier
  const createSupplierActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => onClose?.(),
      disabled: createMutation.isPending
    },
    {
      label: createMutation.isPending ? "Adding..." : "Add Supplier",
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending
    }
  ];

  return (
    <LayoutForm2
      sections={createSupplierFormSections()}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      actionButtons={createSupplierActionButtons()}
      isLoading={createMutation.isPending}
    />
  );
}

// Quick Add Project Form
const projectFormSchema = insertProjectSchema.extend({
  totalValue: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface QuickAddProjectProps {
  onSuccess?: (projectId: string) => void;
  onClose?: () => void;
}

export function QuickAddProject({ onSuccess, onClose }: QuickAddProjectProps) {
  const [activeSection, setActiveSection] = useState("project");
  const { toast } = useToast();
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      customerId: "",
      status: "planning",
      totalValue: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project added successfully",
      });
      onSuccess?.(newProject.id);
      onClose?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createMutation.mutate(data);
  };

  // Create form sections for project
  const createProjectFormSections = (): FormSection2<ProjectFormData>[] => [
    {
      id: "project",
      label: "Project Info",
      icon: <FolderOpen className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "name",
          label: "Project Name",
          type: "text",
          placeholder: "Enter project name",
          register: form.register("name"),
          validation: {
            error: form.formState.errors.name?.message,
            isRequired: true
          },
          testId: "input-quick-project-name"
        } as FormField2<ProjectFormData>),
        createFieldRow({
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Enter project description",
          register: form.register("description"),
          testId: "textarea-quick-project-description",
          rows: 3
        } as FormField2<ProjectFormData>)
      ]
    }
  ];

  // Create action buttons for project
  const createProjectActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => onClose?.(),
      disabled: createMutation.isPending
    },
    {
      label: createMutation.isPending ? "Adding..." : "Add Project",
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending
    }
  ];

  return (
    <LayoutForm2
      sections={createProjectFormSections()}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      actionButtons={createProjectActionButtons()}
      isLoading={createMutation.isPending}
    />
  );
}