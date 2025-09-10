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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="customer-name">Customer Name *</Label>
        <Input
          id="customer-name"
          {...form.register("name")}
          placeholder="Enter customer name"
          data-testid="input-quick-customer-name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="customer-email">Email *</Label>
        <Input
          id="customer-email"
          type="email"
          {...form.register("email")}
          placeholder="customer@example.com"
          data-testid="input-quick-customer-email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="customer-phone">Phone</Label>
        <Input
          id="customer-phone"
          {...form.register("phone")}
          placeholder="Phone number"
          data-testid="input-quick-customer-phone"
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          data-testid="button-cancel-customer"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          data-testid="button-save-customer"
        >
          {createMutation.isPending ? "Adding..." : "Add Customer"}
        </Button>
      </div>
    </form>
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
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact-first-name">First Name *</Label>
          <Input
            id="contact-first-name"
            {...form.register("firstName")}
            placeholder="John"
            data-testid="input-quick-contact-first-name"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="contact-last-name">Last Name *</Label>
          <Input
            id="contact-last-name"
            {...form.register("lastName")}
            placeholder="Doe"
            data-testid="input-quick-contact-last-name"
          />
          {form.formState.errors.lastName && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.lastName.message}
            </p>
          )}
        </div>
      </div>
      
      <div>
        <Label htmlFor="contact-email">Email *</Label>
        <Input
          id="contact-email"
          type="email"
          {...form.register("email")}
          placeholder="john.doe@company.com"
          data-testid="input-quick-contact-email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            {...form.register("phone")}
            placeholder="+31 6 12345678"
            data-testid="input-quick-contact-phone"
          />
        </div>
        
        <div>
          <Label htmlFor="contact-position">Position</Label>
          <Input
            id="contact-position"
            {...form.register("position")}
            placeholder="Manager"
            data-testid="input-quick-contact-position"
          />
        </div>
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          data-testid="button-submit-contact"
        >
          {createMutation.isPending ? "Adding..." : "Add Contact Person"}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          data-testid="button-cancel-contact"
        >
          Cancel
        </Button>
      </div>
    </form>
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="supplier-name">Supplier Name *</Label>
        <Input
          id="supplier-name"
          {...form.register("name")}
          placeholder="Enter supplier name"
          data-testid="input-quick-supplier-name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="supplier-email">Email *</Label>
        <Input
          id="supplier-email"
          type="email"
          {...form.register("email")}
          placeholder="supplier@example.com"
          data-testid="input-quick-supplier-email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="supplier-phone">Phone</Label>
        <Input
          id="supplier-phone"
          {...form.register("phone")}
          placeholder="Phone number"
          data-testid="input-quick-supplier-phone"
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          data-testid="button-cancel-supplier"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          data-testid="button-save-supplier"
        >
          {createMutation.isPending ? "Adding..." : "Add Supplier"}
        </Button>
      </div>
    </form>
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="project-name">Project Name *</Label>
        <Input
          id="project-name"
          {...form.register("name")}
          placeholder="Enter project name"
          data-testid="input-quick-project-name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      
      <div>
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          {...form.register("description")}
          placeholder="Enter project description"
          rows={3}
          data-testid="textarea-quick-project-description"
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          data-testid="button-cancel-project"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          data-testid="button-save-project"
        >
          {createMutation.isPending ? "Adding..." : "Add Project"}
        </Button>
      </div>
    </form>
  );
}