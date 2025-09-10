import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Search, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddContactPerson } from "@/components/quick-add-forms";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, InsertCustomer, CustomerContact } from "@shared/schema";
import { z } from "zod";

const formSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().min(1, "Payment terms is required"),
  // Temporary fields for address input (will be saved to addresses table)
  street: z.string().optional(),
  houseNumber: z.string().optional(), 
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  // Temporary fields for primary contact (will be saved to customerContacts table)
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  primaryContactMobile: z.string().optional(),
  primaryContactPosition: z.string().optional(),
  contactPersonEmail: z.string().email().optional(),
  selectedContactPersonId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: customerContacts, isLoading: contactsLoading } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customer-contacts"],
  });


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobile: "",
      taxId: "",
      bankAccount: "",
      language: "nl",
      paymentTerms: "30",
      status: "active",
      // Address fields
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "Netherlands",
      // Primary contact fields
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      primaryContactMobile: "",
      primaryContactPosition: "",
      contactPersonEmail: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingCustomer(null);
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCustomer> }) => {
      const response = await apiRequest("PUT", `/api/customers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingCustomer(null);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Extract only customer table fields
    const submitData: InsertCustomer = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      mobile: data.mobile,
      taxId: data.taxId,
      bankAccount: data.bankAccount,
      language: data.language,
      paymentTerms: parseInt(data.paymentTerms),
      status: data.status,
      contactPersonEmail: data.contactPersonEmail,
      // We'll handle address and contacts separately later
    };

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      mobile: customer.mobile || "",
      taxId: customer.taxId || "",
      bankAccount: customer.bankAccount || "",
      language: customer.language || "nl",
      paymentTerms: customer.paymentTerms?.toString() || "30",
      status: customer.status || "active",
      // Address fields (we'll load these from related address)
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "Netherlands",
      // Primary contact fields (we'll load these from related contacts)
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      primaryContactMobile: "",
      primaryContactPosition: "",
      contactPersonEmail: customer.contactPersonEmail || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCustomer = () => {
    alert("ADD Customer button clicked!");
    console.log("ADD Customer button clicked!");
    setEditingCustomer(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      mobile: "",
      taxId: "",
      bankAccount: "",
      language: "nl",
      paymentTerms: "30",
      status: "active",
      // Address fields
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "Netherlands",
      // Primary contact fields
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      primaryContactMobile: "",
      primaryContactPosition: "",
    });
    console.log("Setting dialog open to true");
    setIsDialogOpen(true);
    console.log("Dialog state after setting:", isDialogOpen);
  };

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Image */}
      <Card>
        <CardContent className="p-0">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Professional business office with team working" 
            className="rounded-lg w-full h-48 object-cover" 
          />
        </CardContent>
      </Card>

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-customers"
            />
          </div>
        </div>
        
        <button 
          onClick={() => alert("SIMPLE BUTTON WORKS!")} 
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          data-testid="button-add-customer"
        >
          <Plus className="mr-2" size={16} />
          Add Customer (TEST)
        </button>
      </div>

      {/* Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer information and contact details" : "Create a new customer with contact information"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="max-h-[70vh] overflow-y-auto pr-2" style={{scrollBehavior: 'smooth'}}>
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Enter company name"
                      data-testid="input-customer-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      {...form.register("taxId")}
                      placeholder="Tax identification number"
                      data-testid="input-tax-id"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAccount">Bank Account</Label>
                    <Input
                      id="bankAccount"
                      {...form.register("bankAccount")}
                      placeholder="Bank account number"
                      data-testid="input-bank-account"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={form.watch("language") || "nl"} 
                      onValueChange={(value) => form.setValue("language", value)}
                    >
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="company@example.com"
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...form.register("phone")}
                      placeholder="+31 20 123 4567"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    {...form.register("mobile")}
                    placeholder="+31 6 12 34 56 78"
                    data-testid="input-mobile"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPersonEmail">Contact Person Email in Company</Label>
                  <Input
                    id="contactPersonEmail"
                    type="email"
                    {...form.register("contactPersonEmail")}
                    placeholder="contactperson@company.com"
                    data-testid="input-contact-person-email"
                  />
                  {form.formState.errors.contactPersonEmail && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.contactPersonEmail.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">Address Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street">Street</Label>
                    <Input
                      id="street"
                      {...form.register("street")}
                      placeholder="Enter street name"
                      data-testid="input-street"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="houseNumber">House Number</Label>
                    <Input
                      id="houseNumber"
                      {...form.register("houseNumber")}
                      placeholder="123A"
                      data-testid="input-house-number"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      {...form.register("postalCode")}
                      placeholder="1234 AB"
                      data-testid="input-postal-code"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder="Amsterdam"
                      data-testid="input-city"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...form.register("country")}
                      placeholder="Netherlands"
                      data-testid="input-country"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Contact Person */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">Primary Contact Person</h3>
                <div>
                  <Label htmlFor="selectedContactPersonId">Contact Person</Label>
                  <SelectWithAdd
                    value={form.watch("selectedContactPersonId") || ""}
                    onValueChange={(value) => form.setValue("selectedContactPersonId", value)}
                    placeholder="Select or add contact person"
                    addFormTitle="Add New Contact Person"
                    testId="select-primary-contact"
                    addFormContent={
                      <QuickAddContactPerson 
                        onSuccess={(contactId) => {
                          form.setValue("selectedContactPersonId", contactId);
                          queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
                        }}
                        onClose={() => {}}
                        customerId={editingCustomer?.id}
                      />
                    }
                  >
                    {contactsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading contacts...
                      </SelectItem>
                    ) : customerContacts && customerContacts.length > 0 ? (
                      customerContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName} ({contact.email})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-contacts" disabled>
                        No contact persons found
                      </SelectItem>
                    )}
                  </SelectWithAdd>
                </div>
              </div>

              {/* Business Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">Business Settings</h3>
                
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                    <Select 
                      value={form.watch("paymentTerms")} 
                      onValueChange={(value) => form.setValue("paymentTerms", value)}
                    >
                      <SelectTrigger data-testid="select-payment-terms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="45">45 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={form.watch("status") || "active"} 
                      onValueChange={(value) => form.setValue("status", value)}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              </div>
              <div className="flex space-x-3 pt-4 border-t mt-4">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-customer"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Customer"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2" size={20} />
            Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table className="table-fixed w-full">
              <TableHeader className="bg-orange-50 dark:bg-orange-900/20">
                <TableRow>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-1/5">Company Name</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-1/6">Email</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-1/8">Phone</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-1/8">Mobile</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-16">Language</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-20">Payment Terms</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-16">Status</TableHead>
                  <TableHead className="whitespace-nowrap uppercase font-semibold text-xs text-orange-800 dark:text-orange-200 w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No customers found. Create your first customer to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`} className="text-sm font-normal">
                      <TableCell className="font-medium truncate pr-2" title={customer.name}>{customer.name}</TableCell>
                      <TableCell>
                        {customer.email ? (
                          <div className="flex items-center space-x-2">
                            <Mail size={14} className="text-orange-500" />
                            <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                              {customer.email}
                            </a>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center space-x-2">
                            <Phone size={14} className="text-orange-500" />
                            <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                              {customer.phone}
                            </a>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {customer.mobile ? (
                          <div className="flex items-center space-x-2">
                            <Phone size={14} className="text-green-500" />
                            <a href={`tel:${customer.mobile}`} className="text-blue-600 hover:underline">
                              {customer.mobile}
                            </a>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {customer.language?.toUpperCase() || "NL"}
                        </Badge>
                      </TableCell>
                      <TableCell>{customer.paymentTerms || 30} days</TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.status === "active" ? "default" : "secondary"}
                          className={customer.status === "active" ? "bg-green-100 text-green-800" : ""}
                        >
                          {customer.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            data-testid={`button-edit-${customer.id}`}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
                            data-testid={`button-delete-${customer.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
