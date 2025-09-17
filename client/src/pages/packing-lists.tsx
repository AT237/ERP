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
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

const formSchema = insertPackingListSchema.extend({
  weight: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PackingLists() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackingList, setEditingPackingList] = useState<PackingList | null>(null);
  const [activeSection, setActiveSection] = useState("basic");
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

  // Custom select components
  const renderCustomerSelect = () => (
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
  );

  const renderInvoiceSelect = () => (
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
  );

  const renderProjectSelect = () => (
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
  );

  // Create form sections
  const createFormSections = (): FormSection2<FormData>[] => [
    {
      id: "basic",
      label: "Basic Info",
      icon: <Box className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "packingNumber",
            label: "Packing Number",
            type: "text",
            placeholder: "PL-2024-0001",
            register: form.register("packingNumber"),
            validation: {
              error: form.formState.errors.packingNumber?.message,
              isRequired: true
            },
            testId: "input-packing-number",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pending", label: "Pending" },
              { value: "packed", label: "Packed" },
              { value: "shipped", label: "Shipped" },
              { value: "delivered", label: "Delivered" }
            ],
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            testId: "select-status",
            width: "50%"
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "customerId",
          label: "Customer",
          type: "custom",
          customComponent: renderCustomerSelect(),
          validation: {
            error: form.formState.errors.customerId?.message,
            isRequired: true
          },
          testId: "select-customer"
        } as FormField2<FormData>)
      ]
    },
    {
      id: "relations",
      label: "Relations",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "invoiceId",
            label: "Invoice (Optional)",
            type: "custom",
            customComponent: renderInvoiceSelect(),
            testId: "select-invoice",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "projectId",
            label: "Project (Optional)",
            type: "custom",
            customComponent: renderProjectSelect(),
            testId: "select-project",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "shipping",
      label: "Shipping",
      icon: <Truck className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "shippingAddress",
          label: "Shipping Address",
          type: "textarea",
          placeholder: "Enter shipping address...",
          register: form.register("shippingAddress"),
          testId: "textarea-shipping-address",
          rows: 3
        } as FormField2<FormData>),
        createFieldsRow([
          {
            key: "shippingMethod",
            label: "Shipping Method",
            type: "select",
            options: [
              { value: "standard", label: "Standard Shipping" },
              { value: "express", label: "Express Shipping" },
              { value: "overnight", label: "Overnight" },
              { value: "freight", label: "Freight" },
              { value: "pickup", label: "Customer Pickup" }
            ],
            setValue: (value) => form.setValue("shippingMethod", value),
            watch: () => form.watch("shippingMethod"),
            testId: "select-shipping-method",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "trackingNumber",
            label: "Tracking Number",
            type: "text",
            placeholder: "Tracking number",
            register: form.register("trackingNumber"),
            testId: "input-tracking-number",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "details",
      label: "Details",
      icon: <span className="text-xs font-bold">⚙</span>,
      rows: [
        createFieldsRow([
          {
            key: "weight",
            label: "Weight (kg)",
            type: "number",
            placeholder: "0.00",
            register: form.register("weight"),
            testId: "input-weight",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "dimensions",
            label: "Dimensions",
            type: "text",
            placeholder: "L x W x H",
            register: form.register("dimensions"),
            testId: "input-dimensions",
            width: "50%"
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "notes",
          label: "Notes",
          type: "textarea",
          placeholder: "Additional notes...",
          register: form.register("notes"),
          testId: "textarea-notes",
          rows: 3
        } as FormField2<FormData>)
      ]
    }
  ];

  // Create action buttons
  const createActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => {
        setIsDialogOpen(false);
        form.reset();
        setEditingPackingList(null);
      },
      disabled: createMutation.isPending || updateMutation.isPending
    },
    {
      label: (createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Packing List",
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending || updateMutation.isPending
    }
  ];

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
              <DialogDescription className="sr-only">
                Form to {editingPackingList ? "edit existing packing list" : "create new packing list"}
              </DialogDescription>
            </DialogHeader>
            
            <LayoutForm2
              sections={createFormSections()}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              form={form}
              onSubmit={onSubmit}
              actionButtons={createActionButtons()}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
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
