import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer, InsertCustomer } from "@shared/schema";
import { z } from "zod";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

const customerFormSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().min(1, "Betalingsvoorwaarden zijn verplicht"),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const defaultColumns: ColumnConfig[] = [
  createIdColumn('id', 'Customer ID'),
  { key: 'name', label: 'Company Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'email', label: 'Email', visible: true, width: 180, filterable: true, sortable: true },
  { key: 'phone', label: 'Phone', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'mobile', label: 'Mobile', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'taxId', label: 'Tax ID', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'paymentTerms', label: 'Payment Terms', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true },
];

export default function Customers() {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns
  });

  // Data fetching
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Form setup
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobile: "",
      taxId: "",
      bankAccount: "",
      language: "nl",
      paymentTerms: "30",
      status: "active",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowDialog(false);
      form.reset();
      setEditingCustomer(null);
      toast({
        title: "Succes",
        description: "Klant toegevoegd",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet toevoegen",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerFormData> }) => {
      const response = await apiRequest("PUT", `/api/customers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowDialog(false);
      form.reset();
      setEditingCustomer(null);
      toast({
        title: "Succes",
        description: "Klant bijgewerkt",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet bijwerken",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succes",
        description: "Klant verwijderd",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet verwijderen",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onSubmit = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    // Dispatch custom event to open customer edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-customer-${customer.id}`,
        name: `Edit Customer: ${customer.name}`,
        formType: 'customer',
        parentId: customer.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je deze klant wilt verwijderen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewCustomer = () => {
    // Dispatch custom event to open customer form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-customer',
        name: 'New Customer',
        formType: 'customer'
      }
    });
    window.dispatchEvent(event);
  };

  // Render table data with proper formatting
  const renderTableData = (customers: Customer[]) => {
    return customers.map((customer) => ({
      ...customer,
      name: customer.name,
      email: customer.email || 'Geen email',
      phone: customer.phone || 'Geen telefoon',
      mobile: customer.mobile || 'Geen mobiel',
      taxId: customer.taxId || 'Geen BTW-nr',
      paymentTerms: `${customer.paymentTerms || '30'} dagen`,
      status: customer.status || 'actief',
    }));
  };

  // Form content
  const renderFormContent = () => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Bedrijfsinformatie</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bedrijfsnaam *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Bedrijfsnaam"
              data-testid="input-customer-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">BTW-nummer</Label>
            <Input
              id="taxId"
              {...form.register("taxId")}
              placeholder="NL123456789B01"
              data-testid="input-customer-taxId"
            />
          </div>
        </div>

      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Contactinformatie</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="info@bedrijf.nl"
              data-testid="input-customer-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoon</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder="+31 20 123 4567"
              data-testid="input-customer-phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobiel</Label>
            <Input
              id="mobile"
              {...form.register("mobile")}
              placeholder="+31 6 12345678"
              data-testid="input-customer-mobile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccount">Bankrekeningnummer</Label>
            <Input
              id="bankAccount"
              {...form.register("bankAccount")}
              placeholder="NL91ABNA0417164300"
              data-testid="input-customer-bankAccount"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Bedrijfsinstellingen</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Taal</Label>
            <Select 
              onValueChange={(value) => form.setValue("language", value)}
              value={form.watch("language") || "nl"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Betalingsvoorwaarden *</Label>
            <Select 
              onValueChange={(value) => form.setValue("paymentTerms", value)}
              value={form.watch("paymentTerms") || "30"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dagen</SelectItem>
                <SelectItem value="14">14 dagen</SelectItem>
                <SelectItem value="30">30 dagen</SelectItem>
                <SelectItem value="45">45 dagen</SelectItem>
                <SelectItem value="60">60 dagen</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.paymentTerms && (
              <p className="text-sm text-red-600">{form.formState.errors.paymentTerms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              onValueChange={(value) => form.setValue("status", value)}
              value={form.watch("status") || "active"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="archived">Gearchiveerd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowDialog(false);
            form.reset();
          }}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          Annuleren
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {(createMutation.isPending || updateMutation.isPending) ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-6">
      <DataTableLayout
      title="Customer Management"
      entityName="Customer"
      entityNamePlural="Customers"
      data={renderTableData(customers)}
      columns={tableState.columns}
      setColumns={tableState.setColumns}
      isLoading={isLoading}
      searchTerm={tableState.searchTerm}
      setSearchTerm={tableState.setSearchTerm}
      filters={tableState.filters}
      setFilters={tableState.setFilters}
      sortConfig={tableState.sortConfig}
      setSortConfig={tableState.setSortConfig}
      selectedRows={tableState.selectedRows}
      setSelectedRows={tableState.setSelectedRows}
      getRowId={(row: Customer) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      headerActions={[
        {
          key: 'add-customer',
          label: 'Add Customer',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleNewCustomer,
          variant: 'default' as const
        }
      ]}
      rowActions={(row: Customer) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(row)
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDelete(row.id),
          className: 'text-red-600 hover:text-red-700'
        }
      ]}
      addEditDialog={{
        isOpen: showDialog,
        onOpenChange: setShowDialog,
        title: editingCustomer ? 'Edit Customer' : 'Add New Customer',
        content: renderFormContent()
      }}
    />
    </div>
  );
}