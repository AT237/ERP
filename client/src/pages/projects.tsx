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
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

const formSchema = insertProjectSchema.extend({
  totalValue: z.string().optional(),
  progress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeSection, setActiveSection] = useState("basic");
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
      startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : undefined,
      endDate: project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : undefined,
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

  // Custom customer select component
  const renderCustomerSelect = () => (
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
  );

  // Create form sections
  const createFormSections = (): FormSection2<FormData>[] => [
    {
      id: "basic",
      label: "Basic Info",
      icon: <FolderOpen className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "name",
          label: "Project Name",
          type: "text",
          placeholder: "Enter project name",
          register: form.register("name"),
          validation: {
            error: form.formState.errors.name?.message,
            isRequired: true
          },
          testId: "input-project-name"
        } as FormField2<FormData>),
        createFieldRow({
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Enter project description...",
          register: form.register("description"),
          testId: "textarea-description",
          rows: 3
        } as FormField2<FormData>),
        createFieldsRow([
          {
            key: "customerId",
            label: "Customer",
            type: "custom",
            customComponent: renderCustomerSelect(),
            testId: "select-customer",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "planning", label: "Planning" },
              { value: "in-progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "on-hold", label: "On Hold" }
            ],
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            testId: "select-status",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: <Calendar className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "startDate",
            label: "Start Date",
            type: "text",
            register: form.register("startDate"),
            testId: "input-start-date",
            width: "50%",
            customComponent: (
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-start-date"
              />
            )
          } as FormField2<FormData>,
          {
            key: "endDate",
            label: "End Date",
            type: "text",
            register: form.register("endDate"),
            testId: "input-end-date",
            width: "50%",
            customComponent: (
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                data-testid="input-end-date"
              />
            )
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "metrics",
      label: "Metrics",
      icon: <DollarSign className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "totalValue",
            label: "Total Value",
            type: "number",
            placeholder: "0.00",
            register: form.register("totalValue"),
            testId: "input-total-value",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "progress",
            label: "Progress (%)",
            type: "number",
            placeholder: "0",
            register: form.register("progress"),
            testId: "input-progress",
            width: "50%"
          } as FormField2<FormData>
        ])
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
        setEditingProject(null);
      },
      disabled: createMutation.isPending || updateMutation.isPending
    },
    {
      label: (createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Project",
      variant: "default",
      onClick: () => form.handleSubmit(onSubmit)(),
      disabled: createMutation.isPending || updateMutation.isPending
    }
  ];

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
            
            <LayoutForm2<FormData>
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
