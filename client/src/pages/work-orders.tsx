import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, ClipboardList, Search, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkOrder, Project } from "@shared/schema";
import { format } from "date-fns";

export default function WorkOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: workOrders, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
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

  const handleEdit = (workOrder: WorkOrder) => {
    // Dispatch event to open edit form tab
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-work-order-${workOrder.id}`,
        name: `${workOrder.orderNumber}`,
        formType: 'work-order',
        parentId: workOrder.id
      }
    }));
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this work order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewWorkOrder = () => {
    // Dispatch event to open new work order form tab
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-work-order',
        name: 'New Work Order',
        formType: 'work-order'
      }
    }));
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
        
        <Button onClick={handleNewWorkOrder} data-testid="button-add-work-order">
          <Plus className="mr-2" size={16} />
          Add Work Order
        </Button>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No work orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkOrders.map((workOrder) => {
                    const project = projects?.find((p) => p.id === workOrder.projectId);
                    return (
                      <TableRow key={workOrder.id}>
                        <TableCell>
                          <span className="font-mono" data-testid={`text-order-number-${workOrder.id}`}>
                            {workOrder.orderNumber}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`text-project-${workOrder.id}`}>
                          {project?.name || "No Project"}
                        </TableCell>
                        <TableCell>
                          <div data-testid={`text-title-${workOrder.id}`}>
                            <div className="font-medium">{workOrder.title}</div>
                            {workOrder.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {workOrder.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-assigned-to-${workOrder.id}`}>
                          {workOrder.assignedTo || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(workOrder.status || "pending")} data-testid={`badge-status-${workOrder.id}`}>
                            {workOrder.status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(workOrder.priority || "medium")} data-testid={`badge-priority-${workOrder.id}`}>
                            {workOrder.priority || "medium"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-due-date-${workOrder.id}`}>
                          {workOrder.dueDate ? format(new Date(workOrder.dueDate), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell data-testid={`text-hours-${workOrder.id}`}>
                          <div className="flex items-center space-x-1">
                            <Clock size={14} className="text-muted-foreground" />
                            <span className="text-sm">
                              {workOrder.actualHours || 0}/{workOrder.estimatedHours || 0}
                            </span>
                          </div>
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