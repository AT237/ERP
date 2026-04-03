import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { LayoutForm2, createFieldRow, createSectionHeaderRow } from './LayoutForm2';
import { DataTableLayout, ColumnConfig, type DirectInputConfig } from './DataTableLayout';
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { useDataTable } from '@/hooks/useDataTable';
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { SelectItem } from "@/components/ui/select";
import { QuickAddSupplier } from "@/components/quick-add-forms";
import { X } from "lucide-react";
import type { PurchaseOrder, InsertPurchaseOrder, PurchaseOrderItem, Supplier, InventoryItem, UnitOfMeasure } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";

const formSchema = insertPurchaseOrderSchema.extend({
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PurchaseOrderFormLayoutProps {
  onSave: () => void;
  purchaseOrderId?: string;
  parentId?: string;
}

export function PurchaseOrderFormLayout({ onSave, purchaseOrderId, parentId }: PurchaseOrderFormLayoutProps) {
  const [activeSection, setActiveSection] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<string[]>([]);
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [currentPurchaseOrderId, setCurrentPurchaseOrderId] = useState<string | undefined>(purchaseOrderId);
  const [deleteItemTarget, setDeleteItemTarget] = useState<PurchaseOrderItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!currentPurchaseOrderId;

  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    supplierId: { label: "Leverancier" },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: "",
      supplierId: "",
      status: "concept",
      orderDate: toDisplayDate(new Date()),
      expectedDate: undefined,
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      notes: "",
    },
  });

  const { data: purchaseOrder, isLoading: isLoadingPurchaseOrder } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", purchaseOrderId],
    enabled: !!purchaseOrderId,
  });

  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: inventoryItems } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: units } = useQuery<UnitOfMeasure[]>({ queryKey: ["/api/units-of-measure"] });

  const { data: poItems = [] } = useQuery<PurchaseOrderItem[]>({
    queryKey: ["/api/purchase-orders", currentPurchaseOrderId, "items"],
    queryFn: async () => {
      if (!currentPurchaseOrderId) return [];
      const res = await fetch(`/api/purchase-orders/${currentPurchaseOrderId}/items`);
      return res.json();
    },
    enabled: !!currentPurchaseOrderId,
  });

  const poItemsList = useMemo(() => {
    return [...poItems].sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [poItems]);

  useEffect(() => {
    if (purchaseOrder) {
      const formData = {
        orderNumber: purchaseOrder.orderNumber,
        supplierId: purchaseOrder.supplierId,
        status: purchaseOrder.status || "concept",
        orderDate: purchaseOrder.orderDate ? toDisplayDate(purchaseOrder.orderDate) : toDisplayDate(new Date()),
        expectedDate: purchaseOrder.expectedDate ? toDisplayDate(purchaseOrder.expectedDate) : "",
        subtotal: purchaseOrder.subtotal || "0",
        taxAmount: purchaseOrder.taxAmount || "0",
        totalAmount: purchaseOrder.totalAmount || "0",
        notes: purchaseOrder.notes || "",
      };
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    }
  }, [purchaseOrder, form]);

  useEffect(() => {
    const subscription = form.watch(() => setHasUnsavedChanges(true));
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const tabId = purchaseOrderId ? `edit-purchase-order-${purchaseOrderId}` : 'new-purchase-order';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', { detail: { tabId, hasUnsavedChanges } }));
  }, [hasUnsavedChanges, purchaseOrderId]);

  const recalcTotals = useCallback(() => {
    const subtotal = poItemsList.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    form.setValue('subtotal', subtotal.toFixed(2));
    const tax = Number(form.getValues('taxAmount') || 0);
    form.setValue('totalAmount', (subtotal + tax).toFixed(2));
  }, [poItemsList, form]);

  useEffect(() => { recalcTotals(); }, [recalcTotals]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertPurchaseOrder) => {
      const response = await apiRequest("POST", "/api/purchase-orders", data);
      return response.json();
    },
    onSuccess: (newPO) => {
      setCurrentPurchaseOrderId(newPO.id);
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', { detail: { tabId: 'new-purchase-order', hasUnsavedChanges: false } }));
      toast({ title: "Success", description: "Purchase order created" });
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: { entityType: 'purchase-order', entity: newPO, parentId }
      }));
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create purchase order", variant: "destructive" });
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
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', { detail: { tabId, hasUnsavedChanges: false } }));
      toast({ title: "Success", description: "Purchase order updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update purchase order", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest("POST", `/api/purchase-orders/${currentPurchaseOrderId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", currentPurchaseOrderId, "items"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/purchase-order-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", currentPurchaseOrderId, "items"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchase-order-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", currentPurchaseOrderId, "items"] });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: any = {
      ...data,
      orderDate: data.orderDate ? toStorageDate(data.orderDate) : new Date(),
      expectedDate: data.expectedDate ? toStorageDate(data.expectedDate) : undefined,
    };
    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDeleteItem = (item: PurchaseOrderItem) => setDeleteItemTarget(item);
  const confirmDeleteItem = () => {
    if (deleteItemTarget) {
      deleteItemMutation.mutate(deleteItemTarget.id);
      setDeleteItemTarget(null);
    }
  };

  const handleBulkDeleteItems = () => {
    itemTableState.selectedRows.forEach(id => deleteItemMutation.mutate(id));
    itemTableState.setSelectedRows([]);
    setIsBulkDeleteOpen(false);
  };

  const handleDuplicateItem = async (item: PurchaseOrderItem) => {
    const { id, ...rest } = item;
    await addItemMutation.mutateAsync(rest);
  };

  const itemColumns: ColumnConfig[] = [
    { key: 'position', label: '#', visible: true, width: 50, filterable: false, sortable: true },
    { key: 'lineType', label: 'Type', visible: true, width: 100, filterable: true, sortable: true },
    { key: 'description', label: 'Description', visible: true, width: 300, filterable: true, sortable: true },
    { key: 'quantity', label: 'Qty', visible: true, width: 80, filterable: false, sortable: true },
    { key: 'unit', label: 'Unit', visible: true, width: 80, filterable: false, sortable: false },
    { key: 'unitPrice', label: 'Unit Price', visible: true, width: 100, filterable: false, sortable: true,
      renderCell: (value: string) => `€ ${Number(value || 0).toFixed(2)}`
    },
    { key: 'discountPercent', label: 'Disc %', visible: true, width: 80, filterable: false, sortable: false },
    { key: 'lineTotal', label: 'Total', visible: true, width: 100, filterable: false, sortable: true,
      renderCell: (value: string) => `€ ${Number(value || 0).toFixed(2)}`
    },
    { key: 'costPrice', label: 'Cost Price', visible: false, width: 100, filterable: false, sortable: false },
    { key: 'hsCode', label: 'HS Code', visible: false, width: 100, filterable: false, sortable: false },
  ];

  const itemTableState = useDataTable({
    defaultColumns: itemColumns,
    defaultSort: { column: 'position', direction: 'asc' },
    tableKey: 'purchase-order-items'
  });

  const inventoryOptions = useMemo(() => {
    return (inventoryItems || []).map(item => ({
      value: item.id,
      label: `${item.sku || ''} - ${item.name}`,
      item
    }));
  }, [inventoryItems]);

  const unitOptions = useMemo(() => {
    return (units || []).map(u => ({ value: u.code || u.name, label: u.name }));
  }, [units]);

  const poDirectInput = useMemo(() => ({
    enabled: true,
    fields: [
      {
        key: 'itemId',
        type: 'searchable-select' as const,
        placeholder: 'Search item...',
        width: 250,
        options: inventoryOptions,
        onChange: (value: string, setValues: (vals: Record<string, any>) => void) => {
          const item = inventoryItems?.find(i => i.id === value);
          if (item) {
            const qty = 1;
            const price = Number(item.costPrice || item.sellingPrice || 0);
            setValues({
              itemId: value,
              description: item.name,
              quantity: String(qty),
              unit: item.unit || '',
              unitPrice: price.toFixed(2),
              costPrice: item.costPrice ? String(item.costPrice) : '',
              discountPercent: '0',
              lineTotal: price.toFixed(2),
              lineType: 'standard',
              hsCode: item.hsCode || '',
              countryOfOrigin: item.countryOfOrigin || '',
            });
          }
        }
      },
      { key: 'description', type: 'text' as const, placeholder: 'Description', width: 250, required: true },
      { key: 'quantity', type: 'number' as const, placeholder: 'Qty', width: 80,
        onChange: (value: string, setValues: (vals: Record<string, any>) => void, currentValues: Record<string, any>) => {
          const qty = Number(value) || 0;
          const price = Number(currentValues.unitPrice) || 0;
          const disc = Number(currentValues.discountPercent) || 0;
          const total = qty * price * (1 - disc / 100);
          setValues({ quantity: value, lineTotal: total.toFixed(2) });
        }
      },
      { key: 'unit', type: 'select' as const, placeholder: 'Unit', width: 80, options: unitOptions },
      { key: 'unitPrice', type: 'number' as const, placeholder: 'Price', width: 100,
        onChange: (value: string, setValues: (vals: Record<string, any>) => void, currentValues: Record<string, any>) => {
          const qty = Number(currentValues.quantity) || 0;
          const price = Number(value) || 0;
          const disc = Number(currentValues.discountPercent) || 0;
          const total = qty * price * (1 - disc / 100);
          setValues({ unitPrice: value, lineTotal: total.toFixed(2) });
        }
      },
      { key: 'discountPercent', type: 'number' as const, placeholder: '%', width: 60,
        onChange: (value: string, setValues: (vals: Record<string, any>) => void, currentValues: Record<string, any>) => {
          const qty = Number(currentValues.quantity) || 0;
          const price = Number(currentValues.unitPrice) || 0;
          const disc = Number(value) || 0;
          const total = qty * price * (1 - disc / 100);
          setValues({ discountPercent: value, lineTotal: total.toFixed(2) });
        }
      },
      { key: 'lineTotal', type: 'number' as const, placeholder: 'Total', width: 100, readOnly: true },
    ],
    defaultValues: {
      itemId: '',
      description: '',
      quantity: '1',
      unit: '',
      unitPrice: '0.00',
      discountPercent: '0',
      lineTotal: '0.00',
      lineType: 'standard',
      costPrice: '',
      hsCode: '',
      countryOfOrigin: '',
      position: String((poItemsList.length + 1) * 10),
      positionNo: '',
    },
    onAdd: async (values: Record<string, any>) => {
      if (!currentPurchaseOrderId) return;
      await addItemMutation.mutateAsync({
        purchaseOrderId: currentPurchaseOrderId,
        ...values,
        position: Number(values.position) || (poItemsList.length + 1) * 10,
      });
    },
    onUpdate: async (id: string, values: Record<string, any>) => {
      await updateItemMutation.mutateAsync({ id, data: values });
    },
  }), [inventoryOptions, unitOptions, currentPurchaseOrderId, poItemsList.length, addItemMutation, updateItemMutation, inventoryItems]);

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
    <div>
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
                placeholder: 'Auto-generated',
                register: form.register('orderNumber'),
                disabled: true,
                testId: 'input-order-number'
              }),
              createFieldRow<FormData>({
                key: 'supplierId',
                label: 'Supplier',
                type: 'custom',
                validation: { isRequired: true, error: form.formState.errors.supplierId?.message },
                customComponent: (
                  <SelectWithAdd
                    value={form.watch("supplierId")}
                    onValueChange={(value) => form.setValue("supplierId", value)}
                    placeholder="Select supplier"
                    addFormTitle="Add New Supplier"
                    testId="select-supplier"
                    addFormContent={
                      <QuickAddSupplier onSuccess={(supplierId) => form.setValue("supplierId", supplierId)} />
                    }
                  >
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectWithAdd>
                )
              }),
              createFieldRow<FormData>({
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { value: 'concept', label: 'Concept' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'ordered', label: 'Ordered' },
                  { value: 'received', label: 'Received' },
                  { value: 'completed', label: 'Completed' },
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
                disabled: true,
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
                disabled: true,
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
          },
          {
            id: 'items',
            label: 'Regels',
            rows: []
          }
        ]}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={onSubmit}
        toolbar={toolbar}
        changeTracking={{
          enabled: true,
          suppressTracking: false,
          modifiedFieldClassName: 'ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950',
          onChangesDetected: (hasChanges, modified) => {
            setHasUnsavedChanges(hasChanges);
            setModifiedFields(modified);
          }
        }}
        originalValues={originalValues}
        validationErrorDialog={
          <ValidationErrorDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            errors={validErrors}
            onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
          />
        }
      />
      {isEditing && activeSection === "items" && (
        <div className="px-6 py-4 pb-10 bg-white ml-[15px] mr-[15px]">
          <DataTableLayout
            data={poItemsList}
            isLoading={false}
            columns={itemTableState.columns}
            setColumns={itemTableState.setColumns}
            searchTerm={itemTableState.searchTerm}
            setSearchTerm={itemTableState.setSearchTerm}
            filters={itemTableState.filters}
            setFilters={itemTableState.setFilters}
            onAddFilter={itemTableState.addFilter}
            onUpdateFilter={itemTableState.updateFilter}
            onRemoveFilter={itemTableState.removeFilter}
            sortConfig={itemTableState.sortConfig}
            onSort={itemTableState.handleSort}
            selectedRows={itemTableState.selectedRows}
            setSelectedRows={itemTableState.setSelectedRows}
            onToggleRowSelection={itemTableState.toggleRowSelection}
            onToggleAllRows={() => {
              const allIds = poItemsList.map(item => item.id);
              itemTableState.toggleAllRows(allIds);
            }}
            getRowId={(item: PurchaseOrderItem) => item.id}
            entityName="Regel"
            entityNamePlural="Regels"
            applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
            applySorting={itemTableState.applySorting}
            compact={true}
            deleteConfirmDialog={{
              isOpen: isBulkDeleteOpen,
              onOpenChange: setIsBulkDeleteOpen,
              onConfirm: handleBulkDeleteItems,
              itemCount: itemTableState.selectedRows.length,
            }}
            onDuplicate={handleDuplicateItem}
            directInput={poDirectInput}
            rowActions={(item: PurchaseOrderItem) => [
              {
                key: 'delete',
                label: 'Delete',
                icon: <X className="h-4 w-4" />,
                onClick: () => handleDeleteItem(item),
                variant: 'destructive'
              }
            ]}
          />
        </div>
      )}
      <SafeDeleteDialog
        open={!!deleteItemTarget}
        onOpenChange={(open) => { if (!open) setDeleteItemTarget(null); }}
        onConfirm={confirmDeleteItem}
        entityName={deleteItemTarget?.description || 'dit regelitem'}
        entityId={deleteItemTarget?.id || ''}
        isPending={deleteItemMutation.isPending}
      />
    </div>
  );
}
