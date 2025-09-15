import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSalesOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SalesOrder, InsertSalesOrder, Customer } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { DataTableLayout, createIdColumn, type ColumnConfig } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";

const formSchema = insertSalesOrderSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const defaultColumns: ColumnConfig[] = [
  createIdColumn('orderNumber', 'Order Number'),
  { 
    key: 'customerName', 
    label: 'Customer', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder & { customerName?: string }) => (
      <span data-testid={`text-customer-${row.id}`}>{value || "Unknown Customer"}</span>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "completed": return "default";
          case "shipped": return "secondary";
          case "pending": return "outline";
          case "cancelled": return "destructive";
          default: return "outline";
        }
      };
      return (
        <Badge variant={getStatusVariant(value || "")} data-testid={`badge-status-${row.id}`}>
          {value}
        </Badge>
      );
    }
  },
  { 
    key: 'orderDate', 
    label: 'Order Date', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-order-date-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'expectedDeliveryDate', 
    label: 'Expected Delivery', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-expected-delivery-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'totalAmount', 
    label: 'Total Amount', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-total-amount-${row.id}`}>
        €{parseFloat(value).toFixed(2)}
      </span>
    )
  },
];

export default function SalesOrders() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSalesOrder, setEditingSalesOrder] = useState<SalesOrder | null>(null);
  const { toast } = useToast();

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'orderDate', direction: 'desc' },
    tableKey: 'sales-orders'
  });

  const { data: salesOrders = [], isLoading } = useQuery<SalesOrder[]>({
    queryKey: ["/api/sales-orders"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Enhance sales orders with customer names for display
  const enhancedSalesOrders = salesOrders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    return {
      ...order,
      customerName: customer?.name || "Unknown Customer"
    };
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: "",
      customerId: "",
      status: "pending",
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: undefined,
      subtotal: "",
      taxAmount: "0",
      totalAmount: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSalesOrder) => {
      const response = await apiRequest("POST", "/api/sales-orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowDialog(false);
      form.reset();
      setEditingSalesOrder(null);
      toast({
        title: "Success",
        description: "Sales order created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSalesOrder> }) => {
      const response = await apiRequest("PUT", `/api/sales-orders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowDialog(false);
      form.reset();
      setEditingSalesOrder(null);
      toast({
        title: "Success",
        description: "Sales order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sales order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Sales order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sales order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertSalesOrder = {
      ...data,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount || "0",
      totalAmount: data.totalAmount,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
    };

    if (editingSalesOrder) {
      updateMutation.mutate({ id: editingSalesOrder.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (salesOrder: SalesOrder) => {
    setEditingSalesOrder(salesOrder);
    form.reset({
      orderNumber: salesOrder.orderNumber,
      customerId: salesOrder.customerId,
      status: salesOrder.status || "pending",
      orderDate: salesOrder.orderDate ? format(new Date(salesOrder.orderDate), "yyyy-MM-dd") : new Date().toISOString().split('T')[0],
      expectedDeliveryDate: salesOrder.expectedDeliveryDate ? format(new Date(salesOrder.expectedDeliveryDate), "yyyy-MM-dd") : "",
      subtotal: salesOrder.subtotal,
      taxAmount: salesOrder.taxAmount || "0",
      totalAmount: salesOrder.totalAmount,
      notes: salesOrder.notes || "",
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this sales order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewSalesOrder = () => {
    setEditingSalesOrder(null);
    form.reset();
    setShowDialog(true);
  };

  // Apply search and filters using the table state
  const filteredAndSortedSalesOrders = tableState.applySorting(
    tableState.applyFiltersAndSearch(enhancedSalesOrders)
  );

  // Form content render function
  const renderFormContent = () => (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order Number</Label>
          <Input
            id="orderNumber"
            {...form.register("orderNumber")}
            placeholder="Auto-generated"
            disabled
            data-testid="input-order-number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer *</Label>
          <Select
            value={form.watch("customerId")}
            onValueChange={(value) => form.setValue("customerId", value)}
          >
            <SelectTrigger data-testid="select-customer">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.watch("status") || ""}
            onValueChange={(value) => form.setValue("status", value)}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderDate">Order Date</Label>
          <Input
            id="orderDate"
            type="date"
            {...form.register("orderDate")}
            data-testid="input-order-date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
        <Input
          id="expectedDeliveryDate"
          type="date"
          {...form.register("expectedDeliveryDate")}
          data-testid="input-expected-delivery-date"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subtotal">Subtotal *</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            {...form.register("subtotal")}
            placeholder="0.00"
            data-testid="input-subtotal"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax Amount</Label>
          <Input
            id="taxAmount"
            type="number"
            step="0.01"
            {...form.register("taxAmount")}
            placeholder="0.00"
            data-testid="input-tax-amount"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="totalAmount">Total Amount *</Label>
          <Input
            id="totalAmount"
            type="number"
            step="0.01"
            {...form.register("totalAmount")}
            placeholder="0.00"
            data-testid="input-total-amount"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Additional notes..."
          data-testid="input-notes"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setShowDialog(false);
            form.reset();
          }}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save"
        >
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );

  return (
    <DataTableLayout
      entityName="Sales Order"
      entityNamePlural="Sales Orders"
      data={filteredAndSortedSalesOrders}
      columns={tableState.columns}
      setColumns={tableState.setColumns}
      isLoading={isLoading}
      searchTerm={tableState.searchTerm}
      setSearchTerm={tableState.setSearchTerm}
      filters={tableState.filters}
      setFilters={tableState.setFilters}
      onAddFilter={tableState.addFilter}
      onUpdateFilter={tableState.updateFilter}
      onRemoveFilter={tableState.removeFilter}
      sortConfig={tableState.sortConfig}
      onSort={tableState.handleSort}
      selectedRows={tableState.selectedRows}
      setSelectedRows={tableState.setSelectedRows}
      onToggleRowSelection={tableState.toggleRowSelection}
      onToggleAllRows={() => {
        const allIds = enhancedSalesOrders.map(order => order.id);
        tableState.toggleAllRows(allIds);
      }}
      onRowDoubleClick={handleEdit}
      getRowId={(row: SalesOrder) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      headerActions={[
        {
          key: 'add-sales-order',
          label: 'New Sales Order',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleNewSalesOrder,
          variant: 'default' as const
        }
      ]}
      rowActions={(row: SalesOrder) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(row),
          variant: 'outline' as const
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDelete(row.id),
          variant: 'outline' as const
        }
      ]}
      addEditDialog={{
        isOpen: showDialog,
        onOpenChange: setShowDialog,
        title: editingSalesOrder ? 'Edit Sales Order' : 'New Sales Order',
        content: renderFormContent()
      }}
    />
  );
}