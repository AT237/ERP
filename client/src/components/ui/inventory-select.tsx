import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, ExternalLink, RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unit?: string;
  unitPrice?: string;
  brand?: string;
  manufacturerPartNumber?: string;
}

interface InventorySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function InventorySelect({
  value,
  onValueChange,
  placeholder = "Artikel zoeken...",
  testId = "select-inventory-item",
  className,
}: InventorySelectProps) {
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedItem = items.find((i) => i.id === value);

  const getLabel = (item: InventoryItem) =>
    item.sku ? `${item.sku} - ${item.name}` : item.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          data-testid={testId}
        >
          <span className="truncate">
            {selectedItem ? getLabel(selectedItem) : placeholder}
          </span>
          {value && selectedItem && (
            <RefreshCw
              className="ml-auto h-4 w-4 shrink-0 text-orange-600 hover:text-orange-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
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
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          filter={(itemValue, search) => {
            const item = items.find((i) => i.id === itemValue);
            if (!item) return 0;
            const s = search.toLowerCase();
            return item.name?.toLowerCase().includes(s) ||
              item.sku?.toLowerCase().includes(s) ||
              item.brand?.toLowerCase().includes(s) ||
              item.manufacturerPartNumber?.toLowerCase().includes(s)
              ? 1
              : 0;
          }}
        >
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <CommandInput
              placeholder="Zoeken op naam, SKU of merk..."
              className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
            />
            <div className="flex-shrink-0 ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("open-form-tab", {
                      detail: {
                        id: `inventory-new-${Date.now()}`,
                        name: "Nieuw artikel",
                        formType: "inventory",
                      },
                    })
                  );
                  setOpen(false);
                }}
                data-testid="button-add-inventory"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CommandList>
            <CommandEmpty>Geen artikel gevonden.</CommandEmpty>
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
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onValueChange?.(item.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center min-w-0">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[item.sku, item.brand].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 ml-2 shrink-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.dispatchEvent(
                        new CustomEvent("open-form-tab", {
                          detail: {
                            id: `edit-inventory-${item.id}`,
                            name: item.name || "Edit Artikel",
                            formType: "inventory",
                            entityId: item.id,
                          },
                        })
                      );
                      setOpen(false);
                    }}
                    data-testid={`${testId}-edit-${item.id}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
