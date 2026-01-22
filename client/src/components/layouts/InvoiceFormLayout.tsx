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
import { Plus, Save, X, FileText, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, createIdColumn, createPositionColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Invoice, InvoiceItem, InsertInvoice, InsertInvoiceItem, Customer } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

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
      status: "pending",
      dueDate: "",
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
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

  const { data: fetchedInvoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoices", invoiceId, "items"],
    enabled: !!invoiceId,
  });

  useEffect(() => {
    if (invoice) {
      invoiceForm.reset({
        invoiceNumber: invoice.invoiceNumber || "",
        customerId: invoice.customerId || "",
        status: invoice.status || "pending",
        dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : "",
        invoiceDate: invoice.createdAt ? format(new Date(invoice.createdAt), "yyyy-MM-dd") : "",
        subtotal: invoice.subtotal || "0.00",
        taxAmount: invoice.taxAmount || "0.00",
        totalAmount: invoice.totalAmount || "0.00",
        paidAmount: invoice.paidAmount || "0.00",
        notes: invoice.notes || "",
      });
    }
  }, [invoice, invoiceForm]);

  useEffect(() => {
    if (fetchedInvoiceItems.length > 0) {
      setInvoiceItems(fetchedInvoiceItems);
    }
  }, [fetchedInvoiceItems]);

  const itemColumns = React.useMemo(() => [
    createPositionColumn(),
    createIdColumn('id', 'Line ID'),
    { 
      key: 'description', 
      label: 'Description', 
      visible: true, 
      width: 300, 
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

  const handleDeleteItem = (item: InvoiceItem) => {
    if (window.confirm(`Are you sure you want to delete this item?`)) {
      deleteItemMutation.mutate(item.id);
      setInvoiceItems(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const handleCancel = () => {
    window.dispatchEvent(new CustomEvent('close-form-tab', {
      detail: { tabId: invoiceId ? `edit-invoice-${invoiceId}` : 'new-invoice' }
    }));
  };

  const actionButtons = React.useMemo(() => {
    const buttons: Array<{
      key: string;
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      variant: 'default' | 'outline' | 'destructive';
      testId: string;
    }> = [
      {
        key: 'save',
        label: 'Save',
        icon: <Save className="h-4 w-4" />,
        onClick: () => invoiceForm.handleSubmit(handleSaveInvoice)(),
        variant: 'default',
        testId: 'button-save-invoice'
      },
    ];

    if (isEditing) {
      buttons.push({
        key: 'print',
        label: 'Print',
        icon: <Printer className="h-4 w-4" />,
        onClick: () => {
          toast({
            title: "Print",
            description: "Print functionality coming soon",
          });
        },
        variant: 'outline',
        testId: 'button-print-invoice'
      });
    }

    buttons.push({
      key: 'cancel',
      label: 'Cancel',
      icon: <X className="h-4 w-4" />,
      onClick: handleCancel,
      variant: 'outline',
      testId: 'button-cancel-invoice'
    });

    return buttons;
  }, [isEditing, invoiceForm, handleSaveInvoice, handleCancel, toast]);

  const formSections: any[] = [
    {
      id: "general",
      label: "General",
      rows: [
        createFieldsRow([
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
                value={invoiceForm.watch("customerId") || ""}
                onValueChange={(value) => invoiceForm.setValue("customerId", value)}
                customers={customers as any}
                testId="select-customer"
              />
            ),
            validation: {
              error: invoiceForm.formState.errors.customerId?.message,
              isRequired: true
            },
            testId: "field-customer"
          },
          {
            key: "invoiceDate",
            label: "Invoice Date",
            type: "date",
            placeholder: "dd-mm-yyyy",
            setValue: (value) => invoiceForm.setValue("invoiceDate", value),
            watch: () => invoiceForm.watch("invoiceDate"),
            validation: {
              error: invoiceForm.formState.errors.invoiceDate?.message
            },
            testId: "input-invoice-date"
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
            setValue: (value) => invoiceForm.setValue("status", value),
            watch: () => invoiceForm.watch("status"),
            validation: {
              error: invoiceForm.formState.errors.status?.message
            },
            testId: "select-status"
          },
          {
            key: "dueDate",
            label: "Due Date",
            type: "date",
            placeholder: "dd-mm-yyyy",
            setValue: (value) => invoiceForm.setValue("dueDate", value),
            watch: () => invoiceForm.watch("dueDate"),
            validation: {
              error: invoiceForm.formState.errors.dueDate?.message
            },
            testId: "input-due-date"
          },
        ]),
        {
          type: 'custom',
          customContent: (
            <div className="grid grid-cols-[130px_1fr] items-start gap-3 mt-4">
              <Label 
                htmlFor="notes" 
                className="text-sm font-medium text-right pt-2"
              >
                Notes
              </Label>
              <div>
                <Textarea
                  id="notes"
                  {...invoiceForm.register("notes")}
                  placeholder="Invoice notes..."
                  className="min-h-[80px]"
                  data-testid="textarea-invoice-notes"
                />
                {invoiceForm.formState.errors.notes && (
                  <span className="text-sm text-red-600 mt-1 block">
                    {invoiceForm.formState.errors.notes.message}
                  </span>
                )}
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: "amounts",
      label: "Amounts",
      rows: [
        createFieldsRow([
          {
            key: "subtotal",
            label: "Subtotal",
            type: "text",
            register: invoiceForm.register("subtotal"),
            validation: {
              error: invoiceForm.formState.errors.subtotal?.message,
              isRequired: true
            },
            testId: "input-subtotal"
          },
          {
            key: "taxAmount",
            label: "Tax Amount",
            type: "text",
            register: invoiceForm.register("taxAmount"),
            validation: {
              error: invoiceForm.formState.errors.taxAmount?.message
            },
            testId: "input-tax-amount"
          },
          {
            key: "totalAmount",
            label: "Total Amount",
            type: "text",
            register: invoiceForm.register("totalAmount"),
            validation: {
              error: invoiceForm.formState.errors.totalAmount?.message,
              isRequired: true
            },
            testId: "input-total-amount"
          },
          {
            key: "paidAmount",
            label: "Paid Amount",
            type: "text",
            register: invoiceForm.register("paidAmount"),
            validation: {
              error: invoiceForm.formState.errors.paidAmount?.message
            },
            testId: "input-paid-amount"
          },
        ]),
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
        actionButtons={actionButtons as any}
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
