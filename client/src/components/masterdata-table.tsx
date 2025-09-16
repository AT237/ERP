import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { ActionButton } from '@/components/layouts/BaseFormLayout';

interface MasterDataTableProps {
  title: string;
  endpoint: string;
  schema: z.ZodSchema;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any) => string;
  }>;
}

export default function MasterDataTable({ title, endpoint, schema, fields, columns }: MasterDataTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("data");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = field.type === 'number' ? 0 : '';
      return acc;
    }, {} as any)
  });

  // Fetch data
  const { data: items = [], isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(`/api/masterdata/${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/masterdata/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: `${title} created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create ${title.toLowerCase()}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const handleNewItem = () => {
    form.reset();
    setIsDialogOpen(true);
  };

  // Dynamic field component renderer
  const renderFieldComponent = (field: any, formField: any) => {
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
              {field.options?.map((option: any) => (
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
      default:
        return (
          <Input
            {...formField}
            type={field.type}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            data-testid={`input-${field.name}`}
          />
        );
    }
  };

  // Create dynamic form sections based on fields
  const createDynamicFormSections = (): FormSection2<any>[] => {
    // Group fields by type for better organization
    const basicFields = fields.filter(f => ['text', 'number'].includes(f.type));
    const selectFields = fields.filter(f => f.type === 'select');
    const textareaFields = fields.filter(f => f.type === 'textarea');
    
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
      onClick: () => setIsDialogOpen(false),
      disabled: createMutation.isPending
    },
    {
      label: createMutation.isPending ? "Creating..." : "Create",
      variant: "default",
      onClick: () => form.handleSubmit(handleSubmit)(),
      disabled: createMutation.isPending
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewItem} data-testid={`button-add-${endpoint}`}>
              <Plus className="mr-2" size={16} />
              Add {title.slice(0, -1)}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New {title.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <LayoutForm2<any>
                sections={createDynamicFormSections()}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                form={form}
                onSubmit={handleSubmit}
                actionButtons={createActionButtons()}
                isLoading={createMutation.isPending}
              />
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div>Loading...</div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{title} ({Array.isArray(items) ? items.length : 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th key={column.key} className="text-left p-3 font-medium">
                        {column.label}
                      </th>
                    ))}
                    <th className="text-left p-3 font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(items) || items.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="text-center p-8 text-muted-foreground">
                        No {title.toLowerCase()} found. Click "Add {title.slice(0, -1)}" to create one.
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        {columns.map((column) => (
                          <td key={column.key} className="p-3">
                            {column.render ? column.render(item[column.key]) : item[column.key]}
                          </td>
                        ))}
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}