import { useState, useEffect, useMemo, useCallback } from "react";
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
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer } from "@/components/quick-add-forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Invoice, InsertInvoice, Customer } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const formSchema = insertInvoiceSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  paidAmount: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

interface InvoiceFormLayoutProps {
  onSave: () => void;
  invoiceId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function InvoiceFormLayout({ onSave, invoiceId, parentId }: InvoiceFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [suppressTracking, setSuppressTracking] = useState(true);
  
  const { toast } = useToast();
  const isEditing = !!invoiceId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      invoiceNumber: "",
      customerId: "",
      status: "pending",
      dueDate: undefined,
      subtotal: "",
      taxAmount: "0",
      totalAmount: "",
      paidAmount: "0",
      notes: "",
    },
  });

  // Change tracking helpers
  const compareValues = (original: any, current: any) => {
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
  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    if (suppressTracking) return baseClassName;
    
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  // Load invoice data if editing
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  // Load customers for dropdown
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Update form when invoice data loads and store original values for change tracking
  useEffect(() => {
    setSuppressTracking(true);
    
    if (invoice) {
      const formData = {
        invoiceNumber: invoice.invoiceNumber || "",
        customerId: invoice.customerId || "",
        status: invoice.status || "pending",
        dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : "",
        subtotal: invoice.subtotal || "",
        taxAmount: invoice.taxAmount || "0",
        totalAmount: invoice.totalAmount || "",
        paidAmount: invoice.paidAmount || "0",
        notes: invoice.notes || "",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new invoice, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
    
    // Re-enable tracking after form is stable
    setTimeout(() => setSuppressTracking(false), 100);
  }, [invoice, form]);

  // Throttled change checking - only when tracking is enabled
  const [checkScheduled, setCheckScheduled] = useState(false);
  const scheduleChangeCheck = useCallback(() => {
    if (suppressTracking || checkScheduled) return;
    
    setCheckScheduled(true);
    setTimeout(() => {
      if (!suppressTracking && Object.keys(originalValues).length > 0) {
        checkForChanges();
      }
      setCheckScheduled(false);
    }, 200);
  }, [suppressTracking, checkScheduled, originalValues, checkForChanges]);

  // Watch for changes in form values and update change tracking (throttled)
  const invoiceNumberValue = form.watch("invoiceNumber");
  const customerIdValue = form.watch("customerId");
  const statusValue = form.watch("status");
  const dueDateValue = form.watch("dueDate");
  const subtotalValue = form.watch("subtotal");
  const taxAmountValue = form.watch("taxAmount");
  const totalAmountValue = form.watch("totalAmount");
  const paidAmountValue = form.watch("paidAmount");
  const notesValue = form.watch("notes");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [invoiceNumberValue, customerIdValue, statusValue, dueDateValue, subtotalValue, taxAmountValue, totalAmountValue, paidAmountValue, notesValue, scheduleChangeCheck]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = invoiceId ? `edit-invoice-${invoiceId}` : 'new-invoice';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, invoiceId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      // Dispatch entity-created event
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'invoice',
          entity: newInvoice,
          parentId: parentId
        }
      }));
      
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertInvoice>) => {
      const response = await apiRequest("PUT", `/api/invoices/${invoiceId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: FormData) => {
    const submitData: InsertInvoice = {
      ...data,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount || "0",
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount || "0",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Tab content
  const tabs: FormTab[] = [
    {
      id: "general",
      label: "Invoice Details",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <Label htmlFor="invoiceNumber" className="text-sm font-medium text-right pt-2">Invoice Number *</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <Input
                  id="invoiceNumber"
                  {...form.register("invoiceNumber")}
                  placeholder="INV-2024-0001"
                  data-testid="input-invoice-number"
                  className={getFieldClassName("invoiceNumber")}
                />
                {form.formState.errors.invoiceNumber && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.invoiceNumber.message}</p>
                )}
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Status
              </div>
              <div>
                <Select 
                  onValueChange={(value) => form.setValue("status", value)}
                  value={form.watch("status") || "pending"}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label htmlFor="customerId" className="text-sm font-medium text-right pt-2">Customer *</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <SelectWithAdd
                  value={form.watch("customerId")}
                  onValueChange={(value) => form.setValue("customerId", value)}
                  placeholder="Select customer"
                  addFormTitle="Add New Customer"
                  testId="select-customer"
                  addFormContent={
                    <QuickAddCustomer 
                      onSuccess={(customerId) => {
                        form.setValue("customerId", customerId);
                      }}
                    />
                  }
                >
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectWithAdd>
                {form.formState.errors.customerId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.customerId.message}</p>
                )}
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Due Date
              </div>
              <div>
                <Input
                  id="dueDate"
                  type="date"
                  {...form.register("dueDate")}
                  data-testid="input-due-date"
                  className={getFieldClassName("dueDate")}
                />
              </div>
            </div>

            <Label htmlFor="subtotal" className="text-sm font-medium text-right pt-2">Subtotal *</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <Input
                  id="subtotal"
                  {...form.register("subtotal")}
                  placeholder="0.00"
                  data-testid="input-subtotal"
                  className={getFieldClassName("subtotal")}
                />
                {form.formState.errors.subtotal && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.subtotal.message}</p>
                )}
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Tax Amount
              </div>
              <div>
                <Input
                  id="taxAmount"
                  {...form.register("taxAmount")}
                  placeholder="0.00"
                  data-testid="input-tax-amount"
                  className={getFieldClassName("taxAmount")}
                />
              </div>
            </div>

            <Label htmlFor="totalAmount" className="text-sm font-medium text-right pt-2">Total Amount *</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <Input
                  id="totalAmount"
                  {...form.register("totalAmount")}
                  placeholder="0.00"
                  data-testid="input-total-amount"
                  className={getFieldClassName("totalAmount")}
                />
                {form.formState.errors.totalAmount && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.totalAmount.message}</p>
                )}
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Paid Amount
              </div>
              <div>
                <Input
                  id="paidAmount"
                  {...form.register("paidAmount")}
                  placeholder="0.00"
                  data-testid="input-paid-amount"
                  className={getFieldClassName("paidAmount")}
                />
              </div>
            </div>

            <Label htmlFor="notes" className="text-sm font-medium text-right pt-2">Notes</Label>
            <div className="w-[60%]">
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Additional notes..."
                rows={3}
                data-testid="textarea-notes"
                className={getFieldClassName("notes")}
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  // Action buttons
  const actionButtons: ActionButton[] = [
    {
      key: "cancel",
      label: "Cancel",
      icon: <ArrowLeft size={14} />,
      onClick: onSave,
      variant: "outline",
      testId: "button-cancel"
    },
    {
      key: "save",
      label: isEditing ? "Update Invoice" : "Create Invoice",
      icon: <Save size={14} />,
      onClick: form.handleSubmit(onSubmit),
      variant: "default",
      testId: "button-save",
      disabled: createMutation.isPending || updateMutation.isPending
    }
  ];

  // Info fields for header
  const headerFields: InfoField[] = [
    {
      label: "Invoice",
      value: form.watch("invoiceNumber") || "New Invoice"
    }
  ];

  if (isLoadingInvoice) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  return (
    <BaseFormLayout
      headerFields={headerFields}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actionButtons={actionButtons}
      isLoading={isLoadingInvoice}
    />
  );
}