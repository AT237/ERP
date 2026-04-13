import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Trash2, ChevronRight, ChevronDown, Type, Heading, Table, Image, MoveUp, MoveDown, Indent, Outdent, Copy } from "lucide-react";
import { insertContractSchema, type Contract, type ContractItem, type Customer, type DocumentLayout } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useValidationErrors } from "@/hooks/use-validation-errors";
import { ValidationErrorDialog } from "@/components/ui/validation-error-dialog";
import { LayoutForm2, type FormSection2 } from './LayoutForm2';
import { CustomerSelect } from "@/components/ui/customer-select";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

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
}

const PLACEHOLDERS = [
  { category: "Klant", items: [
    { label: "Naam", value: "{{customer.name}}" },
    { label: "Straat", value: "{{customer.address.street}}" },
    { label: "Huisnummer", value: "{{customer.address.houseNumber}}" },
    { label: "Postcode", value: "{{customer.address.postalCode}}" },
    { label: "Plaats", value: "{{customer.address.city}}" },
    { label: "Land", value: "{{customer.countryName}}" },
    { label: "E-mail", value: "{{customer.generalEmail}}" },
    { label: "Telefoon", value: "{{customer.phone}}" },
    { label: "Mobiel", value: "{{customer.mobile}}" },
    { label: "KVK", value: "{{customer.kvkNummer}}" },
    { label: "BTW nummer", value: "{{customer.btwNummer}}" },
    { label: "Klantnummer", value: "{{customer.customerNumber}}" },
    { label: "Bankrekening", value: "{{customer.bankAccount}}" },
  ]},
  { category: "Bedrijf", items: [
    { label: "Naam", value: "{{company.name}}" },
    { label: "Straat", value: "{{company.address.street}}" },
    { label: "Huisnummer", value: "{{company.address.houseNumber}}" },
    { label: "Postcode", value: "{{company.address.postalCode}}" },
    { label: "Plaats", value: "{{company.address.city}}" },
    { label: "Land", value: "{{company.address.country}}" },
    { label: "KVK", value: "{{company.kvkNummer}}" },
    { label: "BTW nummer", value: "{{company.btwNummer}}" },
    { label: "IBAN", value: "{{company.iban}}" },
    { label: "Bank", value: "{{company.bankName}}" },
    { label: "Telefoon", value: "{{company.phone}}" },
    { label: "E-mail", value: "{{company.email}}" },
    { label: "Website", value: "{{company.website}}" },
  ]},
  { category: "Contract", items: [
    { label: "Contractnummer", value: "{{contract.contractNumber}}" },
    { label: "Datum", value: "{{contract.contractDate}}" },
    { label: "Geldig tot", value: "{{contract.validUntil}}" },
    { label: "Omschrijving", value: "{{contract.description}}" },
    { label: "Status", value: "{{contract.status}}" },
  ]},
  { category: "Datum", items: [
    { label: "Vandaag", value: "[VANDAAG]" },
    { label: "Huidig jaar", value: "[JAAR]" },
  ]},
];

interface ContractFormLayoutProps {
  onSave: () => void;
  contractId?: string;
  parentId?: string;
}

export function ContractFormLayout({ onSave, contractId, parentId }: ContractFormLayoutProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Klant", "Bedrijf"]));
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
      indentLevel: 0,
    };
    setRows(prev => [...prev, newRow]);
    setSelectedRowIndex(rows.length);
    setHasUnsavedChanges(true);
  }, [rows.length]);

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

  const insertPlaceholder = useCallback((placeholder: string) => {
    if (selectedRowIndex !== null && activeTextareaRef.current) {
      const ta = activeTextareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = ta.value;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      updateRow(selectedRowIndex, 'content', newText);
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + placeholder.length;
      }, 0);
    } else if (selectedRowIndex !== null) {
      const currentContent = rows[selectedRowIndex]?.content || "";
      updateRow(selectedRowIndex, 'content', currentContent + placeholder);
    } else {
      toast({ title: "Selecteer eerst een rij", description: "Klik op een tekstrij om een placeholder in te voegen.", variant: "destructive" });
    }
  }, [selectedRowIndex, rows, updateRow, toast]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'heading': return <Heading className="w-4 h-4" />;
      case 'table': return <Table className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'heading': return 'Kop';
      case 'table': return 'Tabel';
      case 'image': return 'Afbeelding';
      default: return 'Tekst';
    }
  };

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

  const contentBuilder = (
    <div className="flex h-[calc(100vh-220px)]">
      <div className="flex-1 flex flex-col overflow-hidden border-r">
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => addRow("text")}><Type className="w-4 h-4 mr-1" />Tekst</Button>
            </TooltipTrigger><TooltipContent>Tekstrij toevoegen</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => addRow("heading")}><Heading className="w-4 h-4 mr-1" />Kop</Button>
            </TooltipTrigger><TooltipContent>Koprij toevoegen</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => addRow("table")}><Table className="w-4 h-4 mr-1" />Tabel</Button>
            </TooltipTrigger><TooltipContent>Tabelrij toevoegen</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => addRow("image")}><Image className="w-4 h-4 mr-1" />Afbeelding</Button>
            </TooltipTrigger><TooltipContent>Afbeeldingrij toevoegen</TooltipContent></Tooltip>
          </TooltipProvider>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={autoNumber}>Auto-nummering</Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {rows.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Type className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nog geen rijen. Gebruik de knoppen hierboven om inhoud toe te voegen.</p>
              </div>
            )}
            {rows.map((row, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-colors ${selectedRowIndex === index ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                onClick={() => setSelectedRowIndex(index)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <span className="text-xs text-muted-foreground">{getTypeIcon(row.itemType)}</span>
                      <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    </div>
                    <div className="flex-1" style={{ marginLeft: `${row.indentLevel * 24}px` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          value={row.articleNumber}
                          onChange={(e) => updateRow(index, 'articleNumber', e.target.value)}
                          className="w-20 h-7 text-xs"
                          placeholder="Nr."
                        />
                        <span className="text-xs text-muted-foreground font-medium">{getTypeLabel(row.itemType)}</span>
                        <div className="ml-auto flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveRow(index, 'up'); }} disabled={index === 0}>
                            <MoveUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveRow(index, 'down'); }} disabled={index === rows.length - 1}>
                            <MoveDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); changeIndent(index, 'decrease'); }} disabled={row.indentLevel === 0}>
                            <Outdent className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); changeIndent(index, 'increase'); }} disabled={row.indentLevel >= 3}>
                            <Indent className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); duplicateRow(index); }}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); removeRow(index); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {row.itemType === 'heading' ? (
                        <Input
                          value={row.content}
                          onChange={(e) => updateRow(index, 'content', e.target.value)}
                          className="font-bold text-base"
                          placeholder="Koptekst..."
                        />
                      ) : row.itemType === 'image' ? (
                        <Input
                          value={row.content}
                          onChange={(e) => updateRow(index, 'content', e.target.value)}
                          placeholder="Afbeelding URL of referentie..."
                        />
                      ) : (
                        <Textarea
                          ref={(el) => {
                            if (selectedRowIndex === index) activeTextareaRef.current = el;
                          }}
                          value={row.content}
                          onChange={(e) => updateRow(index, 'content', e.target.value)}
                          placeholder={row.itemType === 'table' ? "Tabelinhoud (bijv. kolom1 | kolom2 | kolom3)..." : "Tekst invoeren... Gebruik {{placeholders}} voor dynamische data."}
                          rows={row.itemType === 'table' ? 4 : 3}
                          className="resize-none text-sm"
                          onFocus={() => {
                            setSelectedRowIndex(index);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="w-64 flex flex-col overflow-hidden bg-muted/20">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Placeholders</h3>
          <p className="text-xs text-muted-foreground mt-1">Klik om in te voegen bij geselecteerde rij</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {PLACEHOLDERS.map(group => (
              <div key={group.category} className="mb-1">
                <button
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded"
                  onClick={() => toggleCategory(group.category)}
                >
                  {expandedCategories.has(group.category) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {group.category}
                </button>
                {expandedCategories.has(group.category) && (
                  <div className="ml-4 space-y-0.5">
                    {group.items.map(item => (
                      <button
                        key={item.value}
                        className="w-full text-left px-2 py-1 text-xs rounded hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between group"
                        onClick={() => insertPlaceholder(item.value)}
                        title={item.value}
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] text-muted-foreground group-hover:text-primary/70 font-mono truncate ml-2">{item.value}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
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
      ],
    },
    {
      id: "content",
      label: "Inhoud",
      rows: [
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
