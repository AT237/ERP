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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer, QuickAddProject } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPackingListSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Box, Search, Truck, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PackingList, InsertPackingList, Customer, Invoice, Project } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const formSchema = insertPackingListSchema.extend({
  weight: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PackingLists() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackingList, setEditingPackingList] = useState<PackingList | null>(null);
  const { toast } = useToast();

  const { data: packingLists, isLoading } = useQuery<PackingList[]>({
    queryKey: ["/api/packing-lists"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packingNumber: "",
      customerId: "",
      invoiceId: "",
      projectId: "",
      status: "pending",
      shippingAddress: "",
      shippingMethod: "",
      trackingNumber: "",
      weight: "",
      dimensions: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPackingList) => {
      const response = await apiRequest("POST", "/api/packing-lists", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingPackingList(null);
      toast({
        title: "Success",
        description: "Packing list created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create packing list",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPackingList> }) => {
      const response = await apiRequest("PUT", `/api/packing-lists/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingPackingList(null);
      toast({
        title: "Success",
        description: "Packing list updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update packing list",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/packing-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      toast({
        title: "Success",
        description: "Packing list deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete packing list",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertPackingList = {
      ...data,
      weight: data.weight || undefined,
      invoiceId: data.invoiceId || undefined,
      projectId: data.projectId || undefined,
    };

    if (editingPackingList) {
      updateMutation.mutate({ id: editingPackingList.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (packingList: PackingList) => {
    setEditingPackingList(packingList);
    form.reset({
      packingNumber: packingList.packingNumber,
      customerId: packingList.customerId,
      invoiceId: packingList.invoiceId || "",
      projectId: packingList.projectId || "",
      status: packingList.status || "pending",
      shippingAddress: packingList.shippingAddress || "",
      shippingMethod: packingList.shippingMethod || "",
      trackingNumber: packingList.trackingNumber || "",
      weight: packingList.weight || "",
      dimensions: packingList.dimensions || "",
      notes: packingList.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this packing list?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewPackingList = () => {
    setEditingPackingList(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredPackingLists = packingLists?.filter(list =>
    list.packingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "shipped": return "default";
      case "packed": return "secondary";
      case "pending": return "outline";
      case "delivered": return "default";
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
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Warehouse inventory management system" 
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
              placeholder="Search packing lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-packing-lists"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewPackingList} data-testid="button-add-packing-list">
              <Plus className="mr-2" size={16} />
              Add Packing List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPackingList ? "Edit Packing List" : "Create New Packing List"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="packingNumber">Packing Number *</Label>
                  <Input
                    id="packingNumber"
                    {...form.register("packingNumber")}
                    placeholder="PL-2024-0001"
                    data-testid="input-packing-number"
                  />
                  {form.formState.errors.packingNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.packingNumber.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="customerId">Customer *</Label>
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
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectWithAdd>
                  {form.formState.errors.customerId && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.customerId.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceId">Invoice (Optional)</Label>
                  <Select 
                    value={form.watch("invoiceId")} 
                    onValueChange={(value) => form.setValue("invoiceId", value)}
                  >
                    <SelectTrigger data-testid="select-invoice">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices?.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="projectId">Project (Optional)</Label>
                  <SelectWithAdd
                    value={form.watch("projectId")}
                    onValueChange={(value) => form.setValue("projectId", value)}
                    placeholder="Select project"
                    addFormTitle="Add New Project"
                    testId="select-project"
                    addFormContent={
                      <QuickAddProject 
                        onSuccess={(projectId) => {
                          form.setValue("projectId", projectId);
                        }}
                      />
                    }
                  >
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectWithAdd>
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={form.watch("status")} 
                  onValueChange={(value) => form.setValue("status", value)}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  {...form.register("shippingAddress")}
                  placeholder="Enter shipping address..."
                  rows={3}
                  data-testid="textarea-shipping-address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shippingMethod">Shipping Method</Label>
                  <Select 
                    value={form.watch("shippingMethod")} 
                    onValueChange={(value) => form.setValue("shippingMethod", value)}
                  >
                    <SelectTrigger data-testid="select-shipping-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Shipping</SelectItem>
                      <SelectItem value="express">Express Shipping</SelectItem>
                      <SelectItem value="overnight">Overnight</SelectItem>
                      <SelectItem value="freight">Freight</SelectItem>
                      <SelectItem value="pickup">Customer Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    {...form.register("trackingNumber")}
                    placeholder="Tracking number"
                    data-testid="input-tracking-number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    {...form.register("weight")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    data-testid="input-weight"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    {...form.register("dimensions")}
                    placeholder="L x W x H"
                    data-testid="input-dimensions"
                  />
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
                  data-testid="button-save-packing-list"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Packing List"}
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

      {/* Packing Lists Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Box className="mr-2" size={20} />
            Packing Lists ({filteredPackingLists.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Packing #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Shipping Method</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackingLists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No packing lists found. Create your first packing list to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPackingLists.map((list) => {
                    const customer = customers?.find(c => c.id === list.customerId);
                    const invoice = invoices?.find(i => i.id === list.invoiceId);
                    return (
                      <TableRow key={list.id} data-testid={`row-packing-list-${list.id}`}>
                        <TableCell className="font-medium">{list.packingNumber}</TableCell>
                        <TableCell>{customer?.name || "—"}</TableCell>
                        <TableCell>{invoice?.invoiceNumber || "—"}</TableCell>
                        <TableCell>
                          {list.shippingMethod ? (
                            <div className="flex items-center space-x-2">
                              <Truck size={14} />
                              <span className="capitalize">{list.shippingMethod}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {list.trackingNumber ? (
                            <div className="flex items-center space-x-2">
                              <Package size={14} />
                              <span>{list.trackingNumber}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{list.weight ? `${list.weight} kg` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(list.status || "pending")}>
                            {list.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(list)}
                              data-testid={`button-edit-${list.id}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(list.id)}
                              data-testid={`button-delete-${list.id}`}
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
