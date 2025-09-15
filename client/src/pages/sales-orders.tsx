import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormTabLayout } from '@/components/layouts/FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSalesOrderSchema, insertSalesOrderItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, FileText, Download, Save, Eye, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { SalesOrder, InsertSalesOrder, SalesOrderItem, InsertSalesOrderItem, Customer, InventoryItem } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

// Form schemas
const salesOrderFormSchema = insertSalesOrderSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

const salesOrderItemFormSchema = insertSalesOrderItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  lineTotal: z.string().min(1, "Line total is required"),
});

type SalesOrderFormData = z.infer<typeof salesOrderFormSchema>;
type SalesOrderItemFormData = z.infer<typeof salesOrderItemFormSchema>;

interface SalesOrdersProps {
  onCreateNew?: (formInfo: {id: string, name: string, formType: string, parentId?: string}) => void;
}

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

export default function SalesOrders({ onCreateNew }: SalesOrdersProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSalesOrder, setEditingSalesOrder] = useState<SalesOrder | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<SalesOrder | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesOrderItem | null>(null);
  const { toast } = useToast();

  // Default column configuration for sales order items
  const defaultItemColumns: ColumnConfig[] = [
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
      label: 'Quantity', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true,
      renderCell: (value: number) => value?.toString() || "0"
    },
    { 
      key: 'unitPrice', 
      label: 'Unit Price', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => `€${value || "0.00"}`
    },
    { 
      key: 'lineTotal', 
      label: 'Line Total', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => `€${value || "0.00"}`
    },
  ];

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'orderDate', direction: 'desc' },
    tableKey: 'sales-orders'
  });

  // Data table state for sales order items
  const itemTableState = useDataTable({ 
    defaultColumns: defaultItemColumns,
    tableKey: 'sales-order-items'
  });

  // Optimized data fetching with stable loading state
  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery<SalesOrder[]>({
    queryKey: ["/api/sales-orders"],
    staleTime: 30000, // Prevent refetch for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000, // Customers change less frequently
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 30000,
    gcTime: 300000,
  });

  // Combined loading state to prevent partial renders
  const isLoading = salesOrdersLoading || customersLoading;

  const { data: salesOrderItems = [], isLoading: isLoadingItems } = useQuery<SalesOrderItem[]>({
    queryKey: ["/api/sales-orders", selectedSalesOrder?.id, "items"],
    queryFn: async () => {
      if (!selectedSalesOrder?.id) return [];
      const response = await fetch(`/api/sales-orders/${selectedSalesOrder.id}/items`);
      if (!response.ok) throw new Error('Failed to fetch sales order items');
      return response.json();
    },
    enabled: !!selectedSalesOrder?.id,
  });

  // Customer name lookup - memoized to prevent re-creation
  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  // Enhance sales orders with customer names for display
  const enhancedSalesOrders = salesOrders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    return {
      ...order,
      customerName: customer?.name || "Unknown Customer"
    };
  });

  // Forms
  const salesOrderForm = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderFormSchema),
    defaultValues: {
      orderNumber: "",
      customerId: "",
      status: "pending",
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDeliveryDate: "",
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      notes: "",
    },
  });

  const itemForm = useForm<SalesOrderItemFormData>({
    resolver: zodResolver(salesOrderItemFormSchema),
    defaultValues: {
      salesOrderId: "",
      itemId: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    },
  });

  // Helper functions
  const calculateLineTotal = (quantity: number, unitPrice: string) => {
    const total = quantity * parseFloat(unitPrice || "0");
    return total.toFixed(2);
  };

  const calculateSalesOrderTotals = () => {
    const subtotal = salesOrderItems.reduce((sum, item) => {
      return sum + parseFloat(item.lineTotal || "0");
    }, 0);
    
    const taxAmount = subtotal * 0.21; // 21% VAT
    const totalAmount = subtotal + taxAmount;
    
    salesOrderForm.setValue("subtotal", subtotal.toFixed(2));
    salesOrderForm.setValue("taxAmount", taxAmount.toFixed(2));
    salesOrderForm.setValue("totalAmount", totalAmount.toFixed(2));
  };


  // Mutations
  const createSalesOrderMutation = useMutation({
    mutationFn: async (data: SalesOrderFormData) => {
      const processedData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("POST", "/api/sales-orders", processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setShowDialog(false);
      salesOrderForm.reset();
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

  const updateSalesOrderMutation = useMutation({
    mutationFn: async (data: SalesOrderFormData) => {
      const processedData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("PUT", `/api/sales-orders/${editingSalesOrder?.id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setShowDialog(false);
      salesOrderForm.reset();
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

  const deleteSalesOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
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

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: async (data: SalesOrderItemFormData) => {
      const response = await apiRequest("POST", `/api/sales-orders/${selectedSalesOrder?.id}/items`, {
        ...data,
        unitPrice: parseFloat(data.unitPrice),
        lineTotal: parseFloat(data.lineTotal),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", selectedSalesOrder?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setShowItemDialog(false);
      itemForm.reset();
      setEditingItem(null);
      calculateSalesOrderTotals();
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: SalesOrderItemFormData) => {
      const response = await apiRequest("PUT", `/api/sales-order-items/${editingItem?.id}`, {
        ...data,
        unitPrice: parseFloat(data.unitPrice),
        lineTotal: parseFloat(data.lineTotal),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", selectedSalesOrder?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setShowItemDialog(false);
      itemForm.reset();
      setEditingItem(null);
      calculateSalesOrderTotals();
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales-order-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders", selectedSalesOrder?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      calculateSalesOrderTotals();
      toast({
        title: "Success",
        description: "Item deleted successfully",
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

  const onSubmit = (data: SalesOrderFormData) => {
    if (editingSalesOrder) {
      updateSalesOrderMutation.mutate(data);
    } else {
      createSalesOrderMutation.mutate(data);
    }
  };

  const onItemSubmit = (data: SalesOrderItemFormData) => {
    if (editingItem) {
      updateItemMutation.mutate(data);
    } else {
      createItemMutation.mutate(data);
    }
  };

  const handleEdit = (salesOrder: SalesOrder) => {
    setEditingSalesOrder(salesOrder);
    salesOrderForm.reset({
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

  const handleView = (salesOrder: SalesOrder) => {
    setSelectedSalesOrder(salesOrder);
    setActiveTab("general");
    setShowDetailDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this sales order?")) {
      deleteSalesOrderMutation.mutate(id);
    }
  };

  const handleEditItem = (item: SalesOrderItem) => {
    setEditingItem(item);
    itemForm.reset({
      salesOrderId: item.salesOrderId,
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    });
    setShowItemDialog(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleNewItem = () => {
    setEditingItem(null);
    itemForm.reset({
      salesOrderId: selectedSalesOrder?.id || "",
      itemId: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    });
    setShowItemDialog(true);
  };

  const handleNewSalesOrder = () => {
    setEditingSalesOrder(null);
    salesOrderForm.reset();
    setShowDialog(true);
  };

  // Apply search and filters using the table state
  const filteredAndSortedSalesOrders = tableState.applySorting(
    tableState.applyFiltersAndSearch(enhancedSalesOrders)
  );

  // Apply search and filters for items using the item table state
  const filteredAndSortedItems = itemTableState.applySorting(
    itemTableState.applyFiltersAndSearch(salesOrderItems)
  );

  // Tab content render functions
  const renderGeneralTab = () => (
    <form onSubmit={salesOrderForm.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order Number</Label>
          <Input
            id="orderNumber"
            {...salesOrderForm.register("orderNumber")}
            placeholder="Auto-generated"
            disabled
            data-testid="input-order-number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer *</Label>
          <Select
            value={salesOrderForm.watch("customerId")}
            onValueChange={(value) => salesOrderForm.setValue("customerId", value)}
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
            value={salesOrderForm.watch("status") || ""}
            onValueChange={(value) => salesOrderForm.setValue("status", value)}
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
            {...salesOrderForm.register("orderDate")}
            data-testid="input-order-date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
        <Input
          id="expectedDeliveryDate"
          type="date"
          {...salesOrderForm.register("expectedDeliveryDate")}
          data-testid="input-expected-delivery-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...salesOrderForm.register("notes")}
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
            salesOrderForm.reset();
          }}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createSalesOrderMutation.isPending || updateSalesOrderMutation.isPending}
          data-testid="button-save"
        >
          {createSalesOrderMutation.isPending || updateSalesOrderMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );

  const renderItemsTab = () => (
    <div className="space-y-4">
      <DataTableLayout
        entityName="Item"
        entityNamePlural="Items"
        data={filteredAndSortedItems}
        columns={itemTableState.columns}
        setColumns={itemTableState.setColumns}
        isLoading={isLoadingItems}
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
          const allIds = salesOrderItems.map(item => item.id);
          itemTableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleEditItem}
        getRowId={(row: SalesOrderItem) => row.id}
        applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
        applySorting={itemTableState.applySorting}
        headerActions={[
          {
            key: 'add-item',
            label: 'Add Item',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewItem,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: SalesOrderItem) => [
          {
            key: 'edit-item',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditItem(row),
            variant: 'outline' as const
          },
          {
            key: 'delete-item',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDeleteItem(row.id),
            variant: 'outline' as const
          }
        ]}
        hideAddEditDialog={true}
      />
    </div>
  );

  const renderFinancialTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subtotal">Subtotal *</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            {...salesOrderForm.register("subtotal")}
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
            {...salesOrderForm.register("taxAmount")}
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
            {...salesOrderForm.register("totalAmount")}
            placeholder="0.00"
            data-testid="input-total-amount"
          />
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Order Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Items ({salesOrderItems.length}):</span>
            <span>€{salesOrderItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || "0"), 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (21%):</span>
            <span>€{(salesOrderItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || "0"), 0) * 0.21).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium border-t pt-1">
            <span>Total:</span>
            <span>€{(salesOrderItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || "0"), 0) * 1.21).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConditionsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="incoTerms">Inco Terms</Label>
          <Input
            id="incoTerms"
            placeholder="e.g., EXW, FOB, CIF"
            data-testid="input-inco-terms"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="paymentConditions">Payment Conditions</Label>
          <Textarea
            id="paymentConditions"
            placeholder="Payment terms and conditions..."
            data-testid="input-payment-conditions"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="deliveryConditions">Delivery Conditions</Label>
          <Textarea
            id="deliveryConditions"
            placeholder="Delivery terms and conditions..."
            data-testid="input-delivery-conditions"
          />
        </div>
      </div>
    </div>
  );

  // Form content for simple add/edit dialog
  const renderFormContent = () => (
    <form onSubmit={salesOrderForm.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orderNumber">Order Number</Label>
          <Input
            id="orderNumber"
            {...salesOrderForm.register("orderNumber")}
            placeholder="Auto-generated"
            disabled
            data-testid="input-order-number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer *</Label>
          <Select
            value={salesOrderForm.watch("customerId")}
            onValueChange={(value) => salesOrderForm.setValue("customerId", value)}
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
            value={salesOrderForm.watch("status") || ""}
            onValueChange={(value) => salesOrderForm.setValue("status", value)}
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
            {...salesOrderForm.register("orderDate")}
            data-testid="input-order-date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
        <Input
          id="expectedDeliveryDate"
          type="date"
          {...salesOrderForm.register("expectedDeliveryDate")}
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
            {...salesOrderForm.register("subtotal")}
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
            {...salesOrderForm.register("taxAmount")}
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
            {...salesOrderForm.register("totalAmount")}
            placeholder="0.00"
            data-testid="input-total-amount"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...salesOrderForm.register("notes")}
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
            salesOrderForm.reset();
          }}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createSalesOrderMutation.isPending || updateSalesOrderMutation.isPending}
          data-testid="button-save"
        >
          {createSalesOrderMutation.isPending || updateSalesOrderMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );

  // Item form content
  const renderItemFormContent = () => (
    <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="itemId">Item</Label>
          <Select
            value={itemForm.watch("itemId")}
            onValueChange={(value) => {
              itemForm.setValue("itemId", value);
              const item = inventoryItems.find(i => i.id === value);
              if (item) {
                itemForm.setValue("unitPrice", item.price?.toString() || "0.00");
                const quantity = itemForm.watch("quantity") || 1;
                const lineTotal = calculateLineTotal(quantity, item.price?.toString() || "0.00");
                itemForm.setValue("lineTotal", lineTotal);
              }
            }}
          >
            <SelectTrigger data-testid="select-item">
              <SelectValue placeholder="Select item" />
            </SelectTrigger>
            <SelectContent>
              {inventoryItems?.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} - €{item.price}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            {...itemForm.register("quantity", { 
              valueAsNumber: true,
              onChange: (e) => {
                const quantity = parseInt(e.target.value) || 1;
                const unitPrice = itemForm.watch("unitPrice") || "0.00";
                const lineTotal = calculateLineTotal(quantity, unitPrice);
                itemForm.setValue("lineTotal", lineTotal);
              }
            })}
            data-testid="input-quantity"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit Price *</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            {...itemForm.register("unitPrice", {
              onChange: (e) => {
                const unitPrice = e.target.value || "0.00";
                const quantity = itemForm.watch("quantity") || 1;
                const lineTotal = calculateLineTotal(quantity, unitPrice);
                itemForm.setValue("lineTotal", lineTotal);
              }
            })}
            placeholder="0.00"
            data-testid="input-unit-price"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lineTotal">Line Total</Label>
          <Input
            id="lineTotal"
            type="number"
            step="0.01"
            {...itemForm.register("lineTotal")}
            placeholder="0.00"
            disabled
            data-testid="input-line-total"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setShowItemDialog(false);
            itemForm.reset();
            setEditingItem(null);
          }}
          data-testid="button-cancel-item"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createItemMutation.isPending || updateItemMutation.isPending}
          data-testid="button-save-item"
        >
          {createItemMutation.isPending || updateItemMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );

  return (
    <>
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
        onRowDoubleClick={handleView}
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
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleView(row),
            variant: 'outline' as const
          },
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
      
      {/* Detail Dialog with FormTabLayout */}
      {showDetailDialog && selectedSalesOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="detail-dialog-overlay">
          <div className="bg-white rounded-lg shadow-lg w-[95%] h-[90%] max-w-7xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold" data-testid="detail-dialog-title">
                  Sales Order Details - {selectedSalesOrder.orderNumber}
                </h2>
                <Badge 
                  variant={selectedSalesOrder.status === 'completed' ? 'default' : 'outline'}
                  data-testid="detail-dialog-status-badge"
                >
                  {selectedSalesOrder.status || 'pending'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" data-testid="button-export-pdf">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowDetailDialog(false)}
                  data-testid="button-close-detail"
                >
                  ×
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-6 overflow-hidden">
              <FormTabLayout
                tabs={[
                  { id: 'general', label: 'General', content: renderGeneralTab() },
                  { id: 'items', label: 'Items', content: renderItemsTab() },
                  { id: 'conditions', label: 'Conditions', content: renderConditionsTab() },
                  { id: 'financial', label: 'Financial', content: renderFinancialTab() },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Item Dialog */}
      {showItemDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="item-dialog-overlay">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold" data-testid="item-dialog-title">
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowItemDialog(false);
                  itemForm.reset();
                  setEditingItem(null);
                }}
                data-testid="button-close-item"
              >
                ×
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {renderItemFormContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}