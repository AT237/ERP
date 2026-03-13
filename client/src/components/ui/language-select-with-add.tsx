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
import type { Language } from "@shared/schema";

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
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

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

  const selectedLanguage = languages.find(lang => lang.code === value);

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
                className={cn("truncate", value && selectedLanguage ? "cursor-pointer hover:underline" : "")}
                title={value && selectedLanguage ? "Dubbelklik om te openen" : undefined}
                onDoubleClick={(e) => {
                  if (!value || !selectedLanguage) return;
                  e.stopPropagation();
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('open-form-tab', {
                    detail: { id: `language-${value}`, name: selectedLanguage.name, formType: 'language', entityId: value }
                  }));
                }}
              >{selectedLanguage ? selectedLanguage.name : placeholder}</span>
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
                  placeholder="Search languages..." 
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
                          id: 'new-language', 
                          name: 'New Language', 
                          formType: 'language'
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
                <CommandEmpty>No language found.</CommandEmpty>
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
                  {languages.map((language) => (
                    <CommandItem
                      key={language.id}
                      value={language.code}
                      onSelect={(currentValue) => {
                        onValueChange?.(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between group"
                      data-testid={`option-language-${language.code}`}
                    >
                      <div className="flex items-center flex-1">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === language.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium">{language.name}</span>
                          <span className="text-xs text-muted-foreground">{language.code}</span>
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
                              id: `language-${language.id}`, 
                              name: language.name, 
                              formType: 'language',
                              recordId: language.id
                            } 
                          }));
                        }}
                        data-testid={`${testId}-view-${language.code}`}
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
      {value && selectedLanguage && (
        <RefreshIconButton queryKeys={["/api/languages"]} className="absolute right-9 top-1/2 -translate-y-1/2 z-10" title="Ververs talen" />
      )}
    </div>
  );
}