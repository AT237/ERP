import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Globe, Settings } from "lucide-react";
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
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

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
  const [activeSection, setActiveSection] = useState("country");
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

  // Custom checkbox components
  const renderBtwCheckbox = () => (
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
  );

  const renderAreaCodeCheckbox = () => (
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
  );

  // Create form sections for country
  const createCountryFormSections = (): FormSection2<CountryFormData>[] => [
    {
      id: "country",
      label: "Country Info",
      icon: <Globe className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "code",
            label: "Code",
            type: "text",
            placeholder: "NL",
            register: countryForm.register("code"),
            validation: {
              error: countryForm.formState.errors.code?.message,
              isRequired: true
            },
            testId: "input-country-code",
            width: "25%"
          } as FormField2<CountryFormData>,
          {
            key: "name",
            label: "Country Name",
            type: "text",
            placeholder: "Netherlands",
            register: countryForm.register("name"),
            validation: {
              error: countryForm.formState.errors.name?.message,
              isRequired: true
            },
            testId: "input-country-name",
            width: "75%"
          } as FormField2<CountryFormData>
        ])
      ]
    },
    {
      id: "validation",
      label: "Validation Rules",
      icon: <Settings className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "requiresBtw",
          label: "BTW Requirements",
          type: "custom",
          customComponent: renderBtwCheckbox(),
          testId: "checkbox-requires-btw"
        } as FormField2<CountryFormData>),
        createFieldRow({
          key: "requiresAreaCode",
          label: "Area Code Requirements",
          type: "custom",
          customComponent: renderAreaCodeCheckbox(),
          testId: "checkbox-requires-area-code"
        } as FormField2<CountryFormData>)
      ]
    }
  ];

  // Create action buttons
  const createActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => setShowAddDialog(false),
      disabled: createCountryMutation.isPending
    },
    {
      label: createCountryMutation.isPending ? "Creating..." : "Create Country",
      variant: "default",
      onClick: () => countryForm.handleSubmit(handleCreateCountry)(),
      disabled: createCountryMutation.isPending
    }
  ];

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
          
          <LayoutForm2
            sections={createCountryFormSections()}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            form={countryForm}
            onSubmit={handleCreateCountry}
            actionButtons={createActionButtons()}
            isLoading={createCountryMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}