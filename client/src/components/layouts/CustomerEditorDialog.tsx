import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CustomerFormLayout } from "./CustomerFormLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCustomerSchema } from "@shared/schema";
import { z } from "zod";

const customerFormSchema = insertCustomerSchema.omit({ id: true }).extend({
  name: z.string().min(1, "Company name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  language: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  taxId: z.string().optional(),
  bankAccount: z.string().optional(),
  contactPersonEmail: z.string().optional(),
  // Address fields (will create address separately)
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  customerId?: string;
  initialData?: any;
  onSuccess: (id: string) => void;
}

export function CustomerEditorDialog({
  open,
  onOpenChange,
  mode,
  customerId,
  initialData,
  onSuccess
}: CustomerEditorDialogProps) {
  const { toast } = useToast();

  // Fetch customer data for edit mode if no initialData provided
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["/api/customers", customerId],
    enabled: mode === "edit" && !!customerId && !initialData,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // First create the address if provided
      let addressId = null;
      if (data.street || data.city || data.country) {
        const addressResponse = await apiRequest("POST", "/api/addresses", {
          street: data.street || "",
          houseNumber: data.houseNumber || "",
          postalCode: data.postalCode || "",
          city: data.city || "",
          country: data.country || "Nederland",
        });
        const addressData = await addressResponse.json();
        addressId = addressData.id;
      }

      // Then create the customer
      const customerResponse = await apiRequest("POST", "/api/customers", {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        language: data.language || "nl",
        paymentTerms: parseInt(data.paymentTerms),
        addressId,
        taxId: data.taxId || null,
        bankAccount: data.bankAccount || null,
        contactPersonEmail: data.contactPersonEmail || null,
      });
      return await customerResponse.json();
    },
    onSuccess: (newCustomer) => {
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      onSuccess(newCustomer.id);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!customerId) throw new Error("Customer ID is required for update");

      // Update address if provided and exists
      const customer = customerData || initialData;
      if (customer?.addressId && (data.street || data.city || data.country)) {
        await apiRequest("PUT", `/api/addresses/${customer.addressId}`, {
          street: data.street || "",
          houseNumber: data.houseNumber || "",
          postalCode: data.postalCode || "",
          city: data.city || "",
          country: data.country || "Nederland",
        });
      } else if (!customer?.addressId && (data.street || data.city || data.country)) {
        // Create new address if customer doesn't have one
        const addressResponse = await apiRequest("POST", "/api/addresses", {
          street: data.street || "",
          houseNumber: data.houseNumber || "",
          postalCode: data.postalCode || "",
          city: data.city || "",
          country: data.country || "Nederland",
        });
        const addressData = await addressResponse.json();
        
        // Update customer with new address
        const customerResponse = await apiRequest("PUT", `/api/customers/${customerId}`, {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          mobile: data.mobile || null,
          language: data.language || "nl",
          paymentTerms: parseInt(data.paymentTerms),
          addressId: addressData.id,
          taxId: data.taxId || null,
          bankAccount: data.bankAccount || null,
          contactPersonEmail: data.contactPersonEmail || null,
        });
        return await customerResponse.json();
      }

      // Update customer
      const customerResponse = await apiRequest("PUT", `/api/customers/${customerId}`, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        language: data.language || "nl",
        paymentTerms: parseInt(data.paymentTerms),
        taxId: data.taxId || null,
        bankAccount: data.bankAccount || null,
        contactPersonEmail: data.contactPersonEmail || null,
      });
      return await customerResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      onSuccess(customerId!);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    }
  });

  const handleSave = (data: CustomerFormData) => {
    if (mode === "create") {
      createCustomerMutation.mutate(data);
    } else {
      updateCustomerMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Prepare initial data for form
  const formData = initialData || customerData;
  const mappedInitialData = formData ? {
    name: formData.name || "",
    email: formData.email || "",
    phone: formData.phone || "",
    mobile: formData.mobile || "",
    language: formData.language || "nl",
    paymentTerms: formData.paymentTerms?.toString() || "30",
    street: formData.address?.street || formData.street || "",
    houseNumber: formData.address?.houseNumber || formData.houseNumber || "",
    postalCode: formData.address?.postalCode || formData.postalCode || "",
    city: formData.address?.city || formData.city || "",
    country: formData.address?.country || formData.country || "Nederland",
    taxId: formData.taxId || "",
    bankAccount: formData.bankAccount || "",
    contactPersonEmail: formData.contactPersonEmail || "",
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0"
        data-testid="dialog-customer-editor"
      >
        {isLoadingCustomer ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-lg">Loading customer data...</div>
          </div>
        ) : (
          <CustomerFormLayout
            customerId={customerId}
            initialData={mappedInitialData}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={createCustomerMutation.isPending || updateCustomerMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}