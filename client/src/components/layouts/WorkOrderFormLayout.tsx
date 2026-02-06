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
import { QuickAddProject } from "@/components/quick-add-forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ClipboardList, Calendar, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { WorkOrder, InsertWorkOrder, Project } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from './LayoutForm2';

// Form schema for work order data
const workOrderFormSchema = insertWorkOrderSchema.extend({
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
});

type FormData = z.infer<typeof workOrderFormSchema>;

// Use a flexible type for form data to handle dynamic validation
type FormFieldValues = {
  [key: string]: any;
};

interface WorkOrderFormLayoutProps {
  onSave: () => void;
  workOrderId?: string;
  parentId?: string; // ID of the parent tab that opened this form
}

export function WorkOrderFormLayout({ onSave, workOrderId, parentId }: WorkOrderFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("basic");
  
  // Change tracking state
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const isEditing = !!workOrderId;

  const form = useForm<FormData>({
    resolver: zodResolver(workOrderFormSchema),
    mode: 'onBlur',
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

  // Change tracking helpers
  const compareValues = (original: any, current: any) => {
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

  // Load work order data if editing
  const { data: workOrder, isLoading: isLoadingWorkOrder } = useQuery<WorkOrder>({
    queryKey: ["/api/work-orders", workOrderId],
    enabled: !!workOrderId,
  });

  // Load projects data for select options
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Update form when work order data loads and store original values for change tracking
  useEffect(() => {
    if (workOrder) {
      const formData = {
        orderNumber: workOrder.orderNumber || "",
        projectId: workOrder.projectId || "",
        title: workOrder.title || "",
        description: workOrder.description || "",
        assignedTo: workOrder.assignedTo || "",
        status: workOrder.status || "pending",
        priority: workOrder.priority || "medium",
        startDate: workOrder.startDate ? format(new Date(workOrder.startDate), "yyyy-MM-dd") : undefined,
        dueDate: workOrder.dueDate ? format(new Date(workOrder.dueDate), "yyyy-MM-dd") : undefined,
        completedDate: workOrder.completedDate ? format(new Date(workOrder.completedDate), "yyyy-MM-dd") : undefined,
        estimatedHours: workOrder.estimatedHours?.toString() || "",
        actualHours: workOrder.actualHours?.toString() || "",
      };
      
      form.reset(formData);
      
      // Store original values for change tracking
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      // For new work order, store default values as original
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
  }, [workOrder, form]);

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
  const orderNumberValue = form.watch("orderNumber");
  const projectIdValue = form.watch("projectId");
  const titleValue = form.watch("title");
  const descriptionValue = form.watch("description");
  const assignedToValue = form.watch("assignedTo");
  const statusValue = form.watch("status");
  const priorityValue = form.watch("priority");
  const startDateValue = form.watch("startDate");
  const dueDateValue = form.watch("dueDate");
  const completedDateValue = form.watch("completedDate");
  const estimatedHoursValue = form.watch("estimatedHours");
  const actualHoursValue = form.watch("actualHours");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [
    orderNumberValue, projectIdValue, titleValue, descriptionValue, assignedToValue,
    statusValue, priorityValue, startDateValue, dueDateValue, completedDateValue,
    estimatedHoursValue, actualHoursValue, scheduleChangeCheck
  ]);

  // Communicate unsaved changes status to parent Layout
  useEffect(() => {
    const tabId = workOrderId ? `edit-work-order-${workOrderId}` : 'new-work-order';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, workOrderId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InsertWorkOrder) => {
      const response = await apiRequest("POST", "/api/work-orders", data);
      return response.json();
    },
    onSuccess: (newWorkOrder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Success",
        description: "Work order created successfully",
      });
      
      // Dispatch scoped entity-created event 
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'work-order',
          entity: newWorkOrder,
          parentId: parentId // Scope to originating component
        }
      }));
      
      onSave();
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
    mutationFn: async (data: Partial<InsertWorkOrder>) => {
      const response = await apiRequest("PUT", `/api/work-orders/${workOrderId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId] });
      toast({
        title: "Success",
        description: "Work order updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = (data: FormData) => {
    const transformedData: InsertWorkOrder = {
      ...data,
      estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : undefined,
      actualHours: data.actualHours ? parseInt(data.actualHours) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
    };
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  // Custom project select component
  const renderProjectSelect = () => (
    <SelectWithAdd
      value={form.watch("projectId") || ""}
      onValueChange={(value) => form.setValue("projectId", value || "")}
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
      icon: <ClipboardList className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "orderNumber",
          label: "Order Number",
          type: "text",
          placeholder: "WO-2024-0001",
          register: form.register("orderNumber"),
          validation: {
            error: form.formState.errors.orderNumber?.message,
            isRequired: true
          },
          testId: "input-order-number",
          isModified: modifiedFields.has("orderNumber")
        } as FormField2<FormData>),
        createFieldRow({
          key: "projectId",
          label: "Project",
          type: "custom",
          customComponent: renderProjectSelect(),
          testId: "select-project",
          isModified: modifiedFields.has("projectId")
        } as FormField2<FormData>),
        createFieldRow({
          key: "title",
          label: "Title",
          type: "text",
          placeholder: "Enter work order title",
          register: form.register("title"),
          validation: {
            error: form.formState.errors.title?.message,
            isRequired: true
          },
          testId: "input-title",
          isModified: modifiedFields.has("title")
        } as FormField2<FormData>),
        createFieldRow({
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Enter work order description...",
          register: form.register("description"),
          testId: "textarea-description",
          rows: 4,
          isModified: modifiedFields.has("description")
        } as FormField2<FormData>),
        createFieldRow({
          key: "assignedTo",
          label: "Assigned To",
          type: "text",
          placeholder: "Employee name",
          register: form.register("assignedTo"),
          testId: "input-assigned-to",
          isModified: modifiedFields.has("assignedTo")
        } as FormField2<FormData>)
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
            key: "dueDate",
            label: "Due Date",
            type: "custom",
            testId: "input-due-date",
            width: "50%",
            customComponent: (
              <Input
                id="dueDate"
                type="date"
                {...form.register("dueDate")}
                data-testid="input-due-date"
                className={getFieldClassName("dueDate")}
              />
            ),
            isModified: modifiedFields.has("dueDate")
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "completedDate",
          label: "Completed Date",
          type: "custom",
          testId: "input-completed-date",
          customComponent: (
            <Input
              id="completedDate"
              type="date"
              {...form.register("completedDate")}
              data-testid="input-completed-date"
              className={getFieldClassName("completedDate")}
              style={{ width: "50%" }}
            />
          ),
          isModified: modifiedFields.has("completedDate")
        } as FormField2<FormData>),
        createFieldsRow([
          {
            key: "estimatedHours",
            label: "Estimated Hours",
            type: "number",
            placeholder: "0",
            register: form.register("estimatedHours"),
            testId: "input-estimated-hours",
            width: "50%",
            isModified: modifiedFields.has("estimatedHours")
          } as FormField2<FormData>,
          {
            key: "actualHours",
            label: "Actual Hours",
            type: "number",
            placeholder: "0",
            register: form.register("actualHours"),
            testId: "input-actual-hours",
            width: "50%",
            isModified: modifiedFields.has("actualHours")
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "status",
      label: "Status & Priority",
      icon: <AlertTriangle className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pending", label: "Pending" },
              { value: "in-progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" }
            ],
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            testId: "select-status",
            width: "50%",
            isModified: modifiedFields.has("status")
          } as FormField2<FormData>,
          {
            key: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" }
            ],
            setValue: (value) => form.setValue("priority", value),
            watch: () => form.watch("priority"),
            testId: "select-priority",
            width: "50%",
            isModified: modifiedFields.has("priority")
          } as FormField2<FormData>
        ])
      ]
    }
  ];

  const toolbar = useFormToolbar({
    entityType: "work_order",
    entityId: workOrderId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  // Header fields for info display (when editing)
  const createHeaderFields = (): InfoField[] => {
    if (!isEditing || !workOrder) return [];
    
    return [
      {
        label: "Order #",
        value: workOrder.orderNumber
      },
      {
        label: "Status",
        value: workOrder.status || "pending"
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
      documentType="work_order"
      entityId={workOrderId}
      isLoading={isLoadingWorkOrder}
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