import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { QuickAddCustomer } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, FolderOpen, Search, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, InsertProject, Customer } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const formSchema = insertProjectSchema.extend({
  totalValue: z.string().optional(),
  progress: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      customerId: "",
      status: "planning",
      startDate: undefined,
      endDate: undefined,
      totalValue: "",
      progress: "0",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingProject(null);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProject> }) => {
      const response = await apiRequest("PUT", `/api/projects/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingProject(null);
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertProject = {
      ...data,
      totalValue: data.totalValue || undefined,
      progress: data.progress ? parseInt(data.progress) : 0,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.reset({
      name: project.name,
      description: project.description || "",
      customerId: project.customerId || "",
      status: project.status || "planning",
      startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : "",
      endDate: project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : "",
      totalValue: project.totalValue || "",
      progress: project.progress?.toString() || "0",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewProject = () => {
    setEditingProject(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "planning": return "outline";
      case "on-hold": return "destructive";
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
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Industrial manufacturing floor with machinery" 
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
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-projects"
            />
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewProject} data-testid="button-add-project">
              <Plus className="mr-2" size={16} />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Edit Project" : "Create New Project"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Form to {editingProject ? "edit existing project" : "create new project"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter project name"
                  data-testid="input-project-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter project description..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <SelectWithAdd
                    value={form.watch("customerId") || ""}
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
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={form.watch("status") || "planning"} 
                    onValueChange={(value) => form.setValue("status", value)}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...form.register("endDate")}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalValue">Total Value</Label>
                  <Input
                    id="totalValue"
                    {...form.register("totalValue")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    data-testid="input-total-value"
                  />
                </div>
                
                <div>
                  <Label htmlFor="progress">Progress (%)</Label>
                  <Input
                    id="progress"
                    {...form.register("progress")}
                    placeholder="0"
                    type="number"
                    min="0"
                    max="100"
                    data-testid="input-progress"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-project"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Project"}
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

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FolderOpen className="mr-2" size={20} />
            Projects ({filteredProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No projects found. Create your first project to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => {
                    const customer = customers?.find(c => c.id === project.customerId);
                    return (
                      <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>{customer?.name || "—"}</TableCell>
                        <TableCell>
                          {project.startDate ? (
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} />
                              <span>{format(new Date(project.startDate), "MMM dd, yyyy")}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {project.endDate ? (
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} />
                              <span>{format(new Date(project.endDate), "MMM dd, yyyy")}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={project.progress || 0} className="w-20" />
                            <span className="text-xs text-muted-foreground">{project.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.totalValue ? (
                            <div className="flex items-center space-x-2">
                              <DollarSign size={14} />
                              <span>${project.totalValue}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(project.status || "planning")}>
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(project)}
                              data-testid={`button-edit-${project.id}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(project.id)}
                              data-testid={`button-delete-${project.id}`}
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
