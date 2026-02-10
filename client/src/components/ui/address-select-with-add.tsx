import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Address } from "@shared/schema";

// Address form schema moved to tab-based system

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
  // Dialog state removed - using tab system instead
  const [searchQuery, setSearchQuery] = useState("");
  // Active section state removed - using tab system instead
  // Toast removed - not needed for tab-based system

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

  // Address form moved to tab-based system

  // Address creation moved to tab-based system

  // Address creation handler moved to tab-based system

  // Form sections moved to tab-based system

  // Action buttons moved to tab-based system

  // Header fields moved to tab-based system

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
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent('open-form-tab', { 
                      detail: { 
                        id: 'new-address', 
                        name: 'New Address', 
                        formType: 'address' 
                      } 
                    }));
                  }}
                  data-testid={`${testId}-add-button`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>No address found.</CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onValueChange?.("");
                      setOpen(false);
                    }}
                    className="text-muted-foreground italic"
                  >
                    — Clear selection —
                  </CommandItem>
                )}
                {addresses.map((address) => (
                  <CommandItem
                    key={address.id}
                    value={address.id}
                    onSelect={() => {
                      onValueChange?.(address.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center flex-1">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === address.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{formatAddress(address)}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-orange-600 hover:bg-orange-50 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        window.dispatchEvent(new CustomEvent('open-form-tab', { 
                          detail: { 
                            id: `address-${address.id}`, 
                            name: `Edit Address`, 
                            formType: 'address',
                            recordId: address.id
                          } 
                        }));
                      }}
                      data-testid={`${testId}-view-${address.id}`}
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Address form now opens in tab instead of dialog */}
    </>
  );
}