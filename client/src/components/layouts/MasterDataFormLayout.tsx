import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow } from '@/components/layouts/LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
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
  
  const config = useMemo(() => getMasterDataConfig(type), [type]);
  const isEditing = !!id;

  const form = useForm({
    resolver: config ? zodResolver(config.schema) : undefined,
    defaultValues: config ? {
      ...config.fields.reduce((acc, field) => {
        acc[field.name] = field.type === 'number' ? 0 : '';
        return acc;
      }, {} as any),
      ...(config.hiddenDefaults || {}),
    } : {}
  });

  const { data: existingData, isLoading: isLoadingData } = useQuery({
    queryKey: [`/api/masterdata/${config?.endpoint}`, id],
    queryFn: async () => {
      if (!id || !config) return null;
      const response = await fetch(`/api/masterdata/${config.endpoint}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!id && !!config
  });

  useEffect(() => {
    if (existingData && isEditing) {
      form.reset(existingData);
    }
  }, [existingData, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!config) throw new Error('No config');
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
      if (config) {
        queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${config.endpoint}`] });
      }
      toast({
        title: "Success",
        description: `${config?.singularTitle || 'Item'} ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onSave?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} ${(config?.singularTitle || 'item').toLowerCase()}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: any) => {
    const submitData = { ...data };
    if (config?.hiddenDefaults) {
      Object.entries(config.hiddenDefaults).forEach(([key, value]) => {
        if (submitData[key] === undefined || submitData[key] === null || submitData[key] === '') {
          submitData[key] = value;
        }
      });
    }
    createMutation.mutate(submitData);
  };

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

  const formSections: FormSection2<any>[] = useMemo(() => {
    if (!config) return [];
    
    const rows: any[] = config.fields.map(field => 
      createFieldRow({
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
      } as FormField2<any>)
    );

    return [{
      id: "data",
      label: config.singularTitle,
      icon: <Database className="h-4 w-4" />,
      rows
    }];
  }, [config, form.control]);

  const toolbar = useFormToolbar({
    entityType: `masterdata-${type}`,
    entityId: id,
    onSave: form.handleSubmit(handleSubmit),
    onClose: () => onSave?.(),
    saveDisabled: createMutation.isPending,
    saveLoading: createMutation.isPending,
  });

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

  if (isLoadingData && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div>Loading {config.singularTitle.toLowerCase()}...</div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={handleSubmit}
        toolbar={toolbar}
        documentType={`masterdata-${type}`}
        entityId={id}
        isLoading={createMutation.isPending}
      />
    </Form>
  );
}
