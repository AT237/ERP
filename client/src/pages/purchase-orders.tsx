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
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddSupplier } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ShoppingCart, Search, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseOrder, InsertPurchaseOrder, Supplier } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const formSchema = insertPurchaseOrderSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const { toast } = useToast();

  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: "",
      supplierId: "",
      status: "pending",
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: undefined,
      subtotal: "",
      taxAmount: "0",
      totalAmount: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPurchaseOrder) => {
      const response = await apiRequest("POST", "/api/purchase-orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingPurchaseOrder(null);
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPurchaseOrder> }) => {
      const response = await apiRequest("PUT", `/api/purchase-orders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingPurchaseOrder(null);
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertPurchaseOrder = {
      ...data,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount || "0",
      totalAmount: data.totalAmount,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
    };

    if (editingPurchaseOrder) {
      updateMutation.mutate({ id: editingPurchaseOrder.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (purchaseOrder: PurchaseOrder) => {
    setEditingPurchaseOrder(purchaseOrder);
    form.reset({
      orderNumber: purchaseOrder.orderNumber,
      supplierId: purchaseOrder.supplierId,
      status: purchaseOrder.status || "pending",
      orderDate: purchaseOrder.orderDate ? format(new Date(purchaseOrder.orderDate), "yyyy-MM-dd") : new Date().toISOString().split('T')[0],
      expectedDate: purchaseOrder.expectedDate ? format(new Date(purchaseOrder.expectedDate), "yyyy-MM-dd") : "",
      subtotal: purchaseOrder.subtotal,
      taxAmount: purchaseOrder.taxAmount || "0",
      totalAmount: purchaseOrder.totalAmount,
      notes: purchaseOrder.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewPurchaseOrder = () => {
    setEditingPurchaseOrder(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredPurchaseOrders = purchaseOrders?.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "received": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "outline";
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
            src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Large warehouse with organized inventory shelves" 
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
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-purchase-orders"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewPurchaseOrder} data-testid="button-add-purchase-order">
              <Plus className="mr-2" size={16} />
              Add Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPurchaseOrder ? "Edit Purchase Order" : "Create New Purchase Order"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Form to {editingPurchaseOrder ? "edit existing purchase order" : "create new purchase order"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number *</Label>
                  <Input
                    id="orderNumber"
                    {...form.register("orderNumber")}
                    placeholder="PO-2024-0001"
                    data-testid="input-order-number"
                  />
                  {form.formState.errors.orderNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.orderNumber.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <SelectWithAdd
                    value={form.watch("supplierId")}
                    onValueChange={(value) => form.setValue("supplierId", value)}
                    placeholder="Select supplier"
                    addFormTitle="Add New Supplier"
                    testId="select-supplier"
                    addFormContent={
                      <QuickAddSupplier 
                        onSuccess={(supplierId) => {
                          form.setValue("supplierId", supplierId);
                        }}
                      />
                    }
                  >
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectWithAdd>
                  {form.formState.errors.supplierId && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.supplierId.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={form.watch("status") || "pending"} 
                    onValueChange={(value) => form.setValue("status", value)}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    {...form.register("orderDate")}
                    data-testid="input-order-date"
                  />
                </div>
                
                <div>
                  <Label htmlFor="expectedDate">Expected Date</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    {...form.register("expectedDate")}
                    data-testid="input-expected-date"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal">Subtotal *</Label>
                  <Input
                    id="subtotal"
                    {...form.register("subtotal")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    data-testid="input-subtotal"
                  />
                  {form.formState.errors.subtotal && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.subtotal.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="taxAmount">Tax Amount</Label>
                  <Input
                    id="taxAmount"
                    {...form.register("taxAmount")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    data-testid="input-tax-amount"
                  />
                </div>
                
                <div>
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    {...form.register("totalAmount")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    data-testid="input-total-amount"
                  />
                  {form.formState.errors.totalAmount && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.totalAmount.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Additional notes..."
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-purchase-order"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Purchase Order"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2" size={20} />
            Purchase Orders ({filteredPurchaseOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase orders found. Create your first purchase order to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchaseOrders.map((order) => {
                    const supplier = suppliers?.find(s => s.id === order.supplierId);
                    return (
                      <TableRow key={order.id} data-testid={`row-purchase-order-${order.id}`}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{supplier?.name || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar size={14} />
                            <span>{format(new Date(order.orderDate!), "MMM dd, yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.expectedDate ? (
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} />
                              <span>{format(new Date(order.expectedDate), "MMM dd, yyyy")}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <DollarSign size={14} />
                            <span>${order.totalAmount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status || "pending")}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(order)}
                              data-testid={`button-edit-${order.id}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                              data-testid={`button-delete-${order.id}`}
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
