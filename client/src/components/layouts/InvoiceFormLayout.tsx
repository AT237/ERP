import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LayoutForm2, type FormSection2, createFieldsRow, createCustomRow, createFieldRow, createSectionHeaderRow } from './LayoutForm2';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSelect } from "@/components/ui/customer-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Save, X, FileText, Printer, CopyPlus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { DataTableLayout, createIdColumn, createPositionColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Invoice, InvoiceItem, InsertInvoice, InsertInvoiceItem, Customer, PaymentDay, Project, VatRate } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";
import { amountToWords } from "@/utils/field-resolver";
import { PaymentDaySelectWithAdd } from "@/components/ui/payment-day-select-with-add";
import { ProjectSelect } from "@/components/ui/project-select";
import { addDays } from "date-fns";

const invoiceFormSchema = insertInvoiceSchema.omit({
  subtotal: true,
  taxAmount: true,
  totalAmount: true,
}).extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  totalAmountInWords: z.string().optional(),
  paidAmount: z.string().optional(),
  dueDate: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentDaysId: z.string().optional(),
});

const invoiceItemFormSchema = insertInvoiceItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  lineTotal: z.string().min(1, "Line total is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
type InvoiceItemFormData = z.infer<typeof invoiceItemFormSchema>;

interface InvoiceFormLayoutProps {
  onSave: () => void;
  invoiceId?: string;
  parentId?: string;
}

interface WorkOrderMultiSelectProps {
  allWorkOrders: any[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  projectId?: string;
  search: string;
  onSearchChange: (v: string) => void;
  dropdownOpen: boolean;
  onDropdownOpenChange: (v: boolean) => void;
}

function WorkOrderMultiSelect({ allWorkOrders, selectedIds, onToggle, projectId, search, onSearchChange, dropdownOpen, onDropdownOpenChange }: WorkOrderMultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = allWorkOrders.filter((wo: any) =>
    !search ||
    wo.title?.toLowerCase().includes(search.toLowerCase()) ||
    wo.orderNumber?.toLowerCase().includes(search.toLowerCase())
  );
  const projectWOs = filtered.filter((wo: any) => projectId && wo.projectId === projectId);
  const otherWOs = filtered.filter((wo: any) => !projectId || wo.projectId !== projectId);

  return (
    <div className="relative">
      {/* Tag input container — chips + search input all in one box */}
      <div
        className={`min-h-[40px] w-full flex flex-wrap items-center gap-1 px-3 py-1.5 border rounded-md bg-background cursor-text transition-colors ${dropdownOpen ? 'border-orange-400 ring-1 ring-orange-400' : 'border-input hover:border-orange-300'}`}
        onClick={() => { inputRef.current?.focus(); onDropdownOpenChange(true); }}
      >
        {selectedIds.map(woId => {
          const wo = allWorkOrders.find((w: any) => w.id === woId);
          return (
            <span
              key={woId}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-orange-500 text-white text-xs rounded-full select-none cursor-pointer"
              onDoubleClick={e => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('open-form-tab', {
                  detail: {
                    id: `edit-work-order-${woId}`,
                    name: wo?.orderNumber || woId.slice(0, 8),
                    formType: 'work-order',
                    parentId: woId,
                  }
                }));
              }}
              title={wo?.title ? `${wo.orderNumber} – ${wo.title}\nDubbelklik om te openen` : 'Dubbelklik om te openen'}
            >
              <span className="font-medium">{wo?.orderNumber || '...'}</span>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onToggle(woId); }}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-orange-700 text-white font-bold text-xs leading-none"
              >×</button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => { onSearchChange(e.target.value); onDropdownOpenChange(true); }}
          onFocus={() => onDropdownOpenChange(true)}
          onBlur={() => setTimeout(() => onDropdownOpenChange(false), 150)}
          placeholder={selectedIds.length === 0 ? 'Klik om work orders toe te voegen...' : ''}
          className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder:text-muted-foreground py-0.5"
        />
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {projectWOs.length > 0 && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-orange-50">Van dit project</div>
              {projectWOs.map((wo: any) => (
                <button key={wo.id} type="button" onMouseDown={e => { e.preventDefault(); onToggle(wo.id); }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-orange-50 ${selectedIds.includes(wo.id) ? 'bg-orange-100' : ''}`}>
                  <span className={`w-3.5 h-3.5 flex-shrink-0 rounded border flex items-center justify-center ${selectedIds.includes(wo.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                    {selectedIds.includes(wo.id) && <span className="text-white text-[8px] font-bold">✓</span>}
                  </span>
                  <span className="font-mono text-orange-600 text-[11px]">{wo.orderNumber}</span>
                  <span className="truncate">{wo.title}</span>
                </button>
              ))}
            </>
          )}
          {otherWOs.length > 0 && (
            <>
              {projectWOs.length > 0 && <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">Overige work orders</div>}
              {otherWOs.map((wo: any) => (
                <button key={wo.id} type="button" onMouseDown={e => { e.preventDefault(); onToggle(wo.id); }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-orange-50 ${selectedIds.includes(wo.id) ? 'bg-orange-100' : ''}`}>
                  <span className={`w-3.5 h-3.5 flex-shrink-0 rounded border flex items-center justify-center ${selectedIds.includes(wo.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                    {selectedIds.includes(wo.id) && <span className="text-white text-[8px] font-bold">✓</span>}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{wo.orderNumber}</span>
                  <span className="truncate">{wo.title}</span>
                </button>
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Geen work orders gevonden</div>
          )}
        </div>
      )}
    </div>
  );
}

export function InvoiceFormLayout({ onSave, invoiceId, parentId }: InvoiceFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [, navigate] = useLocation();
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [deleteItemTarget, setDeleteItemTarget] = useState<InvoiceItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [vatRatePercent, setVatRatePercent] = useState<number>(0);
  const [customerLanguageCode, setCustomerLanguageCode] = useState<string>('nl');
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [woSearch, setWoSearch] = useState('');
  const [woDropdownOpen, setWoDropdownOpen] = useState(false);
  const { toast } = useToast();
  const isEditing = !!invoiceId;

  const invoiceForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onBlur',
    defaultValues: {
      invoiceNumber: "",
      customerId: "",
      projectId: "",
      description: "",
      paymentDaysId: "",
      status: "pending",
      dueDate: "",
      invoiceDate: toDisplayDate(new Date()),
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      totalAmountInWords: "",
      paidAmount: "0.00",
      notes: "",
      printSortOrder: "position",
    },
  });

  const itemForm = useForm<InvoiceItemFormData>({
    resolver: zodResolver(invoiceItemFormSchema),
    defaultValues: {
      invoiceId: "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    },
  });

  const { data: invoice, isLoading: invoiceLoading } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: paymentDaysList = [] } = useQuery<PaymentDay[]>({
    queryKey: ["/api/masterdata/payment-days"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: vatRates = [] } = useQuery<VatRate[]>({
    queryKey: ["/api/masterdata/vat-rates"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedInvoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoices", invoiceId, "items"],
    enabled: !!invoiceId,
  });

  const { data: allWorkOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: invoiceWorkOrderIds = [] } = useQuery<string[]>({
    queryKey: ["/api/invoices", invoiceId, "work-orders"],
    enabled: !!invoiceId,
  });

  const { data: nextNumberData, refetch: refetchNextNumber } = useQuery<{ number: string }>({
    queryKey: ["/api/invoices/next-number"],
    enabled: !isEditing,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isEditing && nextNumberData?.number && !invoiceForm.getValues("invoiceNumber")) {
      invoiceForm.setValue("invoiceNumber", nextNumberData.number);
    }
  }, [nextNumberData, isEditing]);

  const formInitializedForId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (invoice && formInitializedForId.current !== invoice.id) {
      formInitializedForId.current = invoice.id;
      invoiceForm.reset({
        invoiceNumber: invoice.invoiceNumber || "",
        customerId: invoice.customerId || "",
        projectId: invoice.projectId || "",
        description: (invoice as any).description || "",
        paymentDaysId: (invoice as any).paymentDaysId || "",
        status: invoice.status || "pending",
        dueDate: invoice.dueDate ? toDisplayDate(invoice.dueDate) : "",
        invoiceDate: (invoice as any).invoiceDate ? toDisplayDate((invoice as any).invoiceDate) : (invoice.createdAt ? toDisplayDate(invoice.createdAt) : ""),
        subtotal: invoice.subtotal || "0.00",
        taxAmount: invoice.taxAmount || "0.00",
        totalAmount: invoice.totalAmount || "0.00",
        totalAmountInWords: (invoice as any).totalAmountInWords || "",
        paidAmount: invoice.paidAmount || "0.00",
        notes: invoice.notes || "",
        printSortOrder: (invoice as any).printSortOrder || "position",
      });
    }
  }, [invoice]);

  // Restore vatRatePercent and customerLanguageCode from customer when invoice or vatRates load
  useEffect(() => {
    if (!invoice || customers.length === 0) return;
    const customer = customers.find(c => c.id === invoice.customerId);
    if (customer) {
      const lang = (customer as any)?.languageCode || 'nl';
      setCustomerLanguageCode(lang);
    }
    if (vatRates.length === 0 || vatRatePercent !== 0) return;
    const customer2 = customers.find(c => c.id === invoice.customerId);
    const vatRate = vatRates.find(v => v.id === (customer2 as any)?.vatRateId);
    if (vatRate) setVatRatePercent(parseFloat(String(vatRate.rate)));
  }, [invoice, vatRates, customers]);

  useEffect(() => {
    if (fetchedInvoiceItems.length > 0) {
      setInvoiceItems(fetchedInvoiceItems);
    }
  }, [fetchedInvoiceItems]);

  useEffect(() => {
    if (invoiceWorkOrderIds.length > 0) {
      setSelectedWorkOrderIds(invoiceWorkOrderIds);
    }
  }, [invoiceWorkOrderIds]);

  useEffect(() => {
    const subtotal = invoiceItems.reduce((sum, item) => {
      return sum + (parseFloat(item.lineTotal || "0") || 0);
    }, 0);
    invoiceForm.setValue("subtotal", subtotal.toFixed(2));
    let total: number;
    if (vatRatePercent > 0) {
      const taxAmount = subtotal * vatRatePercent / 100;
      invoiceForm.setValue("taxAmount", taxAmount.toFixed(2));
      total = subtotal + taxAmount;
      invoiceForm.setValue("totalAmount", total.toFixed(2));
    } else {
      const taxAmount = parseFloat(invoiceForm.getValues("taxAmount") || "0") || 0;
      total = subtotal + taxAmount;
      invoiceForm.setValue("totalAmount", total.toFixed(2));
    }
    invoiceForm.setValue("totalAmountInWords", amountToWords(total, customerLanguageCode));
  }, [invoiceItems, vatRatePercent, customerLanguageCode]);

  const calculateDueDate = (invoiceDateStr: string, pDaysId: string) => {
    if (!invoiceDateStr || !pDaysId || paymentDaysList.length === 0) return;
    const paymentDay = paymentDaysList.find(pd => pd.id === pDaysId);
    if (!paymentDay) return;
    const parts = invoiceDateStr.split("-");
    if (parts.length !== 3) return;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const invoiceDateObj = new Date(year, month, day);
    if (isNaN(invoiceDateObj.getTime())) return;
    const dueDateObj = addDays(invoiceDateObj, paymentDay.days);
    invoiceForm.setValue("dueDate", toDisplayDate(dueDateObj));
  };

  const watchedTaxAmount = invoiceForm.watch("taxAmount");

  useEffect(() => {
    const subtotal = parseFloat(invoiceForm.getValues("subtotal") || "0") || 0;
    const tax = parseFloat(watchedTaxAmount || "0") || 0;
    invoiceForm.setValue("totalAmount", (subtotal + tax).toFixed(2));
  }, [watchedTaxAmount]);

  const watchedInvoiceDate = invoiceForm.watch("invoiceDate");
  const watchedPaymentDaysId = invoiceForm.watch("paymentDaysId");

  useEffect(() => {
    if (watchedInvoiceDate && watchedPaymentDaysId && paymentDaysList.length > 0) {
      calculateDueDate(watchedInvoiceDate, watchedPaymentDaysId);
    }
  }, [watchedInvoiceDate, watchedPaymentDaysId, paymentDaysList]);

  const handleCustomerChange = (customerId: string) => {
    invoiceForm.setValue("customerId", customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer?.paymentDaysId) {
      invoiceForm.setValue("paymentDaysId", customer.paymentDaysId);
    } else {
      invoiceForm.setValue("paymentDaysId", "");
      invoiceForm.setValue("dueDate", "");
    }
    // Auto-apply customer's VAT rate
    const vatRate = vatRates.find(v => v.id === (customer as any)?.vatRateId);
    const pct = vatRate ? parseFloat(String(vatRate.rate)) : 0;
    setVatRatePercent(pct);
    // Apply customer's language code for amount in words
    const lang = (customer as any)?.languageCode || 'nl';
    setCustomerLanguageCode(lang);
    const subtotal = parseFloat(invoiceForm.getValues("subtotal") || "0") || 0;
    const taxAmount = subtotal * pct / 100;
    const total = subtotal + taxAmount;
    invoiceForm.setValue("taxAmount", taxAmount.toFixed(2));
    invoiceForm.setValue("totalAmount", total.toFixed(2));
    invoiceForm.setValue("totalAmountInWords", amountToWords(total, lang));
  };

  const handlePaymentDaysChange = (pDaysId: string) => {
    invoiceForm.setValue("paymentDaysId", pDaysId);
  };

  const handleInvoiceDateChange = (value: string) => {
    invoiceForm.setValue("invoiceDate", value);
  };

  const itemColumns = React.useMemo(() => [
    createPositionColumn(),
    {
      key: 'workDate',
      label: 'Date',
      visible: true,
      width: 90,
      filterable: false,
      sortable: true,
      renderCell: (value: any) => {
        if (!value) return '';
        const d = new Date(value);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`;
      }
    },
    {
      key: 'technicianNames',
      label: 'Technicians',
      visible: true,
      width: 150,
      filterable: true,
      sortable: true
    },
    {
      key: 'description',
      label: 'Description',
      visible: true,
      width: 200,
      filterable: true,
      sortable: true
    },
    { 
      key: 'quantity', 
      label: 'Qty', 
      visible: true, 
      width: 80, 
      filterable: false, 
      sortable: true,
      className: 'text-right',
      renderCell: (value: any) => (
        <span className="text-right w-full block">{value != null ? parseFloat(String(value)).toString() : "0"}</span>
      )
    },
    {
      key: 'unit',
      label: 'Unit',
      visible: true,
      width: 80,
      filterable: false,
      sortable: false
    },
    createCurrencyColumn('unitPrice', 'Unit Price'),
    createCurrencyColumn('lineTotal', 'Line Total'),
  ], []);

  const itemTableState = useDataTable({
    defaultColumns: itemColumns,
    tableKey: 'invoice-items'
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: async (newInvoice) => {
      if (selectedWorkOrderIds.length > 0) {
        try {
          await apiRequest("PUT", `/api/invoices/${newInvoice.id}/work-orders`, { workOrderIds: selectedWorkOrderIds });
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'invoice',
          entity: newInvoice,
          parentId: parentId
        }
      }));
      
      onSave();
    },
    onError: (error: Error) => {
      let description = "Failed to create invoice";
      try {
        const jsonStr = error.message.replace(/^\d+:\s*/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) description = parsed.message;
      } catch {}
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertInvoice>) => {
      const response = await apiRequest("PUT", `/api/invoices/${invoiceId}`, data);
      return response.json();
    },
    onSuccess: async () => {
      if (invoiceId) {
        try {
          await apiRequest("PUT", `/api/invoices/${invoiceId}/work-orders`, { workOrderIds: selectedWorkOrderIds });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "work-orders"] });
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      onSave();
    },
    onError: (error: Error) => {
      let description = "Failed to update invoice";
      try {
        const jsonStr = error.message.replace(/^\d+:\s*/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) description = parsed.message;
      } catch {}
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/invoice-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      toast({
        title: "Success",
        description: "Invoice item deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleSaveInvoice = (data: InvoiceFormData) => {
    const submitData: any = {
      ...data,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount || "0",
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount || "0",
      dueDate: data.dueDate ? toStorageDate(data.dueDate) : undefined,
      invoiceDate: data.invoiceDate ? toStorageDate(data.invoiceDate) : undefined,
      paymentDaysId: data.paymentDaysId || null,
      projectId: data.projectId || null,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDeleteItem = (item: InvoiceItem) => {
    setDeleteItemTarget(item);
  };

  const confirmDeleteItem = () => {
    if (!deleteItemTarget) return;
    deleteItemMutation.mutate(deleteItemTarget.id);
    setInvoiceItems(prev => prev.filter(i => i.id !== deleteItemTarget.id));
    setDeleteItemTarget(null);
  };

  const handleBulkDeleteItems = async () => {
    const selectedIds = itemTableState.selectedRows;
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => apiRequest("DELETE", `/api/invoice-items/${id}`)));
      setInvoiceItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
      itemTableState.setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      toast({ title: "Deleted", description: `${selectedIds.length} rule(s) deleted` });
    } catch {
      toast({ title: "Error", description: "Failed to delete selected items", variant: "destructive" });
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const handleDuplicateItem = async (item: InvoiceItem) => {
    if (!invoiceId) return;
    try {
      const { id, createdAt, updatedAt, ...duplicateData } = item as any;
      const nextPosition = invoiceItems.length > 0
        ? String(Math.max(...invoiceItems.map(i => parseInt(String(i.position || '0'), 10))) + 10).padStart(3, '0')
        : '010';
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/items`, {
        ...duplicateData,
        position: nextPosition,
        description: `${duplicateData.description || ''} (Copy)`,
      });
      const newItem = await response.json();
      setInvoiceItems(prev => [...prev, newItem]);
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      toast({ title: "Success", description: "Line item duplicated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate line item", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    window.dispatchEvent(new CustomEvent('close-form-tab', {
      detail: { tabId: invoiceId ? `edit-invoice-${invoiceId}` : 'new-invoice' }
    }));
  };

  const toolbar = useFormToolbar({
    entityType: "invoice",
    entityId: invoiceId,
    onSave: invoiceForm.handleSubmit(handleSaveInvoice),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const currentProjectId = invoiceForm.watch("projectId");
  const mismatchedWOs = selectedWorkOrderIds.filter(woId => {
    const wo = (allWorkOrders as any[]).find((w: any) => w.id === woId);
    return currentProjectId && wo && wo.projectId !== currentProjectId;
  });
  const woMismatchError = mismatchedWOs.length > 0
    ? `${mismatchedWOs.map(woId => {
        const wo = (allWorkOrders as any[]).find((w: any) => w.id === woId);
        return wo?.orderNumber || woId.slice(0, 8);
      }).join(', ')} ${mismatchedWOs.length === 1 ? 'hoort' : 'horen'} niet bij dit project.`
    : undefined;

  const prevMismatchRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (woMismatchError && woMismatchError !== prevMismatchRef.current) {
      toast({
        title: "Work order conflict",
        description: woMismatchError,
        variant: "destructive",
      });
    }
    prevMismatchRef.current = woMismatchError;
  }, [woMismatchError]);

  const formSections: any[] = [
    {
      id: "general",
      label: "General",
      rows: [
        {
          type: 'two-column' as const,
          leftColumn: [
            {
              key: "invoiceNumber",
              label: "Number",
              type: "custom",
              customComponent: (
                <div className="flex gap-1 items-center">
                  <Input
                    {...invoiceForm.register("invoiceNumber")}
                    className={`h-10 text-xs flex-1 ${invoiceForm.formState.errors.invoiceNumber ? 'border-red-500' : ''}`}
                    placeholder="CI-2026-001"
                    data-testid="input-invoice-number"
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      title="Nieuw beschikbaar nummer ophalen"
                      onClick={async () => {
                        const result = await refetchNextNumber();
                        if (result.data?.number) {
                          invoiceForm.setValue("invoiceNumber", result.data.number);
                        }
                      }}
                      className="h-10 w-10 flex items-center justify-center rounded border border-input bg-background hover:bg-orange-50 hover:border-orange-400 transition-colors flex-shrink-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {invoiceForm.formState.errors.invoiceNumber && (
                    <span className="text-xs text-red-500 mt-1">{invoiceForm.formState.errors.invoiceNumber.message}</span>
                  )}
                </div>
              ),
              validation: { isRequired: true },
              testId: "input-invoice-number"
            },
            {
              key: "customerId",
              label: "Customer",
              type: "custom",
              customComponent: (
                <CustomerSelect
                  value={invoiceForm.watch("customerId")}
                  onValueChange={(value) => handleCustomerChange(value)}
                  placeholder="Select customer..."
                  testId="select-invoice-customer"
                  customers={customers.map(c => ({
                    id: c.id,
                    customerNumber: (c as any).customerNumber || '',
                    name: c.name,
                    email: (c as any).generalEmail || (c as any).email || undefined,
                    phone: (c as any).phone || undefined,
                  }))}
                  parentId={invoiceId || 'new-invoice'}
                />
              ),
            },
            {
              key: "invoiceDate",
              label: "Invoice Date",
              type: "date",
              placeholder: "dd-mm-yyyy",
              setValue: (value: string) => handleInvoiceDateChange(value),
              watch: () => invoiceForm.watch("invoiceDate"),
              validation: {
                error: invoiceForm.formState.errors.invoiceDate?.message
              },
              testId: "input-invoice-date"
            },
            {
              key: "paymentDaysId",
              label: "Payment Days",
              type: "custom",
              customComponent: (
                <PaymentDaySelectWithAdd
                  value={invoiceForm.watch("paymentDaysId") || ""}
                  onValueChange={(value) => handlePaymentDaysChange(value)}
                  language="nl"
                  placeholder="Select payment days..."
                  testId="select-invoice-payment-days"
                />
              ),
            },
            {
              key: "dueDate",
              label: "Due Date",
              type: "date",
              placeholder: "dd-mm-yyyy",
              setValue: (value: string) => invoiceForm.setValue("dueDate", value),
              watch: () => invoiceForm.watch("dueDate"),
              validation: {
                error: invoiceForm.formState.errors.dueDate?.message
              },
              testId: "input-due-date"
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "cancelled", label: "Cancelled" }
              ],
              setValue: (value: string) => invoiceForm.setValue("status", value),
              watch: () => invoiceForm.watch("status"),
              validation: {
                error: invoiceForm.formState.errors.status?.message
              },
              testId: "select-status"
            },
          ],
          rightColumn: [
            {
              key: "projectId",
              label: "Project",
              type: "custom",
              customComponent: (
                <ProjectSelect
                  value={invoiceForm.watch("projectId") || ""}
                  onValueChange={(value) => invoiceForm.setValue("projectId", value || "")}
                  placeholder="Select project..."
                  testId="select-invoice-project"
                  projects={projects.map(p => ({
                    id: p.id,
                    projectNumber: (p as any).projectNumber || '',
                    name: p.name,
                  }))}
                  parentId={invoiceId || 'new-invoice'}
                />
              ),
            },
            {
              key: "workOrderIds",
              label: "Work Orders",
              type: "custom",
              customComponent: <WorkOrderMultiSelect
                allWorkOrders={allWorkOrders}
                selectedIds={selectedWorkOrderIds}
                onToggle={(woId) => setSelectedWorkOrderIds(prev => prev.includes(woId) ? prev.filter(id => id !== woId) : [...prev, woId])}
                projectId={currentProjectId || undefined}
                search={woSearch}
                onSearchChange={setWoSearch}
                dropdownOpen={woDropdownOpen}
                onDropdownOpenChange={setWoDropdownOpen}
              />,
            },
            {
              key: "description",
              label: "Description",
              type: "textarea",
              placeholder: "Invoice description...",
              register: invoiceForm.register("description"),
              validation: {
                error: invoiceForm.formState.errors.description?.message
              },
              testId: "input-invoice-description"
            },
            {
              key: "notes",
              label: "Notes",
              type: "textarea",
              placeholder: "Invoice notes...",
              register: invoiceForm.register("notes"),
              validation: {
                error: invoiceForm.formState.errors.notes?.message
              },
              testId: "textarea-invoice-notes"
            },
          ],
        },
      ]
    },
    {
      id: "amounts",
      label: "Amounts",
      rows: [
        createFieldRow({
          key: "subtotal" as any,
          label: "Subtotal",
          type: "display",
          displayValue: `€ ${invoiceForm.watch("subtotal") || "0.00"}`,
          testId: "display-subtotal"
        } as any),
        createFieldRow({
          key: "taxAmount" as any,
          label: vatRatePercent > 0 ? `VAT Amount (${vatRatePercent}%)` : "VAT Amount",
          type: "display",
          displayValue: `€ ${invoiceForm.watch("taxAmount") || "0.00"}`,
          testId: "display-vat-amount"
        } as any),
        createFieldRow({
          key: "totalAmount" as any,
          label: "Total Amount",
          type: "display",
          displayValue: `€ ${invoiceForm.watch("totalAmount") || "0.00"}`,
          testId: "display-total-amount"
        } as any),
        createFieldRow({
          key: "totalAmountInWords" as any,
          label: "Bedrag in woorden",
          type: "textarea",
          register: invoiceForm.register("totalAmountInWords"),
          testId: "input-total-amount-in-words"
        } as any),
        createFieldRow({
          key: "paidAmount",
          label: "Paid Amount",
          type: "text",
          register: invoiceForm.register("paidAmount"),
          validation: {
            error: invoiceForm.formState.errors.paidAmount?.message
          },
          testId: "input-paid-amount"
        })
      ]
    },
    {
      id: "printSettings",
      label: "Print Settings",
      rows: [
        createSectionHeaderRow("Afdrukinstellingen", "mb-6"),
        createFieldRow({
          key: "printSortOrder",
          label: "Sorteervolgorde",
          type: "custom",
          customComponent: (
            <Select
              value={invoiceForm.watch("printSortOrder") || "position"}
              onValueChange={(value) => invoiceForm.setValue("printSortOrder", value)}
            >
              <SelectTrigger className="w-full" data-testid="select-print-sort-order">
                <SelectValue placeholder="Selecteer sortering..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="position">Positie (standaard)</SelectItem>
                <SelectItem value="position_low_high">Positie laag - hoog</SelectItem>
                <SelectItem value="position_high_low">Positie hoog - laag</SelectItem>
                <SelectItem value="price_high_low">Prijs hoog - laag</SelectItem>
                <SelectItem value="price_low_high">Prijs laag - hoog</SelectItem>
                <SelectItem value="alpha_az">Alfabetisch A-Z</SelectItem>
                <SelectItem value="alpha_za">Alfabetisch Z-A</SelectItem>
              </SelectContent>
            </Select>
          ),
          testId: "field-print-sort-order"
        }),
        createFieldRow({
          key: "printLanguageCode",
          label: "Taal",
          type: "custom",
          customComponent: (
            <Select
              value={invoiceForm.watch("printLanguageCode" as any) || "nl"}
              onValueChange={(value) => invoiceForm.setValue("printLanguageCode" as any, value)}
            >
              <SelectTrigger className="w-full" data-testid="select-print-language">
                <SelectValue placeholder="Selecteer taal..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          ),
          testId: "field-print-language"
        }),
        createFieldRow({
          key: "printProjectNo",
          label: "Projectnummer",
          type: "checkbox",
          watch: () => invoiceForm.watch("printProjectNo" as any) || false,
          setValue: (checked) => invoiceForm.setValue("printProjectNo" as any, checked === true),
          testId: "checkbox-print-project-no"
        }),
        createFieldRow({
          key: "printPaymentConditions",
          label: "Betalingscondities",
          type: "checkbox",
          watch: () => invoiceForm.watch("printPaymentConditions" as any) || false,
          setValue: (checked) => invoiceForm.setValue("printPaymentConditions" as any, checked === true),
          testId: "checkbox-print-payment-conditions"
        }),
      ]
    },
  ];

  return (
    <div>
      <LayoutForm2
        sections={formSections}
        activeSection={activeTab}
        onSectionChange={setActiveTab}
        form={invoiceForm}
        onSubmit={handleSaveInvoice}
        toolbar={toolbar}
        documentType="invoice"
        entityId={invoiceId}
        isLoading={invoiceLoading}
      />
      {isEditing && (
        <div className="px-6 py-4 pb-10 bg-white ml-[15px] mr-[15px]">
          <DataTableLayout
            data={invoiceItems}
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
              const allIds = invoiceItems.map(item => item.id);
              itemTableState.toggleAllRows(allIds);
            }}
            getRowId={(item: InvoiceItem) => item.id}
            entityName="Invoice Item"
            entityNamePlural="Invoice Items"
            applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
            applySorting={itemTableState.applySorting}
            compact={true}
            onRowDoubleClick={(item: InvoiceItem) => {
              if (invoiceId) {
                navigate(`/invoices/${invoiceId}/items/${item.id}`);
              }
            }}
            headerActions={[
              {
                key: 'add-item',
                label: 'ADD LINE',
                icon: <Plus className="h-4 w-4" />,
                onClick: () => {
                  if (invoiceId) {
                    navigate(`/invoices/${invoiceId}/items/new`);
                  }
                },
                variant: 'default' as const
              }
            ]}
            deleteConfirmDialog={{
              isOpen: isBulkDeleteOpen,
              onOpenChange: setIsBulkDeleteOpen,
              onConfirm: handleBulkDeleteItems,
              itemCount: itemTableState.selectedRows.length,
            }}
            onDuplicate={handleDuplicateItem}
            rowActions={(item: InvoiceItem) => [
              {
                key: 'edit',
                label: 'Edit',
                icon: <FileText className="h-4 w-4" />,
                onClick: () => {
                  if (invoiceId) {
                    navigate(`/invoices/${invoiceId}/items/${item.id}`);
                  }
                },
                variant: 'outline'
              },
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
