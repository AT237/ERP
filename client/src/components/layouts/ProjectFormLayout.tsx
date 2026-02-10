import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer } from "@/components/quick-add-forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { FolderOpen, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { Project, InsertProject, Customer } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from './LayoutForm2';

// Form schema for project data
const projectFormSchema = insertProjectSchema.extend({
  totalValue: z.string().optional(),
  progress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof projectFormSchema>;

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

interface ProjectFormLayoutProps {
  onSave: () => void;
  projectId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function ProjectFormLayout({ onSave, projectId, parentId }: ProjectFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("basic");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const isEditing = !!projectId;

  const form = useForm<FormData>({
    resolver: zodResolver(projectFormSchema),
    mode: 'onBlur',
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

  // Change tracking helpers
  const compareValues = (original: any, current: any) => {
    const isEmpty = (v: any) => v === null || v === undefined || v === "";
    if (isEmpty(original) && isEmpty(current)) return true;
    if (typeof original !== typeof current) return false;
    if (original === null || current === null) return original === current;
    return String(original).trim() === String(current).trim();
  };

  const checkForChanges = () => {
    const currentValues = form.getValues();
    const modifiedFieldsSet = new Set<string>();
    let hasChanges = false;

    // Compare each field with original values
    Object.keys(originalValues).forEach(fieldName => {
      const originalValue = originalValues[fieldName];
      const currentValue = currentValues[fieldName as keyof typeof currentValues];
      
      if (!compareValues(originalValue, currentValue)) {
        modifiedFieldsSet.add(fieldName);
        hasChanges = true;
      }
    });

    setModifiedFields(modifiedFieldsSet);
    setHasUnsavedChanges(hasChanges);
    
    return hasChanges;
  };

  // Get CSS class for field based on whether it's modified
  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  // Load project data if editing
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  // Load customers data for select options
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Update form when project data loads and store original values for change tracking
  useEffect(() => {
    if (project) {
      const formData = {
        name: project.name || "",
        description: project.description || "",
        customerId: project.customerId || "",
        status: project.status || "planning",
        startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : undefined,
        endDate: project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : undefined,
        totalValue: project.totalValue || "",
        progress: project.progress?.toString() || "0",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new project, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
  }, [project, form]);

  // Throttled change checking
  const [checkScheduled, setCheckScheduled] = useState(false);
  const scheduleChangeCheck = useCallback(() => {
    if (checkScheduled) return;
    
    setCheckScheduled(true);
    setTimeout(() => {
      if (Object.keys(originalValues).length > 0) {
        checkForChanges();
      }
      setCheckScheduled(false);
    }, 200);
  }, [checkScheduled, originalValues, checkForChanges]);

  // Watch for changes in form values and update change tracking (throttled)
  const nameValue = form.watch("name");
  const descriptionValue = form.watch("description");
  const customerIdValue = form.watch("customerId");
  const statusValue = form.watch("status");
  const startDateValue = form.watch("startDate");
  const endDateValue = form.watch("endDate");
  const totalValueValue = form.watch("totalValue");
  const progressValue = form.watch("progress");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [nameValue, descriptionValue, customerIdValue, statusValue, startDateValue, endDateValue, totalValueValue, progressValue, scheduleChangeCheck]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = projectId ? `edit-project-${projectId}` : 'new-project';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, projectId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-project', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      // Dispatch scoped entity-created event 
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'project',
          entity: newProject,
          parentId: parentId // Scope to originating component
        }
      }));
      
      onSave();
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
    mutationFn: async (data: Partial<InsertProject>) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      const tabId = projectId ? `edit-project-${projectId}` : 'new-project';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: FormData) => {
    const transformedData: InsertProject = {
      ...data,
      totalValue: data.totalValue || undefined,
      progress: data.progress ? parseInt(data.progress) : 0,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
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
          testId: "input-project-name",
          isModified: modifiedFields.has("name")
        } as FormField2<FormData>),
        createFieldRow({
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Enter project description...",
          register: form.register("description"),
          testId: "textarea-description",
          rows: 3,
          isModified: modifiedFields.has("description")
        } as FormField2<FormData>),
        createFieldsRow([
          {
            key: "customerId",
            label: "Customer",
            type: "custom",
            customComponent: renderCustomerSelect(),
            testId: "select-customer",
            width: "50%",
            isModified: modifiedFields.has("customerId")
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
            width: "50%",
            isModified: modifiedFields.has("status")
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
            type: "custom",
            testId: "input-start-date",
            width: "50%",
            customComponent: (
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-start-date"
                className={getFieldClassName("startDate")}
              />
            ),
            isModified: modifiedFields.has("startDate")
          } as FormField2<FormData>,
          {
            key: "endDate",
            label: "End Date",
            type: "custom",
            testId: "input-end-date",
            width: "50%",
            customComponent: (
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                data-testid="input-end-date"
                className={getFieldClassName("endDate")}
              />
            ),
            isModified: modifiedFields.has("endDate")
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
            width: "50%",
            isModified: modifiedFields.has("totalValue")
          } as FormField2<FormData>,
          {
            key: "progress",
            label: "Progress (%)",
            type: "number",
            placeholder: "0",
            register: form.register("progress"),
            testId: "input-progress",
            width: "50%",
            isModified: modifiedFields.has("progress")
          } as FormField2<FormData>
        ])
      ]
    }
  ];

  const toolbar = useFormToolbar({
    entityType: "project",
    entityId: projectId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Header fields for info display (when editing)
  const createHeaderFields = (): InfoField[] => {
    if (!isEditing || !project) return [];
    
    return [
      {
        label: "Project",
        value: project.name
      },
      {
        label: "Status",
        value: project.status || "planning"
      }
    ];
  };

  return (
    <LayoutForm2
      sections={createFormSections()}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={onSubmit}
      toolbar={toolbar}
      headerFields={createHeaderFields()}
      documentType="project"
      entityId={projectId}
      isLoading={isLoadingProject}
      changeTracking={{
        enabled: true,
        suppressTracking: false,
        modifiedFieldClassName: 'ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950',
        onChangesDetected: (hasChanges, modifiedFields) => {
          setHasUnsavedChanges(hasChanges);
          setModifiedFields(modifiedFields);
        }
      }}
      originalValues={originalValues}
    />
  );
}