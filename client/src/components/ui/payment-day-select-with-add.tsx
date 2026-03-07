import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { PaymentDay } from "@shared/schema";

interface PaymentDaySelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  language?: string;
}

export function PaymentDaySelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select payment days...",
  testId = "select-payment-day",
  className,
  language = "nl",
}: PaymentDaySelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Load payment days
  const { data: paymentDays = [] } = useQuery<PaymentDay[]>({
    queryKey: ["/api/masterdata/payment-days"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedPaymentDay = paymentDays.find(pd => pd.id === value);
  const displayName = selectedPaymentDay 
    ? (language === "en" ? selectedPaymentDay.name_en : selectedPaymentDay.name_nl)
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
                className={cn("truncate", value && selectedPaymentDay ? "cursor-pointer hover:underline" : "")}
                title={value && selectedPaymentDay ? "Dubbelklik om te openen" : undefined}
                onDoubleClick={(e) => {
                  if (!value || !selectedPaymentDay) return;
                  e.stopPropagation();
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('open-form-tab', {
                    detail: { id: `masterdata-payment-days-${value}`, name: displayName, formType: 'masterdata-payment-days', entityId: value }
                  }));
                }}
              >{displayName}</span>
              {value && selectedPaymentDay && (
                <RefreshCw
                  className="ml-auto h-4 w-4 shrink-0 text-orange-600 hover:text-orange-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    queryClient.invalidateQueries({ queryKey: ["/api/masterdata/payment-days"] });
                  }}
                />
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
            <Command>
              <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <CommandInput 
                  placeholder="Search payment days..." 
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
                          id: 'new-masterdata-payment-days', 
                          name: 'New Payment Day', 
                          formType: 'masterdata-payment-days'
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
                <CommandEmpty>No payment day found.</CommandEmpty>
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
                  {paymentDays.map((paymentDay) => {
                    const itemName = language === "en" ? paymentDay.name_en : paymentDay.name_nl;
                    const itemDesc = language === "en" ? paymentDay.description_en : paymentDay.description_nl;
                    
                    return (
                      <CommandItem
                        key={paymentDay.id}
                        value={paymentDay.id}
                        onSelect={(currentValue) => {
                          onValueChange?.(currentValue === value ? "" : currentValue);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between group"
                        data-testid={`option-payment-day-${paymentDay.days}`}
                      >
                        <div className="flex items-center flex-1">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              value === paymentDay.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{itemName}</span>
                            {itemDesc && <span className="text-xs text-muted-foreground">{itemDesc}</span>}
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
                                id: `masterdata-payment-days-${paymentDay.id}`, 
                                name: itemName, 
                                formType: 'masterdata-payment-days',
                                entityId: paymentDay.id
                              } 
                            }));
                          }}
                          data-testid={`${testId}-view-${paymentDay.days}`}
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
