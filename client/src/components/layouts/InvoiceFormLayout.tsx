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
import { Plus, Save, X, FileText, Printer, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { DataTableLayout, createIdColumn, createPositionColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Invoice, InvoiceItem, InsertInvoice, InsertInvoiceItem, Customer, PaymentDay, Project } from "@shared/schema";
import { z } from "zod";
import { toDisplayDate, toStorageDate } from "@/lib/date-utils";
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

export function InvoiceFormLayout({ onSave, invoiceId, parentId }: InvoiceFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [, navigate] = useLocation();
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
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
      paidAmount: "0.00",
      notes: "",
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

  const { data: fetchedInvoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoices", invoiceId, "items"],
    enabled: !!invoiceId,
  });

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
        paidAmount: invoice.paidAmount || "0.00",
        notes: invoice.notes || "",
      });
    }
  }, [invoice]);

  useEffect(() => {
    if (fetchedInvoiceItems.length > 0) {
      setInvoiceItems(fetchedInvoiceItems);
    }
  }, [fetchedInvoiceItems]);

  useEffect(() => {
    const subtotal = invoiceItems.reduce((sum, item) => {
      return sum + (parseFloat(item.lineTotal || "0") || 0);
    }, 0);
    const taxAmount = parseFloat(invoiceForm.getValues("taxAmount") || "0") || 0;
    invoiceForm.setValue("subtotal", subtotal.toFixed(2));
    invoiceForm.setValue("totalAmount", (subtotal + taxAmount).toFixed(2));
  }, [invoiceItems]);

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
      className: 'text-right'
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
    onSuccess: (newInvoice) => {
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
    if (window.confirm(`Are you sure you want to delete this item?`)) {
      deleteItemMutation.mutate(item.id);
      setInvoiceItems(prev => prev.filter(i => i.id !== item.id));
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
              type: "text",
              register: invoiceForm.register("invoiceNumber"),
              validation: {
                error: invoiceForm.formState.errors.invoiceNumber?.message,
                isRequired: true
              },
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
          key: "taxAmount",
          label: "Tax Amount",
          type: "text",
          register: invoiceForm.register("taxAmount"),
          validation: {
            error: invoiceForm.formState.errors.taxAmount?.message
          },
          testId: "input-tax-amount"
        }),
        createFieldRow({
          key: "totalAmount" as any,
          label: "Total Amount",
          type: "display",
          displayValue: `€ ${invoiceForm.watch("totalAmount") || "0.00"}`,
          testId: "display-total-amount"
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
              value={invoiceForm.watch("printSortOrder" as any) || "position"}
              onValueChange={(value) => invoiceForm.setValue("printSortOrder" as any, value)}
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
        <div className="px-6 py-4 bg-white ml-[15px] mr-[15px]">
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
    </div>
  );
}
