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
import type { Country } from "@shared/schema";

interface CountrySelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function CountrySelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select country...",
  testId = "select-country",
  className,
}: CountrySelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Load countries with search
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/countries", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/countries?q=${encodeURIComponent(searchQuery)}` : "/api/countries";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch countries");
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const formatCountry = (country: Country) => {
    return `${country.name} (${country.code})`;
  };

  const selectedCountry = countries.find(country => country.code === value);

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
                className={cn("truncate", value && selectedCountry ? "cursor-pointer hover:underline" : "")}
                title={value && selectedCountry ? "Dubbelklik om te openen" : undefined}
                onDoubleClick={(e) => {
                  if (!value || !selectedCountry) return;
                  e.stopPropagation();
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('open-form-tab', {
                    detail: { id: `country-${value}`, name: formatCountry(selectedCountry), formType: 'country', entityId: value }
                  }));
                }}
              >{selectedCountry ? formatCountry(selectedCountry) : placeholder}</span>
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
                  placeholder="Search countries..." 
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
                          id: 'new-country', 
                          name: 'New Country', 
                          formType: 'country'
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
                <CommandEmpty>No country found.</CommandEmpty>
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
                  {countries.map((country) => (
                    <CommandItem
                      key={country.id}
                      value={country.code}
                      onSelect={() => {
                        console.log("🌍 Country selected:", { code: country.code, name: country.name, requirements: { btw: country.requiresBtw, areaCode: country.requiresAreaCode } });
                        onValueChange?.(country.code);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center flex-1">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === country.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{formatCountry(country)}</div>
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
                              id: `country-${country.id}`, 
                              name: country.name, 
                              formType: 'country',
                              recordId: country.id
                            } 
                          }));
                        }}
                        data-testid={`${testId}-view-${country.code}`}
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
      </div>
      {value && selectedCountry && (
        <RefreshIconButton queryKeys={["/api/countries"]} />
      )}
    </div>
  );
}