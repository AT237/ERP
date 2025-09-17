import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Search, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAddressSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { Address } from "@shared/schema";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

const addressFormSchema = insertAddressSchema.extend({
  street: z.string().min(1, "Street is required"),
  houseNumber: z.string().min(1, "House number is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

interface AddressSelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function AddressSelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select address...",
  testId = "select-address",
  className,
}: AddressSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("address");
  const { toast } = useToast();

  // Load addresses with search
  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/addresses?q=${encodeURIComponent(searchQuery)}` : "/api/addresses";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch addresses");
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Address form
  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "Nederland",
    },
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiRequest("POST", "/api/addresses", data);
      return response.json();
    },
    onSuccess: (newAddress) => {
      toast({
        title: "Success",
        description: "Address created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      onValueChange?.(newAddress.id);
      setShowAddDialog(false);
      addressForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create address",
        variant: "destructive",
      });
    },
  });

  const handleCreateAddress = (data: AddressFormData) => {
    createAddressMutation.mutate(data);
  };

  // Create form sections for address
  const createAddressFormSections = (): FormSection2<AddressFormData>[] => [
    {
      id: "address",
      label: "Address Details",
      icon: <MapPin className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "street",
            label: "Street",
            type: "text",
            register: addressForm.register("street"),
            validation: {
              error: addressForm.formState.errors.street?.message,
              isRequired: true
            },
            testId: "input-address-street",
            width: "67%"
          } as FormField2<AddressFormData>,
          {
            key: "houseNumber",
            label: "House No.",
            type: "text",
            register: addressForm.register("houseNumber"),
            validation: {
              error: addressForm.formState.errors.houseNumber?.message,
              isRequired: true
            },
            testId: "input-address-house-number",
            width: "33%"
          } as FormField2<AddressFormData>
        ]),
        createFieldsRow([
          {
            key: "postalCode",
            label: "Postal Code",
            type: "text",
            register: addressForm.register("postalCode"),
            validation: {
              error: addressForm.formState.errors.postalCode?.message,
              isRequired: true
            },
            testId: "input-address-postal-code",
            width: "33%"
          } as FormField2<AddressFormData>,
          {
            key: "city",
            label: "City",
            type: "text",
            register: addressForm.register("city"),
            validation: {
              error: addressForm.formState.errors.city?.message,
              isRequired: true
            },
            testId: "input-address-city",
            width: "33%"
          } as FormField2<AddressFormData>,
          {
            key: "country",
            label: "Country",
            type: "text",
            register: addressForm.register("country"),
            validation: {
              error: addressForm.formState.errors.country?.message,
              isRequired: true
            },
            testId: "input-address-country",
            width: "33%"
          } as FormField2<AddressFormData>
        ])
      ]
    }
  ];

  // Create action buttons
  const createActionButtons = (): ActionButton[] => [
    {
      key: "cancel",
      label: "Cancel",
      variant: "outline",
      onClick: () => setShowAddDialog(false),
      disabled: createAddressMutation.isPending
    },
    {
      key: "submit",
      label: createAddressMutation.isPending ? "Creating..." : "Create Address",
      variant: "default",
      onClick: () => addressForm.handleSubmit(handleCreateAddress)(),
      disabled: createAddressMutation.isPending
    }
  ];

  // Header fields with "Open full form" link
  const createAddressHeaderFields = () => [
    {
      label: "Address Management",
      value: (
        <Link href="/masterdata-form/addresses" data-testid="link-open-address-management">
          <Button variant="ghost" size="sm" className="h-auto p-0 text-orange-600 hover:text-orange-800">
            <ExternalLink className="h-4 w-4 mr-1" />
            Manage addresses
          </Button>
        </Link>
      )
    }
  ];

  const formatAddress = (address: Address) => {
    return `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}, ${address.country}`;
  };

  const selectedAddress = addresses.find(address => address.id === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            data-testid={testId}
          >
            {selectedAddress ? formatAddress(selectedAddress) : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 max-h-[300px]" 
          align="start" 
          sideOffset={4}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command>
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <CommandInput 
                placeholder="Search addresses..." 
                className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <div className="flex-shrink-0 ml-auto">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => setShowAddDialog(true)}
                  data-testid={`${testId}-add-button`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>No address found.</CommandEmpty>
              <CommandGroup>
                {addresses.map((address) => (
                  <CommandItem
                    key={address.id}
                    value={address.id}
                    onSelect={() => {
                      onValueChange?.(address.id);
                      setOpen(false);
                    }}
                    className="flex items-center"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === address.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{formatAddress(address)}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add Address Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          
          <LayoutForm2
            sections={createAddressFormSections()}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            form={addressForm}
            onSubmit={handleCreateAddress}
            actionButtons={createActionButtons()}
            headerFields={createAddressHeaderFields()}
            isLoading={createAddressMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}