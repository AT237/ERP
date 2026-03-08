import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout } from './BaseFormLayout';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTextSnippetSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, FileText, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TextSnippet, InsertTextSnippet } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from './LayoutForm2';

// Form schema for text snippets
const textSnippetFormSchema = insertTextSnippetSchema.extend({
  // Add any additional validation rules if needed
});

type TextSnippetFormData = z.infer<typeof textSnippetFormSchema>;

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

// Available categories for text snippets
const SNIPPET_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "disclaimer", label: "Disclaimer" },
  { value: "terms", label: "Terms & Conditions" },
  { value: "warranty", label: "Warranty" },
  { value: "delivery", label: "Delivery" },
  { value: "payment", label: "Payment" },
  { value: "contact", label: "Contact" },
  { value: "signature", label: "Signature" },
];

// Available locales
const LOCALES = [
  { value: "nl", label: "Dutch (NL)" },
  { value: "en", label: "English (EN)" },
  { value: "de", label: "German (DE)" },
  { value: "fr", label: "French (FR)" },
];

interface TextSnippetFormLayoutProps {
  onSave: () => void;
  textSnippetId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function TextSnippetFormLayout({ onSave, textSnippetId, parentId }: TextSnippetFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    name: { label: "Naam" },
    code: { label: "Code" },
  });
  const isEditing = !!textSnippetId;

  // Form setup
  const form = useForm<TextSnippetFormData>({
    resolver: zodResolver(textSnippetFormSchema),
    mode: 'onBlur',
    defaultValues: {
      code: "",
      title: "",
      body: "",
      category: "general",
      locale: "nl",
      version: 1,
      isActive: true,
    },
  });

  // Change tracking helpers
  const compareValues = (original: any, current: any) => {
    const isEmpty = (v: any) => v === null || v === undefined || v === "";
    if (isEmpty(original) && isEmpty(current)) return true;
    if (typeof original !== typeof current) return false;
    if (original === null || current === null) return original === current;
    return String(original).trim() === String(current).trim();
  };

  const checkForChanges = () => {
    const currentValues = form.getValues();
    const modifiedFieldsSet = new Set<string>();
    let hasChanges = false;

    // Compare each field with original values
    Object.keys(originalValues).forEach(fieldName => {
      const originalValue = originalValues[fieldName];
      const currentValue = currentValues[fieldName as keyof typeof currentValues];
      
      if (!compareValues(originalValue, currentValue)) {
        modifiedFieldsSet.add(fieldName);
        hasChanges = true;
      }
    });

    setModifiedFields(modifiedFieldsSet);
    setHasUnsavedChanges(hasChanges);
    
    return hasChanges;
  };

  // Get CSS class for field based on whether it's modified
  const [suppressTracking, setSuppressTracking] = useState(true);
  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    if (suppressTracking) return baseClassName;
    
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  // Load text snippet data if editing
  const { data: textSnippet, isLoading: isLoadingTextSnippet } = useQuery<TextSnippet>({
    queryKey: ["/api/text-snippets", textSnippetId],
    enabled: !!textSnippetId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertTextSnippet) => {
      await apiRequest("POST", "/api/text-snippets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-snippets"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-text-snippet', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Text snippet created successfully",
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create text snippet",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; snippet: Partial<InsertTextSnippet> }) => {
      await apiRequest("PUT", `/api/text-snippets/${data.id}`, data.snippet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-snippets"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      const tabId = textSnippetId ? `edit-text-snippet-${textSnippetId}` : 'new-text-snippet';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Text snippet updated successfully",
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update text snippet",
        variant: "destructive",
      });
    },
  });

  // Load data into form when text snippet is loaded or form is reset
  useEffect(() => {
    if (!isEditing) {
      // Creating new snippet
      const defaultValues = {
        code: "",
        title: "",
        body: "",
        category: "general",
        locale: "nl",
        version: 1,
        isActive: true,
      };
      
      form.reset(defaultValues);
      setOriginalValues(defaultValues);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
      // Enable change tracking after form is loaded
      setTimeout(() => setSuppressTracking(false), 100);
    }
  }, [isEditing, form]);

  useEffect(() => {
    if (textSnippet && isEditing) {
      const formData = {
        code: textSnippet.code,
        title: textSnippet.title,
        body: textSnippet.body,
        category: textSnippet.category || "general",
        locale: textSnippet.locale || "nl",
        version: textSnippet.version || 1,
        isActive: textSnippet.isActive ?? true,
      };
      
      form.reset(formData);
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
      // Enable change tracking after form is loaded
      setTimeout(() => setSuppressTracking(false), 100);
    }
  }, [textSnippet, isEditing, form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = textSnippetId ? `edit-text-snippet-${textSnippetId}` : 'new-text-snippet';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, textSnippetId]);

  // Helper function to get category label
  const getCategoryLabel = (categoryValue: string) => {
    const category = SNIPPET_CATEGORIES.find(cat => cat.value === categoryValue);
    return category?.label || categoryValue;
  };

  // Helper function to get locale label
  const getLocaleLabel = (localeValue: string) => {
    const locale = LOCALES.find(loc => loc.value === localeValue);
    return locale?.label || localeValue;
  };

  // Custom render functions for form fields
  const renderCategorySelect = (field: any) => (
    <Select onValueChange={field.onChange} value={field.value || "general"}>
      <SelectTrigger 
        data-testid="select-category"
        className={getFieldClassName("category")}
      >
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {SNIPPET_CATEGORIES.map((category) => (
          <SelectItem 
            key={category.value} 
            value={category.value}
            data-testid={`option-category-${category.value}`}
          >
            {category.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderLocaleSelect = (field: any) => (
    <Select onValueChange={field.onChange} value={field.value || "nl"}>
      <SelectTrigger 
        data-testid="select-locale"
        className={getFieldClassName("locale")}
      >
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((locale) => (
          <SelectItem 
            key={locale.value} 
            value={locale.value}
            data-testid={`option-locale-${locale.value}`}
          >
            {locale.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderActiveSwitch = (field: any) => (
    <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
      <div className="space-y-0.5">
        <Label>Active</Label>
      </div>
      <Switch
        checked={field.value ?? true}
        onCheckedChange={field.onChange}
        data-testid="switch-active"
      />
    </div>
  );

  // Form submission
  const onSubmit = (data: TextSnippetFormData) => {
    if (isEditing && textSnippet) {
      updateMutation.mutate({
        id: textSnippet.id,
        snippet: data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  // Create form sections
  const createFormSections = (): FormSection2<TextSnippetFormData>[] => [
    {
      id: "basic",
      label: "Basic Information",
      icon: <FileText className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "code",
            label: "Code",
            type: "custom",
            customComponent: (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="SNIPPET_CODE" 
                        data-testid="input-code"
                        className={getFieldClassName("code")}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ),
            validation: {
              isRequired: true
            },
            testId: "input-code",
            width: "50%"
          } as FormField2<TextSnippetFormData>,
          {
            key: "category",
            label: "Category",
            type: "custom",
            customComponent: (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      {renderCategorySelect(field)}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ),
            testId: "select-category",
            width: "50%"
          } as FormField2<TextSnippetFormData>
        ]),
        createFieldRow({
          key: "title",
          label: "Title",
          type: "custom",
          customComponent: (
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="Enter snippet title" 
                      data-testid="input-title"
                      className={getFieldClassName("title")}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ),
          validation: {
            isRequired: true
          },
          testId: "input-title"
        } as FormField2<TextSnippetFormData>)
      ]
    },
    {
      id: "content",
      label: "Content",
      icon: <Edit className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "body",
          label: "Content",
          type: "custom",
          customComponent: (
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the text content for this snippet..." 
                      className={`min-h-[120px] ${getFieldClassName("body")}`}
                      data-testid="textarea-body"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ),
          validation: {
            isRequired: true
          },
          testId: "textarea-body"
        } as FormField2<TextSnippetFormData>)
      ]
    },
    {
      id: "settings",
      label: "Settings",
      icon: <span className="text-xs font-bold">⚙</span>,
      rows: [
        {
          type: "fields",
          fields: [
            {
              key: "locale",
              label: "Language",
              type: "custom",
              customComponent: (
                <FormField
                  control={form.control}
                  name="locale"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        {renderLocaleSelect(field)}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ),
              testId: "select-locale",
              width: "33%"
            } as FormField2<TextSnippetFormData>,
            {
              key: "version",
              label: "Version",
              type: "custom",
              customComponent: (
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          data-testid="input-version"
                          className={getFieldClassName("version")}
                          {...field}
                          value={field.value?.toString() || "1"}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ),
              testId: "input-version",
              width: "33%"
            } as FormField2<TextSnippetFormData>,
            {
              key: "isActive",
              label: "Active",
              type: "custom",
              customComponent: (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        {renderActiveSwitch(field)}
                      </FormControl>
                    </FormItem>
                  )}
                />
              ),
              testId: "switch-active",
              width: "33%"
            } as FormField2<TextSnippetFormData>
          ]
        }
      ]
    }
  ];


  // Watch form changes for change tracking
  useEffect(() => {
    if (suppressTracking) return;

    const subscription = form.watch(() => {
      checkForChanges();
    });

    return () => subscription.unsubscribe();
  }, [form, originalValues, suppressTracking]);

  // Form tabs with content
  const tabs: FormTab[] = [
    {
      id: "basic",
      label: "Basic Information",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium">Code *</Label>
              <Input
                id="code"
                {...form.register("code")}
                placeholder="SNIPPET_CODE"
                data-testid="input-code"
                className={getFieldClassName("code")}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select 
                value={form.watch("category") || "general"} 
                onValueChange={(value) => form.setValue("category", value)}
              >
                <SelectTrigger 
                  data-testid="select-category"
                  className={getFieldClassName("category")}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SNIPPET_CATEGORIES.map((category) => (
                    <SelectItem 
                      key={category.value} 
                      value={category.value}
                      data-testid={`option-category-${category.value}`}
                    >
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Enter snippet title"
              data-testid="input-title"
              className={getFieldClassName("title")}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "content",
      label: "Content",
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="body" className="text-sm font-medium">Content *</Label>
            <Textarea
              id="body"
              {...form.register("body")}
              placeholder="Enter the text content for this snippet..."
              className={`min-h-[120px] ${getFieldClassName("body")}`}
              data-testid="textarea-body"
            />
            {form.formState.errors.body && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.body.message}</p>
            )}
          </div>
        </div>
      )
    },
    {
      id: "settings",
      label: "Settings",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="locale" className="text-sm font-medium">Language</Label>
              <Select 
                value={form.watch("locale") || "nl"} 
                onValueChange={(value) => form.setValue("locale", value)}
              >
                <SelectTrigger 
                  data-testid="select-locale"
                  className={getFieldClassName("locale")}
                >
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((locale) => (
                    <SelectItem 
                      key={locale.value} 
                      value={locale.value}
                      data-testid={`option-locale-${locale.value}`}
                    >
                      {locale.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="version" className="text-sm font-medium">Version</Label>
              <Input
                id="version"
                type="number"
                min="1"
                {...form.register("version", { valueAsNumber: true })}
                data-testid="input-version"
                className={getFieldClassName("version")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                </div>
                <Switch
                  checked={form.watch("isActive") ?? true}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                  data-testid="switch-active"
                />
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Info fields for the header
  const headerFields: InfoField[] = useMemo(() => {
    if (!isEditing || !textSnippet) return [];
    
    return [
      {
        label: "Code",
        value: textSnippet.code || "N/A"
      },
      {
        label: "Category",
        value: getCategoryLabel(textSnippet.category || "general")
      },
      {
        label: "Language",
        value: getLocaleLabel(textSnippet.locale || "nl")
      },
      {
        label: "Version",
        value: textSnippet.version?.toString() || "1"
      }
    ];
  }, [textSnippet, isEditing]);

  const toolbar = useFormToolbar({
    entityType: "text_snippet",
    entityId: textSnippetId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const isLoading = isLoadingTextSnippet;

  return (
    <BaseFormLayout
      headerFields={headerFields}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      toolbar={toolbar}
      isLoading={isLoading}
      validationErrorDialog={
        <ValidationErrorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          errors={validErrors}
          onShowFields={() => handleShowFields(setActiveTab, setActiveTab)}
        />
      }
    />
  );
}