import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { RateAndCharge } from "@shared/schema";

interface RateSelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  excludeIds?: string[];
}

export function RateSelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select rate...",
  testId = "select-rate",
  className,
  excludeIds = [],
}: RateSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: rates = [] } = useQuery<RateAndCharge[]>({
    queryKey: ["/api/masterdata/rates-and-charges"],
    staleTime: 5 * 60 * 1000,
  });

  const selectedRate = rates.find(r => r.id === value);
  const displayName = selectedRate 
    ? `${selectedRate.code} - ${selectedRate.name} (€${Number(selectedRate.rate).toFixed(2)})`
    : placeholder;

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
                className={cn("truncate", value && selectedRate ? "cursor-pointer hover:underline" : "")}
                title={value && selectedRate ? "Dubbelklik om te openen" : undefined}
                onDoubleClick={(e) => {
                  if (!value || !selectedRate) return;
                  e.stopPropagation();
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('open-form-tab', {
                    detail: { id: `masterdata-rates-and-charges-${value}`, name: displayName, formType: 'masterdata-rates-and-charges', entityId: value }
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
                  placeholder="Search rates..." 
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
                          id: 'new-masterdata-rates-and-charges', 
                          name: 'New Rate & Charge', 
                          formType: 'masterdata-rates-and-charges'
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
                <CommandEmpty>No rate found.</CommandEmpty>
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
                  {rates.filter(rate => !excludeIds.includes(rate.id) || rate.id === value).map((rate) => (
                    <CommandItem
                      key={rate.id}
                      value={rate.id}
                      onSelect={(currentValue) => {
                        onValueChange?.(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between group"
                      data-testid={`option-rate-${rate.code}`}
                    >
                      <div className="flex items-center flex-1">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === rate.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium">{rate.code} - {rate.name} (€{Number(rate.rate).toFixed(2)})</span>
                          {rate.description && <span className="text-xs text-muted-foreground">{rate.description}</span>}
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
                              id: `masterdata-rates-and-charges-${rate.id}`, 
                              name: `${rate.code} - ${rate.name}`, 
                              formType: 'masterdata-rates-and-charges',
                              entityId: rate.id
                            } 
                          }));
                        }}
                        data-testid={`${testId}-view-${rate.code}`}
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
        {value && selectedRate && (
          <RefreshIconButton queryKeys={["/api/masterdata/rates-and-charges"]} className="absolute right-9 top-1/2 -translate-y-1/2 z-10" title="Ververs tarieven" />
        )}
    </div>
  );
}
