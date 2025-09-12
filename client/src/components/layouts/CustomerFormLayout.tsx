import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer, InsertCustomer } from "@shared/schema";
import { z } from "zod";

// Use the same schema as in customers.tsx
const customerFormSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().min(1, "Betalingsvoorwaarden zijn verplicht"),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormLayoutProps {
  onSave: () => void;
  customerId?: string;
}

interface Memo {
  id: string;
  title: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export function CustomerFormLayout({ onSave, customerId }: CustomerFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState({ title: "", content: "", isInternal: false });
  const { toast } = useToast();
  const isEditing = !!customerId;

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

  // Load customer data if editing
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    enabled: !!customerId,
  });

  // Update form when customer data loads
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        mobile: customer.mobile || "",
        taxId: customer.taxId || "",
        bankAccount: customer.bankAccount || "",
        language: customer.language || "nl",
        paymentTerms: customer.paymentTerms?.toString() || "30",
        status: customer.status || "active",
      });
    }
  }, [customer, form]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succes",
        description: "Klant toegevoegd",
      });
      onSave();
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
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("PUT", `/api/customers/${customerId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succes",
        description: "Klant bijgewerkt",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan klant niet bijwerken",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: CustomerFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddMemo = () => {
    if (newMemo.title.trim() && newMemo.content.trim()) {
      const memo: Memo = {
        id: Date.now().toString(),
        title: newMemo.title,
        content: newMemo.content,
        isInternal: newMemo.isInternal,
        createdAt: new Date(),
      };
      setMemos([...memos, memo]);
      setNewMemo({ title: "", content: "", isInternal: false });
    }
  };

  const handleDeleteMemo = (id: string) => {
    setMemos(memos.filter(memo => memo.id !== id));
  };

  // Tab content
  const tabs = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-6">
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

            <div className="grid grid-cols-1 gap-4">

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
            </div>
          </div>
        </div>
      )
    },
    {
      id: "financial",
      label: "Financial",
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Financiële informatie</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bankrekeningnummer</Label>
                <Input
                  id="bankAccount"
                  {...form.register("bankAccount")}
                  placeholder="NL91ABNA0417164300"
                  data-testid="input-customer-bankAccount"
                />
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
            </div>

            <div className="grid grid-cols-1 gap-4">
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
        </div>
      )
    },
    {
      id: "contact",
      label: "Contact",
      content: (
        <div className="space-y-6">
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
            </div>
          </div>
        </div>
      )
    },
    {
      id: "memo",
      label: "Memo",
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600">Notities</h3>
            
            {/* Add new memo */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memo-title">Titel</Label>
                <Input
                  id="memo-title"
                  value={newMemo.title}
                  onChange={(e) => setNewMemo({ ...newMemo, title: e.target.value })}
                  placeholder="Notitie titel"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="memo-content">Inhoud</Label>
                <Textarea
                  id="memo-content"
                  value={newMemo.content}
                  onChange={(e) => setNewMemo({ ...newMemo, content: e.target.value })}
                  placeholder="Notitie inhoud..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="memo-internal"
                  checked={newMemo.isInternal}
                  onChange={(e) => setNewMemo({ ...newMemo, isInternal: e.target.checked })}
                />
                <Label htmlFor="memo-internal">Interne notitie</Label>
              </div>
              
              <Button onClick={handleAddMemo} className="bg-orange-600 hover:bg-orange-700">
                Notitie toevoegen
              </Button>
            </div>

            {/* Display existing memos */}
            <div className="space-y-3">
              {memos.map((memo) => (
                <div key={memo.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{memo.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMemo(memo.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Verwijderen
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{memo.content}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{memo.isInternal ? 'Interne notitie' : 'Externe notitie'}</span>
                    <span>{memo.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              
              {memos.length === 0 && (
                <p className="text-gray-500 text-center py-4">Geen notities toegevoegd</p>
              )}
            </div>
          </div>
        </div>
      )
    }
  ];


  // Create header fields for BaseFormLayout
  const headerFields: InfoField[] = [
    {
      label: "Customer ID",
      value: customerId ? customer?.customerNumber || customerId.slice(0, 8) : 'New customer'
    },
    {
      label: "Status", 
      value: isEditing ? "Edit" : "Draft"
    }
  ];

  // Create action buttons for BaseFormLayout
  const actionButtons: ActionButton[] = [
    {
      key: 'cancel',
      label: 'Cancel',
      icon: <ArrowLeft size={14} />,
      onClick: onSave,
      variant: 'outline',
      testId: 'button-cancel'
    },
    {
      key: 'save',
      label: isEditing ? 'Update Customer' : 'Save Customer',
      icon: <Save size={14} />,
      onClick: form.handleSubmit(onSubmit),
      variant: 'default',
      disabled: createMutation.isPending || updateMutation.isPending,
      loading: createMutation.isPending || updateMutation.isPending,
      testId: 'button-save'
    }
  ];

  return (
    <BaseFormLayout
      headerFields={headerFields}
      actionButtons={actionButtons}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isLoading={isLoadingCustomer}
    />
  );
}