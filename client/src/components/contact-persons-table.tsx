import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerContactSchema, type InsertCustomerContact, type CustomerContact, type Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus, Mail, Phone, Minus } from "lucide-react";

// Import our reusable layouts
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import { useDataTable } from '@/hooks/useDataTable';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Form schema with date and mobile validation
const formSchema = insertCustomerContactSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional field
      
      // Check DD-MM-YYYY format
      const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
      const match = val.match(dateRegex);
      if (!match) return false;
      
      const [, day, month, year] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Check if date is valid
      if (date.getDate() !== parseInt(day) || 
          date.getMonth() !== parseInt(month) - 1 || 
          date.getFullYear() !== parseInt(year)) {
        return false;
      }
      
      // Check age limit (max 120 years)
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      const dayDiff = today.getDate() - date.getDate();
      
      const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0);
      
      return actualAge <= 120 && date <= today;
    }, "Please enter a valid date in DD-MM-YYYY format (max age 120 years)")
}).omit({ customerId: true, position: true });

type FormData = z.infer<typeof formSchema>;

// Default column configuration for customer contacts
const defaultColumns: ColumnConfig[] = [
  createIdColumn('id', 'Contact ID'),
  { 
    key: 'fullName', 
    label: 'Name', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: any, row: CustomerContact) => 
      `${row.firstName} ${row.lastName}`
  },
  { 
    key: 'dateOfBirth', 
    label: 'Date of Birth', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: Date | null) => value ? 
      new Date(value).toLocaleDateString('nl-NL') : "—"
  },
  { 
    key: 'mobile', 
    label: 'Mobile', 
    visible: true, 
    width: 160, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string[] | string | null, row: CustomerContact) => {
      const mobiles = Array.isArray(value) ? value : value ? [value] : [];
      return mobiles.length > 0 ? (
        <div className="space-y-1">
          {mobiles.slice(0, 2).map((mobile, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Phone size={12} className="text-green-500" />
              <a href={`tel:${mobile}`} className="text-blue-600 hover:underline text-xs">
                {mobile}
              </a>
            </div>
          ))}
          {mobiles.length > 2 && (
            <span className="text-xs text-gray-500">+{mobiles.length - 2} more</span>
          )}
        </div>
      ) : "—";
    }
  },
  { key: 'position', label: 'Position', visible: true, width: 150, filterable: true, sortable: true },
  { 
    key: 'email', 
    label: 'Email', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <div className="flex items-center space-x-2">
        <Mail size={14} className="text-orange-500" />
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-sm">
          {value}
        </a>
      </div>
    ) : "—"
  },
  { 
    key: 'phone', 
    label: 'Phone', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <div className="flex items-center space-x-2">
        <Phone size={14} className="text-orange-500" />
        <a href={`tel:${value}`} className="text-blue-600 hover:underline text-sm">
          {value}
        </a>
      </div>
    ) : "—"
  },
  { 
    key: 'isPrimary', 
    label: 'Primary', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: boolean) => (
      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
        value 
          ? 'bg-orange-100 text-orange-800' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {value ? 'Primary' : 'Secondary'}
      </span>
    )
  },
];

export default function ContactPersonsTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([""]);
  const [activeSection, setActiveSection] = useState("general");

  // Initialize data table state
  const dataTableState = useDataTable({ 
    defaultColumns,
    tableKey: 'contact-persons'
  });

  // Fetch customer contacts
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<CustomerContact[]>({
    queryKey: ['/api/customer-contacts'],
  });

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      mobile: [],
      dateOfBirth: "",
      isPrimary: false,
    }
  });

  // Handle mobile number management - defined before JSX usage
  const addMobileNumber = () => {
    const newNumbers = [...mobileNumbers, ""];
    setMobileNumbers(newNumbers);
    form.setValue("mobile", newNumbers.filter(n => n.trim() !== ""));
  };

  const removeMobileNumber = (index: number) => {
    const newNumbers = mobileNumbers.filter((_, i) => i !== index);
    setMobileNumbers(newNumbers);
    form.setValue("mobile", newNumbers.filter(n => n.trim() !== ""));
  };

  const updateMobileNumber = (index: number, value: string) => {
    // Apply country code mask
    let formattedValue = value.replace(/[^\d+]/g, ''); // Keep only digits and +
    if (formattedValue && !formattedValue.startsWith('+')) {
      formattedValue = '+' + formattedValue;
    }
    
    const newNumbers = [...mobileNumbers];
    newNumbers[index] = formattedValue;
    setMobileNumbers(newNumbers);
    
    // Update form with non-empty numbers
    const validNumbers = newNumbers.filter(n => n.trim() !== "");
    form.setValue("mobile", validNumbers);
  };

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/customer-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create contact');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-contacts'] });
      toast({ title: "Success", description: "Contact person created successfully." });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create contact person.",
        variant: "destructive" 
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/customer-contacts/${editingContact!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update contact');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-contacts'] });
      toast({ title: "Success", description: "Contact person updated successfully." });
      setShowAddDialog(false);
      setEditingContact(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update contact person.",
        variant: "destructive" 
      });
    },
  });

  // Delete contacts mutation
  const deleteContactsMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      await Promise.all(
        contactIds.map(id => 
          fetch(`/api/customer-contacts/${id}`, { method: 'DELETE' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-contacts'] });
      toast({ title: "Success", description: "Contact person(s) deleted successfully." });
      dataTableState.clearSelection();
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete contact person(s).",
        variant: "destructive" 
      });
    },
  });

  // Helper function to convert DD-MM-YYYY to Date
  const convertDateString = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return undefined;
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Helper function to convert Date to DD-MM-YYYY
  const formatDateString = (date: Date | string | null): string => {
    if (!date) return "";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Form submit handler
  const onSubmit = (data: FormData) => {
    // Always set customerId to null for independent contacts
    // Convert date string to Date object
    const submitData = {
      ...data,
      customerId: null,
      dateOfBirth: convertDateString(data.dateOfBirth)
    };
    
    if (editingContact) {
      updateContactMutation.mutate(submitData as any);
    } else {
      createContactMutation.mutate(submitData as any);
    }
  };

  // Handle edit
  const handleEdit = (contact: CustomerContact) => {
    setEditingContact(contact);
    const mobilesArray = Array.isArray(contact.mobile) ? contact.mobile : contact.mobile ? [contact.mobile] : [];
    setMobileNumbers(mobilesArray.length > 0 ? mobilesArray : [""]);
    
    form.reset({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      mobile: mobilesArray,
      dateOfBirth: contact.dateOfBirth ? formatDateString(contact.dateOfBirth) : "",
      isPrimary: contact.isPrimary || false,
    });
    setShowAddDialog(true);
  };

  // Enhanced contact data with customer name
  const enhancedContacts = contacts.map((contact: CustomerContact) => {
    const customer = customers.find((c: Customer) => c.id === contact.customerId);
    return {
      ...contact,
      customerName: contact.customerId ? (customer?.name || 'Unknown Customer') : 'Independent Contact',
    };
  });


  // Form sections
  const formSections: FormSection2<FormData>[] = [
    {
      id: "general",
      label: "Contact Person Details",
      rows: [
        createSectionHeaderRow("Contact Information"),
        createFieldRow({
          key: "firstName",
          label: "First Name",
          type: "text",
          register: form.register("firstName"),
          validation: {
            isRequired: true,
            error: form.formState.errors.firstName?.message
          },
          testId: "input-first-name"
        }),
        createFieldRow({
          key: "lastName",
          label: "Last Name",
          type: "text",
          register: form.register("lastName"),
          validation: {
            isRequired: true,
            error: form.formState.errors.lastName?.message
          },
          testId: "input-last-name"
        }),
        createFieldRow({
          key: "dateOfBirth",
          label: "Date of Birth",
          type: "text",
          placeholder: "DD-MM-YYYY",
          register: form.register("dateOfBirth"),
          validation: {
            error: form.formState.errors.dateOfBirth?.message
          },
          testId: "input-date-of-birth"
        }),
        createFieldRow({
          key: "mobile",
          label: "Mobile Numbers",
          type: "custom",
          validation: {
            error: form.formState.errors.mobile?.message
          },
          testId: "input-mobile-numbers",
          customComponent: (
            <div className="space-y-2">
              {mobileNumbers.map((number, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    type="text"
                    value={number}
                    onChange={(e) => updateMobileNumber(index, e.target.value)}
                    placeholder="+0031612345678"
                    data-testid={`input-mobile-${index}`}
                    className="flex-1"
                  />
                  {mobileNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeMobileNumber(index)}
                      data-testid={`button-remove-mobile-${index}`}
                      className="shrink-0"
                    >
                      <Minus size={16} />
                    </Button>
                  )}
                  {index === mobileNumbers.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addMobileNumber}
                      data-testid="button-add-mobile"
                      className="shrink-0"
                    >
                      <Plus size={16} />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.mobile && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.mobile.message}
                </p>
              )}
            </div>
          )
        }),
        
        createSectionHeaderRow("Contact Details", "mt-6"),
        createFieldRow({
          key: "email",
          label: "Email Address",
          type: "email",
          register: form.register("email"),
          validation: {
            error: form.formState.errors.email?.message
          },
          testId: "input-contact-email"
        }),
        createFieldRow({
          key: "phone",
          label: "Phone Number",
          type: "tel",
          register: form.register("phone"),
          validation: {
            error: form.formState.errors.phone?.message
          },
          testId: "input-contact-phone"
        })
      ]
    }
  ];

  // Handle add contact
  const handleAddContact = () => {
    setEditingContact(null);
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      mobile: [],
      dateOfBirth: "",
      isPrimary: false,
    });
    setMobileNumbers([""]);
    setShowAddDialog(true);
  };

  return (
    <DataTableLayout
      // Data and loading
      data={enhancedContacts}
      isLoading={isLoadingContacts}
      
      // Table configuration
      columns={dataTableState.columns}
      setColumns={dataTableState.setColumns}
      
      // Search and filtering
      searchTerm={dataTableState.searchTerm}
      setSearchTerm={dataTableState.setSearchTerm}
      filters={dataTableState.filters}
      setFilters={dataTableState.setFilters}
      onAddFilter={dataTableState.addFilter}
      onUpdateFilter={dataTableState.updateFilter}
      onRemoveFilter={dataTableState.removeFilter}
      
      // Sorting
      sortConfig={dataTableState.sortConfig}
      onSort={dataTableState.handleSort}
      
      // Row selection
      selectedRows={dataTableState.selectedRows}
      setSelectedRows={dataTableState.setSelectedRows}
      onToggleRowSelection={dataTableState.toggleRowSelection}
      onToggleAllRows={() => dataTableState.toggleAllRows(enhancedContacts.map((c: any) => c.id))}
      getRowId={(contact) => contact.id}
      
      // UI configuration
      entityName="Contact Person"
      entityNamePlural="Contact Persons"
      
      // Header actions
      headerActions={[
        {
          key: 'add-contact',
          label: 'Add Contact Person',
          icon: <Plus size={16} />,
          onClick: handleAddContact,
          variant: 'default'
        }
      ]}
      
      // Dialogs
      addEditDialog={{
        isOpen: showAddDialog,
        onOpenChange: setShowAddDialog,
        title: editingContact ? "Edit Contact Person" : "Add New Contact Person",
        content: (
          <div className="p-6">
            <LayoutForm2
              sections={formSections}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              form={form}
              onSubmit={onSubmit}
              actionButtons={[
                {
                  key: 'cancel',
                  label: 'Cancel',
                  onClick: () => {
                    setShowAddDialog(false);
                    setEditingContact(null);
                  },
                  variant: 'outline',
                  testId: 'button-cancel-contact'
                },
                {
                  key: 'save',
                  label: editingContact 
                    ? (updateContactMutation.isPending ? "Updating..." : "Update Contact Person")
                    : (createContactMutation.isPending ? "Adding..." : "Add Contact Person"),
                  onClick: form.handleSubmit(onSubmit),
                  variant: 'default',
                  loading: createContactMutation.isPending || updateContactMutation.isPending,
                  testId: 'button-save-contact'
                }
              ]}
              changeTracking={{
                enabled: false // No change tracking for table forms
              }}
              isLoading={false}
            />
          </div>
        )
      }}
      
      deleteConfirmDialog={{
        isOpen: showDeleteDialog,
        onOpenChange: setShowDeleteDialog,
        onConfirm: () => deleteContactsMutation.mutate(dataTableState.selectedRows),
        itemCount: dataTableState.selectedRows.length
      }}
      
      // Event handlers
      onRowDoubleClick={handleEdit}
      
      // Data processing
      applyFiltersAndSearch={(data, searchTerm, filters) => {
        let filtered = data;
        
        // Apply search
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          filtered = filtered.filter((contact: any) =>
            contact.name?.toLowerCase().includes(searchLower) ||
            contact.email?.toLowerCase().includes(searchLower) ||
            contact.phone?.toLowerCase().includes(searchLower) ||
            contact.position?.toLowerCase().includes(searchLower) ||
            contact.customerName?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply filters
        filters.forEach(filter => {
          filtered = filtered.filter((contact: any) => {
            const value = contact[filter.column];
            const filterValue = filter.value?.toLowerCase() || '';
            
            if (!value || !filterValue) return false;
            
            switch (filter.type) {
              case 'contains':
                return String(value).toLowerCase().includes(filterValue);
              case 'equals':
                return String(value).toLowerCase() === filterValue;
              case 'starts_with':
                return String(value).toLowerCase().startsWith(filterValue);
              case 'ends_with':
                return String(value).toLowerCase().endsWith(filterValue);
              default:
                return true;
            }
          });
        });
        
        return filtered;
      }}
      
      applySorting={(data, sortConfig) => {
        if (!sortConfig) return data;
        
        return [...data].sort((a: any, b: any) => {
          const aVal = a[sortConfig.column];
          const bVal = b[sortConfig.column];
          
          if (aVal === bVal) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          
          const comparison = aVal < bVal ? -1 : 1;
          return sortConfig.direction === 'desc' ? -comparison : comparison;
        });
      }}
    />
  );
}