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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSalesOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SalesOrder, InsertSalesOrder, Customer } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";
import { DatePicker } from "@/components/ui/date-picker";

// Form schema
const salesOrderFormSchema = insertSalesOrderSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type SalesOrderFormData = z.infer<typeof salesOrderFormSchema>;

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

interface SalesOrderFormLayoutProps {
  onSave: () => void;
  salesOrderId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function SalesOrderFormLayout({ onSave, salesOrderId, parentId }: SalesOrderFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    customerId: { label: "Klant" },
    subtotal: { label: "Subtotaal" },
    totalAmount: { label: "Totaal" },
  });
  const [currentSalesOrderId, setCurrentSalesOrderId] = useState<string | undefined>(salesOrderId);
  const isEditing = !!currentSalesOrderId;

  // Form setup
  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderFormSchema),
    mode: 'onBlur',
    defaultValues: {
      orderNumber: "",
      customerId: "",
      status: "pending",
      orderDate: toDisplayDate(new Date()),
      expectedDeliveryDate: "",
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      notes: "",
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

  // Load sales order data if editing
  const { data: salesOrder, isLoading: isLoadingSalesOrder } = useQuery<SalesOrder>({
    queryKey: ["/api/sales-orders", salesOrderId],
    enabled: !!salesOrderId,
  });

  // Load customers data
  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  // Update form when sales order data loads and store original values for change tracking
  useEffect(() => {
    setSuppressTracking(true);
    
    if (salesOrder) {
      const formData = {
        orderNumber: salesOrder.orderNumber || "",
        customerId: salesOrder.customerId || "",
        status: salesOrder.status || "pending",
        orderDate: salesOrder.orderDate ? toDisplayDate(salesOrder.orderDate) : toDisplayDate(new Date()),
        expectedDeliveryDate: salesOrder.expectedDeliveryDate ? toDisplayDate(salesOrder.expectedDeliveryDate) : "",
        subtotal: salesOrder.subtotal?.toString() || "0.00",
        taxAmount: salesOrder.taxAmount?.toString() || "0.00",
        totalAmount: salesOrder.totalAmount?.toString() || "0.00",
        notes: salesOrder.notes || "",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new sales order, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
    
    // Re-enable tracking after form is stable
    setTimeout(() => setSuppressTracking(false), 100);
  }, [salesOrder, form]);

  // Throttled change checking
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
  const orderNumberValue = form.watch("orderNumber");
  const customerIdValue = form.watch("customerId");
  const statusValue = form.watch("status");
  const orderDateValue = form.watch("orderDate");
  const expectedDeliveryDateValue = form.watch("expectedDeliveryDate");
  const subtotalValue = form.watch("subtotal");
  const taxAmountValue = form.watch("taxAmount");
  const totalAmountValue = form.watch("totalAmount");
  const notesValue = form.watch("notes");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [orderNumberValue, customerIdValue, statusValue, orderDateValue, expectedDeliveryDateValue, subtotalValue, taxAmountValue, totalAmountValue, notesValue, scheduleChangeCheck]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = salesOrderId ? `edit-sales-order-${salesOrderId}` : 'new-sales-order';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, salesOrderId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: SalesOrderFormData) => {
      const processedData = {
        ...data,
        orderDate: data.orderDate ? toStorageDate(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? toStorageDate(data.expectedDeliveryDate) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("POST", "/api/sales-orders", processedData);
      return response.json();
    },
    onSuccess: (newSalesOrder) => {
      setCurrentSalesOrderId(newSalesOrder.id);
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-sales-order', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Sales order created successfully",
      });
      
      // Dispatch entity-created event if needed
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'sales-order',
          entity: newSalesOrder,
          parentId: parentId
        }
      }));
      
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SalesOrderFormData) => {
      const processedData = {
        ...data,
        orderDate: data.orderDate ? toStorageDate(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? toStorageDate(data.expectedDeliveryDate) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("PUT", `/api/sales-orders/${salesOrderId}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", salesOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      const tabId = salesOrderId ? `edit-sales-order-${salesOrderId}` : 'new-sales-order';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Sales order updated successfully",
      });
          },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sales order",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: SalesOrderFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Tab content
  const tabs: FormTab[] = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <Label htmlFor="orderNumber" className="text-sm font-medium text-right pt-2">Order Number</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <Input
                  id="orderNumber"
                  {...form.register("orderNumber")}
                  placeholder="Auto-generated"
                  disabled={true}
                  data-testid="input-order-number"
                  className={getFieldClassName("orderNumber")}
                />
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Customer *
              </div>
              <div>
                <Select 
                  onValueChange={(value) => form.setValue("customerId", value)}
                  value={form.watch("customerId") || ""}
                >
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.customerId && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.customerId.message}</p>
                )}
              </div>
            </div>

            <Label htmlFor="status" className="text-sm font-medium text-right pt-2">Status</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
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
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Order Date
              </div>
              <div>
                <DatePicker
                  value={form.watch("orderDate") || ""}
                  onChange={(value) => form.setValue("orderDate", value)}
                  placeholder="dd-mm-yyyy"
                  className={getFieldClassName("orderDate")}
                  testId="input-order-date"
                />
              </div>
            </div>

            <Label htmlFor="expectedDeliveryDate" className="text-sm font-medium text-right pt-2">Expected Delivery</Label>
            <div className="w-[30%]">
              <DatePicker
                value={form.watch("expectedDeliveryDate") || ""}
                onChange={(value) => form.setValue("expectedDeliveryDate", value)}
                placeholder="dd-mm-yyyy"
                className={getFieldClassName("expectedDeliveryDate")}
                testId="input-expected-delivery-date"
              />
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
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <Label htmlFor="subtotal" className="text-sm font-medium text-right pt-2">Subtotal *</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
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
                  type="number"
                  step="0.01"
                  {...form.register("taxAmount")}
                  placeholder="0.00"
                  data-testid="input-tax-amount"
                  className={getFieldClassName("taxAmount")}
                />
              </div>
            </div>

            <Label htmlFor="totalAmount" className="text-sm font-medium text-right pt-2">Total Amount *</Label>
            <div className="w-[30%]">
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                {...form.register("totalAmount")}
                placeholder="0.00"
                data-testid="input-total-amount"
                className={getFieldClassName("totalAmount")}
              />
              {form.formState.errors.totalAmount && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.totalAmount.message}</p>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: "notes",
      label: "Notes",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <Label htmlFor="notes" className="text-sm font-medium text-right pt-2">Notes</Label>
            <div>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Additional notes..."
                rows={6}
                data-testid="textarea-notes"
                className={getFieldClassName("notes")}
              />
            </div>
          </div>
        </div>
      )
    }
  ];

  // Info fields for the header
  const headerFields: InfoField[] = salesOrder ? [
    {
      label: "Order Number",
      value: salesOrder.orderNumber || "Auto-generated"
    },
    {
      label: "Customer",
      value: customers.find(c => c.id === salesOrder.customerId)?.name || "Not selected"
    },
    {
      label: "Status",
      value: salesOrder.status || "pending"
    },
    {
      label: "Total Amount",
      value: `€${parseFloat(salesOrder.totalAmount.toString()).toFixed(2)}`
    }
  ] : [];

  const toolbar = useFormToolbar({
    entityType: "sales_order",
    entityId: salesOrderId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  return (
    <BaseFormLayout
      headerFields={headerFields}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      toolbar={toolbar}
      isLoading={isLoadingSalesOrder || customersLoading}
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