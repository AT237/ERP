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
import { CustomerEditorDialog } from "@/components/layouts/CustomerEditorDialog";
import { cn } from "@/lib/utils";

interface CustomerSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  onOpen?: () => void; // Callback to trigger lazy loading
  customers?: Array<{ id: string; name: string; email?: string; phone?: string; city?: string }>; // Optional external customers data
}

export function CustomerSelect({
  value,
  onValueChange,
  placeholder = "Select customer...",
  testId = "select-customer",
  className,
  onOpen,
  customers: externalCustomers
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Load customers only when not provided externally
  const { data: internalCustomers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: !externalCustomers && (open || !!onOpen), // Only load when popover opens or onOpen is provided
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Use external customers if provided, otherwise use internal
  const customers = externalCustomers || internalCustomers;

  const selectedCustomer = customers.find(customer => customer.id === value);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && onOpen) {
      onOpen(); // Trigger lazy loading callback
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    onValueChange?.(customerId);
    setOpen(false);
  };

  const handleCreateCustomer = () => {
    setEditorMode('create');
    setEditingCustomerId(null);
    setShowEditorDialog(true);
    setOpen(false);
  };

  const handleEditCustomer = (customerId: string) => {
    setEditorMode('edit');
    setEditingCustomerId(customerId);
    setShowEditorDialog(true);
    setOpen(false);
  };

  const handleEditorSuccess = (customerId: string) => {
    onValueChange?.(customerId);
    setShowEditorDialog(false);
    setEditingCustomerId(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", className)}
            data-testid={testId}
          >
            <div className="flex items-center gap-2">
              {selectedCustomer ? (
                <div className="flex flex-col items-start">
                  <span className="font-medium">{selectedCustomer.name}</span>
                  {selectedCustomer.city && (
                    <span className="text-xs text-gray-500">{selectedCustomer.city}</span>
                  )}
                </div>
              ) : (
                placeholder
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search customers..." />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-sm text-muted-foreground">No customers found</p>
                  <Button
                    size="sm"
                    onClick={handleCreateCustomer}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="button-create-customer-from-empty"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Customer
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {/* Add Customer Button */}
                <CommandItem
                  onSelect={handleCreateCustomer}
                  className="flex items-center gap-2 text-orange-600 bg-orange-50 hover:bg-orange-100"
                  data-testid="button-add-customer"
                >
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Add New Customer</span>
                </CommandItem>

                {/* Customer List */}
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name} ${customer.email || ''} ${customer.city || ''}`}
                    onSelect={() => handleCustomerSelect(customer.id)}
                    className="flex items-center justify-between group"
                    data-testid={`option-customer-${customer.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        {customer.city && (
                          <span className="text-xs text-gray-500">{customer.city}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Edit Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCustomer(customer.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-orange-100"
                      data-testid={`button-edit-customer-${customer.id}`}
                    >
                      <Search className="h-3 w-3 text-orange-600" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Customer Editor Dialog */}
      <CustomerEditorDialog
        open={showEditorDialog}
        onOpenChange={setShowEditorDialog}
        mode={editorMode}
        customerId={editingCustomerId || undefined}
        onSuccess={handleEditorSuccess}
      />
    </>
  );
}