import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { LayoutForm2, createFieldRow, createSectionHeaderRow } from './LayoutForm2';
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { SelectItem } from "@/components/ui/select";
import { QuickAddSupplier } from "@/components/quick-add-forms";
import type { PurchaseOrder, InsertPurchaseOrder, Supplier } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";

const formSchema = insertPurchaseOrderSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PurchaseOrderFormLayoutProps {
  onSave: () => void;
  purchaseOrderId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function PurchaseOrderFormLayout({ onSave, purchaseOrderId, parentId }: PurchaseOrderFormLayoutProps) {
  const [activeSection, setActiveSection] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    supplierId: { label: "Leverancier" },
    subtotal: { label: "Subtotaal" },
    totalAmount: { label: "Totaal" },
  });
  const [currentPurchaseOrderId, setCurrentPurchaseOrderId] = useState<string | undefined>(purchaseOrderId);
  const isEditing = !!currentPurchaseOrderId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: "",
      supplierId: "",
      status: "pending",
      orderDate: toDisplayDate(new Date()),
      expectedDate: undefined,
      subtotal: "",
      taxAmount: "0",
      totalAmount: "",
      notes: "",
    },
  });

  // Load purchase order data if editing
  const { data: purchaseOrder, isLoading: isLoadingPurchaseOrder } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", purchaseOrderId],
    enabled: !!purchaseOrderId,
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Update form when purchase order data loads
  useEffect(() => {
    if (purchaseOrder) {
      const formData = {
        orderNumber: purchaseOrder.orderNumber,
        supplierId: purchaseOrder.supplierId,
        status: purchaseOrder.status || "pending",
        orderDate: purchaseOrder.orderDate ? toDisplayDate(purchaseOrder.orderDate) : toDisplayDate(new Date()),
        expectedDate: purchaseOrder.expectedDate ? toDisplayDate(purchaseOrder.expectedDate) : "",
        subtotal: purchaseOrder.subtotal,
        taxAmount: purchaseOrder.taxAmount || "0",
        totalAmount: purchaseOrder.totalAmount,
        notes: purchaseOrder.notes || "",
      };
      
      form.reset(formData);
      setHasUnsavedChanges(false);
    }
  }, [purchaseOrder, form]);

  // Track form changes for unsaved changes indicator
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = purchaseOrderId ? `edit-purchase-order-${purchaseOrderId}` : 'new-purchase-order';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, purchaseOrderId]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertPurchaseOrder) => {
      const response = await apiRequest("POST", "/api/purchase-orders", data);
      return response.json();
    },
    onSuccess: (newPurchaseOrder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-purchase-order', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
      
      // Dispatch scoped entity-created event if needed
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'purchase-order',
          entity: newPurchaseOrder,
          parentId: parentId
        }
      }));
      
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertPurchaseOrder>) => {
      const response = await apiRequest("PUT", `/api/purchase-orders/${purchaseOrderId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", purchaseOrderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      const tabId = purchaseOrderId ? `edit-purchase-order-${purchaseOrderId}` : 'new-purchase-order';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertPurchaseOrder = {
      ...data,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount || "0",
      totalAmount: data.totalAmount,
      orderDate: data.orderDate ? toStorageDate(data.orderDate) : new Date(),
      expectedDate: data.expectedDate ? toStorageDate(data.expectedDate) : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const toolbar = useFormToolbar({
    entityType: "purchase_order",
    entityId: purchaseOrderId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  if (isLoadingPurchaseOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading purchase order...</div>
      </div>
    );
  }

  return (
    <LayoutForm2
      documentType="purchase_order"
      entityId={purchaseOrderId}
      sections={[
        {
          id: 'general',
          label: 'Purchase Order Details',
          rows: [
            createSectionHeaderRow<FormData>('Basic Information'),
            createFieldRow<FormData>({
              key: 'orderNumber',
              label: 'Order Number',
              type: 'text',
              placeholder: 'PO-2024-0001',
              register: form.register('orderNumber'),
              validation: { 
                isRequired: true,
                error: form.formState.errors.orderNumber?.message 
              },
              testId: 'input-order-number'
            }),
            createFieldRow<FormData>({
              key: 'supplierId',
              label: 'Supplier',
              type: 'custom',
              validation: { 
                isRequired: true,
                error: form.formState.errors.supplierId?.message 
              },
              customComponent: (
                <SelectWithAdd
                  value={form.watch("supplierId")}
                  onValueChange={(value) => form.setValue("supplierId", value)}
                  placeholder="Select supplier"
                  addFormTitle="Add New Supplier"
                  testId="select-supplier"
                  addFormContent={
                    <QuickAddSupplier 
                      onSuccess={(supplierId) => {
                        form.setValue("supplierId", supplierId);
                      }}
                    />
                  }
                >
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectWithAdd>
              )
            }),
            createFieldRow<FormData>({
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'received', label: 'Received' },
                { value: 'cancelled', label: 'Cancelled' }
              ],
              setValue: (value) => form.setValue('status', value),
              watch: () => form.watch('status'),
              testId: 'select-status'
            }),
            createFieldRow<FormData>({
              key: 'orderDate',
              label: 'Order Date',
              type: 'date',
              placeholder: 'dd-mm-yyyy',
              setValue: (value) => form.setValue('orderDate', value),
              watch: () => form.watch('orderDate'),
              testId: 'input-order-date'
            }),
            createFieldRow<FormData>({
              key: 'expectedDate',
              label: 'Expected Date',
              type: 'date',
              placeholder: 'dd-mm-yyyy',
              setValue: (value) => form.setValue('expectedDate', value),
              watch: () => form.watch('expectedDate'),
              testId: 'input-expected-date'
            }),
            
            createSectionHeaderRow<FormData>('Financial Information'),
            createFieldRow<FormData>({
              key: 'subtotal',
              label: 'Subtotal',
              type: 'text',
              placeholder: '0.00',
              register: form.register('subtotal'),
              validation: { 
                isRequired: true,
                error: form.formState.errors.subtotal?.message 
              },
              testId: 'input-subtotal'
            }),
            createFieldRow<FormData>({
              key: 'taxAmount',
              label: 'Tax Amount',
              type: 'text',
              placeholder: '0.00',
              register: form.register('taxAmount'),
              testId: 'input-tax-amount'
            }),
            createFieldRow<FormData>({
              key: 'totalAmount',
              label: 'Total Amount',
              type: 'text',
              placeholder: '0.00',
              register: form.register('totalAmount'),
              validation: { 
                isRequired: true,
                error: form.formState.errors.totalAmount?.message 
              },
              testId: 'input-total-amount'
            }),
            createFieldRow<FormData>({
              key: 'notes',
              label: 'Notes',
              type: 'textarea',
              rows: 3,
              placeholder: 'Additional notes...',
              register: form.register('notes'),
              testId: 'textarea-notes'
            })
          ]
        }
      ]}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      toolbar={toolbar}
      validationErrorDialog={
        <ValidationErrorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          errors={validErrors}
          onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
        />
      }
    />
  );
}