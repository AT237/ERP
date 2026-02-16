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
import type { CustomerContact } from "@shared/schema";

interface ContactPersonSelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  customerId?: string;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function ContactPersonSelectWithAdd({
  value,
  onValueChange,
  customerId,
  placeholder = "Select contact person...",
  testId = "select-contact-person",
  className,
}: ContactPersonSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts = [] } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customer-contacts", customerId, searchQuery],
    queryFn: async () => {
      let url = "/api/customer-contacts";
      const params = new URLSearchParams();
      
      if (customerId) {
        url = `/api/customer-contacts/by-customer/${customerId}`;
      } else if (searchQuery) {
        url = "/api/customer-contacts/search";
        params.append("q", searchQuery);
        if (customerId) params.append("customerId", customerId);
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const formatContact = (contact: CustomerContact) => {
    const name = `${contact.firstName} ${contact.lastName}`;
    const details = [];
    if (contact.position) details.push(contact.position);
    if (contact.email) details.push(contact.email);
    return details.length > 0 ? `${name} – ${details.join(" (")}${details.length > 1 ? ")" : ""}` : name;
  };

  const selectedContact = contacts.find(contact => contact.id === value);

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between", className)}
              data-testid={testId}
            >
              {selectedContact ? formatContact(selectedContact) : placeholder}
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
                  placeholder="Search contacts..." 
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
                          id: 'new-contact-person', 
                          name: 'New Contact Person', 
                          formType: 'contact-person'
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
                <CommandEmpty>No contact person found.</CommandEmpty>
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
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => {
                        onValueChange?.(contact.id);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center flex-1">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === contact.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{formatContact(contact)}</div>
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
                              id: `edit-contact-person-${contact.id}`, 
                              name: `${contact.firstName} ${contact.lastName}`, 
                              formType: 'contact-person',
                              entityId: contact.id
                            } 
                          }));
                        }}
                        data-testid={`${testId}-view-${contact.id}`}
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
      </div>
      {value && selectedContact && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: {
                id: `contact-person-${selectedContact.id}`,
                name: `${selectedContact.firstName} ${selectedContact.lastName}`,
                formType: 'contact-person',
                entityId: selectedContact.id
              }
            }));
          }}
          data-testid={`${testId}-lookup`}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}