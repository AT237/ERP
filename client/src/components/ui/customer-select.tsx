import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const customerFormSchema = insertCustomerSchema.extend({
  name: z.string().min(1, "Company name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  language: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms is required"),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().optional(),
  primaryContactPhone: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  onOpen?: () => void; // Callback to trigger lazy loading
  customers?: Array<{ id: string; customerNumber: string; name: string; email?: string; phone?: string }>; // Optional external customers data
  parentId?: string; // ID of the parent tab that opened this select
  onRefreshCustomer?: () => void; // Called when user clicks the refresh icon to sync customer snapshot
}

export function CustomerSelect({
  value,
  onValueChange,
  placeholder = "Select customer...",
  testId = "select-customer",
  className,
  onOpen,
  customers: externalCustomers,
  parentId,
  onRefreshCustomer,
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [isRefreshingCustomer, setIsRefreshingCustomer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load customers only when not provided externally
  const { data: internalCustomers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: !externalCustomers, // Only fetch if no external customers provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Use external customers if provided, otherwise use internal query
  const customers = externalCustomers || internalCustomers;
  const customersTyped = customers as Array<{
    id: string;
    customerNumber: string;
    name: string;
    email?: string;
    phone?: string;
  }>;

  // Customer form
  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      language: "nl",
      paymentTerms: "30",
      country: "Nederland",
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: (newCustomer) => {
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      onValueChange?.(newCustomer.id);
      setShowAddDialog(false);
      customerForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  // Edit customer mutation
  const editCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData & { id: string }) => {
      const response = await apiRequest("PUT", `/api/customers/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/extended"] });
      setShowEditDialog(false);
      setEditingCustomer(null);
      customerForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const handleCreateCustomer = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  const handleEditCustomer = (data: CustomerFormData) => {
    if (!editingCustomer) return;
    const processedData = {
      ...data,
      id: editingCustomer,
    };
    editCustomerMutation.mutate(processedData);
  };

  const openEditDialog = (customer: any) => {
    setEditingCustomer(customer.id);
    // Pre-populate form with customer data
    customerForm.reset({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      street: customer.street || "",
      houseNumber: customer.houseNumber || "",
      postalCode: customer.postalCode || "",
      city: customer.city || "",
      country: customer.country || "Nederland",
      language: customer.language || "nl",
      paymentTerms: customer.paymentTerms?.toString() || "30",
      primaryContactName: customer.primaryContactName || "",
      primaryContactEmail: customer.primaryContactEmail || "",
      primaryContactPhone: customer.primaryContactPhone || "",
    });
    setShowEditDialog(true);
    setOpen(false);
  };

  // Listen for entity-created events to auto-select newly created customer
  // Only react to events scoped to this specific CustomerSelect instance
  useEffect(() => {
    const handleEntityCreated = (event: CustomEvent) => {
      const { entityType, entity, parentId: eventParentId } = event.detail;
      
      // Only handle customer creation events that are scoped to this component
      const myParentId = parentId || testId;
      if (entityType === 'customer' && entity?.id && eventParentId === myParentId) {
        // Auto-select the newly created customer
        onValueChange?.(entity.id);
      }
    };

    window.addEventListener('entity-created', handleEntityCreated as EventListener);
    return () => {
      window.removeEventListener('entity-created', handleEntityCreated as EventListener);
    };
  }, [onValueChange, parentId, testId]);

  const selectedCustomer = customersTyped.find(customer => customer.id === value);

  return (
    <>
      <div className="flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (isOpen && onOpen) {
              onOpen();
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn("w-full justify-between", className)}
                data-testid={testId}
              >
                <span
                  className={cn("truncate", value && selectedCustomer ? "cursor-pointer hover:underline" : "")}
                  title={value && selectedCustomer ? "Dubbelklik om te openen" : undefined}
                  onDoubleClick={(e) => {
                    if (!value || !selectedCustomer) return;
                    e.stopPropagation();
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent('open-form-tab', {
                      detail: {
                        id: `customer-${value}`,
                        name: selectedCustomer.customerNumber || selectedCustomer.name,
                        formType: 'customer',
                        entityId: value,
                      }
                    }));
                  }}
                >{selectedCustomer ? selectedCustomer.name : placeholder}</span>
                {value && selectedCustomer && onRefreshCustomer && (
                  <span
                    className="ml-auto inline-flex items-center"
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClickCapture={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (isRefreshingCustomer) return;
                      setIsRefreshingCustomer(true);
                      onRefreshCustomer();
                      setTimeout(() => setIsRefreshingCustomer(false), 700);
                    }}
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4 shrink-0 text-orange-600 hover:text-orange-700 cursor-pointer",
                        isRefreshingCustomer && "animate-spin-once"
                      )}
                      title="Klantgegevens synchroniseren met dit document"
                    />
                  </span>
                )}
                <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 max-h-[300px]" 
              align="start" 
              sideOffset={4}
              style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
              <Command
                filter={(value, search) => {
                  if (value === '__clear__') return search ? 0 : 1;
                  const customer = customersTyped.find(c => c.id === value);
                  if (!customer) return 0;
                  
                  const searchLower = search.toLowerCase();
                  return (
                    customer.name?.toLowerCase().includes(searchLower) ||
                    customer.customerNumber?.toLowerCase().includes(searchLower) ||
                    customer.email?.toLowerCase().includes(searchLower) ||
                    customer.phone?.toLowerCase().includes(searchLower)
                  ) ? 1 : 0;
                }}
              >
                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                  <CommandInput 
                    placeholder="Search customers..." 
                    className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
                  />
                  <div className="flex-shrink-0 ml-auto">
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      onClick={() => {
                        const uniqueTabId = `customer-new-${Date.now()}`;
                        window.dispatchEvent(new CustomEvent('open-form-tab', {
                          detail: {
                            id: uniqueTabId,
                            name: 'New Customer',
                            formType: 'customer',
                            parentId: parentId || testId
                          }
                        }));
                        setOpen(false);
                      }}
                      data-testid={`button-add-customer-${parentId || testId}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CommandList>
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>
                    {value && (
                      <CommandItem
                        value="__clear__"
                        onSelect={() => { onValueChange?.(""); setOpen(false); }}
                        className="text-muted-foreground italic"
                      >
                        — Clear selection —
                      </CommandItem>
                    )}
                    {customersTyped.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => {
                          onValueChange?.(customer.id);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <div className="font-medium">{customer.name}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const uniqueTabId = `customer-edit-${customer.id}-${Date.now()}`;
                            window.dispatchEvent(new CustomEvent('open-form-tab', {
                              detail: {
                                id: uniqueTabId,
                                name: customer.name || 'Edit Customer',
                                formType: 'customer',
                                entityId: customer.id,
                                parentId: parentId || testId
                              }
                            }));
                            setOpen(false);
                          }}
                          data-testid={`${testId}-edit-${customer.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={customerForm.handleSubmit(handleCreateCustomer)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  {...customerForm.register("name")}
                  data-testid="input-customer-name"
                />
                {customerForm.formState.errors.name && (
                  <p className="text-sm text-red-600">{customerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select 
                  onValueChange={(value) => customerForm.setValue("language", value)}
                  value={customerForm.watch("language") || "nl"}
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
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...customerForm.register("email")}
                  data-testid="input-customer-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...customerForm.register("phone")}
                  data-testid="input-customer-phone"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  {...customerForm.register("street")}
                  data-testid="input-customer-street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="houseNumber">House No.</Label>
                <Input
                  id="houseNumber"
                  {...customerForm.register("houseNumber")}
                  data-testid="input-customer-house-number"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  {...customerForm.register("postalCode")}
                  data-testid="input-customer-postal-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...customerForm.register("city")}
                  data-testid="input-customer-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...customerForm.register("country")}
                  data-testid="input-customer-country"
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms *</Label>
              <Select 
                onValueChange={(value) => customerForm.setValue("paymentTerms", value)}
                value={customerForm.watch("paymentTerms") || "30"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary Contact */}
            <div className="space-y-4">
              <h4 className="font-medium">Primary Contact (Optional)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryContactName">Name</Label>
                  <Input
                    id="primaryContactName"
                    {...customerForm.register("primaryContactName")}
                    data-testid="input-primary-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryContactEmail">Email</Label>
                  <Input
                    id="primaryContactEmail"
                    type="email"
                    {...customerForm.register("primaryContactEmail")}
                    data-testid="input-primary-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryContactPhone">Phone</Label>
                  <Input
                    id="primaryContactPhone"
                    {...customerForm.register("primaryContactPhone")}
                    data-testid="input-primary-contact-phone"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel-customer"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={createCustomerMutation.isPending}
                data-testid="button-save-customer"
              >
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={customerForm.handleSubmit(handleEditCustomer)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Company Name *</Label>
                <Input
                  id="edit-name"
                  {...customerForm.register("name")}
                  data-testid="input-edit-customer-name"
                />
                {customerForm.formState.errors.name && (
                  <p className="text-sm text-red-600">{customerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-language">Language</Label>
                <Select 
                  onValueChange={(value) => customerForm.setValue("language", value)}
                  value={customerForm.watch("language") || "nl"}
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
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...customerForm.register("email")}
                  data-testid="input-edit-customer-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  {...customerForm.register("phone")}
                  data-testid="input-edit-customer-phone"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-street">Street</Label>
                <Input
                  id="edit-street"
                  {...customerForm.register("street")}
                  data-testid="input-edit-customer-street"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-houseNumber">House No.</Label>
                <Input
                  id="edit-houseNumber"
                  {...customerForm.register("houseNumber")}
                  data-testid="input-edit-customer-house-number"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-postalCode">Postal Code</Label>
                <Input
                  id="edit-postalCode"
                  {...customerForm.register("postalCode")}
                  data-testid="input-edit-customer-postal-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  {...customerForm.register("city")}
                  data-testid="input-edit-customer-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  {...customerForm.register("country")}
                  data-testid="input-edit-customer-country"
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="edit-paymentTerms">Payment Terms *</Label>
              <Select 
                onValueChange={(value) => customerForm.setValue("paymentTerms", value)}
                value={customerForm.watch("paymentTerms") || "30"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="45">45 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Primary Contact */}
            <div className="space-y-4">
              <h4 className="font-medium">Primary Contact (Optional)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-primaryContactName">Name</Label>
                  <Input
                    id="edit-primaryContactName"
                    {...customerForm.register("primaryContactName")}
                    data-testid="input-edit-primary-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-primaryContactEmail">Email</Label>
                  <Input
                    id="edit-primaryContactEmail"
                    type="email"
                    {...customerForm.register("primaryContactEmail")}
                    data-testid="input-edit-primary-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-primaryContactPhone">Phone</Label>
                  <Input
                    id="edit-primaryContactPhone"
                    {...customerForm.register("primaryContactPhone")}
                    data-testid="input-edit-primary-contact-phone"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingCustomer(null);
                  customerForm.reset();
                }}
                data-testid="button-cancel-edit-customer"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={editCustomerMutation.isPending}
                data-testid="button-save-edit-customer"
              >
                {editCustomerMutation.isPending ? "Updating..." : "Update Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}