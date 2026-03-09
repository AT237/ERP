import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database, RefreshCw } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow } from '@/components/layouts/LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { getMasterDataConfig, type MasterDataField, type MasterDataSection } from "@/config/masterdata-config";
import { EntitySelect } from "@/components/ui/entity-select";

interface MasterDataFormLayoutProps {
  type: string;
  id?: string;
  onSave?: () => void;
}

export default function MasterDataFormLayout({ type, id, onSave }: MasterDataFormLayoutProps) {
  const [activeSection, setActiveSection] = useState(() => {
    const cfg = getMasterDataConfig(type);
    return cfg?.sections ? cfg.sections[0].id : "data";
  });
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors();
  const queryClient = useQueryClient();
  
  const config = useMemo(() => getMasterDataConfig(type), [type]);
  const [currentId, setCurrentId] = useState<string | undefined>(id);
  const isEditing = !!currentId;

  const allFields = useMemo(() => {
    if (!config) return [];
    if (config.sections) {
      return config.sections.flatMap(s => s.fields);
    }
    return config.fields;
  }, [config]);

  // Collect unique fetchOptionsFrom endpoints from all fields
  const dynamicEndpoints = useMemo(() =>
    [...new Set(allFields.filter(f => f.fetchOptionsFrom).map(f => f.fetchOptionsFrom!))],
    [allFields]
  );

  // Fetch all dynamic option sources in parallel
  const dynamicQueries = useQueries({
    queries: dynamicEndpoints.map(endpoint => ({
      queryKey: [`/api/masterdata/${endpoint}`],
      queryFn: async () => {
        const res = await fetch(`/api/masterdata/${endpoint}`);
        if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
        return res.json();
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Build a map: endpoint → options array
  const dynamicOptionsMap = useMemo(() => {
    const map: Record<string, Array<{ value: string; label: string }>> = {};
    dynamicEndpoints.forEach((endpoint, i) => {
      const raw: any[] = dynamicQueries[i]?.data || [];
      const field = allFields.find(f => f.fetchOptionsFrom === endpoint);
      const valueKey = field?.fetchOptionsMap?.value || 'code';
      const labelKey = field?.fetchOptionsMap?.label || 'name';
      map[endpoint] = raw
        .filter(item => item.isActive !== false)
        .map(item => ({ value: item[valueKey], label: `${item[valueKey]} – ${item[labelKey]}` }));
    });
    return map;
  }, [dynamicEndpoints, dynamicQueries, allFields]);

  const form = useForm({
    resolver: config ? zodResolver(config.schema) : undefined,
    defaultValues: config ? {
      ...allFields.reduce((acc, field) => {
        if (field.type === 'number') {
          acc[field.name] = 0;
        } else if (field.type === 'select' && field.options?.every(o => o.value === 'true' || o.value === 'false')) {
          acc[field.name] = false;
        } else {
          acc[field.name] = '';
        }
        return acc;
      }, {} as any),
      ...(config.hiddenDefaults || {}),
    } : {}
  });

  const { data: existingData, isLoading: isLoadingData } = useQuery({
    queryKey: [`/api/masterdata/${config?.endpoint}`, currentId],
    queryFn: async () => {
      if (!currentId || !config) return null;
      const response = await fetch(`/api/masterdata/${config.endpoint}/${currentId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!currentId && !!config
  });

  useEffect(() => {
    if (existingData && isEditing) {
      form.reset(existingData);
    }
  }, [existingData, isEditing, form]);

  // Auto-code: find the first auto-code field in the config
  const autoCodeField = useMemo(() => allFields.find(f => f.type === 'auto-code'), [allFields]);

  const { data: nextCodeData, refetch: refetchNextCode } = useQuery<{ code: string }>({
    queryKey: [autoCodeField?.nextCodeEndpoint],
    queryFn: async () => {
      if (!autoCodeField?.nextCodeEndpoint) return { code: '' };
      const res = await fetch(autoCodeField.nextCodeEndpoint);
      if (!res.ok) throw new Error('Failed to fetch next code');
      return res.json();
    },
    enabled: !!autoCodeField?.nextCodeEndpoint && !isEditing,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isEditing && nextCodeData?.code && autoCodeField && !form.getValues(autoCodeField.name)) {
      form.setValue(autoCodeField.name, nextCodeData.code);
    }
  }, [nextCodeData, isEditing, autoCodeField]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!config) throw new Error('No config');
      const url = isEditing 
        ? `/api/masterdata/${config.endpoint}/${currentId}`
        : `/api/masterdata/${config.endpoint}`;
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to save');
      }
      return response.json();
    },
    onSuccess: (saved: any) => {
      if (!isEditing && saved?.id) setCurrentId(saved.id);
      if (config) {
        queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${config.endpoint}`] });
      }
      toast({
        title: "Success",
        description: `${config?.singularTitle || 'Item'} ${isEditing ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || `Failed to ${isEditing ? 'update' : 'create'} ${(config?.singularTitle || 'item').toLowerCase()}`,
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
    const resolvedOptions = field.fetchOptionsFrom
      ? (dynamicOptionsMap[field.fetchOptionsFrom] || [])
      : (field.options || []);

    switch (field.type) {
      case 'select':
        if (field.fetchOptionsFrom) {
          return (
            <EntitySelect
              endpoint={field.fetchOptionsFrom}
              formType={`masterdata-${field.fetchOptionsFrom}`}
              labelField={field.fetchOptionsMap?.label || "name"}
              secondaryField={field.fetchOptionsMap?.value !== field.fetchOptionsMap?.label ? (field.fetchOptionsMap?.value || "code") : "code"}
              value={String(formField.value ?? "")}
              onValueChange={(val) => formField.onChange(val)}
              placeholder={`Select ${field.label.toLowerCase()}...`}
              testId={`select-${field.name}`}
            />
          );
        }
        return (
          <Select
            onValueChange={(val) => {
              if (val === "true") formField.onChange(true);
              else if (val === "false") formField.onChange(false);
              else formField.onChange(val);
            }}
            value={String(formField.value ?? "")}
            data-testid={`select-${field.name}`}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {resolvedOptions.map((option) => (
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
      case 'auto-code':
        return (
          <div className="flex gap-1 items-center">
            <Input
              {...formField}
              type="text"
              placeholder="RC-0001"
              data-testid={`input-${field.name}`}
              className="h-10 text-xs flex-1 font-mono"
            />
            {!isEditing && (
              <button
                type="button"
                title="Nieuw beschikbaar nummer ophalen"
                onClick={async () => {
                  const result = await refetchNextCode();
                  if (result.data?.code) {
                    formField.onChange(result.data.code);
                  }
                }}
                className="h-10 w-10 flex items-center justify-center rounded border border-input bg-background hover:bg-orange-50 hover:border-orange-400 transition-colors flex-shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
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

  const buildFieldRows = (fields: MasterDataField[]) => {
    return fields.map(field => 
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
  };

  const formSections: FormSection2<any>[] = useMemo(() => {
    if (!config) return [];
    
    if (config.sections) {
      return config.sections.map(section => ({
        id: section.id,
        label: section.label,
        rows: buildFieldRows(section.fields)
      }));
    }

    return [{
      id: "data",
      label: config.singularTitle,
      icon: <Database className="h-4 w-4" />,
      rows: buildFieldRows(config.fields)
    }];
  }, [config, form.control, dynamicOptionsMap]);

  const toolbar = useFormToolbar({
    entityType: `masterdata-${type}`,
    entityId: id,
    onSave: form.handleSubmit(handleSubmit, onInvalid),
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
        validationErrorDialog={
          <ValidationErrorDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            errors={validErrors}
            onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
          />
        }
      />
    </Form>
  );
}
