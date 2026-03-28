import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { LayoutForm2, buildFormPersistenceKey, type FormSection2, createFieldsRow, createFieldRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import type { InfoField } from './InfoHeaderLayout';
import { InventorySelect } from "@/components/ui/inventory-select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPackingListItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PackingListItem, InventoryItem } from "@shared/schema";
import { z } from "zod";

const packingListItemFormSchema = insertPackingListItemSchema.extend({
  quantity: z.coerce.number().min(1, "Aantal moet minimaal 1 zijn"),
  packedQuantity: z.coerce.number().min(0, "Ingepakt aantal kan niet negatief zijn"),
});

type PackingListItemFormData = z.infer<typeof packingListItemFormSchema>;

interface PackingListItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  packingListId?: string;
}

export function PackingListItemFormLayout({ onSave, lineItemId, packingListId }: PackingListItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { toast } = useToast();
  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    itemId: { label: "Artikel" },
    quantity: { label: "Aantal" },
  });
  const isEditing = !!lineItemId;

  const form = useForm<PackingListItemFormData>({
    resolver: zodResolver(packingListItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      packingListId: packingListId || "",
      itemId: "",
      quantity: 1,
      packedQuantity: 0,
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<PackingListItem>({
    queryKey: ["/api/packing-list-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 5 * 60 * 1000,
  });

  const itemIdValue = form.watch("itemId");

  const selectedItem = inventoryItems.find(i => i.id === itemIdValue);

  useEffect(() => {
    if (lineItem && isEditing) {
      form.reset({
        packingListId: lineItem.packingListId,
        itemId: lineItem.itemId,
        quantity: lineItem.quantity,
        packedQuantity: lineItem.packedQuantity || 0,
      });
    }
  }, [lineItem, isEditing, form]);

  useEffect(() => {
    const tabId = lineItemId ? `edit-packing-list-item-${lineItemId}` : 'new-packing-list-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId]);

  const createMutation = useMutation({
    mutationFn: async (data: PackingListItemFormData) => {
      const response = await apiRequest("POST", `/api/packing-lists/${packingListId}/items`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kan item niet toevoegen");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId] });
      setHasUnsavedChanges(false);
      const newKey = buildFormPersistenceKey({ formType: "packing-list-item", entityId: undefined, scope: packingListId });
      localStorage.removeItem(newKey);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-packing-list-item', hasUnsavedChanges: false }
      }));
      toast({ title: "Item toegevoegd" });
      onSave();
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PackingListItemFormData) => {
      const response = await apiRequest("PUT", `/api/packing-list-items/${lineItemId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kan item niet bijwerken");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-list-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", packingListId] });
      setHasUnsavedChanges(false);
      toast({ title: "Item bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PackingListItemFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const headerFields: InfoField[] = selectedItem ? [
    { label: 'Artikel', value: selectedItem.name || selectedItem.sku || '' },
    { label: 'SKU', value: selectedItem.sku || '' },
  ] : [];

  const handleClose = useCallback(() => {
    if (!lineItemId) {
      const key = buildFormPersistenceKey({ formType: "packing-list-item", entityId: undefined, scope: packingListId });
      localStorage.removeItem(key);
    }
    onSave();
  }, [lineItemId, packingListId, onSave]);

  const toolbar = useFormToolbar({
    entityType: "packing_list_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit, onInvalid),
    onClose: handleClose,
    saveDisabled: !form.formState.isDirty && !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
    extraQueryKeysToInvalidate: packingListId ? [["/api/packing-lists", packingListId, "items"], ["/api/packing-lists", packingListId]] : [],
    navigationListQueryKey: packingListId ? ["/api/packing-lists", packingListId, "items"] : undefined,
    navigationParentId: packingListId,
  });

  const formSections: FormSection2<PackingListItemFormData>[] = [
    {
      id: "general",
      label: "Algemeen",
      icon: <Package className="h-4 w-4" />,
      rows: [
        createFieldRow({
          key: 'itemId',
          label: 'Artikel',
          type: 'custom',
          customComponent: (
            <InventorySelect
              value={form.watch("itemId") || ""}
              onValueChange={(value) => {
                form.setValue("itemId", value, { shouldDirty: true });
                setHasUnsavedChanges(true);
              }}
              testId="select-item"
            />
          ),
          validation: { isRequired: true, error: form.formState.errors.itemId?.message },
          testId: 'select-item',
        }),
        createFieldsRow([
          {
            key: 'quantity',
            label: 'Aantal',
            type: 'number',
            register: form.register('quantity', { valueAsNumber: true }),
            placeholder: '1',
            validation: { isRequired: true, error: form.formState.errors.quantity?.message },
            testId: 'input-quantity',
          },
          {
            key: 'packedQuantity',
            label: 'Ingepakt',
            type: 'number',
            register: form.register('packedQuantity', { valueAsNumber: true }),
            placeholder: '0',
            validation: { error: form.formState.errors.packedQuantity?.message },
            testId: 'input-packed-quantity',
          },
        ]),
      ],
    },
  ];

  return (
    <div>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        toolbar={toolbar}
        documentType="packing-list-item"
        entityId={lineItemId}
        isLoading={isEditing && isLoadingLineItem}
        headerFields={isEditing ? headerFields : undefined}
        formPersistence={{
          formType: "packing-list-item",
          entityId: lineItemId,
          scope: packingListId,
          onChangesDetected: handleChangesDetected,
        }}
      />
      <ValidationErrorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        errors={validErrors}
        onShowFields={() => handleShowFields(setActiveSection, setActiveSection)}
      />
    </div>
  );
}
