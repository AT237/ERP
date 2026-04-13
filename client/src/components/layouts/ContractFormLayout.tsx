import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Type, Heading, Table2, ImageIcon, MoveUp, MoveDown, Copy } from "lucide-react";
import { insertContractSchema, type Contract, type ContractItem, type Customer, type DocumentLayout } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { LayoutForm2, type FormSection2 } from './LayoutForm2';
import { CustomerSelect } from "@/components/ui/customer-select";
import { DataTableLayout, createPositionColumn, type ColumnConfig, type DirectInputConfig } from './DataTableLayout';
import { useDataTable } from "@/hooks/useDataTable";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { getContractPlaceholderTables, getFieldLabel } from "@/utils/available-fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useLocation } from "wouter";

const formSchema = insertContractSchema.extend({
  contractNumber: z.string().min(1, "Contractnummer is verplicht"),
  contractDate: z.any().optional(),
  validUntil: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ContractRow {
  id?: string;
  articleNumber: string;
  itemType: string;
  content: string;
  position: number;
  indentLevel: number;
  fontFamily: string;
  fontSize: number | null;
  fontWeight: string | null;
}

const PLACEHOLDERS = (() => {
  const tables = getContractPlaceholderTables();
  const groups = tables.map(table => ({
    category: table.label,
    items: table.fields.map(field => ({
      label: getFieldLabel(field),
      value: `{{${table.name}.${field}}}`,
    })),
  }));
  groups.push({
    category: "Datum",
    items: [
      { label: "Vandaag", value: "[VANDAAG]" },
      { label: "Huidig jaar", value: "[JAAR]" },
    ],
  });
  return groups;
})();

interface ContractFormLayoutProps {
  onSave: () => void;
  contractId?: string;
  parentId?: string;
}

export function ContractFormLayout({ onSave, contractId, parentId }: ContractFormLayoutProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const tables = getContractPlaceholderTables();
    return new Set(tables.map(t => t.label));
  });
  const [originalValues, setOriginalValues] = useState<Partial<FormData>>({});

  const { dialogOpen, setDialogOpen, errors: validErrors, onInvalid, handleShowFields } = useValidationErrors({
    contractNumber: { label: "Contractnummer" },
  });

  const effectiveId = contractId || (parentId !== 'contracts' ? parentId : undefined);
  const [currentContractId, setCurrentContractId] = useState<string | undefined>(effectiveId);
  const isEditing = !!currentContractId;

  const { data: contract, isLoading: isLoadingContract } = useQuery<Contract>({
    queryKey: ["/api/contracts", effectiveId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${effectiveId}`);
      if (!response.ok) throw new Error("Failed to fetch contract");
      return response.json();
    },
    enabled: !!effectiveId,
  });

  const emptyItems: ContractItem[] = useMemo(() => [], []);
  const { data: contractItemsData } = useQuery<ContractItem[]>({
    queryKey: ["/api/contracts", effectiveId, "items"],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${effectiveId}/items`);
      if (!response.ok) throw new Error("Failed to fetch contract items");
      return response.json();
    },
    enabled: !!effectiveId,
  });
  const contractItems = contractItemsData ?? emptyItems;

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
  });

  const [shouldLoadLanguages, setShouldLoadLanguages] = useState(false);
  const { data: languages = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ["/api/languages"],
    enabled: shouldLoadLanguages,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: availableLayouts = [] } = useQuery<DocumentLayout[]>({
    queryKey: ["/api/layouts", { documentType: "contract" }],
    queryFn: async () => {
      const res = await fetch("/api/layouts?documentType=contract");
      if (!res.ok) throw new Error("Failed to fetch layouts");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractNumber: "",
      description: "",
      customerId: "",
      contractDate: "",
      validUntil: "",
      status: "concept",
      notes: "",
      printLayoutId: "",
      printLanguageCode: "nl",
    }
  });

  useEffect(() => {
    if (contract && isEditing) {
      const formData = {
        contractNumber: contract.contractNumber || "",
        description: contract.description || "",
        customerId: contract.customerId || "",
        contractDate: contract.contractDate ? format(new Date(contract.contractDate), 'dd-MM-yyyy') : "",
        validUntil: contract.validUntil ? format(new Date(contract.validUntil), 'dd-MM-yyyy') : "",
        status: contract.status || "concept",
        notes: contract.notes || "",
        printLayoutId: contract.printLayoutId || "",
        printLanguageCode: (contract as any).printLanguageCode || "nl",
      };
      form.reset(formData);
      setOriginalValues(formData);
    }
  }, [contract, isEditing, form]);

  useEffect(() => {
    setRows(contractItems.map(item => ({
      id: item.id,
      articleNumber: item.articleNumber || "",
      itemType: item.itemType || "text",
      content: item.content || "",
      position: item.position || 0,
      indentLevel: item.indentLevel || 0,
      fontFamily: (item as any).fontFamily || "Arial",
      fontSize: (item as any).fontSize || null,
      fontWeight: (item as any).fontWeight || null,
    })));
  }, [contractItems]);

  const customerIdValue = form.watch("customerId");
  const prevCustomerIdRef = useRef(customerIdValue);
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevCustomerIdRef.current = customerIdValue;
      return;
    }
    if (customerIdValue && customerIdValue !== prevCustomerIdRef.current) {
      const customer = customers.find(c => c.id === customerIdValue);
      if (customer) {
        const lang = (customer as any)?.languageCode || 'nl';
        form.setValue("printLanguageCode", lang);
      }
    }
    prevCustomerIdRef.current = customerIdValue;
  }, [customerIdValue, customers, form]);

  useEffect(() => {
    if (contract && isEditing) {
      isInitialLoadRef.current = true;
    }
  }, [contract, isEditing]);

  const handleRefreshCustomer = useCallback(async () => {
    const customerId = form.getValues("customerId");
    if (!customerId) return;
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const freshCustomer = await res.json();
        const lang = freshCustomer?.languageCode || 'nl';
        form.setValue("printLanguageCode", lang);
      }
    } catch {}
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    toast({ title: "Klantgegevens bijgewerkt", description: "Klantgegevens en taalinstellingen zijn gesynchroniseerd." });
  }, [form, toast]);

  const parseDateValue = (val: string) => {
    if (!val) return null;
    const match = val.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toISOString();
    }
    return val;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        ...data,
        contractDate: parseDateValue(data.contractDate as string || ""),
        validUntil: parseDateValue(data.validUntil as string || ""),
      };

      let savedContract: Contract;
      if (isEditing && currentContractId) {
        const res = await apiRequest("PATCH", `/api/contracts/${currentContractId}`, payload);
        savedContract = await res.json();
      } else {
        const res = await apiRequest("POST", "/api/contracts", payload);
        savedContract = await res.json();
        setCurrentContractId(savedContract.id);
      }

      await apiRequest("PUT", `/api/contracts/${savedContract.id}/items/batch`, {
        items: rows.map((r, i) => ({
          ...(r.id ? { id: r.id } : {}),
          articleNumber: r.articleNumber,
          itemType: r.itemType,
          content: r.content,
          position: i,
          indentLevel: r.indentLevel,
          fontFamily: r.fontFamily || "Arial",
          fontSize: r.fontSize,
          fontWeight: r.fontWeight,
        }))
      });

      return savedContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      if (currentContractId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contracts", currentContractId] });
        queryClient.invalidateQueries({ queryKey: ["/api/contracts", currentContractId, "items"] });
      }
      setOriginalValues(form.getValues());
      setHasUnsavedChanges(false);
      toast({ title: "Opgeslagen", description: "Contract is opgeslagen." });
      onSave();
    },
    onError: (error: any) => {
      toast({ title: "Fout", description: error.message || "Opslaan mislukt", variant: "destructive" });
    },
  });

  const handleSave = useCallback(() => {
    form.handleSubmit(
      (data) => saveMutation.mutate(data),
      onInvalid
    )();
  }, [form, saveMutation, onInvalid]);

  const handleChangesDetected = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const toolbar = useFormToolbar({
    entityType: "contract",
    entityId: currentContractId,
    onSave: handleSave,
    onClose: onSave,
    saveDisabled: saveMutation.isPending,
    saveLoading: saveMutation.isPending,
    showPrint: isEditing,
  });

  const addRow = useCallback((type: string = "text") => {
    const newRow: ContractRow = {
      articleNumber: `${rows.length + 1}`,
      itemType: type,
      content: "",
      position: rows.length,
      indentLevel: type === 'heading' ? 0 : (rows.length > 0 ? rows[rows.length - 1].indentLevel : 0),
      fontFamily: "Arial",
      fontSize: null,
      fontWeight: type === 'heading' ? 'bold' : null,
    };
    setRows(prev => [...prev, newRow]);
    setSelectedRowIndex(rows.length);
    setHasUnsavedChanges(true);
  }, [rows]);

  const updateRow = useCallback((index: number, field: keyof ContractRow, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
    setSelectedRowIndex(null);
    setHasUnsavedChanges(true);
  }, []);

  const moveRow = useCallback((index: number, direction: 'up' | 'down') => {
    setRows(prev => {
      const updated = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return updated;
    });
    setSelectedRowIndex(direction === 'up' ? index - 1 : index + 1);
    setHasUnsavedChanges(true);
  }, []);

  const changeIndent = useCallback((index: number, direction: 'increase' | 'decrease') => {
    setRows(prev => {
      const updated = [...prev];
      const current = updated[index].indentLevel;
      updated[index] = {
        ...updated[index],
        indentLevel: direction === 'increase' ? Math.min(current + 1, 3) : Math.max(current - 1, 0)
      };
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const duplicateRow = useCallback((index: number) => {
    setRows(prev => {
      const updated = [...prev];
      const copy = { ...updated[index], id: undefined };
      updated.splice(index + 1, 0, copy);
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);


  const autoNumber = useCallback(() => {
    setRows(prev => {
      const updated = [...prev];
      const counters = [0, 0, 0, 0];
      for (let i = 0; i < updated.length; i++) {
        const level = updated[i].indentLevel;
        counters[level]++;
        for (let j = level + 1; j < counters.length; j++) counters[j] = 0;
        const parts = counters.slice(0, level + 1);
        updated[i] = { ...updated[i], articleNumber: parts.join('.') };
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const typeLabel = (t: string) => {
    switch (t) {
      case 'heading': return 'Kop';
      case 'image': return 'Afbeelding';
      case 'table': return 'Tabel';
      default: return 'Tekst';
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case 'heading': return <Heading className="w-3.5 h-3.5 text-blue-600" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-green-600" />;
      case 'table': return <Table2 className="w-3.5 h-3.5 text-purple-600" />;
      default: return <Type className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const itemColumns: ColumnConfig[] = useMemo(() => [
    createPositionColumn('articleNumber', 'Pos.', 80),
    {
      key: 'itemType',
      label: 'Type',
      visible: true,
      width: 120,
      filterable: true,
      sortable: false,
      renderCell: (value: string) => (
        <span className="flex items-center gap-1.5 text-xs">
          {typeIcon(value)}
          {typeLabel(value)}
        </span>
      ),
    },
    {
      key: 'content',
      label: 'Inhoud',
      visible: true,
      width: 400,
      filterable: true,
      sortable: false,
      renderCell: (value: string, row: any) => {
        const preview = (value || '').substring(0, 80);
        const isHead = row.itemType === 'heading';
        return (
          <span className={`text-xs truncate block ${isHead ? 'font-bold text-blue-800 dark:text-blue-300' : ''}`}
                style={{ fontFamily: row.fontFamily || 'Arial', paddingLeft: `${(row.indentLevel || 0) * 16}px` }}>
            {row.itemType === 'image' ? (value ? '📷 ' + preview : '📷 (geen afbeelding)') : (preview || '—')}
          </span>
        );
      },
    },
    {
      key: 'fontFamily',
      label: 'Lettertype',
      visible: true,
      width: 100,
      filterable: false,
      sortable: false,
      renderCell: (value: string) => <span className="text-xs text-muted-foreground">{value || 'Arial'}</span>,
    },
    {
      key: 'indentLevel',
      label: 'Niv.',
      visible: true,
      width: 50,
      filterable: false,
      sortable: false,
      align: 'center' as const,
    },
  ], []);

  const itemTableState = useDataTable({
    defaultColumns: itemColumns,
    tableKey: 'contract-items',
    data: rows,
  });

  const contractDirectInput: DirectInputConfig = useMemo(() => ({
    columns: [
      { key: 'articleNumber', fieldType: 'text' as const, placeholder: '1', defaultValue: '' },
      {
        key: 'itemType',
        fieldType: 'select' as const,
        defaultValue: 'text',
        options: [
          { value: 'heading', label: 'Kop' },
          { value: 'text', label: 'Tekst' },
          { value: 'image', label: 'Afbeelding' },
          { value: 'table', label: 'Tabel' },
        ],
      },
      { key: 'content', fieldType: 'text' as const, placeholder: 'Inhoud...' },
      {
        key: 'fontFamily',
        fieldType: 'select' as const,
        defaultValue: 'Arial',
        options: [
          { value: 'Arial', label: 'Arial' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Calibri', label: 'Calibri' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Verdana', label: 'Verdana' },
        ],
      },
    ],
    defaults: { articleNumber: String(rows.length + 1), itemType: 'text', content: '', fontFamily: 'Arial', indentLevel: 0, fontWeight: null, fontSize: null },
    onSave: async (rowData) => {
      const newRow: ContractRow = {
        articleNumber: rowData.articleNumber || String(rows.length + 1),
        itemType: rowData.itemType || 'text',
        content: rowData.content || '',
        position: rows.length,
        indentLevel: 0,
        fontFamily: rowData.fontFamily || 'Arial',
        fontSize: null,
        fontWeight: rowData.itemType === 'heading' ? 'bold' : null,
      };
      setRows(prev => [...prev, newRow]);
      setHasUnsavedChanges(true);
    },
    onUpdate: async (rowId, rowData) => {
      const idx = parseInt(rowId);
      if (idx >= 0 && idx < rows.length) {
        setRows(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...rowData };
          return updated;
        });
        setHasUnsavedChanges(true);
      }
    },
  }), [rows]);


  const contentBuilder = (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 480px)', minHeight: '400px' }}>
      <DataTableLayout
        data={rows.map((r, i) => ({ ...r, _rowIdx: i }))}
        isLoading={false}
        columns={itemTableState.columns}
        setColumns={itemTableState.setColumns}
        tableKey="contract-items"
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
        onToggleAllRows={() => {
          const allIds = rows.map((_: any, i: number) => String(i));
          itemTableState.toggleAllRows(allIds);
        }}
        getRowId={(row: any) => String(row._rowIdx ?? 0)}
        entityName="Regel"
        entityNamePlural="Regels"
        applyFiltersAndSearch={(data: any[]) => itemTableState.applyFiltersAndSearch(data)}
        applySorting={(data: any[]) => itemTableState.applySorting(data)}
        compact={true}
        directInput={contractDirectInput}
        headerActions={[
          { key: 'autoNumber', label: 'Auto-nummering', onClick: autoNumber },
        ]}
        onRowDoubleClick={(row: any) => {
          if (currentContractId && row.id) {
            navigate(`/contracts/${currentContractId}/items/${row.id}`);
          }
        }}
      />
    </div>
  );

  const formSections: FormSection2<FormData>[] = [
    {
      id: "general",
      label: "Algemeen",
      rows: [
        {
          type: 'two-column' as const,
          leftColumn: [
            {
              key: "contractNumber",
              label: "Contractnummer",
              type: "text",
              placeholder: "CON-2026-001",
              register: form.register("contractNumber"),
              validation: {
                isRequired: true,
                error: form.formState.errors.contractNumber?.message,
              },
              testId: "input-contract-number"
            },
            {
              key: "customerId",
              label: "Klant",
              type: "custom",
              customComponent: (
                <CustomerSelect
                  value={form.watch("customerId") || ""}
                  onValueChange={(value) => form.setValue("customerId", value || "")}
                  placeholder="Selecteer klant..."
                  testId="select-contract-customer"
                  customers={customers.map(c => ({
                    id: c.id,
                    customerNumber: (c as any).customerNumber || '',
                    name: c.name,
                    email: (c as any).generalEmail || (c as any).email || undefined,
                    phone: (c as any).phone || undefined,
                  }))}
                  parentId={currentContractId || 'new-contract'}
                  onRefreshCustomer={handleRefreshCustomer}
                />
              ),
            },
            {
              key: "contractDate",
              label: "Datum",
              type: "date",
              placeholder: "dd-mm-yyyy",
              setValue: (value: string) => form.setValue("contractDate", value),
              watch: () => form.watch("contractDate"),
              testId: "input-contract-date"
            },
            {
              key: "validUntil",
              label: "Geldig tot",
              type: "date",
              placeholder: "dd-mm-yyyy",
              setValue: (value: string) => form.setValue("validUntil", value),
              watch: () => form.watch("validUntil"),
              testId: "input-valid-until"
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "concept", label: "Concept" },
                { value: "actief", label: "Actief" },
                { value: "verlopen", label: "Verlopen" },
                { value: "geannuleerd", label: "Geannuleerd" },
              ],
              setValue: (value: string) => form.setValue("status", value),
              watch: () => form.watch("status"),
              testId: "select-status"
            },
            {
              key: "printLanguageCode",
              label: "Taal",
              type: "custom",
              customComponent: (
                <Select
                  value={form.watch("printLanguageCode") || "nl"}
                  onValueChange={(value) => form.setValue("printLanguageCode", value)}
                  onOpenChange={(open) => {
                    if (open) setShouldLoadLanguages(true);
                  }}
                >
                  <SelectTrigger className="w-full" data-testid="select-contract-language">
                    <SelectValue placeholder="Selecteer taal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 ? (
                      languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="nl">Nederlands</SelectItem>
                        <SelectItem value="en">Engels</SelectItem>
                        <SelectItem value="de">Duits</SelectItem>
                        <SelectItem value="fr">Frans</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              ),
              testId: "field-contract-language"
            },
          ],
          rightColumn: [
            {
              key: "description",
              label: "Omschrijving",
              type: "textarea",
              placeholder: "Contract omschrijving...",
              register: form.register("description"),
              testId: "textarea-description"
            },
            {
              key: "notes",
              label: "Notities",
              type: "textarea",
              placeholder: "Interne notities...",
              register: form.register("notes"),
              rows: 6,
              testId: "textarea-notes"
            },
          ],
        },
        {
          type: "custom" as const,
          customContent: contentBuilder,
        },
      ],
    },
    {
      id: "printSettings",
      label: "Printen",
      rows: [
        {
          type: 'two-column' as const,
          leftColumn: [
            {
              key: "printLayoutId",
              label: "Layout",
              type: "custom",
              customComponent: (
                <Select
                  value={form.watch("printLayoutId") || "__clear__"}
                  onValueChange={(value) => form.setValue("printLayoutId", value === "__clear__" ? "" : value)}
                >
                  <SelectTrigger className="w-full" data-testid="select-print-layout">
                    <SelectValue placeholder="Selecteer een layout..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">— Wis selectie —</SelectItem>
                    {availableLayouts.map((layout) => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name} ({layout.pageFormat} - {layout.orientation})
                        {layout.isDefault ? " ★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
              testId: "field-print-layout"
            },
            {
              key: "printLanguageCode2",
              label: "Afdruktaal",
              type: "custom",
              customComponent: (
                <Select
                  value={form.watch("printLanguageCode") || "nl"}
                  onValueChange={(value) => form.setValue("printLanguageCode", value)}
                  onOpenChange={(open) => {
                    if (open) setShouldLoadLanguages(true);
                  }}
                >
                  <SelectTrigger className="w-full" data-testid="select-print-language">
                    <SelectValue placeholder="Selecteer taal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 ? (
                      languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="nl">Nederlands</SelectItem>
                        <SelectItem value="en">Engels</SelectItem>
                        <SelectItem value="de">Duits</SelectItem>
                        <SelectItem value="fr">Frans</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              ),
              testId: "field-print-language"
            },
          ],
          rightColumn: [],
        },
      ],
    },
  ];

  return (
    <>
      <LayoutForm2
        sections={formSections}
        activeSection={activeTab}
        onSectionChange={setActiveTab}
        form={form}
        onSubmit={(data) => saveMutation.mutate(data)}
        toolbar={toolbar}
        documentType="contract"
        entityId={currentContractId}
        isLoading={isLoadingContract}
        originalValues={originalValues}
        changeTracking={{
          enabled: true,
          onChangesDetected: handleChangesDetected,
        }}
      />
      <ValidationErrorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        errors={validErrors}
        onShowFields={() => handleShowFields(setActiveTab, setActiveTab)}
      />
    </>
  );
}
