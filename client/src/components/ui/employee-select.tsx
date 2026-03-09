import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Employee } from "@shared/schema";

interface EmployeeSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function EmployeeSelect({
  value,
  onValueChange,
  placeholder = "Select employee...",
  testId = "select-employee",
  className,
}: EmployeeSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selectedEmployee = employees.find(e => e.id === value);
  const selectedLabel = selectedEmployee
    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
    : null;

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
            {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command
          filter={(itemId, search) => {
            const emp = employees.find(e => e.id === itemId);
            if (!emp) return 0;
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            const num = (emp.employeeNumber || "").toLowerCase();
            return fullName.includes(search.toLowerCase()) || num.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search employee..." />
          <CommandList>
            <CommandEmpty>No employees found.</CommandEmpty>
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
                  — Clear selection
                </CommandItem>
              )}
              {employees.map(emp => (
                <CommandItem
                  key={emp.id}
                  value={emp.id}
                  onSelect={(selectedId) => {
                    const found = employees.find(e => e.id === selectedId);
                    onValueChange?.(found ? found.id : "");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === emp.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span>{emp.firstName} {emp.lastName}</span>
                    <span className="text-xs text-muted-foreground">{emp.employeeNumber}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
