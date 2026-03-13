import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { PaymentTerm } from "@shared/schema";

interface PaymentScheduleSelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  language?: string;
}

export function PaymentScheduleSelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select payment terms...",
  testId = "select-payment-terms",
  className,
}: PaymentScheduleSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: paymentTerms = [] } = useQuery<PaymentTerm[]>({
    queryKey: ["/api/masterdata/payment-terms"],
    staleTime: 5 * 60 * 1000,
  });

  const selectedTerm = paymentTerms.find(pt => pt.id === value);
  const displayName = selectedTerm 
    ? `${selectedTerm.name} (${selectedTerm.days} days)`
    : placeholder;

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
              <span
                className={cn("truncate", value && selectedTerm ? "cursor-pointer hover:underline" : "")}
                title={value && selectedTerm ? "Dubbelklik om te openen" : undefined}
                onDoubleClick={(e) => {
                  if (!value || !selectedTerm) return;
                  e.stopPropagation();
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('open-form-tab', {
                    detail: { id: `masterdata-payment-terms-${value}`, name: displayName, formType: 'masterdata-payment-terms', entityId: value }
                  }));
                }}
              >{displayName}</span>
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
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
                  placeholder="Search payment terms..." 
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
                          id: 'new-masterdata-payment-terms', 
                          name: 'New Payment Terms', 
                          formType: 'masterdata-payment-terms'
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
                <CommandEmpty>No payment terms found.</CommandEmpty>
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
                  {paymentTerms.map((term) => {
                    const itemName = term.name;
                    const description = term.description || `${term.days} days`;
                    
                    return (
                      <CommandItem
                        key={term.id}
                        value={term.id}
                        onSelect={(currentValue) => {
                          onValueChange?.(currentValue === value ? "" : currentValue);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between group"
                        data-testid={`option-payment-terms-${term.code}`}
                      >
                        <div className="flex items-center flex-1">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              value === term.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-xs text-muted-foreground w-16 shrink-0">{term.code}</span>
                          <div className="flex flex-col flex-1 ml-2">
                            <span className="font-medium">{itemName}</span>
                            <span className="text-xs text-muted-foreground">{description}</span>
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
                                id: `masterdata-payment-terms-${term.id}`, 
                                name: itemName, 
                                formType: 'masterdata-payment-terms',
                                entityId: term.id
                              } 
                            }));
                          }}
                          data-testid={`${testId}-view-${term.code}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
