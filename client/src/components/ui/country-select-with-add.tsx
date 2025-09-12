import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCountrySchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { Country } from "@shared/schema";

const countryFormSchema = insertCountrySchema.extend({
  code: z.string().min(1, "Country code is required").max(10, "Country code too long"),
  name: z.string().min(1, "Country name is required"),
});

type CountryFormData = z.infer<typeof countryFormSchema>;

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

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

  // Country form
  const countryForm = useForm<CountryFormData>({
    resolver: zodResolver(countryFormSchema),
    defaultValues: {
      code: "",
      name: "",
      requiresBtw: false,
      requiresAreaCode: false,
    },
  });

  // Create country mutation
  const createCountryMutation = useMutation({
    mutationFn: async (data: CountryFormData) => {
      const response = await apiRequest("POST", "/api/countries", data);
      return response.json();
    },
    onSuccess: (newCountry) => {
      toast({
        title: "Success",
        description: "Country created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      onValueChange?.(newCountry.code);
      setShowAddDialog(false);
      countryForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create country",
        variant: "destructive",
      });
    },
  });

  const handleCreateCountry = (data: CountryFormData) => {
    createCountryMutation.mutate(data);
  };

  const formatCountry = (country: Country) => {
    return `${country.name} (${country.code})`;
  };

  const selectedCountry = countries.find(country => country.code === value);

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
            {selectedCountry ? formatCountry(selectedCountry) : placeholder}
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
                  onClick={() => setShowAddDialog(true)}
                  data-testid={`${testId}-add-button`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.id}
                    value={country.code}
                    onSelect={() => {
                      console.log("🌍 Country selected:", { code: country.code, name: country.name, requirements: { btw: country.requiresBtw, areaCode: country.requiresAreaCode } });
                      onValueChange?.(country.code);
                      setOpen(false);
                    }}
                    className="flex items-center"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium">{formatCountry(country)}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Add Country Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Country</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={countryForm.handleSubmit(handleCreateCountry)} className="space-y-4">
            {/* Country Code and Name */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="NL"
                  {...countryForm.register("code")}
                  data-testid="input-country-code"
                />
                {countryForm.formState.errors.code && (
                  <p className="text-sm text-red-600">{countryForm.formState.errors.code.message}</p>
                )}
              </div>
              <div className="col-span-3 space-y-2">
                <Label htmlFor="name">Country Name *</Label>
                <Input
                  id="name"
                  placeholder="Netherlands"
                  {...countryForm.register("name")}
                  data-testid="input-country-name"
                />
                {countryForm.formState.errors.name && (
                  <p className="text-sm text-red-600">{countryForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Validation Rules */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Validation Rules</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="requiresBtw"
                  checked={countryForm.watch("requiresBtw") || false}
                  onCheckedChange={(checked) => 
                    countryForm.setValue("requiresBtw", !!checked)
                  }
                  data-testid="checkbox-requires-btw"
                />
                <Label 
                  htmlFor="requiresBtw" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Requires BTW/VAT Number
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="requiresAreaCode"
                  checked={countryForm.watch("requiresAreaCode") || false}
                  onCheckedChange={(checked) => 
                    countryForm.setValue("requiresAreaCode", !!checked)
                  }
                  data-testid="checkbox-requires-area-code"
                />
                <Label 
                  htmlFor="requiresAreaCode" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Requires Area Code
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                data-testid="button-cancel-country"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={createCountryMutation.isPending}
                data-testid="button-save-country"
              >
                {createCountryMutation.isPending ? "Creating..." : "Create Country"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}