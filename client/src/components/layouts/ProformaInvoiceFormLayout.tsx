import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LayoutForm2, type FormSection2, createFieldsRow, createCustomRow, createFieldRow, createSectionHeaderRow } from './LayoutForm2';
import { DocumentImagesPanel } from "@/components/ui/document-images-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSelect } from "@/components/ui/customer-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProformaInvoiceSchema, insertProformaInvoiceItemSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Save, X, FileText, Printer, CopyPlus, RefreshCw } from "lucide-react";
import { ProjectSelect } from "@/components/ui/project-select";
import { Input } from "@/components/ui/input";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { DataTableLayout, createIdColumn, createPositionColumn, createCurrencyColumn, type DirectInputConfig } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { ProformaInvoice, ProformaInvoiceItem, InsertProformaInvoice, InsertProformaInvoiceItem, Customer, PaymentDay, VatRate, InventoryItem, UnitOfMeasure } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";
import { amountToWords } from "@/utils/field-resolver";
import { PaymentDaySelectWithAdd } from "@/components/ui/payment-day-select-with-add";
import { addDays } from "date-fns";

const proformaFormSchema = insertProformaInvoiceSchema.omit({
  subtotal: true,
  taxAmount: true,
  totalAmount: true,
}).extend({
  subtotal: z.string().min(1, "Subtotaal is verplicht"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Totaalbedrag is verplicht"),
  totalAmountInWords: z.string().optional(),
  paidAmount: z.string().optional(),
  vatRatePercent: z.string().optional(),
  dueDate: z.string().optional(),
  invoiceDate: z.string().optional(),
  paymentDaysId: z.string().optional(),
  incotermId: z.string().optional(),
});

const proformaItemFormSchema = insertProformaInvoiceItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs is verplicht"),
  lineTotal: z.string().min(1, "Regeltotaal is verplicht"),
});

type ProformaFormData = z.infer<typeof proformaFormSchema>;
type ProformaItemFormData = z.infer<typeof proformaItemFormSchema>;

interface ProformaInvoiceFormLayoutProps {
  onSave: () => void;
  invoiceId?: string;
  parentId?: string;
}

export function ProformaInvoiceFormLayout({ onSave, invoiceId, parentId }: ProformaInvoiceFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [, navigate] = useLocation();
  const [lineItems, setLineItems] = useState<ProformaInvoiceItem[]>([]);
  const [deleteItemTarget, setDeleteItemTarget] = useState<ProformaInvoiceItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [vatRatePercent, setVatRatePercent] = useState<number>(0);
  const [customerLanguageCode, setCustomerLanguageCode] = useState<string>('nl');
  const { toast } = useToast();
  const { dialogOpen: validDialogOpen, setDialogOpen: setValidDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    proformaNumber: { label: "Proformanummer" },
    invoiceDate: { label: "Factuurdatum" },
    customerId: { label: "Klant" },
    subtotal: { label: "Subtotaal" },
    totalAmount: { label: "Totaal" },
  });
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | undefined>(invoiceId);
  const isEditing = !!currentInvoiceId;

  const invoiceForm = useForm<ProformaFormData>({
    resolver: zodResolver(proformaFormSchema),
    mode: 'onBlur',
    defaultValues: {
      proformaNumber: "",
      customerId: "",
      projectId: "",
      description: "",
      paymentDaysId: "",
      status: "concept",
      dueDate: "",
      invoiceDate: toDisplayDate(new Date()),
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      totalAmountInWords: "",
      paidAmount: "0.00",
      vatRatePercent: "",
      notes: "",
      printSortOrder: "position",
      printLanguageCode: "nl",
      incotermId: "",
    },
  });

  const watchedPrintLanguageCode = invoiceForm.watch("printLanguageCode" as any) as string | undefined;

  const { data: invoice, isLoading: invoiceLoading } = useQuery<ProformaInvoice>({
    queryKey: ["/api/proforma-invoices", currentInvoiceId],
    enabled: !!currentInvoiceId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: unitsOfMeasure = [] } = useQuery<UnitOfMeasure[]>({
    queryKey: ["/api/masterdata/units-of-measure"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: paymentDaysList = [] } = useQuery<PaymentDay[]>({
    queryKey: ["/api/masterdata/payment-days"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: vatRates = [] } = useQuery<VatRate[]>({
    queryKey: ["/api/masterdata/vat-rates"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: incotermsList = [] } = useQuery<any[]>({
    queryKey: ["/api/masterdata/incoterms"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedItems = [] } = useQuery<ProformaInvoiceItem[]>({
    queryKey: ["/api/proforma-invoices", currentInvoiceId, "items"],
    enabled: !!currentInvoiceId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const { data: nextNumberData, refetch: refetchNextNumber } = useQuery<{ number: string }>({
    queryKey: ["/api/proforma-invoices/next-number"],
    enabled: !isEditing,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isEditing && nextNumberData?.number && !invoiceForm.getValues("proformaNumber")) {
      invoiceForm.setValue("proformaNumber", nextNumberData.number);
    }
  }, [nextNumberData, isEditing]);

  const formInitializedForId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (invoice && formInitializedForId.current !== invoice.id) {
      formInitializedForId.current = invoice.id;
      invoiceForm.reset({
        proformaNumber: invoice.proformaNumber || "",
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
        paidAmount: (invoice as any).paidAmount || "0.00",
        vatRatePercent: (invoice as any).vatRatePercent ? parseFloat(String((invoice as any).vatRatePercent)).toString() : "",
        notes: invoice.notes || "",
        printSortOrder: (invoice as any).printSortOrder || "position",
        printLanguageCode: (invoice as any).printLanguageCode || "nl",
        printProjectNo: (invoice as any).printProjectNo ?? true,
        printPaymentConditions: (invoice as any).printPaymentConditions ?? true,
        printLineImages: (invoice as any).printLineImages ?? false,
        incotermId: (invoice as any).incotermId || "",
      } as any);
    }
  }, [invoice]);

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
    if (vatRate) {
      const pct = parseFloat(String(vatRate.rate));
      setVatRatePercent(pct);
      invoiceForm.setValue("vatRatePercent", parseFloat(String(vatRate.rate)).toString());
    }
  }, [invoice, vatRates, customers]);

  useEffect(() => {
    if (fetchedItems.length > 0) {
      setLineItems(fetchedItems);
    }
  }, [fetchedItems]);

  const recalculateTotals = useCallback((items: typeof lineItems) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.lineTotal || "0") || 0);
    }, 0);
    invoiceForm.setValue("subtotal", subtotal.toFixed(2));
    const taxAmount = subtotal * vatRatePercent / 100;
    invoiceForm.setValue("taxAmount", taxAmount.toFixed(2));
    const total = subtotal + taxAmount;
    invoiceForm.setValue("totalAmount", total.toFixed(2));
    const lang = watchedPrintLanguageCode || customerLanguageCode || 'nl';
    invoiceForm.setValue("totalAmountInWords", amountToWords(total, lang));
  }, [vatRatePercent, customerLanguageCode, watchedPrintLanguageCode, invoiceForm]);

  useEffect(() => {
    recalculateTotals(lineItems);
  }, [lineItems, vatRatePercent]);

  const totalCost = React.useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(String(item.quantity || "0")) || 0;
      const cost = parseFloat(String((item as any).costPrice || "0")) || 0;
      return sum + (qty * cost);
    }, 0);
  }, [lineItems]);

  const totalMargin = React.useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (parseFloat(item.lineTotal || "0") || 0);
    }, 0);
    return subtotal - totalCost;
  }, [lineItems, totalCost]);

  useEffect(() => {
    const lang = watchedPrintLanguageCode || customerLanguageCode || 'nl';
    const total = parseFloat(invoiceForm.getValues("totalAmount") || "0") || 0;
    invoiceForm.setValue("totalAmountInWords", amountToWords(total, lang));
  }, [customerLanguageCode, watchedPrintLanguageCode]);

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
    const vatRate = vatRates.find(v => v.id === (customer as any)?.vatRateId);
    const pct = vatRate ? parseFloat(String(vatRate.rate)) : 0;
    setVatRatePercent(pct);
    invoiceForm.setValue("vatRatePercent", pct > 0 ? pct.toString() : "");
    const lang = (customer as any)?.languageCode || 'nl';
    setCustomerLanguageCode(lang);
    invoiceForm.setValue("printLanguageCode" as any, lang);
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

  const handleRefreshCustomer = async () => {
    if (!currentInvoiceId) {
      toast({ title: "Sla de proforma factuur eerst op", description: "Bewaar de proforma factuur voordat je de klantgegevens synchroniseert.", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", `/api/proforma-invoices/${currentInvoiceId}/refresh-customer`);
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId] });
      toast({ title: "Klantgegevens bijgewerkt", description: "De adresgegevens van de klant zijn gesynchroniseerd." });
    } catch {
      toast({ title: "Fout", description: "Synchronisatie mislukt.", variant: "destructive" });
    }
  };

  const handleInvoiceDateChange = (value: string) => {
    invoiceForm.setValue("invoiceDate", value);
  };

  const itemColumns = React.useMemo(() => [
    createPositionColumn(),
    {
      key: 'lineType',
      label: 'Type',
      visible: true,
      width: 100,
      filterable: true,
      sortable: true,
    },
    {
      key: 'itemId',
      label: 'Artikel',
      visible: true,
      forceVisible: true,
      width: 200,
      filterable: true,
      sortable: true,
      renderCell: (value: any) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const item = inventoryItems.find((i: any) => i.id === value);
        return <span>{item ? `${item.sku || ''} - ${item.name || ''}`.trim() : value}</span>;
      }
    },
    {
      key: 'description',
      label: 'Omschrijving',
      visible: true,
      width: 250,
      filterable: true,
      sortable: true
    },
    { 
      key: 'quantity', 
      label: 'Aantal', 
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
      label: 'Eenheid',
      visible: true,
      width: 80,
      filterable: false,
      sortable: false
    },
    createCurrencyColumn('unitPrice', 'Prijs'),
    {
      key: 'discountPercent',
      label: 'Kort. %',
      visible: true,
      width: 70,
      filterable: false,
      sortable: true,
      align: 'right' as const,
      renderCell: (value: any) => {
        const disc = parseFloat(String(value || "0")) || 0;
        return disc > 0 ? `${disc}%` : '';
      }
    },
    {
      key: 'netUnitPrice',
      label: 'Netto Prijs',
      visible: true,
      width: 100,
      filterable: false,
      sortable: true,
      align: 'right' as const,
      renderCell: (_value: any, row: any) => {
        const unitPrice = parseFloat(row.unitPrice || "0") || 0;
        const discount = parseFloat(row.discountPercent || "0") || 0;
        const net = discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice;
        return `€\u00A0${net.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    },
    createCurrencyColumn('costPrice', 'Kostprijs', 100),
    {
      key: 'costPriceTotal',
      label: 'Regelkosten',
      visible: true,
      width: 100,
      filterable: false,
      sortable: true,
      renderCell: (_value: any, row: any) => {
        const qty = parseFloat(row.quantity || "0") || 0;
        const cost = parseFloat(row.costPrice || "0") || 0;
        const total = qty * cost;
        return <span className="text-right w-full block">{`€ ${total.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>;
      }
    },
    createCurrencyColumn('lineTotal', 'Regeltotaal'),
    {
      key: 'margin',
      label: 'Marge',
      visible: true,
      width: 100,
      filterable: false,
      sortable: true,
      getValue: (row: any) => {
        const lineTotal = parseFloat(row.lineTotal || "0") || 0;
        const qty = parseFloat(row.quantity || "0") || 0;
        const cost = parseFloat(row.costPrice || "0") || 0;
        return lineTotal - (qty * cost);
      },
      renderCell: (_value: any, row: any) => {
        const lineTotal = parseFloat(row.lineTotal || "0") || 0;
        const qty = parseFloat(row.quantity || "0") || 0;
        const cost = parseFloat(row.costPrice || "0") || 0;
        const margin = lineTotal - (qty * cost);
        return <span className={`text-right w-full block ${margin < 0 ? 'text-red-600 font-medium' : ''}`}>{`€ ${margin.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>;
      }
    },
  ], [inventoryItems]);

  const itemTableState = useDataTable({
    defaultColumns: itemColumns,
    tableKey: 'proforma-invoice-items'
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProformaInvoice) => {
      const response = await apiRequest("POST", "/api/proforma-invoices", data);
      return response.json();
    },
    onSuccess: async (newInvoice) => {
      setCurrentInvoiceId(newInvoice.id);
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Aangemaakt", description: "Proforma factuur aangemaakt" });
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: { entityType: 'proforma-invoice', entity: newInvoice, parentId }
      }));
    },
    onError: (error: Error) => {
      let description = "Kan proforma factuur niet aanmaken";
      try {
        const jsonStr = error.message.replace(/^\d+:\s*/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) description = parsed.message;
      } catch {}
      toast({ title: "Fout", description, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertProformaInvoice>) => {
      const response = await apiRequest("PUT", `/api/proforma-invoices/${currentInvoiceId}`, data);
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Opgeslagen", description: "Proforma factuur bijgewerkt" });
    },
    onError: (error: Error) => {
      let description = "Kan proforma factuur niet bijwerken";
      try {
        const jsonStr = error.message.replace(/^\d+:\s*/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed.message) description = parsed.message;
      } catch {}
      toast({ title: "Fout", description, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/proforma-invoice-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId, "items"] });
      toast({ title: "Verwijderd", description: "Regel verwijderd" });
    },
    onError: () => {
      toast({ title: "Fout", description: "Kan regel niet verwijderen", variant: "destructive" });
    },
  });

  const directInput = React.useMemo<DirectInputConfig | undefined>(() => {
    if (!currentInvoiceId) return undefined;
    const usedNumbers = new Set<number>();
    let maxNumber = 0;
    for (const item of lineItems) {
      const num = parseInt(item.positionNo || '0', 10);
      if (!isNaN(num) && num > 0) {
        usedNumbers.add(num);
        if (num > maxNumber) maxNumber = num;
      }
    }
    let nextPosition = 10;
    for (let n = 10; n <= maxNumber; n += 10) {
      if (!usedNumbers.has(n)) { nextPosition = n; break; }
      nextPosition = n + 10;
    }
    return {
      columns: [
        { key: 'lineType', fieldType: 'select', defaultValue: '', options: [
          { value: 'standard', label: 'Standaard' },
          { value: 'unique', label: 'Uniek' },
          { value: 'text', label: 'Tekst' },
          { value: 'charges', label: 'Toeslagen' },
        ]},
        { key: 'itemId', 
          fieldType: 'searchable-select', 
          placeholder: 'Zoek artikel...', 
          enabledWhen: (r) => !!r.lineType && r.lineType !== 'text',
          options: inventoryItems.map(item => ({ 
            value: item.id, 
            label: `${item.sku || ''} - ${item.description || item.name || ''}`.trim()
          })),
          onSelect: (val) => {
            const item = inventoryItems.find(i => i.id === val);
            if (!item) return {};
            return {
              itemId: item.id,
              description: item.description || item.name || '',
              unitPrice: item.unitPrice || '0.00',
              costPrice: item.costPrice || '0.00',
              unit: item.unit || 'Pcs.',
            };
          },
        },
        { key: 'description', fieldType: 'text', placeholder: 'Omschrijving', enabledWhen: (r) => !!r.lineType },
        { key: 'quantity', fieldType: 'number', defaultValue: '1', placeholder: 'Aantal', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
        { key: 'unit', fieldType: 'select', defaultValue: 'Pcs.', placeholder: 'Eenheid', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text',
          options: unitsOfMeasure.filter(u => u.isActive !== false).map(u => ({ value: u.code, label: u.code })),
        },
        { key: 'unitPrice', fieldType: 'currency', defaultValue: '0.00', placeholder: 'Prijs', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
        { key: 'discountPercent', fieldType: 'number', defaultValue: '0', placeholder: 'Korting %', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
        { key: 'costPrice', fieldType: 'currency', defaultValue: '0.00', placeholder: 'Kostprijs', enabledWhen: (r) => !!r.lineType && r.lineType !== 'text' },
      ],
      defaults: {
        positionNo: String(nextPosition).padStart(3, '0'),
        position: nextPosition,
        lineType: '',
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
        const usedNums = new Set<number>();
        let maxNum = 0;
        for (const li of lineItems) {
          const n = parseInt(li.positionNo || '0', 10);
          if (!isNaN(n) && n > 0) { usedNums.add(n); if (n > maxNum) maxNum = n; }
        }
        let np = 10;
        for (let n = 10; n <= maxNum; n += 10) {
          if (!usedNums.has(n)) { np = n; break; }
          np = n + 10;
        }
        const itemData = {
          proformaInvoiceId: currentInvoiceId!,
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
        };
        await apiRequest("POST", `/api/proforma-invoices/${currentInvoiceId}/items`, itemData);
        queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId, "items"] });
      },
      onUpdate: async (rowId, rowData) => {
        const qty = parseFloat(rowData.quantity || '0') || 0;
        const price = parseFloat(rowData.unitPrice || '0') || 0;
        const disc = parseFloat(rowData.discountPercent || '0') || 0;
        const netPrice = disc > 0 ? price * (1 - disc / 100) : price;
        const lineTotal = (qty * netPrice).toFixed(2);
        const updateData: any = {};
        for (const [k, v] of Object.entries(rowData)) {
          updateData[k] = v;
        }
        updateData.lineTotal = lineTotal;
        await apiRequest("PUT", `/api/proforma-invoice-items/${rowId}`, updateData);
        queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId, "items"] });
      },
    };
  }, [currentInvoiceId, lineItems, inventoryItems, unitsOfMeasure]);

  const handleSave = (data: ProformaFormData) => {
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
      incotermId: data.incotermId || null,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDeleteItem = (item: ProformaInvoiceItem) => {
    setDeleteItemTarget(item);
  };

  const confirmDeleteItem = () => {
    if (!deleteItemTarget) return;
    deleteItemMutation.mutate(deleteItemTarget.id);
    setLineItems(prev => prev.filter(i => i.id !== deleteItemTarget.id));
    setDeleteItemTarget(null);
  };

  const handleBulkDeleteItems = async () => {
    const selectedIds = itemTableState.selectedRows;
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => apiRequest("DELETE", `/api/proforma-invoice-items/${id}`)));
      setLineItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
      itemTableState.setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId, "items"] });
      toast({ title: "Verwijderd", description: `${selectedIds.length} regel(s) verwijderd` });
    } catch {
      toast({ title: "Fout", description: "Kan geselecteerde regels niet verwijderen", variant: "destructive" });
    } finally {
      setIsBulkDeleteOpen(false);
    }
  };

  const handleDuplicateItem = async (item: ProformaInvoiceItem) => {
    if (!currentInvoiceId) return;
    try {
      const { id, ...duplicateData } = item as any;
      const nextPosition = lineItems.length > 0
        ? String(Math.max(...lineItems.map(i => parseInt(String(i.position || '0'), 10))) + 10).padStart(3, '0')
        : '010';
      const response = await apiRequest("POST", `/api/proforma-invoices/${currentInvoiceId}/items`, {
        ...duplicateData,
        position: nextPosition,
        description: `${duplicateData.description || ''} (Kopie)`,
      });
      const newItem = await response.json();
      setLineItems(prev => [...prev, newItem]);
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices", currentInvoiceId, "items"] });
      toast({ title: "Gedupliceerd", description: "Regel gedupliceerd" });
    } catch (error) {
      toast({ title: "Fout", description: "Kan regel niet dupliceren", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    window.dispatchEvent(new CustomEvent('close-form-tab', {
      detail: { tabId: currentInvoiceId ? `edit-proforma-invoice-${currentInvoiceId}` : 'new-proforma-invoice' }
    }));
  };

  const toolbar = useFormToolbar({
    entityType: "proforma-invoice",
    entityId: currentInvoiceId,
    onSave: invoiceForm.handleSubmit(handleSave, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const formSections: any[] = [
    {
      id: "general",
      label: "Algemeen",
      rows: [
        {
          type: 'two-column' as const,
          leftColumn: [
            {
              key: "proformaNumber",
              label: "Nummer",
              type: "custom",
              customComponent: (
                <div className="flex gap-1 items-center">
                  <Input
                    {...invoiceForm.register("proformaNumber")}
                    className={`h-10 text-xs flex-1 ${invoiceForm.formState.errors.proformaNumber ? 'border-red-500' : ''}`}
                    placeholder="PFI-2026-001"
                    data-testid="input-proforma-number"
                  />
                  {!isEditing && (
                    <button
                      type="button"
                      title="Nieuw beschikbaar nummer ophalen"
                      onClick={async () => {
                        const result = await refetchNextNumber();
                        if (result.data?.number) {
                          invoiceForm.setValue("proformaNumber", result.data.number);
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
              testId: "input-proforma-number"
            },
            {
              key: "customerId",
              label: "Klant",
              type: "custom",
              customComponent: (
                <CustomerSelect
                  value={invoiceForm.watch("customerId")}
                  onValueChange={(value) => handleCustomerChange(value)}
                  placeholder="Selecteer klant..."
                  testId="select-proforma-customer"
                  customers={customers.map(c => ({
                    id: c.id,
                    customerNumber: (c as any).customerNumber || '',
                    name: c.name,
                    email: (c as any).generalEmail || (c as any).email || undefined,
                    phone: (c as any).phone || undefined,
                  }))}
                  parentId={currentInvoiceId || 'new-proforma-invoice'}
                  onRefreshCustomer={handleRefreshCustomer}
                />
              ),
            },
            {
              key: "invoiceDate",
              label: "Factuurdatum",
              type: "date",
              placeholder: "dd-mm-jjjj",
              setValue: (value: string) => handleInvoiceDateChange(value),
              watch: () => invoiceForm.watch("invoiceDate"),
              testId: "input-invoice-date"
            },
            {
              key: "paymentDaysId",
              label: "Betaaldagen",
              type: "custom",
              customComponent: (
                <PaymentDaySelectWithAdd
                  value={invoiceForm.watch("paymentDaysId") || ""}
                  onValueChange={(value) => handlePaymentDaysChange(value)}
                  language="nl"
                  placeholder="Selecteer betaaldagen..."
                  testId="select-payment-days"
                />
              ),
            },
            {
              key: "dueDate",
              label: "Vervaldatum",
              type: "date",
              placeholder: "dd-mm-jjjj",
              setValue: (value: string) => invoiceForm.setValue("dueDate", value),
              watch: () => invoiceForm.watch("dueDate"),
              testId: "input-due-date"
            },
            {
              key: "incotermId",
              label: "Incoterm",
              type: "select",
              options: incotermsList.map((i: any) => ({ value: i.id, label: `${i.code} - ${i.description || ''}`.trim() })),
              setValue: (value: string) => invoiceForm.setValue("incotermId", value),
              watch: () => invoiceForm.watch("incotermId"),
              testId: "select-incoterm"
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "concept", label: "Concept" },
                { value: "sent", label: "Verzonden" },
                { value: "approved", label: "Goedgekeurd" },
                { value: "pending", label: "In behandeling" },
                { value: "paid", label: "Betaald" },
                { value: "overdue", label: "Verlopen" },
                { value: "cancelled", label: "Geannuleerd" }
              ],
              setValue: (value: string) => invoiceForm.setValue("status", value),
              watch: () => invoiceForm.watch("status"),
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
                  placeholder="Selecteer project..."
                  testId="select-project"
                  customerId={invoiceForm.watch("customerId") || undefined}
                />
              ),
            },
            {
              key: "description",
              label: "Omschrijving",
              type: "textarea",
              placeholder: "Omschrijving proforma factuur...",
              register: invoiceForm.register("description"),
              testId: "input-description"
            },
            {
              key: "notes",
              label: "Notities",
              type: "textarea",
              placeholder: "Notities...",
              register: invoiceForm.register("notes"),
              testId: "textarea-notes"
            },
          ],
        },
      ]
    },
    {
      id: "amounts",
      label: "Bedragen",
      rows: [
        createFieldRow({
          key: "vatRatePercent" as any,
          label: "BTW tarief",
          type: "display",
          displayValue: invoiceForm.watch("vatRatePercent") ? `${invoiceForm.watch("vatRatePercent")}%` : "—",
          testId: "display-vat-rate-percent"
        } as any),
        createFieldRow({
          key: "subtotal" as any,
          label: "Subtotaal",
          type: "display",
          displayValue: `€ ${invoiceForm.watch("subtotal") || "0.00"}`,
          testId: "display-subtotal"
        } as any),
        createFieldRow({
          key: "totalCost" as any,
          label: "Totale kosten",
          type: "display",
          displayValue: `€ ${totalCost.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          testId: "display-total-cost"
        } as any),
        createFieldRow({
          key: "totalMargin" as any,
          label: "Marge",
          type: "display",
          displayValue: `€ ${totalMargin.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          testId: "display-total-margin"
        } as any),
        createFieldRow({
          key: "taxAmount" as any,
          label: vatRatePercent > 0 ? `BTW bedrag (${vatRatePercent}%)` : "BTW bedrag",
          type: "display",
          displayValue: `€ ${invoiceForm.watch("taxAmount") || "0.00"}`,
          testId: "display-vat-amount"
        } as any),
        createFieldRow({
          key: "totalAmount" as any,
          label: "Totaalbedrag",
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
          label: "Betaald bedrag",
          type: "text",
          register: invoiceForm.register("paidAmount"),
          testId: "input-paid-amount"
        })
      ]
    },
    {
      id: "printSettings",
      label: "Afdrukinstellingen",
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
              onValueChange={(value) => {
                invoiceForm.setValue("printLanguageCode" as any, value);
                const total = parseFloat(invoiceForm.getValues("totalAmount") || "0") || 0;
                if (total > 0) {
                  invoiceForm.setValue("totalAmountInWords", amountToWords(total, value));
                }
              }}
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
        createFieldRow({
          key: "printLineImages",
          label: "Regelafbeeldingen afdrukken",
          type: "checkbox",
          watch: () => invoiceForm.watch("printLineImages" as any) || false,
          setValue: (checked) => invoiceForm.setValue("printLineImages" as any, checked === true),
          testId: "checkbox-print-line-images"
        }),
      ]
    },
    {
      id: "images",
      label: "Afbeeldingen",
      rows: [
        {
          type: "custom" as const,
          customContent: currentInvoiceId ? (
            <DocumentImagesPanel documentType="proforma-invoice" documentId={currentInvoiceId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-gray-50">
              <p className="text-sm">Sla de proforma factuur eerst op om afbeeldingen te kunnen toevoegen.</p>
            </div>
          ),
        },
      ],
    },
  ];

  return (
    <div>
      <LayoutForm2
        sections={formSections}
        activeSection={activeTab}
        onSectionChange={setActiveTab}
        form={invoiceForm}
        onSubmit={handleSave}
        toolbar={toolbar}
        documentType="proforma-invoice"
        entityId={currentInvoiceId}
        isLoading={invoiceLoading}
      />
      {isEditing && (
        <div className="px-6 py-4 pb-10 bg-white ml-[15px] mr-[15px]">
          <DataTableLayout
            data={lineItems}
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
              const allIds = lineItems.map(item => item.id);
              itemTableState.toggleAllRows(allIds);
            }}
            getRowId={(item: ProformaInvoiceItem) => item.id}
            entityName="Proforma Regel"
            entityNamePlural="Proforma Regels"
            applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
            applySorting={itemTableState.applySorting}
            compact={true}
            onRowDoubleClick={(item: ProformaInvoiceItem) => {
              if (currentInvoiceId) {
                navigate(`/proforma-invoices/${currentInvoiceId}/items/${item.id}`);
              }
            }}
            headerActions={[
              {
                key: 'add-item',
                label: 'REGEL TOEVOEGEN',
                icon: <Plus className="h-4 w-4" />,
                onClick: () => {
                  if (currentInvoiceId) {
                    navigate(`/proforma-invoices/${currentInvoiceId}/items/new`);
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
            directInput={directInput}
            rowActions={(item: ProformaInvoiceItem) => [
              {
                key: 'edit',
                label: 'Bewerken',
                icon: <FileText className="h-4 w-4" />,
                onClick: () => {
                  if (currentInvoiceId) {
                    navigate(`/proforma-invoices/${currentInvoiceId}/items/${item.id}`);
                  }
                },
                variant: 'outline'
              },
              {
                key: 'delete',
                label: 'Verwijderen',
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
      <ValidationErrorDialog
        open={validDialogOpen}
        onOpenChange={setValidDialogOpen}
        errors={validErrors}
        onShowFields={() => handleShowFields(setActiveTab as any, setActiveTab as any)}
      />
    </div>
  );
}
