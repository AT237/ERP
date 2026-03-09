import { useMemo, useCallback, useState } from "react";
import type { UsageLocation } from "@/components/ui/safe-delete-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FormToolbarProps } from "@/components/layouts/FormToolbar";

interface EntityConfig {
  apiPath: string;
  formType: string;
  label: string;
  labelPlural: string;
  listQueryKey: string;
  documentType: string;
  supportsNavigation: boolean;
  supportsDelete: boolean;
  supportsAddNew: boolean;
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  customer: {
    apiPath: "/api/customers",
    formType: "customer",
    label: "Customer",
    labelPlural: "Customers",
    listQueryKey: "/api/customers",
    documentType: "customer",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  supplier: {
    apiPath: "/api/suppliers",
    formType: "supplier",
    label: "Supplier",
    labelPlural: "Suppliers",
    listQueryKey: "/api/suppliers",
    documentType: "supplier",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  quotation: {
    apiPath: "/api/quotations",
    formType: "quotation",
    label: "Quotation",
    labelPlural: "Quotations",
    listQueryKey: "/api/quotations",
    documentType: "quotation",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  invoice: {
    apiPath: "/api/invoices",
    formType: "invoice",
    label: "Invoice",
    labelPlural: "Invoices",
    listQueryKey: "/api/invoices",
    documentType: "invoice",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  purchase_order: {
    apiPath: "/api/purchase-orders",
    formType: "purchase-order",
    label: "Purchase Order",
    labelPlural: "Purchase Orders",
    listQueryKey: "/api/purchase-orders",
    documentType: "purchase_order",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  work_order: {
    apiPath: "/api/work-orders",
    formType: "work-order",
    label: "Work Order",
    labelPlural: "Work Orders",
    listQueryKey: "/api/work-orders",
    documentType: "work_order",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  project: {
    apiPath: "/api/projects",
    formType: "project",
    label: "Project",
    labelPlural: "Projects",
    listQueryKey: "/api/projects",
    documentType: "project",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  inventory: {
    apiPath: "/api/inventory",
    formType: "inventory",
    label: "Inventory Item",
    labelPlural: "Inventory",
    listQueryKey: "/api/inventory",
    documentType: "inventory",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  packing_list: {
    apiPath: "/api/packing-lists",
    formType: "packing-list",
    label: "Packing List",
    labelPlural: "Packing Lists",
    listQueryKey: "/api/packing-lists",
    documentType: "packing_list",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  sales_order: {
    apiPath: "/api/sales-orders",
    formType: "sales-order",
    label: "Sales Order",
    labelPlural: "Sales Orders",
    listQueryKey: "/api/sales-orders",
    documentType: "sales_order",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  text_snippet: {
    apiPath: "/api/text-snippets",
    formType: "text-snippet",
    label: "Text Snippet",
    labelPlural: "Text Snippets",
    listQueryKey: "/api/text-snippets",
    documentType: "text_snippet",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  contact_person: {
    apiPath: "/api/customer-contacts",
    formType: "contact-person",
    label: "Contact Person",
    labelPlural: "Contact Persons",
    listQueryKey: "/api/customer-contacts",
    documentType: "contact_person",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  employee: {
    apiPath: "/api/employees",
    formType: "employee",
    label: "Employee",
    labelPlural: "Employees",
    listQueryKey: "/api/employees",
    documentType: "employee",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  address: {
    apiPath: "/api/addresses",
    formType: "address",
    label: "Address",
    labelPlural: "Addresses",
    listQueryKey: "/api/addresses",
    documentType: "address",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  line_item: {
    apiPath: "/api/quotation-items",
    formType: "line-item",
    label: "Line Item",
    labelPlural: "Line Items",
    listQueryKey: "/api/quotation-items",
    documentType: "line_item",
    supportsNavigation: false,
    supportsDelete: false,
    supportsAddNew: false,
  },
  invoice_line_item: {
    apiPath: "/api/invoice-items",
    formType: "invoice-line-item",
    label: "Invoice Line",
    labelPlural: "Invoice Lines",
    listQueryKey: "/api/invoice-items",
    documentType: "invoice_line_item",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: false,
  },
  "masterdata-payment-terms": {
    apiPath: "/api/masterdata/payment-terms",
    formType: "masterdata-payment-terms",
    label: "Payment Term",
    labelPlural: "Payment Terms",
    listQueryKey: "/api/masterdata/payment-terms",
    documentType: "masterdata_payment_terms",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-rates-and-charges": {
    apiPath: "/api/masterdata/rates-and-charges",
    formType: "masterdata-rates-and-charges",
    label: "Rate & Charge",
    labelPlural: "Rates & Charges",
    listQueryKey: "/api/masterdata/rates-and-charges",
    documentType: "masterdata_rates_and_charges",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-units-of-measure": {
    apiPath: "/api/masterdata/units-of-measure",
    formType: "masterdata-units-of-measure",
    label: "Unit of Measure",
    labelPlural: "Units of Measure",
    listQueryKey: "/api/masterdata/units-of-measure",
    documentType: "masterdata_units_of_measure",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-payment-days": {
    apiPath: "/api/masterdata/payment-days",
    formType: "masterdata-payment-days",
    label: "Payment Day",
    labelPlural: "Payment Days",
    listQueryKey: "/api/masterdata/payment-days",
    documentType: "masterdata_payment_days",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-incoterms": {
    apiPath: "/api/masterdata/incoterms",
    formType: "masterdata-incoterms",
    label: "Incoterm",
    labelPlural: "Incoterms",
    listQueryKey: "/api/masterdata/incoterms",
    documentType: "masterdata_incoterms",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-vat-rates": {
    apiPath: "/api/masterdata/vat-rates",
    formType: "masterdata-vat-rates",
    label: "VAT Rate",
    labelPlural: "VAT Rates",
    listQueryKey: "/api/masterdata/vat-rates",
    documentType: "masterdata_vat_rates",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-cities": {
    apiPath: "/api/masterdata/cities",
    formType: "masterdata-cities",
    label: "City",
    labelPlural: "Cities",
    listQueryKey: "/api/masterdata/cities",
    documentType: "masterdata_cities",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
  "masterdata-statuses": {
    apiPath: "/api/masterdata/statuses",
    formType: "masterdata-statuses",
    label: "Status",
    labelPlural: "Statuses",
    listQueryKey: "/api/masterdata/statuses",
    documentType: "masterdata_statuses",
    supportsNavigation: true,
    supportsDelete: true,
    supportsAddNew: true,
  },
};

export interface UseFormToolbarOptions {
  entityType: string;
  entityId?: string;
  onSave: () => void;
  onClose?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  showAddNew?: boolean;
  showDelete?: boolean;
  showPrint?: boolean;
  showNavigation?: boolean;
  showExport?: boolean;
  extraQueryKeysToInvalidate?: string[][];
  navigationListQueryKey?: string[];
  navigationParentId?: string;
}

export function useFormToolbar({
  entityType,
  entityId,
  onSave,
  onClose,
  saveDisabled = false,
  saveLoading = false,
  showAddNew,
  showDelete,
  showPrint = true,
  showNavigation,
  showExport = true,
  extraQueryKeysToInvalidate = [],
  navigationListQueryKey,
  navigationParentId,
}: UseFormToolbarOptions): FormToolbarProps & { deleteConflict: { name: string; usages: UsageLocation[] } | null; onClearDeleteConflict: () => void } {
  const { toast } = useToast();
  const config = ENTITY_CONFIGS[entityType];
  const [deleteConflict, setDeleteConflict] = useState<{ name: string; usages: UsageLocation[] } | null>(null);
  const isEditing = !!entityId;

  const resolvedShowAddNew = showAddNew ?? (config?.supportsAddNew ?? false);
  const resolvedShowDelete = showDelete ?? (config?.supportsDelete ?? false);
  const resolvedShowNavigation = showNavigation ?? (config?.supportsNavigation ?? false);

  const effectiveNavQueryKey = navigationListQueryKey ?? (config?.listQueryKey ? [config.listQueryKey] : undefined);

  const { data: entityList } = useQuery<any[]>({
    queryKey: effectiveNavQueryKey ?? [],
    enabled: !!effectiveNavQueryKey && isEditing && resolvedShowNavigation,
  });

  const entityIds = useMemo(() => {
    if (!entityList) return [];
    return entityList.map((e: any) => e.id);
  }, [entityList]);

  const currentIndex = useMemo(() => {
    if (!entityId || entityIds.length === 0) return -1;
    return entityIds.indexOf(entityId);
  }, [entityId, entityIds]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!config) throw new Error("No config for entity type");
      const response = await fetch(`${config.apiPath}/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw Object.assign(new Error(body.message || "Failed to delete"), { status: response.status, body });
      }
    },
    onSuccess: () => {
      if (config) {
        queryClient.invalidateQueries({ queryKey: [config.listQueryKey] });
        if (config.listQueryKey !== `${config.apiPath}/extended`) {
          queryClient.invalidateQueries({ queryKey: [`${config.apiPath}/extended`] });
        }
      }
      for (const key of extraQueryKeysToInvalidate) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Deleted",
        description: `${config?.label || "Item"} deleted`,
      });
      if (onClose) onClose();
    },
    onError: (error: any) => {
      if (error.status === 409) {
        const usages: UsageLocation[] = error.body?.usages || [];
        setDeleteConflict({ name: config?.label || "record", usages });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete ${(config?.label || "item").toLowerCase()}`,
          variant: "destructive",
        });
      }
    },
  });

  const handleAddNew = useCallback(() => {
    if (!config) return;
    window.dispatchEvent(
      new CustomEvent("open-form-tab", {
        detail: {
          id: `${config.formType}-new-${Date.now()}`,
          name: `New ${config.label}`,
          formType: config.formType,
          parentId: config.formType + "s",
        },
      })
    );
  }, [config]);

  const handleDelete = useCallback(() => {
    if (!entityId || !config) return;
    deleteMutation.mutate(entityId);
  }, [entityId, config, deleteMutation]);

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0 || !config) return;
    const prevId = entityIds[currentIndex - 1];
    window.dispatchEvent(
      new CustomEvent("open-form-tab", {
        detail: {
          id: `${config.formType}-edit-${prevId}`,
          name: `${config.label} ${prevId}`,
          formType: config.formType,
          entityId: prevId,
          recordId: prevId,
          parentId: navigationParentId,
        },
      })
    );
  }, [currentIndex, entityIds, config, navigationParentId]);

  const handleNext = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= entityIds.length - 1 || !config) return;
    const nextId = entityIds[currentIndex + 1];
    window.dispatchEvent(
      new CustomEvent("open-form-tab", {
        detail: {
          id: `${config.formType}-edit-${nextId}`,
          name: `${config.label} ${nextId}`,
          formType: config.formType,
          entityId: nextId,
          recordId: nextId,
          parentId: navigationParentId,
        },
      })
    );
  }, [currentIndex, entityIds, config, navigationParentId]);

  return {
    onSave,
    saveDisabled,
    saveLoading,

    onAddNew: resolvedShowAddNew ? handleAddNew : undefined,
    showAddNew: resolvedShowAddNew,

    onDelete: resolvedShowDelete && isEditing ? handleDelete : undefined,
    showDelete: resolvedShowDelete,
    deleteDisabled: !isEditing,

    showPrint,
    printDisabled: !isEditing,

    onPrevious: resolvedShowNavigation ? handlePrevious : undefined,
    onNext: resolvedShowNavigation ? handleNext : undefined,
    showNavigation: resolvedShowNavigation,
    previousDisabled: !isEditing || currentIndex <= 0,
    nextDisabled: !isEditing || currentIndex < 0 || currentIndex >= entityIds.length - 1,

    showExport,
    exportDisabled: true,

    documentType: config?.documentType || entityType,
    entityId,
    checkUsagesUrl: config && entityId ? `${config.apiPath}/${entityId}/check-usages` : undefined,
    entityName: config?.label,
    deleteConflict,
    onClearDeleteConflict: () => setDeleteConflict(null),
  };
}
