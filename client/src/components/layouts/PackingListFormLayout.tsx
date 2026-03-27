import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout } from './BaseFormLayout';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { SelectWithAdd } from "@/components/ui/select-with-add";
import { QuickAddCustomer, QuickAddProject } from "@/components/quick-add-forms";
import { Textarea } from "@/components/ui/textarea";
import { CustomerSelect } from "@/components/ui/customer-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPackingListSchema, insertPackingListItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Box, Package, Truck, Plus, Trash2, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import { DataTableLayout, createIdColumn, createNumericColumn, type DirectInputConfig } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { PackingList, PackingListItem, InsertPackingList, InsertPackingListItem, Customer, Invoice, Project, InventoryItem } from "@shared/schema";
import { z } from "zod";
import { LayoutForm2, FormSection2, FormField2, createFieldRow, createFieldsRow } from './LayoutForm2';

const formSchema = insertPackingListSchema.extend({
  weight: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type FormFieldValues = {
  [key: string]: any;
};

interface PackingListFormLayoutProps {
  onSave: () => void;
  packingListId?: string;
  parentId?: string;
}

export function PackingListFormLayout({ onSave, packingListId, parentId }: PackingListFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("basic");
  const [, navigate] = useLocation();
  const [originalValues, setOriginalValues] = useState<FormFieldValues>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [suppressTracking, setSuppressTracking] = useState(true);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    packingNumber: { label: "Paklijst nummer" },
    customerId: { label: "Klant" },
  });
  const [currentPackingListId, setCurrentPackingListId] = useState<string | undefined>(packingListId);
  const isEditing = !!currentPackingListId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      packingNumber: "",
      customerId: "",
      invoiceId: "",
      projectId: "",
      status: "pending",
      shippingAddress: "",
      shippingMethod: "",
      trackingNumber: "",
      weight: "",
      dimensions: "",
      notes: "",
    },
  });

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

  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    if (suppressTracking) return baseClassName;
    const isModified = modifiedFields.has(fieldName);
    if (isModified) {
      return `${baseClassName} ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950`.trim();
    }
    return baseClassName;
  };

  const { data: packingList, isLoading: isLoadingPackingList } = useQuery<PackingList>({
    queryKey: ["/api/packing-lists", packingListId],
    enabled: !!packingListId,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: packingListItems = [] } = useQuery<PackingListItem[]>({
    queryKey: ["/api/packing-lists", currentPackingListId, "items"],
    enabled: !!currentPackingListId,
  });

  const itemColumns = useMemo(() => [
    createIdColumn('id', 'ID'),
    {
      key: 'itemId',
      label: 'Stock item',
      visible: true,
      forceVisible: true,
      width: 250,
      filterable: true,
      sortable: true,
      renderCell: (value: any) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const item = inventoryItems.find((i: any) => i.id === value);
        return <span>{item ? `${item.sku || ''} - ${item.name || ''}`.trim() : value}</span>;
      }
    },
    createNumericColumn('quantity', 'Aantal'),
    createNumericColumn('packedQuantity', 'Ingepakt'),
  ], [inventoryItems]);

  const itemTableState = useDataTable({
    defaultColumns: itemColumns,
    tableKey: 'packing-list-items',
  });

  useEffect(() => {
    setSuppressTracking(true);
    if (packingList) {
      const formData = {
        packingNumber: packingList.packingNumber || "",
        customerId: packingList.customerId || "",
        invoiceId: packingList.invoiceId || "",
        projectId: packingList.projectId || "",
        status: packingList.status || "pending",
        shippingAddress: packingList.shippingAddress || "",
        shippingMethod: packingList.shippingMethod || "",
        trackingNumber: packingList.trackingNumber || "",
        weight: packingList.weight || "",
        dimensions: packingList.dimensions || "",
        notes: packingList.notes || "",
      };
      form.reset(formData);
      setOriginalValues(formData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    }
    setTimeout(() => setSuppressTracking(false), 100);
  }, [packingList, form]);

  const [checkScheduled, setCheckScheduled] = useState(false);
  const scheduleChangeCheck = useCallback(() => {
    if (suppressTracking || checkScheduled) return;
    setCheckScheduled(true);
    setTimeout(() => {
      if (!suppressTracking && Object.keys(originalValues).length > 0) {
        checkForChanges();
      }
      setCheckScheduled(false);
    }, 200);
  }, [suppressTracking, checkScheduled, originalValues, checkForChanges]);

  const packingNumberValue = form.watch("packingNumber");
  const customerIdValue = form.watch("customerId");
  const invoiceIdValue = form.watch("invoiceId");
  const projectIdValue = form.watch("projectId");
  const statusValue = form.watch("status");
  const shippingAddressValue = form.watch("shippingAddress");
  const shippingMethodValue = form.watch("shippingMethod");
  const trackingNumberValue = form.watch("trackingNumber");
  const weightValue = form.watch("weight");
  const dimensionsValue = form.watch("dimensions");
  const notesValue = form.watch("notes");
  
  useEffect(() => {
    scheduleChangeCheck();
  }, [packingNumberValue, customerIdValue, invoiceIdValue, projectIdValue, statusValue, shippingAddressValue, shippingMethodValue, trackingNumberValue, weightValue, dimensionsValue, notesValue, scheduleChangeCheck]);

  useEffect(() => {
    const tabId = packingListId ? `edit-packing-list-${packingListId}` : 'new-packing-list';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, packingListId]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertPackingList) => {
      const response = await apiRequest("POST", "/api/packing-lists", data);
      return response.json();
    },
    onSuccess: (newPackingList) => {
      setCurrentPackingListId(newPackingList.id);
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-packing-list', hasUnsavedChanges: false }
      }));
      toast({ title: "Paklijst aangemaakt" });
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: { entityType: 'packing-list', entity: newPackingList, parentId }
      }));
    },
    onError: () => {
      toast({ title: "Aanmaken mislukt", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertPackingList>) => {
      const response = await apiRequest("PUT", `/api/packing-lists/${packingListId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId] });
      setHasUnsavedChanges(false);
      setModifiedFields(new Set());
      const tabId = packingListId ? `edit-packing-list-${packingListId}` : 'new-packing-list';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({ title: "Paklijst bijgewerkt" });
    },
    onError: () => {
      toast({ title: "Bijwerken mislukt", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    const submitData: InsertPackingList = {
      ...data,
      weight: data.weight || undefined,
      invoiceId: data.invoiceId || undefined,
      projectId: data.projectId || undefined,
    };
    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleBulkDeleteItems = async () => {
    const selectedIds = itemTableState.selectedRows;
    await Promise.all(selectedIds.map(id => apiRequest("DELETE", `/api/packing-list-items/${id}`)));
    queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", currentPackingListId, "items"] });
    itemTableState.setSelectedRows([]);
    setIsBulkDeleteOpen(false);
    toast({ title: `${selectedIds.length} item(s) verwijderd` });
  };

  const packingListDirectInput: DirectInputConfig | undefined = useMemo(() => {
    if (!currentPackingListId) return undefined;
    return {
      columns: [
        { key: 'itemId', 
          fieldType: 'searchable-select', 
          placeholder: 'Zoek artikel...', 
          options: inventoryItems.map(item => ({ 
            value: item.id, 
            label: `${item.sku || ''} - ${item.name || ''}`.trim()
          })),
          onSelect: (val) => {
            const item = inventoryItems.find(i => i.id === val);
            if (!item) return {};
            return { itemId: item.id };
          },
        },
        { key: 'quantity', fieldType: 'number', defaultValue: '1', placeholder: 'Aantal' },
        { key: 'packedQuantity', fieldType: 'number', defaultValue: '0', placeholder: 'Ingepakt' },
      ],
      defaults: {
        itemId: '',
        quantity: '1',
        packedQuantity: '0',
      },
      onSave: async (rowData) => {
        if (!rowData.itemId) {
          toast({ title: "Selecteer een artikel", variant: "destructive" });
          return;
        }
        await apiRequest("POST", `/api/packing-lists/${currentPackingListId}/items`, {
          packingListId: currentPackingListId,
          itemId: rowData.itemId,
          quantity: parseInt(rowData.quantity || '1') || 1,
          packedQuantity: parseInt(rowData.packedQuantity || '0') || 0,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", currentPackingListId, "items"] });
        toast({ title: "Item toegevoegd" });
      },
      onUpdate: async (rowId, rowData) => {
        await apiRequest("PUT", `/api/packing-list-items/${rowId}`, {
          itemId: rowData.itemId,
          quantity: parseInt(rowData.quantity || '1') || 1,
          packedQuantity: parseInt(rowData.packedQuantity || '0') || 0,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", currentPackingListId, "items"] });
        toast({ title: "Item bijgewerkt" });
      },
    };
  }, [currentPackingListId, inventoryItems, toast]);

  const renderCustomerSelect = () => (
    <CustomerSelect
      value={form.watch("customerId") || ""}
      onValueChange={(value) => form.setValue("customerId", value)}
    />
  );

  const renderInvoiceSelect = () => (
    <Select 
      value={form.watch("invoiceId") || ""} 
      onValueChange={(value) => form.setValue("invoiceId", value)}
    >
      <SelectTrigger className={getFieldClassName("invoiceId", "h-10 text-xs")}>
        <SelectValue placeholder="Selecteer factuur" />
      </SelectTrigger>
      <SelectContent>
        {invoices?.map((invoice) => (
          <SelectItem key={invoice.id} value={invoice.id}>
            {invoice.invoiceNumber}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderProjectSelect = () => (
    <Select 
      value={form.watch("projectId") || ""} 
      onValueChange={(value) => form.setValue("projectId", value)}
    >
      <SelectTrigger className={getFieldClassName("projectId", "h-10 text-xs")}>
        <SelectValue placeholder="Selecteer project" />
      </SelectTrigger>
      <SelectContent>
        {projects?.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.projectNumber} - {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const createFormSections = (): FormSection2<FormData>[] => [
    {
      id: "basic",
      label: "Basis",
      icon: <Box className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "packingNumber",
            label: "Paklijst nr.",
            type: "text",
            placeholder: "PL-0001",
            register: form.register("packingNumber"),
            validation: {
              error: form.formState.errors.packingNumber?.message,
              isRequired: true
            },
            testId: "input-packing-number",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pending", label: "In afwachting" },
              { value: "packed", label: "Ingepakt" },
              { value: "shipped", label: "Verzonden" },
              { value: "delivered", label: "Afgeleverd" }
            ],
            setValue: (value) => form.setValue("status", value),
            watch: () => form.watch("status"),
            testId: "select-status",
            width: "50%"
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "customerId",
          label: "Klant",
          type: "custom",
          customComponent: renderCustomerSelect(),
          validation: {
            error: form.formState.errors.customerId?.message,
            isRequired: true
          },
          testId: "select-customer"
        } as FormField2<FormData>)
      ]
    },
    {
      id: "relations",
      label: "Relaties",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createFieldsRow([
          {
            key: "invoiceId",
            label: "Factuur",
            type: "custom",
            customComponent: renderInvoiceSelect(),
            testId: "select-invoice",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "projectId",
            label: "Project",
            type: "custom",
            customComponent: renderProjectSelect(),
            testId: "select-project",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "shipping",
      label: "Verzending",
      icon: <Truck className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: "shippingAddress",
          label: "Verzendadres",
          type: "textarea",
          placeholder: "Verzendadres...",
          register: form.register("shippingAddress"),
          testId: "textarea-shipping-address",
          rows: 3
        } as FormField2<FormData>),
        createFieldsRow([
          {
            key: "shippingMethod",
            label: "Verzendmethode",
            type: "select",
            options: [
              { value: "standard", label: "Standaard" },
              { value: "express", label: "Express" },
              { value: "overnight", label: "Overnight" },
              { value: "freight", label: "Vracht" },
              { value: "pickup", label: "Afhalen" }
            ],
            setValue: (value) => form.setValue("shippingMethod", value),
            watch: () => form.watch("shippingMethod"),
            testId: "select-shipping-method",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "trackingNumber",
            label: "Trackingnummer",
            type: "text",
            placeholder: "Trackingnummer",
            register: form.register("trackingNumber"),
            testId: "input-tracking-number",
            width: "50%"
          } as FormField2<FormData>
        ])
      ]
    },
    {
      id: "details",
      label: "Details",
      icon: <span className="text-xs font-bold">⚙</span>,
      rows: [
        createFieldsRow([
          {
            key: "weight",
            label: "Gewicht (kg)",
            type: "number",
            placeholder: "0.00",
            register: form.register("weight"),
            testId: "input-weight",
            width: "50%"
          } as FormField2<FormData>,
          {
            key: "dimensions",
            label: "Afmetingen",
            type: "text",
            placeholder: "L x B x H",
            register: form.register("dimensions"),
            testId: "input-dimensions",
            width: "50%"
          } as FormField2<FormData>
        ]),
        createFieldRow({
          key: "notes",
          label: "Opmerkingen",
          type: "textarea",
          placeholder: "Opmerkingen...",
          register: form.register("notes"),
          testId: "textarea-notes",
          rows: 3
        } as FormField2<FormData>)
      ]
    }
  ];

  const toolbar = useFormToolbar({
    entityType: "packing_list",
    entityId: packingListId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const headerFields: InfoField[] = [
    { 
      label: "Paklijst", 
      value: isEditing ? (packingList?.packingNumber || "-") : "Nieuwe paklijst"
    },
    { 
      label: "Status", 
      value: isEditing ? (packingList?.status || "pending") : "pending"
    },
  ];

  const formContent = (
    <LayoutForm2
      sections={createFormSections()}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      modifiedFields={modifiedFields}
      form={form}
      entityId={currentPackingListId}
      isLoading={isLoadingPackingList}
    />
  );

  const itemsContent = (
    <div className="px-6 py-4 bg-white ml-[15px] mr-[15px]">
      <DataTableLayout
        data={packingListItems}
        isLoading={false}
        columns={itemTableState.columns}
        setColumns={itemTableState.setColumns}
        searchTerm={itemTableState.searchTerm}
        setSearchTerm={itemTableState.setSearchTerm}
        filters={itemTableState.filters}
        setFilters={itemTableState.setFilters}
        onAddFilter={itemTableState.addFilter}
        onUpdateFilter={itemTableState.updateFilter}
        onRemoveFilter={itemTableState.removeFilter}
        sortConfig={itemTableState.sortConfig}
        onSort={itemTableState.handleSort}
        selectedRows={itemTableState.selectedRows}
        setSelectedRows={itemTableState.setSelectedRows}
        onToggleRowSelection={itemTableState.toggleRowSelection}
        onToggleAllRows={() => {
          const allIds = packingListItems.map(item => item.id);
          itemTableState.toggleAllRows(allIds);
        }}
        getRowId={(item: PackingListItem) => item.id}
        entityName="Paklijst item"
        entityNamePlural="Paklijst items"
        applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
        applySorting={itemTableState.applySorting}
        compact={true}
        directInput={packingListDirectInput}
        deleteConfirmDialog={{
          isOpen: isBulkDeleteOpen,
          onOpenChange: setIsBulkDeleteOpen,
          onConfirm: handleBulkDeleteItems,
          itemCount: itemTableState.selectedRows.length,
          entityName: "paklijst items",
        }}
      />
    </div>
  );

  const tabs = [
    {
      id: "form",
      label: "Formulier",
      content: formContent,
    },
    {
      id: "items",
      label: `Items (${packingListItems.length})`,
      content: currentPackingListId ? itemsContent : (
        <div className="text-center py-8 text-gray-500 text-sm">
          Sla de paklijst eerst op om items toe te voegen.
        </div>
      ),
    },
  ];

  return (
    <BaseFormLayout
      headerFields={headerFields}
      toolbar={toolbar}
      tabs={tabs}
      activeTab={activeSection === "items" ? "items" : "form"}
      onTabChange={(tabId) => {
        if (tabId === "items") {
          setActiveSection("items");
        } else {
          setActiveSection("basic");
        }
      }}
      isLoading={isLoadingPackingList || createMutation.isPending || updateMutation.isPending}
      validationErrorDialog={
        <ValidationErrorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          errors={validErrors}
          onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
        />
      }
    />
  );
}
