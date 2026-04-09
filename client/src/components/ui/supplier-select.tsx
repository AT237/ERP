import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Supplier } from "@shared/schema";

interface SupplierSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  suppliers?: Array<{ id: string; supplierNumber: string; name: string; email?: string | null; phone?: string | null }>;
  parentId?: string;
}

export function SupplierSelect({
  value,
  onValueChange,
  placeholder = "Selecteer leverancier...",
  testId = "select-supplier",
  className,
  suppliers: externalSuppliers,
  parentId,
}: SupplierSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: internalSuppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    enabled: !externalSuppliers,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const suppliers = externalSuppliers || internalSuppliers;
  const suppliersTyped = suppliers as Array<{
    id: string;
    supplierNumber: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }>;

  useEffect(() => {
    const handleEntityCreated = (event: CustomEvent) => {
      const { entityType, entity, parentId: eventParentId } = event.detail;
      const myParentId = parentId || testId;
      if (entityType === 'supplier' && entity?.id && eventParentId === myParentId) {
        onValueChange?.(entity.id);
      }
    };

    window.addEventListener('entity-created', handleEntityCreated as EventListener);
    return () => {
      window.removeEventListener('entity-created', handleEntityCreated as EventListener);
    };
  }, [onValueChange, parentId, testId]);

  const selectedSupplier = suppliersTyped.find(s => s.id === value);

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
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
              className={cn("truncate", value && selectedSupplier ? "cursor-pointer hover:underline" : "")}
              title={value && selectedSupplier ? "Dubbelklik om te openen" : undefined}
              onDoubleClick={(e) => {
                if (!value || !selectedSupplier) return;
                e.stopPropagation();
                setOpen(false);
                window.dispatchEvent(new CustomEvent('open-form-tab', {
                  detail: {
                    id: `supplier-${value}`,
                    name: selectedSupplier.supplierNumber || selectedSupplier.name,
                    formType: 'supplier',
                    entityId: value,
                  }
                }));
              }}
            >{selectedSupplier ? selectedSupplier.name : placeholder}</span>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 text-orange-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 max-h-[300px]" 
          align="start" 
          sideOffset={4}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command
            filter={(value, search) => {
              if (value === '__clear__') return search ? 0 : 1;
              const supplier = suppliersTyped.find(s => s.id === value);
              if (!supplier) return 0;
              const searchLower = search.toLowerCase();
              return (
                supplier.name?.toLowerCase().includes(searchLower) ||
                supplier.supplierNumber?.toLowerCase().includes(searchLower) ||
                supplier.email?.toLowerCase().includes(searchLower) ||
                supplier.phone?.toLowerCase().includes(searchLower)
              ) ? 1 : 0;
            }}
          >
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
              <CommandInput 
                placeholder="Zoek leveranciers..." 
                className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
              />
              <div className="flex-shrink-0 ml-auto">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => {
                    const uniqueTabId = `supplier-new-${Date.now()}`;
                    window.dispatchEvent(new CustomEvent('open-form-tab', {
                      detail: {
                        id: uniqueTabId,
                        name: 'New Supplier',
                        formType: 'supplier',
                        parentId: parentId || testId
                      }
                    }));
                    setOpen(false);
                  }}
                  data-testid={`button-add-supplier-${parentId || testId}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>Geen leverancier gevonden.</CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => { onValueChange?.(""); setOpen(false); }}
                    className="text-muted-foreground italic"
                  >
                    — Selectie wissen —
                  </CommandItem>
                )}
                {[...suppliersTyped].sort((a, b) => {
                  if (a.id === value) return -1;
                  if (b.id === value) return 1;
                  return 0;
                }).map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.id}
                    onSelect={() => {
                      onValueChange?.(supplier.id);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === supplier.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const uniqueTabId = `supplier-edit-${supplier.id}-${Date.now()}`;
                        window.dispatchEvent(new CustomEvent('open-form-tab', {
                          detail: {
                            id: uniqueTabId,
                            name: supplier.name || 'Edit Supplier',
                            formType: 'supplier',
                            entityId: supplier.id,
                            parentId: parentId || testId
                          }
                        }));
                        setOpen(false);
                      }}
                      data-testid={`${testId}-edit-${supplier.id}`}
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
      {value && selectedSupplier && (
        <button
          type="button"
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors"
          title="Open leverancierformulier"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: {
                id: `supplier-${value}`,
                name: selectedSupplier.name || 'Leverancier',
                formType: 'supplier',
                entityId: value,
              }
            }));
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
