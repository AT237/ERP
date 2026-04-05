import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationRequestSchema } from "@shared/schema";
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
import { ProjectSelect } from "@/components/ui/project-select";
import { Input } from "@/components/ui/input";
import { RefreshCw, X } from "lucide-react";
import type { QuotationRequest, InsertQuotationRequest, QuotationRequestItem, Supplier, InventoryItem, UnitOfMeasure } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";

const formSchema = insertQuotationRequestSchema.extend({
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  requestDate: z.string().optional(),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuotationRequestFormLayoutProps {
  onSave: () => void;
  quotationRequestId?: string;
  parentId?: string;
}

export function QuotationRequestFormLayout({ onSave, quotationRequestId, parentId }: QuotationRequestFormLayoutProps) {
  const [activeSection, setActiveSection] = useState('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [modifiedFields, setModifiedFields] = useState<string[]>([]);
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [currentId, setCurrentId] = useState<string | undefined>(quotationRequestId);
  const [deleteItemTarget, setDeleteItemTarget] = useState<QuotationRequestItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!currentId;

  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    supplierId: { label: "Leverancier" },
    title: { label: "Titel" },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestNumber: "",
      supplierId: "",
      projectId: undefined,
      status: "concept",
      requestDate: toDisplayDate(new Date()),
      dueDate: "",
      title: "",
      description: "",
      requirements: "",
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      priority: "medium",
      notes: "",
    },
  });

  const { data: quotationRequest, isLoading: isLoadingQR } = useQuery<QuotationRequest>({
    queryKey: ["/api/quotation-requests", quotationRequestId],
    enabled: !!quotationRequestId,
  });

  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: inventoryItems } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: units } = useQuery<UnitOfMeasure[]>({ queryKey: ["/api/units-of-measure"] });

  const { data: nextNumberData, refetch: refetchNextNumber } = useQuery<{ number: string }>({
    queryKey: ["/api/quotation-requests/next-number"],
    enabled: !isEditing,
  });

  useEffect(() => {
    if (!isEditing && nextNumberData?.number && !form.getValues("requestNumber")) {
      form.setValue("requestNumber", nextNumberData.number);
    }
  }, [nextNumberData, isEditing, form]);

  const { data: qrItems = [], refetch: refetchItems } = useQuery<QuotationRequestItem[]>({
    queryKey: ["/api/quotation-requests", currentId, "items"],
    queryFn: async () => {
      if (!currentId) return [];
      const res = await fetch(`/api/quotation-requests/${currentId}/items`);
      return res.json();
    },
    enabled: !!currentId,
  });

  const qrItemsList = useMemo(() => {
    return [...qrItems].sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [qrItems]);

  useEffect(() => {
    if (quotationRequest) {
      const formData = {
        requestNumber: quotationRequest.requestNumber,
        supplierId: quotationRequest.supplierId,
        projectId: quotationRequest.projectId || undefined,
        status: quotationRequest.status || "concept",
        requestDate: quotationRequest.requestDate ? toDisplayDate(quotationRequest.requestDate) : toDisplayDate(new Date()),
        dueDate: quotationRequest.dueDate ? toDisplayDate(quotationRequest.dueDate) : "",
        title: quotationRequest.title || "",
        description: quotationRequest.description || "",
        requirements: quotationRequest.requirements || "",
        subtotal: quotationRequest.subtotal || "0",
        taxAmount: quotationRequest.taxAmount || "0",
        totalAmount: quotationRequest.totalAmount || "0",
        priority: quotationRequest.priority || "medium",
        notes: quotationRequest.notes || "",
      };
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    }
  }, [quotationRequest, form]);

  useEffect(() => {
    const subscription = form.watch(() => setHasUnsavedChanges(true));
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const tabId = quotationRequestId ? `edit-quotation-request-${quotationRequestId}` : 'new-quotation-request';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, quotationRequestId]);

  const recalcTotals = useCallback(() => {
    const subtotal = qrItemsList.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    form.setValue('subtotal', subtotal.toFixed(2));
    form.setValue('totalAmount', subtotal.toFixed(2));
  }, [qrItemsList, form]);

  useEffect(() => { recalcTotals(); }, [recalcTotals]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertQuotationRequest) => {
      const response = await apiRequest("POST", "/api/quotation-requests", data);
      return response.json();
    },
    onSuccess: (newQR) => {
      setCurrentId(newQR.id);
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-quotation-request', hasUnsavedChanges: false }
      }));
      toast({ title: "Success", description: "Quotation request created" });
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: { entityType: 'quotation-request', entity: newQR, parentId }
      }));
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create quotation request", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertQuotationRequest>) => {
      const response = await apiRequest("PUT", `/api/quotation-requests/${quotationRequestId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", quotationRequestId] });
      setHasUnsavedChanges(false);
      const tabId = quotationRequestId ? `edit-quotation-request-${quotationRequestId}` : 'new-quotation-request';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', { detail: { tabId, hasUnsavedChanges: false } }));
      toast({ title: "Success", description: "Quotation request updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quotation request", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      const response = await apiRequest("POST", `/api/quotation-requests/${currentId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", currentId, "items"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/quotation-request-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", currentId, "items"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotation-request-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", currentId, "items"] });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: any = {
      ...data,
      requestDate: data.requestDate ? toStorageDate(data.requestDate) : new Date(),
      dueDate: data.dueDate ? toStorageDate(data.dueDate) : undefined,
    };
    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDeleteItem = (item: QuotationRequestItem) => setDeleteItemTarget(item);
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

  const handleDuplicateItem = async (item: QuotationRequestItem) => {
    const { id, ...rest } = item;
    await addItemMutation.mutateAsync(rest);
  };

  const handleConvertToPO = async () => {
    if (!currentId || !quotationRequest) return;
    try {
      const poData = {
        supplierId: quotationRequest.supplierId,
        status: "concept",
        orderDate: new Date(),
        subtotal: quotationRequest.subtotal || "0",
        taxAmount: quotationRequest.taxAmount || "0",
        totalAmount: quotationRequest.totalAmount || "0",
        notes: `Converted from ${quotationRequest.requestNumber}. ${quotationRequest.notes || ''}`,
      };
      const poRes = await apiRequest("POST", "/api/purchase-orders", poData);
      const newPO = await poRes.json();

      for (const item of qrItemsList) {
        await apiRequest("POST", `/api/purchase-orders/${newPO.id}/items`, {
          itemId: item.itemId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          lineType: item.lineType,
          position: item.position,
          positionNo: item.positionNo,
          discountPercent: item.discountPercent,
          costPrice: item.costPrice,
          hsCode: item.hsCode,
          countryOfOrigin: item.countryOfOrigin,
        });
      }

      await apiRequest("PUT", `/api/quotation-requests/${currentId}`, { status: "converted" });
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });

      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `edit-purchase-order-${newPO.id}`,
          name: newPO.orderNumber,
          formType: 'purchase-order',
          entityId: newPO.id
        }
      }));

      toast({ title: "Converted", description: `Purchase Order ${newPO.orderNumber} created` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to convert to Purchase Order", variant: "destructive" });
    }
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
    tableKey: 'quotation-request-items'
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

  const qrDirectInput = useMemo<DirectInputConfig | undefined>(() => {
    if (!currentId) return undefined;
    const nextPosition = qrItemsList.length > 0
      ? Math.max(...qrItemsList.map(i => parseInt(i.positionNo || '0', 10) || 0)) + 10
      : 10;
    return {
      columns: [
        { key: 'lineType', fieldType: 'select', defaultValue: 'standard', options: [
          { value: 'standard', label: 'Standaard' },
          { value: 'text', label: 'Tekst' },
        ]},
        { key: 'itemId',
          fieldType: 'searchable-select',
          placeholder: 'Zoek artikel...',
          enabledWhen: (r) => !!r.lineType && r.lineType !== 'text',
          options: inventoryOptions.map(o => ({ value: o.value, label: o.label })),
          onSelect: (val) => {
            const item = inventoryItems?.find(i => i.id === val);
            if (!item) return {};
            return {
              itemId: item.id,
              description: item.name || '',
              unitPrice: item.costPrice || item.sellingPrice || '0.00',
              costPrice: item.costPrice || '0.00',
              unit: item.unit || 'Pcs.',
              hsCode: item.hsCode || '',
              countryOfOrigin: item.countryOfOrigin || '',
            };
          },
        },
        { key: 'description', fieldType: 'text', placeholder: 'Omschrijving', enabledWhen: (r) => !!r.lineType },
        { key: 'quantity', fieldType: 'number', defaultValue: '1', placeholder: 'Aantal', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
        { key: 'unit', fieldType: 'select', defaultValue: 'Pcs.', placeholder: 'Eenheid', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text',
          options: unitOptions,
        },
        { key: 'unitPrice', fieldType: 'currency', defaultValue: '0.00', placeholder: 'Prijs', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
        { key: 'discountPercent', fieldType: 'number', defaultValue: '0', placeholder: 'Korting %', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
        { key: 'costPrice', fieldType: 'currency', defaultValue: '0.00', placeholder: 'Kostprijs', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
      ],
      defaults: {
        positionNo: String(nextPosition).padStart(3, '0'),
        position: nextPosition,
        lineType: 'standard',
        quantity: '1',
        unit: 'Pcs.',
        unitPrice: '0.00',
        costPrice: '0.00',
        discountPercent: '0',
      },
      onSave: async (rowData) => {
        const qty = parseFloat(rowData.quantity || '1') || 1;
        const price = parseFloat(rowData.unitPrice || '0') || 0;
        const disc = parseFloat(rowData.discountPercent || '0') || 0;
        const netPrice = disc > 0 ? price * (1 - disc / 100) : price;
        const lineTotal = (qty * netPrice).toFixed(2);
        const np = qrItemsList.length > 0
          ? Math.max(...qrItemsList.map(i => parseInt(i.positionNo || '0', 10) || 0)) + 10
          : 10;
        const itemData = {
          quotationRequestId: currentId!,
          lineType: rowData.lineType || 'standard',
          description: rowData.description || '',
          quantity: String(qty),
          unit: rowData.unit || 'Pcs.',
          unitPrice: String(price),
          lineTotal,
          costPrice: rowData.costPrice || '0.00',
          discountPercent: String(disc),
          position: np,
          positionNo: String(np).padStart(3, '0'),
          itemId: rowData.itemId || undefined,
          hsCode: rowData.hsCode || '',
          countryOfOrigin: rowData.countryOfOrigin || '',
        };
        await apiRequest("POST", `/api/quotation-requests/${currentId}/items`, itemData);
        queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", currentId, "items"] });
      },
      onUpdate: async (rowId, rowData) => {
        const qty = parseFloat(rowData.quantity || '0') || 0;
        const price = parseFloat(rowData.unitPrice || '0') || 0;
        const disc = parseFloat(rowData.discountPercent || '0') || 0;
        const netPrice = disc > 0 ? price * (1 - disc / 100) : price;
        const lineTotal = (qty * netPrice).toFixed(2);
        const updateData: any = { ...rowData, lineTotal };
        await apiRequest("PUT", `/api/quotation-request-items/${rowId}`, updateData);
        queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", currentId, "items"] });
      },
    };
  }, [currentId, qrItemsList, inventoryOptions, unitOptions, inventoryItems]);

  const convertOptions = isEditing && quotationRequest?.status !== 'converted' ? [
    {
      label: 'Maak Purchase Order (PO)',
      onClick: handleConvertToPO,
    }
  ] : undefined;

  const toolbar = useFormToolbar({
    entityType: "quotation_request",
    entityId: quotationRequestId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    convertOptions,
  });

  if (isLoadingQR) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading quotation request...</div>
      </div>
    );
  }

  const createFormSections = () => [
    {
      id: 'general',
      label: 'Algemeen',
      rows: [
        {
          type: 'two-column' as const,
          leftColumn: [
            {
              key: "requestNumber",
              label: "Nummer",
              type: "custom" as const,
              customComponent: (
                <div className="flex gap-1 items-center">
                  <Input
                    {...form.register("requestNumber")}
                    className={`h-10 text-xs flex-1 ${form.formState.errors.requestNumber ? 'border-red-500' : ''}`}
                    placeholder="QR-2026-001"
                    data-testid="input-request-number"
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      title="Nieuw beschikbaar nummer ophalen"
                      onClick={async () => {
                        const result = await refetchNextNumber();
                        if (result.data?.number) {
                          form.setValue("requestNumber", result.data.number);
                        }
                      }}
                      className="h-10 w-10 flex items-center justify-center rounded border border-input bg-background hover:bg-orange-50 hover:border-orange-400 transition-colors flex-shrink-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ),
              validation: { isRequired: true },
              testId: "input-request-number"
            },
            {
              key: "supplierId",
              label: "Leverancier",
              type: "custom" as const,
              customComponent: (
                <SelectWithAdd
                  value={form.watch("supplierId")}
                  onValueChange={(value) => form.setValue("supplierId", value)}
                  placeholder="Selecteer leverancier..."
                  addFormTitle="Nieuwe leverancier"
                  testId="select-supplier"
                  addFormContent={
                    <QuickAddSupplier onSuccess={(supplierId) => form.setValue("supplierId", supplierId)} />
                  }
                >
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectWithAdd>
              ),
              validation: { isRequired: true, error: form.formState.errors.supplierId?.message },
              testId: "select-supplier"
            },
            {
              key: "requestDate",
              label: "Aanvraagdatum",
              type: "date" as const,
              placeholder: "dd-mm-jjjj",
              setValue: (value: string) => form.setValue("requestDate", value),
              watch: () => form.watch("requestDate"),
              testId: "input-request-date"
            },
            {
              key: "dueDate",
              label: "Vervaldatum",
              type: "date" as const,
              placeholder: "dd-mm-jjjj",
              setValue: (value: string) => form.setValue("dueDate", value),
              watch: () => form.watch("dueDate"),
              testId: "input-due-date"
            },
            {
              key: "status",
              label: "Status",
              type: "select" as const,
              options: [
                { value: "concept", label: "Concept" },
                { value: "pending", label: "In behandeling" },
                { value: "sent", label: "Verzonden" },
                { value: "approved", label: "Goedgekeurd" },
                { value: "rejected", label: "Afgewezen" },
                { value: "converted", label: "Omgezet" },
                { value: "cancelled", label: "Geannuleerd" },
              ],
              setValue: (value: string) => form.setValue("status", value),
              watch: () => form.watch("status"),
              testId: "select-status"
            },
            {
              key: "priority",
              label: "Prioriteit",
              type: "select" as const,
              options: [
                { value: "low", label: "Laag" },
                { value: "medium", label: "Normaal" },
                { value: "high", label: "Hoog" },
              ],
              setValue: (value: string) => form.setValue("priority", value),
              watch: () => form.watch("priority"),
              testId: "select-priority"
            },
          ],
          rightColumn: [
            {
              key: "projectId",
              label: "Project",
              type: "custom" as const,
              customComponent: (
                <ProjectSelect
                  value={form.watch("projectId") || ""}
                  onValueChange={(value) => form.setValue("projectId", value || "")}
                  placeholder="Selecteer project..."
                  testId="select-project"
                />
              ),
              testId: "field-project"
            },
            {
              key: "title",
              label: "Titel",
              type: "text" as const,
              placeholder: "Aanvraag titel...",
              register: form.register("title"),
              validation: { isRequired: true, error: form.formState.errors.title?.message },
              testId: "input-title"
            },
            {
              key: "description",
              label: "Omschrijving",
              type: "textarea" as const,
              placeholder: "Omschrijving aanvraag...",
              register: form.register("description"),
              testId: "textarea-description"
            },
            {
              key: "requirements",
              label: "Vereisten",
              type: "textarea" as const,
              placeholder: "Specifieke vereisten...",
              register: form.register("requirements"),
              testId: "textarea-requirements"
            },
            {
              key: "notes",
              label: "Notities",
              type: "textarea" as const,
              placeholder: "Notities...",
              register: form.register("notes"),
              testId: "textarea-notes"
            },
          ],
        },
      ]
    },
    {
      id: 'amounts',
      label: 'Bedragen',
      rows: [
        createFieldRow({
          key: "subtotal" as any,
          label: "Subtotaal",
          type: "display",
          displayValue: `€ ${form.watch("subtotal") || "0.00"}`,
          testId: "display-subtotal"
        } as any),
        createFieldRow({
          key: "taxAmount" as any,
          label: "BTW bedrag",
          type: "text",
          placeholder: "0.00",
          register: form.register("taxAmount"),
          testId: "input-tax"
        } as any),
        createFieldRow({
          key: "totalAmount" as any,
          label: "Totaalbedrag",
          type: "display",
          displayValue: `€ ${form.watch("totalAmount") || "0.00"}`,
          testId: "display-total"
        } as any),
      ]
    },
    {
      id: 'items',
      label: 'Regels',
      rows: []
    }
  ];

  return (
    <div>
      <LayoutForm2
        sections={createFormSections()}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={onSubmit}
        toolbar={toolbar}
        documentType="quotation_request"
        entityId={currentId}
        isLoading={isLoadingQR}
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
            data={qrItemsList}
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
              const allIds = qrItemsList.map(item => item.id);
              itemTableState.toggleAllRows(allIds);
            }}
            getRowId={(item: QuotationRequestItem) => item.id}
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
            directInput={qrDirectInput}
            rowActions={(item: QuotationRequestItem) => [
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
