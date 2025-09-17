import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database, Settings } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';
import { getMasterDataConfig, type MasterDataField } from "@/config/masterdata-config";

interface MasterDataFormLayoutProps {
  type: string;
  id?: string;
  onSave?: () => void;
}

export default function MasterDataFormLayout({ type, id, onSave }: MasterDataFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("data");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const config = getMasterDataConfig(type);
  
  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Invalid Master Data Type</h2>
          <p className="text-muted-foreground">The master data type "{type}" is not recognized.</p>
        </div>
      </div>
    );
  }

  const form = useForm({
    resolver: zodResolver(config.schema),
    defaultValues: config.fields.reduce((acc, field) => {
      acc[field.name] = field.type === 'number' ? 0 : '';
      return acc;
    }, {} as any)
  });

  const isEditing = !!id;

  // Fetch existing data for editing
  const { data: existingData, isLoading: isLoadingData } = useQuery({
    queryKey: [`/api/masterdata/${config.endpoint}`, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/masterdata/${config.endpoint}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!id
  });

  // Update form when data loads
  useEffect(() => {
    if (existingData && isEditing) {
      form.reset(existingData);
    }
  }, [existingData, isEditing, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isEditing 
        ? `/api/masterdata/${config.endpoint}/${id}`
        : `/api/masterdata/${config.endpoint}`;
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${config.endpoint}`] });
      toast({
        title: "Success",
        description: `${config.singularTitle} ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onSave?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} ${config.singularTitle.toLowerCase()}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  // Dynamic field component renderer
  const renderFieldComponent = (field: MasterDataField, formField: any) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            onValueChange={formField.onChange}
            value={formField.value}
            data-testid={`select-${field.name}`}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            {...formField}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            data-testid={`textarea-${field.name}`}
          />
        );
      case 'number':
        return (
          <Input
            {...formField}
            type="number"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            data-testid={`input-${field.name}`}
            onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
          />
        );
      default:
        return (
          <Input
            {...formField}
            type="text"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            data-testid={`input-${field.name}`}
          />
        );
    }
  };

  // Create dynamic form sections based on fields
  const createDynamicFormSections = (): FormSection2<any>[] => {
    // Group fields by type for better organization
    const basicFields = config.fields.filter(f => ['text', 'number'].includes(f.type));
    const selectFields = config.fields.filter(f => f.type === 'select');
    const textareaFields = config.fields.filter(f => f.type === 'textarea');
    
    const sections: FormSection2<any>[] = [];
    
    // Main data section
    const dataRows: any[] = [];
    
    // Add basic fields (text/number) in pairs if possible
    for (let i = 0; i < basicFields.length; i += 2) {
      const field1 = basicFields[i];
      const field2 = basicFields[i + 1];
      
      if (field2) {
        // Two fields side by side
        dataRows.push(createFieldsRow([
          {
            key: field1.name,
            label: field1.label,
            type: "custom",
            customComponent: (
              <FormField
                control={form.control}
                name={field1.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormControl>
                      {renderFieldComponent(field1, formField)}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ),
            validation: {
              isRequired: field1.required
            },
            testId: `${field1.type}-${field1.name}`,
            width: "50%"
          } as FormField2<any>,
          {
            key: field2.name,
            label: field2.label,
            type: "custom",
            customComponent: (
              <FormField
                control={form.control}
                name={field2.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormControl>
                      {renderFieldComponent(field2, formField)}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ),
            validation: {
              isRequired: field2.required
            },
            testId: `${field2.type}-${field2.name}`,
            width: "50%"
          } as FormField2<any>
        ]));
      } else {
        // Single field full width
        dataRows.push(createFieldRow({
          key: field1.name,
          label: field1.label,
          type: "custom",
          customComponent: (
            <FormField
              control={form.control}
              name={field1.name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormControl>
                    {renderFieldComponent(field1, formField)}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ),
          validation: {
            isRequired: field1.required
          },
          testId: `${field1.type}-${field1.name}`
        } as FormField2<any>));
      }
    }
    
    // Add select fields
    selectFields.forEach(field => {
      dataRows.push(createFieldRow({
        key: field.name,
        label: field.label,
        type: "custom",
        customComponent: (
          <FormField
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormControl>
                  {renderFieldComponent(field, formField)}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ),
        validation: {
          isRequired: field.required
        },
        testId: `${field.type}-${field.name}`
      } as FormField2<any>));
    });
    
    // Add textarea fields
    textareaFields.forEach(field => {
      dataRows.push(createFieldRow({
        key: field.name,
        label: field.label,
        type: "custom",
        customComponent: (
          <FormField
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormControl>
                  {renderFieldComponent(field, formField)}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ),
        validation: {
          isRequired: field.required
        },
        testId: `${field.type}-${field.name}`
      } as FormField2<any>));
    });
    
    if (dataRows.length > 0) {
      sections.push({
        id: "data",
        label: "Data",
        icon: <Database className="h-4 w-4" />,
        rows: dataRows
      });
    }
    
    return sections;
  };

  // Create action buttons
  const createActionButtons = (): ActionButton[] => [
    {
      label: "Cancel",
      variant: "outline",
      onClick: () => onSave?.(),
      disabled: createMutation.isPending
    },
    {
      label: createMutation.isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Create"),
      variant: "default",
      onClick: () => form.handleSubmit(handleSubmit)(),
      disabled: createMutation.isPending
    }
  ];

  if (isLoadingData && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading {config.singularTitle.toLowerCase()}...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">
          {isEditing ? `Edit ${config.singularTitle}` : `Add New ${config.singularTitle}`}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? `Update the ${config.singularTitle.toLowerCase()} details` : `Create a new ${config.singularTitle.toLowerCase()}`}
        </p>
      </div>

      <Form {...form}>
        <LayoutForm2
          sections={createDynamicFormSections()}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          form={form}
          onSubmit={handleSubmit}
          actionButtons={createActionButtons()}
          isLoading={createMutation.isPending}
        />
      </Form>
    </div>
  );
}