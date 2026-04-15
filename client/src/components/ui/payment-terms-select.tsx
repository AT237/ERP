import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, ExternalLink } from "lucide-react";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { PaymentTerm } from "@shared/schema";

interface PaymentTermsSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function PaymentTermsSelect({
  value,
  onValueChange,
  placeholder = "Selecteer betalingstermijn...",
  testId = "select-payment-terms",
  className,
}: PaymentTermsSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: paymentTerms = [] } = useQuery<PaymentTerm[]>({
    queryKey: ["/api/masterdata/payment-terms"],
    staleTime: 5 * 60 * 1000,
  });

  const activeTerms = paymentTerms.filter((pt: any) => pt.isActive !== false);

  const selectedTerm = activeTerms.find(pt => pt.days?.toString() === value);
  const displayName = selectedTerm ? selectedTerm.name : placeholder;

  return (
    <div className="relative flex-1 min-w-0">
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
                  detail: { id: `masterdata-payment-terms-${selectedTerm.id}`, name: selectedTerm.name, formType: 'masterdata-payment-terms', entityId: selectedTerm.id }
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
          <Command
            filter={(itemValue, search) => {
              if (itemValue === '__clear__') return search ? 0 : 1;
              const term = activeTerms.find(pt => pt.id === itemValue);
              if (!term) return 0;
              const searchLower = search.toLowerCase();
              return (
                term.name?.toLowerCase().includes(searchLower) ||
                term.code?.toLowerCase().includes(searchLower) ||
                term.description?.toLowerCase().includes(searchLower) ||
                term.days?.toString().includes(searchLower)
              ) ? 1 : 0;
            }}
          >
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <CommandInput
                placeholder="Zoek betalingstermijn..."
                className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
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
                        id: `new-masterdata-payment-terms-${Date.now()}`,
                        name: 'Nieuwe Betalingstermijn',
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
              <CommandEmpty>Geen betalingstermijn gevonden.</CommandEmpty>
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
                    — Selectie wissen —
                  </CommandItem>
                )}
                {activeTerms.map((term) => (
                  <CommandItem
                    key={term.id}
                    value={term.id}
                    onSelect={() => {
                      onValueChange?.(term.days?.toString() ?? "");
                      setOpen(false);
                    }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center flex-1">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === term.days?.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{term.name}</span>
                        {term.description && <span className="text-xs text-muted-foreground">{term.description}</span>}
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
                            name: term.name,
                            formType: 'masterdata-payment-terms',
                            entityId: term.id
                          }
                        }));
                      }}
                      data-testid={`${testId}-edit-${term.id}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && selectedTerm && (
        <RefreshIconButton queryKeys={["/api/masterdata/payment-terms"]} className="absolute right-9 top-1/2 -translate-y-1/2 z-10" title="Ververs betalingstermijnen" />
      )}
    </div>
  );
}
