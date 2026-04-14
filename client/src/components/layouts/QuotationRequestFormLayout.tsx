import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { SupplierSelect } from "@/components/ui/supplier-select";
import { ProjectSelect } from "@/components/ui/project-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, X, Plus, Printer, Paperclip, Trash2, FileText, Upload, Download } from "lucide-react";
import type { QuotationRequest, InsertQuotationRequest, QuotationRequestItem, InventoryItem, UnitOfMeasure, QuotationRequestSupplier } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";

const formSchema = insertQuotationRequestSchema.extend({
  supplierId: z.string().optional().nullable(),
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'In afwachting',
  sent: 'Verzonden',
  received: 'Ontvangen',
  selected: 'Geselecteerd',
  rejected: 'Afgewezen',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  selected: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
};

function QRSuppliersTab({ quotationRequestId }: { quotationRequestId: string }) {
  const { toast } = useToast();
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: qrSuppliers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/quotation-requests", quotationRequestId, "suppliers"],
    queryFn: async () => {
      const res = await fetch(`/api/quotation-requests/${quotationRequestId}/suppliers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!quotationRequestId,
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      const res = await apiRequest("POST", `/api/quotation-requests/${quotationRequestId}/suppliers`, { supplierId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", quotationRequestId, "suppliers"] });
      setSelectedSupplierId("");
      toast({ title: "Leverancier toegevoegd" });
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message || "Kon leverancier niet toevoegen", variant: "destructive" });
    },
  });

  const removeSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotation-request-suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", quotationRequestId, "suppliers"] });
      toast({ title: "Leverancier verwijderd" });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/quotation-request-suppliers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotation-requests", quotationRequestId, "suppliers"] });
    },
  });

  const handleFileUpload = (qrSupplierId: string, attachmentSlot: 1 | 2 | 3, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fout", description: "Bestand mag maximaal 10MB zijn", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateSupplierMutation.mutate({
        id: qrSupplierId,
        data: {
          [`attachment${attachmentSlot}`]: base64,
          [`attachment${attachmentSlot}Name`]: file.name,
        }
      });
      toast({ title: "Bijlage geüpload", description: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = (qrSupplierId: string, slot: 1 | 2 | 3) => {
    updateSupplierMutation.mutate({
      id: qrSupplierId,
      data: {
        [`attachment${slot}`]: null,
        [`attachment${slot}Name`]: null,
      }
    });
  };

  const handlePrint = (qrSupplier: any) => {
    window.dispatchEvent(new CustomEvent('open-print-dialog', {
      detail: {
        documentType: 'quotation_request',
        documentId: quotationRequestId,
        supplierId: qrSupplier.supplier_id,
        supplierName: qrSupplier.supplier_name,
      }
    }));
    toast({ title: "Afdrukken", description: `PDF genereren voor ${qrSupplier.supplier_name}...` });
  };

  const handleDownloadAttachment = (base64Data: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-xs font-medium text-muted-foreground mb-1 block">Leverancier toevoegen</Label>
          <SupplierSelect
            value={selectedSupplierId}
            onValueChange={setSelectedSupplierId}
            placeholder="Zoek en selecteer leverancier..."
            testId="select-add-supplier"
          />
        </div>
        <Button
          size="sm"
          className="h-9 bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
          disabled={!selectedSupplierId || addSupplierMutation.isPending}
          onClick={() => selectedSupplierId && addSupplierMutation.mutate(selectedSupplierId)}
        >
          <Plus className="h-4 w-4" />
          Toevoegen
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Laden...</div>
      ) : qrSuppliers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Nog geen leveranciers gekoppeld</p>
          <p className="text-xs text-gray-400 mt-1">Selecteer hierboven een leverancier om een aanvraag naar te sturen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {qrSuppliers.map((qs: any) => (
            <div key={qs.id} className="border rounded-lg bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-sm font-medium">{qs.supplier_name}</span>
                    {qs.supplier_number && (
                      <span className="text-xs text-muted-foreground ml-2">({qs.supplier_number})</span>
                    )}
                  </div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[qs.status] || STATUS_COLORS.pending}`}>
                    {STATUS_LABELS[qs.status] || qs.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    className="h-7 text-xs border rounded px-2 bg-white"
                    value={qs.status || 'pending'}
                    onChange={(e) => updateSupplierMutation.mutate({ id: qs.id, data: { status: e.target.value } })}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => handlePrint(qs)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                    onClick={() => removeSupplierMutation.mutate(qs.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="px-4 py-3">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                  <Paperclip className="h-3 w-3 inline mr-1" />
                  Ontvangen offertes (max. 3 bijlagen)
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {([1, 2, 3] as const).map((slot) => {
                    const data = qs[`attachment_${slot}`];
                    const name = qs[`attachment_${slot}_name`];
                    const refKey = `${qs.id}-${slot}`;
                    return (
                      <div key={slot} className="border rounded-md p-2 min-h-[60px] flex flex-col items-center justify-center bg-gray-50/50">
                        <input
                          ref={(el) => { fileInputRefs.current[refKey] = el; }}
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(qs.id, slot, file);
                            e.target.value = '';
                          }}
                        />
                        {data && name ? (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <FileText className="h-5 w-5 text-orange-500" />
                            <span className="text-[10px] text-center truncate w-full px-1" title={name}>{name}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-blue-500"
                                title="Download"
                                onClick={() => handleDownloadAttachment(data, name)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-red-500"
                                title="Verwijderen"
                                onClick={() => handleRemoveAttachment(qs.id, slot)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRefs.current[refKey]?.click()}
                          >
                            <Upload className="h-5 w-5" />
                            <span className="text-[10px]">Bijlage {slot}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
    title: { label: "Titel" },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestNumber: "",
      supplierId: undefined,
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
    ...(isEditing ? [{
      id: 'suppliers',
      label: 'Leveranciers',
      rows: [{
        type: 'custom' as const,
        customContent: (
          <QRSuppliersTab quotationRequestId={currentId!} />
        )
      }]
    }] : []),
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
      {isEditing && (
        <div className="px-6 py-4 pb-10 bg-white ml-[15px] mr-[15px] border-t">
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
            onAdd={() => {
              setTimeout(() => {
                const btn = document.querySelector('[data-testid="button-direct-input"]') as HTMLButtonElement;
                if (btn) {
                  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  btn.focus();
                }
              }, 100);
            }}
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
