import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, ExternalLink } from "lucide-react";
import { RefreshIconButton } from "@/components/ui/refresh-icon-button";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface EntitySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  endpoint: string;
  formType: string;
  labelField?: string;
  secondaryField?: string;
  searchPlaceholder?: string;
  testId?: string;
  className?: string;
  parentId?: string;
  disabled?: boolean;
}

export function EntitySelect({
  value,
  onValueChange,
  placeholder,
  endpoint,
  formType,
  labelField = "name",
  secondaryField = "code",
  searchPlaceholder,
  testId,
  className,
  parentId,
  disabled,
}: EntitySelectProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery<any[]>({
    queryKey: [`/api/masterdata/${endpoint}`],
    queryFn: async () => {
      const r = await fetch(`/api/masterdata/${endpoint}`);
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const activeItems = items.filter((i: any) => i.isActive !== false);

  const getLabel = (item: any) => {
    const label = item[labelField] || item.name || item.code || String(item.id);
    const secondary = secondaryField ? item[secondaryField] : null;
    if (secondary && secondary !== label) return `${secondary} – ${label}`;
    return label;
  };

  const getSearchValue = (item: any) =>
    [item[labelField], item[secondaryField], item.name, item.code]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const selected = activeItems.find((i: any) => i.id === value || i.code === value);
  const displayValue = selected ? getLabel(selected) : (placeholder || `Select ${endpoint.replace(/-/g, " ")}...`);

  const openNewTab = (e?: React.MouseEvent, entityId?: string) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const uid = `${formType}-${entityId || "new"}-${Date.now()}`;
    window.dispatchEvent(new CustomEvent("open-form-tab", {
      detail: {
        id: uid,
        name: entityId ? `Edit` : `New`,
        formType,
        entityId: entityId || undefined,
        parentId: parentId || testId,
      },
    }));
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex-1 min-w-0">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="w-full justify-between"
              data-testid={testId}
            >
              <span className="truncate">{displayValue}</span>
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
                const item = activeItems.find((i: any) => i.id === itemValue || i.code === itemValue);
                if (!item) return 0;
                return getSearchValue(item).includes(search.toLowerCase()) ? 1 : 0;
              }}
            >
              <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <CommandInput
                  placeholder={searchPlaceholder || `Search...`}
                  className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
                />
                <div className="flex-shrink-0 ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => openNewTab()}
                    data-testid={`${testId}-add-btn`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => { onValueChange?.(""); setOpen(false); }}
                      className="text-muted-foreground italic"
                    >
                      — Clear selection —
                    </CommandItem>
                  )}
                  {activeItems.map((item: any) => {
                    const itemKey = item.id;
                    const itemValue = item.id;
                    return (
                      <CommandItem
                        key={itemKey}
                        value={itemValue}
                        onSelect={() => {
                          onValueChange?.(item.code ?? item.id);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              (value === item.id || value === item.code) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span>{getLabel(item)}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                          onClick={(e) => openNewTab(e, item.id)}
                          data-testid={`${testId}-edit-${item.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
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
      {value && selected && (
        <RefreshIconButton queryKeys={[`/api/masterdata/${endpoint}`]} />
      )}
    </div>
  );
}
