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
import { QuickAddProject } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ClipboardList, Search, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkOrder, InsertWorkOrder, Project } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const formSchema = insertWorkOrderSchema.extend({
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function WorkOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const { toast } = useToast();

  const { data: workOrders, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderNumber: "",
      projectId: "",
      title: "",
      description: "",
      assignedTo: "",
      status: "pending",
      priority: "medium",
      startDate: undefined,
      dueDate: undefined,
      completedDate: undefined,
      estimatedHours: "",
      actualHours: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertWorkOrder) => {
      const response = await apiRequest("POST", "/api/work-orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingWorkOrder(null);
      toast({
        title: "Success",
        description: "Work order created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertWorkOrder> }) => {
      const response = await apiRequest("PUT", `/api/work-orders/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingWorkOrder(null);
      toast({
        title: "Success",
        description: "Work order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/work-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Success",
        description: "Work order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete work order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertWorkOrder = {
      ...data,
      estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : undefined,
      actualHours: data.actualHours ? parseInt(data.actualHours) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
    };

    if (editingWorkOrder) {
      updateMutation.mutate({ id: editingWorkOrder.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    form.reset({
      orderNumber: workOrder.orderNumber,
      projectId: workOrder.projectId || "",
      title: workOrder.title,
      description: workOrder.description || "",
      assignedTo: workOrder.assignedTo || "",
      status: workOrder.status || "pending",
      priority: workOrder.priority || "medium",
      startDate: workOrder.startDate ? format(new Date(workOrder.startDate), "yyyy-MM-dd") : undefined,
      dueDate: workOrder.dueDate ? format(new Date(workOrder.dueDate), "yyyy-MM-dd") : undefined,
      completedDate: workOrder.completedDate ? format(new Date(workOrder.completedDate), "yyyy-MM-dd") : undefined,
      estimatedHours: workOrder.estimatedHours?.toString() || "",
      actualHours: workOrder.actualHours?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewWorkOrder = () => {
    setEditingWorkOrder(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredWorkOrders = workOrders?.filter(workOrder =>
    workOrder.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workOrder.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
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
            src="https://images.unsplash.com/photo-1565793298595-6a879b1d9492?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Modern factory production line with workers" 
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
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-work-orders"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewWorkOrder} data-testid="button-add-work-order">
              <Plus className="mr-2" size={16} />
              Add Work Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingWorkOrder ? "Edit Work Order" : "Create New Work Order"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number *</Label>
                  <Input
                    id="orderNumber"
                    {...form.register("orderNumber")}
                    placeholder="WO-2024-0001"
                    data-testid="input-order-number"
                  />
                  {form.formState.errors.orderNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.orderNumber.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="projectId">Project</Label>
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
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter work order title"
                  data-testid="input-title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter work order description..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    {...form.register("assignedTo")}
                    placeholder="Employee name"
                    data-testid="input-assigned-to"
                  />
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
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={form.watch("priority")} 
                    onValueChange={(value) => form.setValue("priority", value)}
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register("startDate")}
                    data-testid="input-start-date"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    {...form.register("dueDate")}
                    data-testid="input-due-date"
                  />
                </div>
                
                <div>
                  <Label htmlFor="completedDate">Completed Date</Label>
                  <Input
                    id="completedDate"
                    type="date"
                    {...form.register("completedDate")}
                    data-testid="input-completed-date"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    {...form.register("estimatedHours")}
                    placeholder="0"
                    type="number"
                    data-testid="input-estimated-hours"
                  />
                </div>
                
                <div>
                  <Label htmlFor="actualHours">Actual Hours</Label>
                  <Input
                    id="actualHours"
                    {...form.register("actualHours")}
                    placeholder="0"
                    type="number"
                    data-testid="input-actual-hours"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-work-order"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Work Order"}
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

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="mr-2" size={20} />
            Work Orders ({filteredWorkOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No work orders found. Create your first work order to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkOrders.map((workOrder) => {
                    const project = projects?.find(p => p.id === workOrder.projectId);
                    return (
                      <TableRow key={workOrder.id} data-testid={`row-work-order-${workOrder.id}`}>
                        <TableCell className="font-medium">{workOrder.orderNumber}</TableCell>
                        <TableCell>{workOrder.title}</TableCell>
                        <TableCell>{project?.name || "—"}</TableCell>
                        <TableCell>{workOrder.assignedTo || "—"}</TableCell>
                        <TableCell>
                          {workOrder.dueDate ? (
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} />
                              <span>{format(new Date(workOrder.dueDate), "MMM dd, yyyy")}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(workOrder.priority || "medium")}>
                            {workOrder.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(workOrder.status || "pending")}>
                            {workOrder.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(workOrder)}
                              data-testid={`button-edit-${workOrder.id}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(workOrder.id)}
                              data-testid={`button-delete-${workOrder.id}`}
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
