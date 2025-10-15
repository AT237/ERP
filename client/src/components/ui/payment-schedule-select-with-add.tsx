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
import type { PaymentSchedule } from "@shared/schema";

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
  placeholder = "Select payment schedule...",
  testId = "select-payment-schedule",
  className,
  language = "nl",
}: PaymentScheduleSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load payment schedules
  const { data: paymentSchedules = [] } = useQuery<PaymentSchedule[]>({
    queryKey: ["/api/masterdata/payment-schedules"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectedSchedule = paymentSchedules.find(ps => ps.id === value);
  const displayName = selectedSchedule 
    ? (language === "en" ? selectedSchedule.name_en : selectedSchedule.name_nl)
    : placeholder;

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
            {displayName}
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
                placeholder="Search payment schedules..." 
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
                        id: 'new-payment-schedule', 
                        name: 'New Payment Schedule', 
                        formType: 'payment-schedule'
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
              <CommandEmpty>No payment schedule found.</CommandEmpty>
              <CommandGroup>
                {paymentSchedules.map((schedule) => {
                  const itemName = language === "en" ? schedule.name_en : schedule.name_nl;
                  
                  // Parse schedule items to show a preview
                  const scheduleItems = schedule.scheduleItems as any[];
                  const itemsPreview = scheduleItems?.map(item => 
                    `${item.percentage}% ${language === "en" ? item.moment_en : item.moment_nl}`
                  ).join(", ");
                  
                  return (
                    <CommandItem
                      key={schedule.id}
                      value={schedule.id}
                      onSelect={(currentValue) => {
                        onValueChange?.(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between group"
                      data-testid={`option-payment-schedule-${schedule.code}`}
                    >
                      <div className="flex items-center flex-1">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === schedule.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium">{itemName}</span>
                          {itemsPreview && <span className="text-xs text-muted-foreground">{itemsPreview}</span>}
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
                              id: `payment-schedule-${schedule.id}`, 
                              name: itemName, 
                              formType: 'payment-schedule',
                              recordId: schedule.id
                            } 
                          }));
                        }}
                        data-testid={`${testId}-view-${schedule.code}`}
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
