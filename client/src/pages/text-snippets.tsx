import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Copy, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import type { TextSnippet } from "@shared/schema";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

  const del = useEntityDelete<TextSnippet>({
    endpoint: '/api/text-snippets',
    queryKeys: ['/api/text-snippets'],
    entityLabel: 'Text Snippet',
    checkUsages: false,
    getName: (row) => row.code || row.title
  });

  // Delete mutation for row actions
  // (Removed old deleteMutation)

  const duplicateMutation = useMutation({
    mutationFn: async (snippet: TextSnippet) => {
      const duplicateData = {
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
    // Dispatch custom event to open text snippet form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-text-snippet',
        name: 'New Text Snippet',
        formType: 'text-snippet'
      }
    });
    window.dispatchEvent(event);
  };

  const handleEdit = (snippet: TextSnippet) => {
    // Dispatch custom event to open text snippet edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-text-snippet-${snippet.id}`,
        name: `${snippet.code}`,
        formType: 'text-snippet',
        parentId: snippet.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (snippet: TextSnippet) => {
    // Same as edit for double-click
    handleEdit(snippet);
  };


  const handleDuplicate = (snippet: TextSnippet) => {
    duplicateMutation.mutate(snippet);
  };





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
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, filteredData),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleRowDoubleClick}
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
            onClick: () => del.handleDeleteRow(row),
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
      />
      {del.renderDeleteDialogs()}

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