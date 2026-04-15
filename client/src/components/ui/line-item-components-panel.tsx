import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, X } from "lucide-react";
import { DataTableLayout, createPositionColumn, createCurrencyColumn, type DirectInputConfig } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import type { LineItemComponent, InventoryItem, UnitOfMeasure } from "@shared/schema";

interface LineItemComponentsPanelProps {
  parentLineItemId: string;
  parentLineItemType: string;
  onCostPriceChanged?: (total: number) => void;
  enableNavigation?: boolean;
}

export function LineItemComponentsPanel({ parentLineItemId, parentLineItemType, onCostPriceChanged, enableNavigation = true }: LineItemComponentsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { data: components = [], isLoading } = useQuery<LineItemComponent[]>({
    queryKey: ["/api/line-item-components", parentLineItemId],
    queryFn: () => fetch(`/api/line-item-components/${parentLineItemId}`).then(r => r.json()),
    enabled: !!parentLineItemId,
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 30000,
  });

  const { data: unitsOfMeasure = [] } = useQuery<UnitOfMeasure[]>({
    queryKey: ["/api/masterdata/units-of-measure"],
    staleTime: 30000,
  });

  const totalBedrag = components
    .filter(c => c.componentType !== "text")
    .map(c => (parseFloat(c.quantity ?? "0") * parseFloat(c.unitPrice ?? "0")))
    .reduce((sum, v) => sum + v, 0);

  const onCostPriceChangedRef = useRef(onCostPriceChanged);
  onCostPriceChangedRef.current = onCostPriceChanged;
  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevTotalRef.current !== totalBedrag) {
      prevTotalRef.current = totalBedrag;
      onCostPriceChangedRef.current?.(totalBedrag);
    }
  }, [totalBedrag]);

  const assemblyColumns = useMemo(() => [
    createPositionColumn('sortOrder', 'Pos.', 70),
    {
      key: 'description',
      label: 'Description',
      visible: true,
      width: 250,
      filterable: true,
      sortable: true,
      renderCell: (_value: any, row: any) => {
        const isStd = row.componentType === "standard";
        if (isStd) {
          const item = inventoryItems.find((i: any) => i.id === row.componentItemId);
          return item ? (item.description || item.name || '') : (row.componentName || '');
        }
        return row.componentName || row.notes || '';
      },
    },
    {
      key: 'quantity',
      label: 'Qty',
      visible: true,
      width: 80,
      filterable: false,
      sortable: true,
      className: 'text-right',
      renderCell: (value: any, row: any) => {
        if (row.componentType === 'text') return '';
        return <span className="text-right w-full block">{value != null ? parseFloat(String(value)).toString() : "0"}</span>;
      },
    },
    {
      key: 'componentUnit',
      label: 'Unit',
      visible: true,
      width: 80,
      filterable: false,
      sortable: false,
      renderCell: (value: any, row: any) => {
        if (row.componentType === "standard") {
          const item = inventoryItems.find((i: any) => i.id === row.componentItemId);
          return item?.unit || value || '';
        }
        return value || '';
      },
    },
    createCurrencyColumn('unitPrice', 'Unit Price', 120),
    {
      key: 'lineTotal',
      label: 'Line Total',
      visible: true,
      width: 120,
      filterable: false,
      sortable: true,
      align: 'right' as const,
      isCurrency: true,
      getValue: (row: any) => {
        if (row.componentType === 'text') return 0;
        const qty = parseFloat(row.quantity || "0") || 0;
        const price = parseFloat(row.unitPrice || "0") || 0;
        return qty * price;
      },
      renderCell: (_value: any, row: any) => {
        if (row.componentType === 'text') return '';
        const qty = parseFloat(row.quantity || "0") || 0;
        const price = parseFloat(row.unitPrice || "0") || 0;
        const total = qty * price;
        return `€\u00A0${total.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
    },
    {
      key: 'componentType',
      label: 'Type',
      visible: true,
      width: 100,
      filterable: true,
      sortable: true,
      renderCell: (value: any) => {
        const labels: Record<string, string> = { standard: 'standard', unique: 'unique', charge: 'charges', text: 'text' };
        return labels[value] || value || '';
      },
    },
    {
      key: 'componentItemId',
      label: 'Stock Item',
      visible: true,
      forceVisible: true,
      width: 200,
      filterable: true,
      sortable: true,
      renderCell: (value: any) => {
        if (!value) return <span className="text-gray-400">—</span>;
        const item = inventoryItems.find((i: any) => i.id === value);
        return <span>{item ? `${item.sku || ''} - ${item.name || ''}`.trim() : value}</span>;
      },
    },
    createCurrencyColumn('costPrice', 'Cost Price', 100),
    {
      key: 'costPriceTotal',
      label: 'Line Cost',
      visible: true,
      width: 100,
      filterable: false,
      sortable: true,
      align: 'right' as const,
      isCurrency: true,
      renderCell: (_value: any, row: any) => {
        if (row.componentType === 'text') return '';
        const qty = parseFloat(row.quantity || "0") || 0;
        const cost = parseFloat(row.costPrice || "0") || 0;
        const total = qty * cost;
        return <span className="text-right w-full block">{`€ ${total.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>;
      },
    },
  ], [inventoryItems]);

  const tableState = useDataTable({
    defaultColumns: assemblyColumns,
    tableKey: `assembly-${parentLineItemId}`,
  });

  const handleDeleteComponent = async (comp: LineItemComponent) => {
    try {
      await apiRequest("DELETE", `/api/line-item-components/${parentLineItemId}/${comp.id}`);
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      toast({ title: "Verwijderd" });
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const handleDuplicateComponent = async (comp: LineItemComponent) => {
    try {
      await apiRequest("POST", `/api/line-item-components/${parentLineItemId}`, {
        parentLineItemId,
        parentLineItemType,
        componentType: comp.componentType,
        componentItemId: comp.componentItemId,
        componentName: comp.componentName,
        componentUnit: comp.componentUnit,
        quantity: comp.quantity,
        unitPrice: comp.unitPrice,
        costPrice: comp.costPrice,
        supplierId: comp.supplierId,
        notes: comp.notes,
        sortOrder: components.length,
      });
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const handleBulkDelete = async () => {
    try {
      for (const id of tableState.selectedRows) {
        await apiRequest("DELETE", `/api/line-item-components/${parentLineItemId}/${id}`);
      }
      qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      tableState.setSelectedRows([]);
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const directInput = useMemo<DirectInputConfig | undefined>(() => {
    if (!parentLineItemId) return undefined;

    let nextSort = 0;
    for (const c of components) {
      const n = parseInt(String(c.sortOrder || '0'), 10);
      if (!isNaN(n) && n >= nextSort) nextSort = n + 10;
    }
    if (nextSort === 0) nextSort = 10;

    return {
      columns: [
        {
          key: 'componentType',
          fieldType: 'select',
          defaultValue: '',
          options: [
            { value: 'standard', label: 'Standaard' },
            { value: 'unique', label: 'Uniek' },
            { value: 'text', label: 'Tekst' },
            { value: 'charge', label: 'Toeslagen' },
          ],
        },
        {
          key: 'componentItemId',
          fieldType: 'searchable-select',
          placeholder: 'Zoek artikel...',
          enabledWhen: (r) => !!r.componentType && r.componentType !== 'text',
          options: inventoryItems.map(item => ({
            value: item.id,
            label: `${item.sku || ''} - ${item.description || item.name || ''}`.trim(),
          })),
          onSelect: (val) => {
            const item = inventoryItems.find(i => i.id === val);
            if (!item) return {};
            return {
              componentItemId: item.id,
              description: item.description || item.name || '',
              componentName: item.name || '',
              unitPrice: item.sellingPrice || item.unitPrice || '0.00',
              costPrice: item.costPrice || '0.00',
              componentUnit: item.unit || 'Pcs.',
            };
          },
        },
        {
          key: 'description',
          fieldType: 'text',
          placeholder: 'Description',
          enabledWhen: (r) => !!r.componentType,
        },
        {
          key: 'quantity',
          fieldType: 'number',
          defaultValue: '1',
          placeholder: 'Aantal',
          enabledWhen: (r) => !!r.componentType && r.componentType !== 'text',
        },
        {
          key: 'componentUnit',
          fieldType: 'select',
          defaultValue: 'Pcs.',
          placeholder: 'Eenheid',
          enabledWhen: (r) => !!r.componentType && r.componentType !== 'text',
          options: unitsOfMeasure.filter(u => u.isActive !== false).map(u => ({ value: u.code, label: u.code })),
        },
        {
          key: 'unitPrice',
          fieldType: 'currency',
          defaultValue: '0.00',
          placeholder: 'Prijs',
          enabledWhen: (r) => !!r.componentType && r.componentType !== 'text',
        },
        {
          key: 'costPrice',
          fieldType: 'currency',
          defaultValue: '0.00',
          placeholder: 'Kostprijs',
          enabledWhen: (r) => !!r.componentType && r.componentType !== 'text',
        },
      ],
      defaults: {
        sortOrder: String(nextSort).padStart(3, '0'),
        componentType: '',
        quantity: '1',
        componentUnit: 'Pcs.',
        unitPrice: '0.00',
        costPrice: '0.00',
      },
      onSave: async (rowData) => {
        const qty = parseFloat(rowData.quantity || '1') || 1;
        const price = parseFloat(rowData.unitPrice || '0') || 0;

        if (!rowData.componentType) {
          toast({ title: "Fout", description: "Selecteer een type", variant: "destructive" });
          throw new Error("Type required");
        }

        if (rowData.componentType === 'standard' && !rowData.componentItemId) {
          toast({ title: "Fout", description: "Selecteer een artikel uit de catalogus", variant: "destructive" });
          throw new Error("Article required");
        }

        if ((rowData.componentType === 'unique' || rowData.componentType === 'charge') && !rowData.description?.trim() && !rowData.componentName?.trim()) {
          toast({ title: "Fout", description: "Voer een omschrijving in", variant: "destructive" });
          throw new Error("Description required");
        }

        const payload: Record<string, any> = {
          parentLineItemId,
          parentLineItemType,
          componentType: rowData.componentType,
          quantity: String(qty),
          unitPrice: String(price),
          costPrice: rowData.costPrice || '0.00',
          notes: rowData.description || '',
          componentName: rowData.componentName || rowData.description || '',
          componentUnit: rowData.componentUnit || 'Pcs.',
          sortOrder: components.length,
        };

        if (rowData.componentType === 'standard') {
          payload.componentItemId = rowData.componentItemId || null;
        }

        if (rowData.componentType === 'text') {
          payload.quantity = '0';
          payload.unitPrice = '0';
          payload.costPrice = '0';
        }

        await apiRequest("POST", `/api/line-item-components/${parentLineItemId}`, payload);
        qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      },
      onUpdate: async (rowId, rowData) => {
        const qty = parseFloat(rowData.quantity || '0') || 0;
        const price = parseFloat(rowData.unitPrice || '0') || 0;

        const updateData: Record<string, any> = { ...rowData };
        updateData.unitPrice = String(price);
        updateData.quantity = String(qty);

        await apiRequest("PUT", `/api/line-item-components/${parentLineItemId}/${rowId}`, updateData);
        qc.invalidateQueries({ queryKey: ["/api/line-item-components", parentLineItemId] });
      },
    };
  }, [parentLineItemId, parentLineItemType, components, inventoryItems, unitsOfMeasure, qc, toast]);

  return (
    <div className="pl-8 pr-6 pb-4">
      <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2">
        Assembly <span className="text-xs text-slate-400 font-normal">({components.length})</span>
      </h3>

      <DataTableLayout
        data={components}
        isLoading={isLoading}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        searchTerm={tableState.searchTerm}
        setSearchTerm={tableState.setSearchTerm}
        filters={tableState.filters}
        setFilters={tableState.setFilters}
        onAddFilter={tableState.addFilter}
        onUpdateFilter={tableState.updateFilter}
        onRemoveFilter={tableState.removeFilter}
        sortConfig={tableState.sortConfig}
        onSort={tableState.handleSort}
        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={() => {
          const allIds = components.map(c => c.id);
          tableState.toggleAllRows(allIds);
        }}
        getRowId={(c: LineItemComponent) => c.id}
        entityName="Component"
        entityNamePlural="assembly items"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        compact={true}
        onRowDoubleClick={(c: LineItemComponent) => {
          if (enableNavigation) {
            navigate(`/components/${parentLineItemId}/${parentLineItemType}/${c.id}`);
          }
        }}
        headerActions={[
          {
            key: 'add-component',
            label: 'ADD LINE',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => {
              if (enableNavigation) {
                navigate(`/components/${parentLineItemId}/${parentLineItemType}/new`);
              }
            },
            variant: 'default' as const,
          },
        ]}
        deleteConfirmDialog={{
          isOpen: isBulkDeleteOpen,
          onOpenChange: setIsBulkDeleteOpen,
          onConfirm: handleBulkDelete,
          itemCount: tableState.selectedRows.length,
        }}
        onDuplicate={handleDuplicateComponent}
        directInput={directInput}
        rowActions={(c: LineItemComponent) => [
          {
            key: 'edit',
            label: 'Edit',
            icon: <FileText className="h-4 w-4" />,
            onClick: () => {
              if (enableNavigation) {
                navigate(`/components/${parentLineItemId}/${parentLineItemType}/${c.id}`);
              }
            },
            variant: 'outline',
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <X className="h-4 w-4" />,
            onClick: () => handleDeleteComponent(c),
            variant: 'destructive',
          },
        ]}
      />
    </div>
  );
}
