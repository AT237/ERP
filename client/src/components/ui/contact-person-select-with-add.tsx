import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerContactSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { CustomerContact } from "@shared/schema";

const contactFormSchema = insertCustomerContactSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  position: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Load contacts with search
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Contact form
  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      isPrimary: false,
      customerId,
    },
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/customer-contacts", {
        ...data,
        customerId,
      });
      return response.json();
    },
    onSuccess: (newContact) => {
      toast({
        title: "Success",
        description: "Contact person created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      onValueChange?.(newContact.id);
      setShowAddDialog(false);
      contactForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contact person",
        variant: "destructive",
      });
    },
  });

  const handleCreateContact = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  const formatContact = (contact: CustomerContact) => {
    const name = `${contact.firstName} ${contact.lastName}`;
    const details = [];
    if (contact.position) details.push(contact.position);
    if (contact.email) details.push(contact.email);
    return details.length > 0 ? `${name} – ${details.join(" (")}${details.length > 1 ? ")" : ""}` : name;
  };

  const selectedContact = contacts.find(contact => contact.id === value);

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
                  onClick={() => setShowAddDialog(true)}
                  data-testid={`${testId}-add-button`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>No contact person found.</CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => {
                      onValueChange?.(contact.id);
                      setOpen(false);
                    }}
                    className="flex items-center"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{formatContact(contact)}</div>
                      {contact.isPrimary && (
                        <div className="text-xs text-orange-600">Primary Contact</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Contact Person</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={contactForm.handleSubmit(handleCreateContact)} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...contactForm.register("firstName")}
                  data-testid="input-contact-first-name"
                />
                {contactForm.formState.errors.firstName && (
                  <p className="text-sm text-red-600">{contactForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...contactForm.register("lastName")}
                  data-testid="input-contact-last-name"
                />
                {contactForm.formState.errors.lastName && (
                  <p className="text-sm text-red-600">{contactForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...contactForm.register("email")}
                  data-testid="input-contact-email"
                />
                {contactForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{contactForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...contactForm.register("phone")}
                  data-testid="input-contact-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  {...contactForm.register("position")}
                  placeholder="e.g. Manager, Director"
                  data-testid="input-contact-position"
                />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                checked={contactForm.watch("isPrimary")}
                onCheckedChange={(checked) => contactForm.setValue("isPrimary", checked as boolean)}
                data-testid="checkbox-contact-is-primary"
              />
              <Label htmlFor="isPrimary" className="text-sm">
                Set as primary contact
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel-contact"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={createContactMutation.isPending}
                data-testid="button-save-contact"
              >
                {createContactMutation.isPending ? "Creating..." : "Create Contact"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}