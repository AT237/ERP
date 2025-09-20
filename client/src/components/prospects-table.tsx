import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useProspectsContext } from "@/contexts/ProspectsContext";
import { Filter, ChevronDown, Plus, Search, Settings, Eye, EyeOff, GripVertical, Trash2, Copy, Download, Mail, ChevronUp, ChevronsUpDown, Phone, Building, Calendar, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProspectSchema, type InsertProspect, type Prospect } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type FilterType = 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with';

type ColumnFilter = {
  column: string;
  type: FilterType;
  value: string;
};

const filterOptions = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
];

// Form schema for the Add/Edit Prospect dialog
const formSchema = insertProspectSchema.extend({
  companyName: z.string().min(1, "Company name is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function ProspectsTable() {
  const prospectsContext = useProspectsContext();
  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    addFilter,
    updateFilter,
    removeFilter,
    columns,
    setColumns,
    toggleColumnVisibility,
    selectedRows,
    setSelectedRows,
    toggleRowSelection,
    toggleAllRows,
    deleteSelectedRows,
    showAddProspectDialog,
    setShowAddProspectDialog,
    showColumnDialog,
    setShowColumnDialog,
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    confirmDeleteProspects,
    sortConfig,
    handleSort,
  } = prospectsContext;
  
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form setup for Add/Edit Prospect dialog
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      email: "",
      phone: "",
      mobile: "",
      position: "",
      industry: "",
      source: "",
      status: "new",
      priority: "medium",
      estimatedValue: "",
      notes: "",
      assignedTo: "",
      nextFollowUp: "",
      lastContactDate: "",
    }
  });

  // Mutation for creating new prospect
  const createProspectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create prospect");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setShowAddProspectDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Prospect added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add prospect. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to add prospect:", error);
    }
  });

  // Mutation for deleting prospects
  const deleteProspectsMutation = useMutation({
    mutationFn: async (prospectIds: string[]) => {
      for (const prospectId of prospectIds) {
        const response = await fetch(`/api/prospects/${prospectId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete prospect ${prospectId}`);
        }
      }
    },
    onSuccess: (_, prospectIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setSelectedRows([]);
      setShowDeleteConfirmDialog(false);
      toast({
        title: "Success",
        description: `${prospectIds.length} ${prospectIds.length === 1 ? 'prospect' : 'prospects'} deleted`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete prospects. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to delete prospects:", error);
    }
  });

  // Mutation for updating prospect
  const updateProspectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingProspect) throw new Error("No prospect to update");
      
      const response = await fetch(`/api/prospects/${editingProspect.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update prospect");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      setEditingProspect(null);
      setShowAddProspectDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Prospect updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update prospect",
        variant: "destructive",
      });
      console.error("Failed to update prospect:", error);
    }
  });

  // Update form when editing prospect changes
  React.useEffect(() => {
    if (editingProspect) {
      form.reset({
        firstName: editingProspect.firstName || "",
        lastName: editingProspect.lastName || "",
        companyName: editingProspect.companyName || "",
        email: editingProspect.email || "",
        phone: editingProspect.phone || "",
        mobile: editingProspect.mobile || "",
        position: editingProspect.position || "",
        industry: editingProspect.industry || "",
        source: editingProspect.source || "",
        status: editingProspect.status || "new",
        priority: editingProspect.priority || "medium",
        estimatedValue: editingProspect.estimatedValue ? String(editingProspect.estimatedValue) : "",
        notes: editingProspect.notes || "",
        assignedTo: editingProspect.assignedTo || "",
        nextFollowUp: editingProspect.nextFollowUp ? new Date(editingProspect.nextFollowUp).toISOString().slice(0, 16) : "",
        lastContactDate: editingProspect.lastContactDate ? new Date(editingProspect.lastContactDate).toISOString().slice(0, 16) : "",
      });
    } else {
      // Reset form to default values when adding new prospect
      form.reset({
        firstName: "",
        lastName: "",
        companyName: "",
        email: "",
        phone: "",
        mobile: "",
        position: "",
        industry: "",
        source: "",
        status: "new",
        priority: "medium",
        estimatedValue: "",
        notes: "",
        assignedTo: "",
        nextFollowUp: "",
        lastContactDate: "",
      });
    }
  }, [editingProspect, form]);

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setShowAddProspectDialog(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingProspect) {
      updateProspectMutation.mutate(data);
    } else {
      createProspectMutation.mutate(data);
    }
  };

  const handleProspectDoubleClick = (prospect: Prospect) => {
    handleEditProspect(prospect);
  };

  const { data: prospects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ['/api/prospects'],
  });

  const applyFilter = (value: any, filter: ColumnFilter): boolean => {
    if (!filter.value) return true;
    
    const cellValue = String(value || '').toLowerCase();
    const filterValue = filter.value.toLowerCase();
    
    switch (filter.type) {
      case 'contains':
        return cellValue.includes(filterValue);
      case 'not_contains':
        return !cellValue.includes(filterValue);
      case 'equals':
        return cellValue === filterValue;
      case 'not_equals':
        return cellValue !== filterValue;
      case 'greater_than':
        return Number(cellValue) > Number(filterValue);
      case 'less_than':
        return Number(cellValue) < Number(filterValue);
      case 'starts_with':
        return cellValue.startsWith(filterValue);
      case 'ends_with':
        return cellValue.endsWith(filterValue);
      default:
        return true;
    }
  };

  const filteredAndSortedProspects = (() => {
    // First apply filters
    let filtered = prospects.filter(prospect => {
      // Apply global search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(prospect).some(value => 
          String(value || '').toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Apply column filters
      return filters.every(filter => {
        const cellValue = prospect[filter.column as keyof Prospect];
        return applyFilter(cellValue, filter);
      });
    });

    // Then apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.column as keyof Prospect] || '';
        const bValue = b[sortConfig.column as keyof Prospect] || '';
        
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  })();

  const visibleColumns = columns.filter(col => col.visible);

  const formatCellValue = (value: any, key: string) => {
    if (!value) return '';
    
    switch (key) {
      case 'estimatedValue':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'EUR' 
        }).format(Number(value));
      case 'nextFollowUp':
      case 'lastContactDate':
      case 'createdAt':
      case 'conversionDate':
        return new Date(value).toLocaleDateString();
      case 'status':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'priority':
        return value.charAt(0).toUpperCase() + value.slice(1);
      default:
        return String(value);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-purple-100 text-purple-800';
      case 'negotiation': return 'bg-orange-100 text-orange-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="prospects-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Prospects</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Manage your potential customers and sales opportunities
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingProspect(null);
            setShowAddProspectDialog(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
          data-testid="button-add-prospect"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Prospect
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filter {filters.length > 0 && `(${filters.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Filters</span>
                {filters.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilters([])}
                    data-testid="button-clear-filters"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              {filters.map((filter, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={filter.column} 
                      onValueChange={(value) => updateFilter(index, 'column', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={filter.type} 
                      onValueChange={(value) => updateFilter(index, 'type', value)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFilter(index)}
                      data-testid={`button-remove-filter-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Input
                    placeholder="Value"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    data-testid={`input-filter-value-${index}`}
                  />
                </div>
              ))}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full" data-testid="button-add-filter">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {columns.map(col => (
                    <DropdownMenuItem 
                      key={col.key} 
                      onClick={() => addFilter(col.key)}
                      data-testid={`menu-item-add-filter-${col.key}`}
                    >
                      {col.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-columns">
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                className="capitalize"
                checked={column.visible}
                onCheckedChange={() => toggleColumnVisibility(column.key)}
                data-testid={`checkbox-column-${column.key}`}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedRows.length > 0 && (
          <Button 
            variant="destructive"
            onClick={deleteSelectedRows}
            data-testid="button-delete-selected"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedRows.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border" data-testid="prospects-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRows.length === filteredAndSortedProspects.length}
                  onCheckedChange={() => toggleAllRows(filteredAndSortedProspects.map(p => p.id))}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort(column.key)}
                  style={{ width: column.width }}
                  data-testid={`column-header-${column.key}`}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortConfig?.column === column.key && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    <span className="ml-2">Loading prospects...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedProspects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                  {searchTerm || filters.length > 0 ? "No prospects match your search criteria" : "No prospects found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProspects.map((prospect) => (
                <TableRow 
                  key={prospect.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onDoubleClick={() => handleProspectDoubleClick(prospect)}
                  data-testid={`row-prospect-${prospect.id}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(prospect.id)}
                      onCheckedChange={() => toggleRowSelection(prospect.id)}
                      data-testid={`checkbox-select-${prospect.id}`}
                    />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell 
                      key={`${prospect.id}-${column.key}`}
                      data-testid={`cell-${column.key}-${prospect.id}`}
                    >
                      {column.key === 'status' ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospect.status || 'new')}`}>
                          {formatCellValue(prospect[column.key as keyof Prospect], column.key)}
                        </span>
                      ) : column.key === 'priority' ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(prospect.priority || 'medium')}`}>
                          {formatCellValue(prospect[column.key as keyof Prospect], column.key)}
                        </span>
                      ) : (
                        <span className="truncate">
                          {formatCellValue(prospect[column.key as keyof Prospect], column.key)}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Prospect Dialog */}
      <Dialog open={showAddProspectDialog} onOpenChange={setShowAddProspectDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-add-prospect">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingProspect ? 'Edit Prospect' : 'Add New Prospect'}
            </DialogTitle>
            <DialogDescription data-testid="dialog-description">
              {editingProspect ? 'Update the prospect information below.' : 'Fill in the prospect information below.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  data-testid="input-first-name"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  data-testid="input-last-name"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                {...form.register("companyName")}
                data-testid="input-company-name"
              />
              {form.formState.errors.companyName && (
                <p className="text-sm text-red-600">{form.formState.errors.companyName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  {...form.register("position")}
                  data-testid="input-position"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  data-testid="input-phone"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  {...form.register("mobile")}
                  data-testid="input-mobile"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  {...form.register("industry")}
                  data-testid="input-industry"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  {...form.register("source")}
                  placeholder="e.g., Website, Referral, Trade Show"
                  data-testid="input-source"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select onValueChange={(value) => form.setValue("status", value)} defaultValue="new">
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select onValueChange={(value) => form.setValue("priority", value)} defaultValue="medium">
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Estimated Value (€)</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  step="0.01"
                  {...form.register("estimatedValue")}
                  data-testid="input-estimated-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  {...form.register("assignedTo")}
                  placeholder="Sales person"
                  data-testid="input-assigned-to"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nextFollowUp">Next Follow Up</Label>
                <Input
                  id="nextFollowUp"
                  type="datetime-local"
                  {...form.register("nextFollowUp")}
                  data-testid="input-next-follow-up"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                {...form.register("notes")}
                data-testid="textarea-notes"
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddProspectDialog(false);
                  setEditingProspect(null);
                  form.reset();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={createProspectMutation.isPending || updateProspectMutation.isPending}
                data-testid="button-save"
              >
                {createProspectMutation.isPending || updateProspectMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  editingProspect ? 'Update Prospect' : 'Add Prospect'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="delete-dialog-title">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription data-testid="delete-dialog-description">
              This action cannot be undone. This will permanently delete {selectedRows.length} 
              {selectedRows.length === 1 ? ' prospect' : ' prospects'} from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProspectsMutation.mutate(selectedRows)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteProspectsMutation.isPending}
              data-testid="button-delete-confirm"
            >
              {deleteProspectsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}