import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer } from "@/components/quick-add-forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Receipt, Search, Calendar, DollarSign, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutForm2, createFieldRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
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

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [activeSection, setActiveSection] = useState('general');
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingInvoice(null);
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInvoice> }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingInvoice(null);
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertInvoice = {
      ...data,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount || "0",
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount || "0",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.reset({
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      status: invoice.status || "pending",
      dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), "yyyy-MM-dd") : undefined,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount || "0",
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount || "0",
      notes: invoice.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "pending": return "secondary";
      case "overdue": return "destructive";
      case "cancelled": return "outline";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Image */}
      <Card>
        <CardContent className="p-0">
          <img 
            src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Modern corporate office workspace" 
            className="rounded-lg w-full h-48 object-cover" 
          />
        </CardContent>
      </Card>

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-invoices"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewInvoice} data-testid="button-add-invoice">
              <Plus className="mr-2" size={16} />
              Add Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Form to {editingInvoice ? "edit existing invoice" : "create new invoice"}
              </DialogDescription>
            </DialogHeader>
            
            <LayoutForm2
              sections={[
                {
                  id: 'general',
                  label: 'Invoice Details',
                  rows: [
                    createSectionHeaderRow<FormData>('Basic Information'),
                    createFieldRow<FormData>({
                      key: 'invoiceNumber',
                      label: 'Invoice Number',
                      type: 'text',
                      placeholder: 'INV-2024-0001',
                      register: form.register('invoiceNumber'),
                      validation: { 
                        isRequired: true,
                        error: form.formState.errors.invoiceNumber?.message 
                      },
                      testId: 'input-invoice-number'
                    }),
                    createFieldRow<FormData>({
                      key: 'customerId',
                      label: 'Customer',
                      type: 'custom',
                      validation: { 
                        isRequired: true,
                        error: form.formState.errors.customerId?.message 
                      },
                      customComponent: (
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
                            <div key={customer.id} value={customer.id}>
                              {customer.name}
                            </div>
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
                        { value: 'paid', label: 'Paid' },
                        { value: 'overdue', label: 'Overdue' },
                        { value: 'cancelled', label: 'Cancelled' }
                      ],
                      setValue: (value) => form.setValue('status', value),
                      watch: () => form.watch('status'),
                      testId: 'select-status'
                    }),
                    createFieldRow<FormData>({
                      key: 'dueDate',
                      label: 'Due Date',
                      type: 'text',
                      placeholder: 'YYYY-MM-DD',
                      register: form.register('dueDate'),
                      testId: 'input-due-date'
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
                      key: 'paidAmount',
                      label: 'Paid Amount',
                      type: 'text',
                      placeholder: '0.00',
                      register: form.register('paidAmount'),
                      testId: 'input-paid-amount'
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
              actionButtons={[
                {
                  key: 'cancel',
                  label: 'Cancel',
                  icon: <ArrowLeft size={14} />,
                  onClick: () => setIsDialogOpen(false),
                  variant: 'outline',
                  testId: 'button-cancel'
                },
                {
                  key: 'save',
                  label: editingInvoice ? 'Update Invoice' : 'Create Invoice',
                  icon: <Save size={14} />,
                  onClick: form.handleSubmit(onSubmit),
                  variant: 'default',
                  testId: 'button-save'
                }
              ]}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="mr-2" size={20} />
            Invoices ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create your first invoice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const customer = customers?.find(c => c.id === invoice.customerId);
                    return (
                      <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{customer?.name || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar size={14} />
                            <span>{format(new Date(invoice.createdAt!), "MMM dd, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <DollarSign size={14} />
                            <span>${invoice.totalAmount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <DollarSign size={14} />
                            <span>${invoice.paidAmount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(invoice.status || "pending")}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(invoice)}
                              data-testid={`button-edit-${invoice.id}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(invoice.id)}
                              data-testid={`button-delete-${invoice.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
