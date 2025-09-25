import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Globe, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLanguageSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { Language } from "@shared/schema";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

const languageFormSchema = insertLanguageSchema.extend({
  code: z.string().min(1, "Language code is required").max(10, "Language code too long"),
  name: z.string().min(1, "Language name is required"),
});

type LanguageFormData = z.infer<typeof languageFormSchema>;

interface LanguageSelectWithAddProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function LanguageSelectWithAdd({
  value,
  onValueChange,
  placeholder = "Select language...",
  testId = "select-language",
  className,
}: LanguageSelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("language");
  const { toast } = useToast();

  // Load languages with search
  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ["/api/languages", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/languages?q=${encodeURIComponent(searchQuery)}` : "/api/languages";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch languages");
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Language form
  const languageForm = useForm<LanguageFormData>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      code: "",
      name: "",
    },
  });

  // Create language mutation
  const createLanguageMutation = useMutation({
    mutationFn: async (data: LanguageFormData) => {
      const response = await apiRequest("POST", "/api/languages", data);
      return response.json();
    },
    onSuccess: (newLanguage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setShowAddDialog(false);
      languageForm.reset();
      onValueChange?.(newLanguage.code);
      toast({
        title: "Success",
        description: "Language created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create language",
        variant: "destructive",
      });
    },
  });

  const selectedLanguage = languages.find(lang => lang.code === value);

  const handleSubmit = languageForm.handleSubmit((data) => {
    createLanguageMutation.mutate(data);
  });

  const actionButtons: ActionButton[] = [
    {
      type: "button",
      variant: "outline", 
      onClick: () => setShowAddDialog(false),
      children: "Cancel",
      testId: "button-cancel-language"
    },
    {
      type: "submit",
      variant: "default",
      onClick: handleSubmit,
      disabled: createLanguageMutation.isPending,
      children: createLanguageMutation.isPending ? "Creating..." : "Create Language",
      testId: "button-create-language"
    }
  ];

  const sections: FormSection2<LanguageFormData>[] = [
    {
      id: "language",
      label: "Language",
      icon: <Globe className="h-4 w-4" />,
      rows: [
        createSectionHeaderRow("Language Information"),
        createFieldsRow([
          // Position 1: Language Code
          {
            key: "code",
            label: "Language Code",
            type: "text",
            register: languageForm.register("code"),
            validation: {
              error: languageForm.formState.errors.code?.message
            },
            placeholder: "e.g., en, nl, de",
            testId: "input-language-code"
          } as FormField2<LanguageFormData>,
          // Position 2: Language Name
          {
            key: "name", 
            label: "Language Name",
            type: "text",
            register: languageForm.register("name"),
            validation: {
              error: languageForm.formState.errors.name?.message
            },
            placeholder: "e.g., English, Dutch, German",
            testId: "input-language-name"
          } as FormField2<LanguageFormData>
          // Position 3-12: automatically empty
        ])
      ]
    }
  ];

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
            {selectedLanguage ? selectedLanguage.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search languages..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-2">No languages found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddDialog(true);
                      setOpen(false);
                    }}
                    className="text-xs"
                    data-testid="button-add-new-language"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Language
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {languages.map((language) => (
                  <CommandItem
                    key={language.id}
                    value={language.code}
                    onSelect={(currentValue) => {
                      onValueChange?.(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                    data-testid={`option-language-${language.code}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === language.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{language.name}</span>
                      <span className="text-xs text-muted-foreground">{language.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {languages.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddDialog(true);
                      setOpen(false);
                    }}
                    className="w-full text-xs"
                    data-testid="button-add-language-from-list"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add New Language
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl h-[600px] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold text-orange-600 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Add New Language
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <LayoutForm2<LanguageFormData>
              form={languageForm}
              sections={sections}
              actionButtons={actionButtons}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              showTabs={false}
              showActionButtons={true}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}