import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Receipt, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Invoice, Customer } from "@shared/schema";
import { format } from "date-fns";

// Default column configuration for invoices
const defaultColumns: ColumnConfig[] = [
  createIdColumn('invoiceNumber', 'Invoice #'),
  { 
    key: 'customerName', 
    label: 'Customer', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Invoice & { customerName?: string }) => (
      <span data-testid={`text-customer-${row.id}`}>{value || "Unknown Customer"}</span>
    )
  },
  { 
    key: 'createdAt', 
    label: 'Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Invoice) => (
      <div className="flex items-center space-x-2" data-testid={`text-date-${row.id}`}>
        <Calendar size={14} />
        <span>{value ? format(new Date(value), "MMM dd, yyyy") : "-"}</span>
      </div>
    )
  },
  { 
    key: 'dueDate', 
    label: 'Due Date', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Invoice) => (
      <div className="flex items-center space-x-2" data-testid={`text-due-date-${row.id}`}>
        {value ? (
          <>
            <Calendar size={14} />
            <span>{format(new Date(value), "MMM dd, yyyy")}</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>
    )
  },
  { 
    key: 'totalAmount', 
    label: 'Total Amount', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: string, row: Invoice) => (
      <div className="flex items-center space-x-2" data-testid={`text-total-${row.id}`}>
        <DollarSign size={14} />
        <span>${value}</span>
      </div>
    )
  },
  { 
    key: 'paidAmount', 
    label: 'Paid Amount', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: string, row: Invoice) => (
      <div className="flex items-center space-x-2" data-testid={`text-paid-${row.id}`}>
        <DollarSign size={14} />
        <span>${value}</span>
      </div>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: Invoice) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "paid": return "default";
          case "pending": return "secondary";
          case "overdue": return "destructive";
          case "cancelled": return "outline";
          default: return "secondary";
        }
      };
      return (
        <Badge variant={getStatusVariant(value || "pending")} data-testid={`badge-status-${row.id}`}>
          {value}
        </Badge>
      );
    }
  },
];

export default function Invoices() {
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'createdAt', direction: 'desc' },
    tableKey: 'invoices'
  });

  // Optimized data fetching with stable loading state
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  // Combined loading state
  const isLoading = invoicesLoading || customersLoading;

  // Customer name lookup - memoized to prevent re-creation
  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  // Enhanced data with customer names - stabilized with useMemo
  const enhancedInvoices = React.useMemo(() => {
    return invoices.map(invoice => ({
      ...invoice,
      customerName: getCustomerName(invoice.customerId || '')
    }));
  }, [invoices, getCustomerName]);

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

  const handleEdit = (invoice: Invoice) => {
    // Dispatch custom event to open invoice edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-invoice-${invoice.id}`,
        name: `${invoice.invoiceNumber}`,
        formType: 'invoice',
        parentId: invoice.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewInvoice = () => {
    // Dispatch custom event to open invoice form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-invoice',
        name: 'New Invoice',
        formType: 'invoice'
      }
    });
    window.dispatchEvent(event);
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
      <div className="p-1 md:p-6 space-y-6">
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
    <div className="p-1 md:p-6 space-y-6">
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
        
        <Button onClick={handleNewInvoice} data-testid="button-add-invoice">
          <Plus className="mr-2" size={16} />
          Add Invoice
        </Button>
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
