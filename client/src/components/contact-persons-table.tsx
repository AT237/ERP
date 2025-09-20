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
import { Checkbox } from "@/components/ui/checkbox";
import { useContactPersonsContext } from "@/contexts/ContactPersonsContext";
import { Filter, ChevronDown, Plus, Search, Settings, Eye, EyeOff, GripVertical, Trash2, Copy, Download, Mail, ChevronUp, ChevronsUpDown, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerContactSchema, type InsertCustomerContact, type CustomerContact } from "@shared/schema";
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

// Form schema for the Add Contact Person dialog
const formSchema = insertCustomerContactSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactPersonsTable() {
  const contactPersonsContext = useContactPersonsContext();
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
    showAddContactDialog,
    setShowAddContactDialog,
    showColumnDialog,
    setShowColumnDialog,
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    confirmDeleteContacts,
    sortConfig,
    handleSort,
  } = contactPersonsContext;
  
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form setup for Add Contact Person dialog
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      mobile: [],
      position: "",
      isPrimary: false,
    }
  });

  // Mutation for creating new contact person
  const createContactMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/customer-contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create contact person");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      setShowAddContactDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contact person added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add contact person. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to add contact person:", error);
    }
  });

  // Mutation for deleting contact persons
  const deleteContactsMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      for (const contactId of contactIds) {
        const response = await fetch(`/api/customer-contacts/${contactId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete contact person ${contactId}`);
        }
      }
    },
    onSuccess: (_, contactIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      setSelectedRows([]);
      setShowDeleteConfirmDialog(false);
      toast({
        title: "Success",
        description: `${contactIds.length} ${contactIds.length === 1 ? 'contact person' : 'contact persons'} deleted`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete contact persons. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to delete contact persons:", error);
    }
  });

  // Mutation for updating contact person
  const updateContactMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingContact) throw new Error("No contact person to update");
      
      const response = await fetch(`/api/customer-contacts/${editingContact.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update contact person");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-contacts"] });
      setEditingContact(null);
      setShowAddContactDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contact person updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update contact person",
        variant: "destructive",
      });
      console.error("Failed to update contact person:", error);
    }
  });

  // Update form when editing contact changes
  React.useEffect(() => {
    if (editingContact) {
      form.reset({
        firstName: editingContact.firstName || "",
        lastName: editingContact.lastName || "",
        email: editingContact.email || "",
        phone: editingContact.phone || "",
        mobile: editingContact.mobile || [],
        position: editingContact.position || "",
        isPrimary: editingContact.isPrimary || false,
      });
    } else {
      // Reset form to default values when adding new contact person
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        mobile: [],
        position: "",
        isPrimary: false,
      });
    }
  }, [editingContact, form]);

  const handleEditContact = (contact: CustomerContact) => {
    // Dispatch custom event to open contact person edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-contact-person-${contact.id}`,
        name: `${contact.firstName} ${contact.lastName}`,
        formType: 'contact-person',
        parentId: contact.id
      }
    });
    window.dispatchEvent(event);
  };

  const onSubmit = (data: FormData) => {
    if (editingContact) {
      updateContactMutation.mutate(data);
    } else {
      createContactMutation.mutate(data);
    }
  };

  const handleContactDoubleClick = (contact: CustomerContact) => {
    // Dispatch custom event to open contact person edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-contact-person-${contact.id}`,
        name: `${contact.firstName} ${contact.lastName}`,
        formType: 'contact-person',
        parentId: contact.id
      }
    });
    window.dispatchEvent(event);
  };

  const { data: contacts = [], isLoading } = useQuery<CustomerContact[]>({
    queryKey: ['/api/customer-contacts'],
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

  const filteredAndSortedContacts = (() => {
    // First apply filters
    let filtered = contacts.filter(contact => {
      // Apply global search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(contact).some(value => 
          String(value || '').toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Apply column filters
      return filters.every(filter => {
        const value = contact[filter.column as keyof CustomerContact];
        return applyFilter(value, filter);
      });
    });

    // Then apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.column as keyof CustomerContact];
        const bValue = b[sortConfig.column as keyof CustomerContact];
        
        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
        
        // Handle different data types
        let comparison = 0;
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          comparison = Number(aValue) - Number(bValue);
        } else {
          // String comparison
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  })();

  const visibleColumns = columns.filter(col => col.visible);

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading contact persons...</div>;
  }

  return (
    <div className="space-y-4" data-testid="contact-persons-table">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contact Persons</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              // Dispatch custom event to open contact person form in new tab
              const event = new CustomEvent('open-form-tab', {
                detail: {
                  id: 'new-contact-person',
                  name: 'New Contact Person',
                  formType: 'contact-person'
                }
              });
              window.dispatchEvent(event);
            }}
            data-testid="button-add-contact"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact Person
          </Button>
          {selectedRows.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirmDialog(true)}
              data-testid="button-delete-selected"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRows.length})
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contact persons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-columns">
              <Settings className="h-4 w-4 mr-2" />
              Columns
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={column.visible}
                onCheckedChange={() => toggleColumnVisibility(column.key)}
                data-testid={`checkbox-column-${column.key}`}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.length === filteredAndSortedContacts.length && filteredAndSortedContacts.length > 0}
                  onCheckedChange={() => toggleAllRows(filteredAndSortedContacts.map(c => c.id))}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key}
                  className="cursor-pointer"
                  onClick={() => handleSort(column.key)}
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
            {filteredAndSortedContacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/50"
                onDoubleClick={() => handleContactDoubleClick(contact)}
                data-testid={`row-contact-${contact.id}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(contact.id)}
                    onCheckedChange={() => toggleRowSelection(contact.id)}
                    data-testid={`checkbox-select-${contact.id}`}
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={`${contact.id}-${column.key}`}>
                    {column.key === 'firstName' && contact.firstName}
                    {column.key === 'lastName' && contact.lastName}
                    {column.key === 'email' && contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {column.key === 'phone' && contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {column.key === 'mobile' && Array.isArray(contact.mobile) && contact.mobile.length > 0 && (
                      <div className="space-y-1">
                        {contact.mobile.slice(0, 2).map((mobile, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-green-500" />
                            <a href={`tel:${mobile}`} className="text-blue-600 hover:underline text-sm">
                              {mobile}
                            </a>
                          </div>
                        ))}
                        {contact.mobile.length > 2 && (
                          <span className="text-xs text-gray-500">+{contact.mobile.length - 2} more</span>
                        )}
                      </div>
                    )}
                    {column.key === 'position' && contact.position}
                    {column.key === 'isPrimary' && (
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        contact.isPrimary 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {contact.isPrimary ? 'Primary' : 'Secondary'}
                      </span>
                    )}
                    {column.key === 'id' && contact.id}
                    {column.key === 'dateOfBirth' && contact.dateOfBirth && (
                      new Date(contact.dateOfBirth).toLocaleDateString()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {filteredAndSortedContacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                  No contact persons found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Contact Person Dialog */}
      <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact Person' : 'Add Contact Person'}
            </DialogTitle>
            <DialogDescription>
              {editingContact 
                ? 'Update the contact person details below.' 
                : 'Fill out the form below to add a new contact person.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register('firstName')}
                  data-testid="input-firstName"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  data-testid="input-lastName"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  {...form.register('position')}
                  data-testid="input-position"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                {...form.register('isPrimary')}
                data-testid="checkbox-isPrimary"
              />
              <Label htmlFor="isPrimary">Primary Contact</Label>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddContactDialog(false);
                  setEditingContact(null);
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createContactMutation.isPending || updateContactMutation.isPending}
                data-testid="button-submit"
              >
                {editingContact ? 'Update' : 'Add'} Contact Person
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedRows.length} contact person{selectedRows.length > 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContactsMutation.mutate(selectedRows)}
              disabled={deleteContactsMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}