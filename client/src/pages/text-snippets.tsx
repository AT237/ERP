import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTextSnippetSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, FileText, Copy, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { TextSnippet, InsertTextSnippet } from "@shared/schema";
import { z } from "zod";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

// Form schema for text snippets
const textSnippetFormSchema = insertTextSnippetSchema.extend({
  // Add any additional validation rules if needed
});

type TextSnippetFormData = z.infer<typeof textSnippetFormSchema>;

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

export default function TextSnippets() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<TextSnippet | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeSection, setActiveSection] = useState("basic");
  const { toast } = useToast();

  // Data fetching
  const { data: textSnippets = [], isLoading } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets"],
    staleTime: 30000,
    gcTime: 300000,
  });

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

  // Column configuration for text snippets table
  const defaultColumns: ColumnConfig[] = [
    createIdColumn('code', 'Code'),
    { 
      key: 'title', 
      label: 'Title', 
      visible: true, 
      width: 200, 
      filterable: true, 
      sortable: true 
    },
    { 
      key: 'category', 
      label: 'Category', 
      visible: true, 
      width: 130, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string | null) => (
        <Badge variant="outline">
          {getCategoryLabel(value || 'general')}
        </Badge>
      )
    },
    { 
      key: 'body', 
      label: 'Content Preview', 
      visible: true, 
      width: 300, 
      filterable: true, 
      sortable: false,
      renderCell: (value: string) => (
        <div className="max-w-xs truncate text-sm text-muted-foreground" title={value}>
          {value && value.length > 50 ? `${value.substring(0, 50)}...` : value}
        </div>
      )
    },
    { 
      key: 'locale', 
      label: 'Language', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string | null) => (
        <Badge variant="secondary">
          {value?.toUpperCase() || 'NL'}
        </Badge>
      )
    },
    { 
      key: 'version', 
      label: 'Version', 
      visible: true, 
      width: 80, 
      filterable: true, 
      sortable: true 
    },
    { 
      key: 'isActive', 
      label: 'Status', 
      visible: true, 
      width: 80, 
      filterable: true, 
      sortable: true,
      renderCell: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  ];

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'text-snippets'
  });

  // Form setup
  const form = useForm<TextSnippetFormData>({
    resolver: zodResolver(textSnippetFormSchema),
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertTextSnippet) => {
      await apiRequest("POST", "/api/text-snippets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-snippets"] });
      toast({
        title: "Success",
        description: "Text snippet created successfully",
      });
      setShowDialog(false);
      form.reset();
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
      toast({
        title: "Success",
        description: "Text snippet updated successfully",
      });
      setShowDialog(false);
      setEditingSnippet(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update text snippet",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/text-snippets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-snippets"] });
      toast({
        title: "Success",
        description: "Text snippet deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete text snippet",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (snippet: TextSnippet) => {
      const duplicateData: InsertTextSnippet = {
        code: `${snippet.code}_copy`,
        title: `${snippet.title} (Copy)`,
        body: snippet.body,
        category: snippet.category,
        locale: snippet.locale,
        version: 1,
        isActive: true,
      };
      await apiRequest("POST", "/api/text-snippets", duplicateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-snippets"] });
      toast({
        title: "Success",
        description: "Text snippet duplicated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate text snippet",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleNewSnippet = () => {
    setEditingSnippet(null);
    form.reset({
      code: "",
      title: "",
      body: "",
      category: "general",
      locale: "nl",
      version: 1,
      isActive: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (snippet: TextSnippet) => {
    setEditingSnippet(snippet);
    form.reset({
      code: snippet.code,
      title: snippet.title,
      body: snippet.body,
      category: snippet.category || "general",
      locale: snippet.locale || "nl",
      version: snippet.version || 1,
      isActive: snippet.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this text snippet?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (snippet: TextSnippet) => {
    duplicateMutation.mutate(snippet);
  };

  const onSubmit = (data: TextSnippetFormData) => {
    if (editingSnippet) {
      updateMutation.mutate({
        id: editingSnippet.id,
        snippet: data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowDialog(false);
      setEditingSnippet(null);
      form.reset();
    }
  };

  // Custom components for FormField integration
  const renderCategorySelect = (field: any) => (
    <Select onValueChange={field.onChange} value={field.value || "general"}>
      <SelectTrigger data-testid="select-category">
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
      <SelectTrigger data-testid="select-locale">
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

  // Create form sections for LayoutForm2
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
                      className="min-h-[120px]"
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

  // Create action buttons
  const createActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => handleDialogClose(false),
      disabled: createMutation.isPending || updateMutation.isPending
    },
    {
      label: `${editingSnippet ? 'Update' : 'Create'} Snippet`,
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending || updateMutation.isPending
    }
  ];

  // Filter data by selected category
  const filteredData = React.useMemo(() => {
    let filtered = textSnippets;
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(snippet => snippet.category === selectedCategory);
    }
    return filtered;
  }, [textSnippets, selectedCategory]);

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Text Snippet"
        entityNamePlural="Text Snippets"
        data={filteredData}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        isLoading={isLoading}
        searchTerm={tableState.searchTerm}
        setSearchTerm={tableState.setSearchTerm}
        filters={tableState.filters}
        setFilters={tableState.setFilters}
        onAddFilter={tableState.addFilter}
        onUpdateFilter={tableState.updateFilter}
        onRemoveFilter={tableState.removeFilter}
        sortConfig={tableState.sortConfig}
        onSort={tableState.handleSort}
        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={() => {
          const allIds = filteredData.map(s => s.id);
          tableState.toggleAllRows(allIds);
        }}
        getRowId={(row: TextSnippet) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-snippet',
            label: 'Add Text Snippet',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewSnippet,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: TextSnippet) => [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(row)
          },
          {
            key: 'duplicate',
            label: 'Duplicate',
            icon: <Copy className="h-4 w-4" />,
            onClick: () => handleDuplicate(row)
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDelete(row.id),
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingSnippet ? 'Edit Text Snippet' : 'Create New Text Snippet'}
            </DialogTitle>
            <DialogDescription>
              {editingSnippet 
                ? 'Update the text snippet details below.' 
                : 'Create a new reusable text snippet for use in documents.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <LayoutForm2
              sections={createFormSections()}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              form={form}
              onSubmit={onSubmit}
              actionButtons={createActionButtons()}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </Form>
        </DialogContent>
      </Dialog>

      {/* Category Filter */}
      <div className="mt-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-all-categories">All Categories</SelectItem>
            {SNIPPET_CATEGORIES.map((category) => (
              <SelectItem 
                key={category.value} 
                value={category.value}
                data-testid={`filter-option-${category.value}`}
              >
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}