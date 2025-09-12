import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAddressSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { Address } from "@shared/schema";

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
          
          <form onSubmit={addressForm.handleSubmit(handleCreateAddress)} className="space-y-4">
            {/* Street and House Number */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Street *</Label>
                <Input
                  id="street"
                  {...addressForm.register("street")}
                  data-testid="input-address-street"
                />
                {addressForm.formState.errors.street && (
                  <p className="text-sm text-red-600">{addressForm.formState.errors.street.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="houseNumber">House No. *</Label>
                <Input
                  id="houseNumber"
                  {...addressForm.register("houseNumber")}
                  data-testid="input-address-house-number"
                />
                {addressForm.formState.errors.houseNumber && (
                  <p className="text-sm text-red-600">{addressForm.formState.errors.houseNumber.message}</p>
                )}
              </div>
            </div>

            {/* Postal Code, City, Country */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  {...addressForm.register("postalCode")}
                  data-testid="input-address-postal-code"
                />
                {addressForm.formState.errors.postalCode && (
                  <p className="text-sm text-red-600">{addressForm.formState.errors.postalCode.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...addressForm.register("city")}
                  data-testid="input-address-city"
                />
                {addressForm.formState.errors.city && (
                  <p className="text-sm text-red-600">{addressForm.formState.errors.city.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  {...addressForm.register("country")}
                  data-testid="input-address-country"
                />
                {addressForm.formState.errors.country && (
                  <p className="text-sm text-red-600">{addressForm.formState.errors.country.message}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel-address"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={createAddressMutation.isPending}
                data-testid="button-save-address"
              >
                {createAddressMutation.isPending ? "Creating..." : "Create Address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}