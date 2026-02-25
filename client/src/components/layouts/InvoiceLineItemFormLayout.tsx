import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutForm2, type FormSection2, type FormField2, createFieldRow, createFieldsRow, createCustomRow, createSectionHeaderRow, createTwoColumnRow } from './LayoutForm2';
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import type { InfoField } from './InfoHeaderLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvoiceItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Save, ArrowLeft, Package, FileText, Search, Library, Check, CalendarIcon, ChevronsUpDown, X } from "lucide-react";
import { EmployeeSelectWithAdd } from "@/components/ui/employee-select-with-add";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceItem, InsertInvoiceItem, TextSnippet, Invoice, CustomerRate, RateAndCharge, Employee } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const lineItemFormSchema = insertInvoiceItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs per eenheid is verplicht"),
  lineTotal: z.string().min(1, "Regel totaal is verplicht"),
  quantity: z.number().min(0, "Aantal kan niet negatief zijn"),
  position: z.number().min(1, "Positie is verplicht").optional(),
  positionNo: z.string().optional(),
  descriptionInternal: z.string().optional(),
  descriptionExternal: z.string().optional(),
  sourceSnippetId: z.string().optional(),
  sourceSnippetVersion: z.number().optional(),
  workDate: z.any().optional(),
  customerRateId: z.string().optional(),
  technicianNames: z.string().optional(),
  technicianIds: z.string().optional(),
}).refine((data) => {
  if ((data.lineType === 'standard' || data.lineType === 'unique') && data.quantity < 1) {
    return false;
  }
  return true;
}, {
  message: "Aantal moet minimaal 1 zijn voor standaard en unieke artikelen",
  path: ["quantity"],
});

type LineItemFormData = z.infer<typeof lineItemFormSchema> & {
  position?: number;
  positionNo?: string;
  descriptionInternal?: string;
  descriptionExternal?: string;
  sourceSnippetId?: string;
  sourceSnippetVersion?: number;
  workDate?: any;
  customerRateId?: string;
  technicianNames?: string;
  technicianIds?: string;
};

interface InvoiceLineItemFormLayoutProps {
  onSave: () => void;
  lineItemId?: string;
  invoiceId?: string;
  parentId?: string;
}

export function InvoiceLineItemFormLayout({ onSave, lineItemId, invoiceId, parentId }: InvoiceLineItemFormLayoutProps) {
  const [activeSection, setActiveSection] = useState("general");
  const [originalValues, setOriginalValues] = useState<Partial<LineItemFormData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState("");
  const [selectedSnippetCategory, setSelectedSnippetCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [rateOpen, setRateOpen] = useState(false);
  const [rateSearchQuery, setRateSearchQuery] = useState("");
  
  const { toast } = useToast();
  const isEditing = !!lineItemId;

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemFormSchema),
    mode: 'onBlur',
    defaultValues: {
      invoiceId: invoiceId || "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
      lineType: "standard",
      itemId: undefined,
      position: 1,
      positionNo: "",
      descriptionInternal: "",
      descriptionExternal: "",
      sourceSnippetId: undefined,
      sourceSnippetVersion: undefined,
      workDate: undefined,
      customerRateId: "",
      technicianNames: "",
    },
  });

  const handleChangesDetected = useCallback((hasChanges: boolean, modifiedFields: Set<string>) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const { data: lineItem, isLoading: isLoadingLineItem } = useQuery<InvoiceItem>({
    queryKey: ["/api/invoice-items", lineItemId],
    enabled: !!lineItemId,
  });

  const { data: invoiceData } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  const customerId = invoiceData?.customerId;

  const { data: invoiceDetails } = useQuery<{ invoice: any; items: InvoiceItem[]; customer: any }>({
    queryKey: ["/api/invoices", invoiceId, "details"],
    enabled: !!invoiceId && !isEditing,
  });

  const { data: customerRates = [] } = useQuery<CustomerRate[]>({
    queryKey: [`/api/customer-rates/${customerId}`],
    enabled: !!customerId,
  });

  const { data: allRates = [] } = useQuery<RateAndCharge[]>({
    queryKey: ["/api/masterdata/rates-and-charges"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    staleTime: 5 * 60 * 1000,
  });

  const customerRateOptions = useMemo(() => {
    const customerRateMap = new Map<string, CustomerRate>();
    customerRates.forEach(cr => customerRateMap.set(cr.rateId, cr));
    return allRates
      .filter(r => (r as any).isActive !== false)
      .map(r => {
        const customerRate = customerRateMap.get(r.id);
        const discount = customerRate ? Number(customerRate.discountPercent) || 0 : 0;
        const baseRate = Number(r.rate);
        const discountedPrice = baseRate * (1 - discount / 100);
        return {
          rateId: r.id,
          code: r.code,
          name: r.name,
          unit: r.unit || "",
          baseRate,
          discount,
          discountedPrice,
          label: `${r.code} - ${r.name} (€${discountedPrice.toFixed(2)}${discount > 0 ? ` / ${discount}% disc.` : ''})`,
        };
      });
  }, [customerRates, allRates]);

  const filteredRateOptions = useMemo(() => {
    if (!rateSearchQuery) return customerRateOptions;
    const q = rateSearchQuery.toLowerCase();
    return customerRateOptions.filter(opt =>
      opt.code.toLowerCase().includes(q) ||
      opt.name.toLowerCase().includes(q) ||
      opt.label.toLowerCase().includes(q)
    );
  }, [rateSearchQuery, customerRateOptions]);

  useEffect(() => {
    if (!isEditing && invoiceDetails?.items) {
      let maxNumber = 0;
      for (const item of invoiceDetails.items) {
        if ((item as any).positionNo) {
          const num = parseInt((item as any).positionNo, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
      const nextNumber = Math.ceil((maxNumber + 1) / 10) * 10;
      const nextPositionNo = nextNumber.toString().padStart(3, '0');
      form.setValue('positionNo', nextPositionNo);
    }
  }, [isEditing, invoiceDetails, form]);

  const { data: textSnippets = [], isLoading: isLoadingSnippets } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets"],
    enabled: showSnippetDialog,
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchedSnippets = [], isLoading: isSearchingSnippets } = useQuery<TextSnippet[]>({
    queryKey: ["/api/text-snippets/search", snippetSearchTerm],
    queryFn: async () => {
      if (!snippetSearchTerm.trim()) return [];
      const response = await fetch(`/api/text-snippets/search?q=${encodeURIComponent(snippetSearchTerm)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!snippetSearchTerm.trim(),
    staleTime: 1 * 60 * 1000,
  });

  useEffect(() => {
    if (lineItem) {
      const formData: LineItemFormData = {
        invoiceId: lineItem.invoiceId || invoiceId || "",
        description: lineItem.description || "",
        quantity: lineItem.quantity || 1,
        unitPrice: lineItem.unitPrice?.toString() || "0.00",
        lineTotal: lineItem.lineTotal?.toString() || "0.00",
        lineType: lineItem.lineType || "standard",
        itemId: lineItem.itemId || undefined,
        position: 1,
        positionNo: (lineItem as any).positionNo || "",
        descriptionInternal: lineItem.description || "",
        descriptionExternal: lineItem.description || "",
        sourceSnippetId: lineItem.sourceSnippetId || undefined,
        sourceSnippetVersion: lineItem.sourceSnippetVersion || undefined,
        workDate: (lineItem as any).workDate || undefined,
        customerRateId: (lineItem as any).customerRateId || "",
        technicianNames: (lineItem as any).technicianNames || "",
        technicianIds: (lineItem as any).technicianIds || "",
      };
      
      if ((lineItem as any).workDate) {
        setSelectedDate(new Date((lineItem as any).workDate));
      }
      if ((lineItem as any).technicianIds) {
        setSelectedEmployeeId(((lineItem as any).technicianIds as string).trim());
      }
      
      form.reset(formData);
      setOriginalValues(formData);
      setHasUnsavedChanges(false);
    } else {
      const defaultFormData = form.getValues();
      setOriginalValues(defaultFormData);
      setHasUnsavedChanges(false);
    }
  }, [lineItem, form, invoiceId]);

  const lineTypeValue = form.watch("lineType");
  const quantityValue = form.watch("quantity");
  const unitPriceValue = form.watch("unitPrice");
  const lineTotalValue = form.watch("lineTotal");
  const customerRateIdValue = form.watch("customerRateId");

  const selectedRateOption = useMemo(() => {
    if (!customerRateIdValue) return null;
    return customerRateOptions.find(opt => opt.rateId === customerRateIdValue) || null;
  }, [customerRateIdValue, customerRateOptions]);

  const SNIPPET_CATEGORIES = [
    { value: "all", label: "All Categories" },
    { value: "general", label: "General" },
    { value: "header", label: "Header" },
    { value: "footer", label: "Footer" },
    { value: "disclaimer", label: "Disclaimer" },
    { value: "terms", label: "Terms & Conditions" },
    { value: "warranty", label: "Warranty" },
    { value: "delivery", label: "Delivery" },
    { value: "payment", label: "Payment" },
    { value: "contact", label: "Contact" },
    { value: "signature", label: "Signature" },
  ];

  const filteredSnippets = useMemo(() => {
    let snippets = snippetSearchTerm.trim() ? searchedSnippets : textSnippets;
    
    if (selectedSnippetCategory && selectedSnippetCategory !== "all") {
      snippets = snippets.filter(snippet => snippet.category === selectedSnippetCategory);
    }
    
    snippets = snippets.filter(snippet => snippet.isActive);
    
    return snippets;
  }, [textSnippets, searchedSnippets, snippetSearchTerm, selectedSnippetCategory]);

  useEffect(() => {
    const quantity = form.getValues("quantity");
    const unitPrice = parseFloat(form.getValues("unitPrice")) || 0;
    const lineTotal = (quantity * unitPrice).toFixed(2);
    form.setValue("lineTotal", lineTotal);
  }, [quantityValue, unitPriceValue, form]);

  useEffect(() => {
    const tabId = lineItemId ? `edit-invoice-line-item-${lineItemId}` : 'new-invoice-line-item';
    window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
      detail: { tabId, hasUnsavedChanges }
    }));
  }, [hasUnsavedChanges, lineItemId]);

  const handleCustomerRateChange = (rateId: string) => {
    form.setValue("customerRateId", rateId);
    const rateOpt = customerRateOptions.find(opt => opt.rateId === rateId);
    if (rateOpt) {
      form.setValue("unitPrice", rateOpt.discountedPrice.toFixed(2));
      if (rateOpt.unit) {
        form.setValue("unit" as any, rateOpt.unit);
      }
    }
    setHasUnsavedChanges(true);
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    form.setValue("workDate", date ? date.toISOString() : undefined);
    setHasUnsavedChanges(true);
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = allEmployees.find(e => e.id === employeeId);
    const fullName = emp ? `${emp.firstName} ${emp.lastName}` : "";
    form.setValue("technicianNames", fullName);
    form.setValue("technicianIds", employeeId);
    setHasUnsavedChanges(true);
  };

  const recordSnippetUsageMutation = useMutation({
    mutationFn: async (data: { snippetId: string; invoiceId: string; usageType: string }) => {
      const response = await apiRequest("POST", `/api/text-snippets/${data.snippetId}/use`, {
        invoiceId: data.invoiceId,
        usageType: data.usageType,
        usageContext: 'invoice-item'
      });
      return response.json();
    },
    onError: (error) => {
      console.warn("Failed to record snippet usage:", error);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/items`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot add line");
      }
      return response.json();
    },
    onSuccess: (newLineItem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      setHasUnsavedChanges(false);
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId: 'new-invoice-line-item', hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Line added",
      });
      
      window.dispatchEvent(new CustomEvent('entity-created', {
        detail: {
          entityType: 'invoice-item',
          entity: newLineItem,
          parentId: parentId
        }
      }));
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Cannot add line",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LineItemFormData) => {
      const response = await apiRequest("PUT", `/api/invoice-items/${lineItemId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Cannot update line");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items", lineItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId, "items"] });
      setHasUnsavedChanges(false);
      const tabId = lineItemId ? `edit-invoice-line-item-${lineItemId}` : 'new-invoice-line-item';
      window.dispatchEvent(new CustomEvent('tab-unsaved-changes', {
        detail: { tabId, hasUnsavedChanges: false }
      }));
      toast({
        title: "Success",
        description: "Line updated",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Cannot update line",
        variant: "destructive",
      });
    },
  });

  const handleSelectSnippet = (snippet: TextSnippet) => {
    form.setValue("descriptionExternal", snippet.body);
    form.setValue("sourceSnippetId", snippet.id);
    form.setValue("sourceSnippetVersion", snippet.version || undefined);
    
    if (form.getValues("lineType") !== "text") {
      form.setValue("lineType", "text");
    }
    
    form.setValue("quantity", 0);
    form.setValue("unitPrice", "0.00");
    form.setValue("lineTotal", "0.00");
    
    setShowSnippetDialog(false);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("");
    
    if (invoiceId) {
      recordSnippetUsageMutation.mutate({
        snippetId: snippet.id,
        invoiceId: invoiceId,
        usageType: 'invoice-line-item'
      });
    }
    
    toast({
      title: "Snippet Added",
      description: `Text from "${snippet.title}" has been added to the line.`,
    });
  };

  const handleOpenSnippetLibrary = () => {
    setShowSnippetDialog(true);
    setSnippetSearchTerm("");
    setSelectedSnippetCategory("");
  };

  const getCategoryLabel = (categoryValue: string) => {
    const category = SNIPPET_CATEGORIES.find(cat => cat.value === categoryValue);
    return category?.label || categoryValue;
  };

  const onSubmit = (data: LineItemFormData) => {
    const emp = allEmployees.find(e => e.id === selectedEmployeeId);
    const techName = emp ? `${emp.firstName} ${emp.lastName}` : undefined;

    const transformedData = {
      ...data,
      quantity: Number(data.quantity),
      description: data.descriptionExternal || data.descriptionInternal || data.description,
      sourceSnippetId: data.sourceSnippetId || undefined,
      sourceSnippetVersion: data.sourceSnippetVersion || undefined,
      workDate: selectedDate ? selectedDate.toISOString() : undefined,
      customerRateId: data.customerRateId || undefined,
      technicianNames: techName || undefined,
      technicianIds: selectedEmployeeId || undefined,
    };
    
    if (isEditing) {
      updateMutation.mutate(transformedData);
    } else {
      createMutation.mutate(transformedData);
    }
  };

  const headerFields: InfoField[] = [
    {
      label: 'Type',
      value: lineTypeValue || 'standard'
    },
    {
      label: 'Totaal',
      value: `€${lineTotalValue || '0.00'}`
    },
  ];

  const toolbar = useFormToolbar({
    entityType: "invoice_line_item",
    entityId: lineItemId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: !hasUnsavedChanges,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const lineTypeOptions = [
    { value: 'standard', label: 'Standard Item' },
    { value: 'unique', label: 'Unique Item' },
    { value: 'text', label: 'Text' },
    { value: 'charges', label: 'Charges' },
  ];

  const formFields: FormField2<LineItemFormData>[] = [
    {
      key: 'lineType',
      label: 'Line Type',
      type: 'select',
      options: lineTypeOptions,
      setValue: (value: string) => form.setValue('lineType', value),
      watch: () => form.watch('lineType'),
      validation: {
        isRequired: true,
        error: form.formState.errors.lineType?.message
      },
      testId: 'select-line-type'
    },
    {
      key: 'positionNo',
      label: 'Pos. No.',
      type: 'text',
      register: form.register('positionNo'),
      placeholder: 'e.g. 010',
      validation: {
        error: form.formState.errors.positionNo?.message
      },
      testId: 'input-position-no'
    },
    {
      key: 'quantity',
      label: 'Quantity',
      type: 'number',
      register: form.register('quantity', { valueAsNumber: true }),
      validation: {
        isRequired: true,
        error: form.formState.errors.quantity?.message
      },
      testId: 'input-quantity'
    },
    {
      key: 'unitPrice',
      label: 'Unit Price',
      type: 'number',
      register: form.register('unitPrice'),
      validation: {
        isRequired: true,
        error: form.formState.errors.unitPrice?.message
      },
      testId: 'input-unit-price'
    },
    {
      key: 'lineTotal',
      label: 'Line Total',
      type: 'text',
      register: form.register('lineTotal'),
      disabled: true,
      className: 'bg-gray-50 dark:bg-gray-800',
      validation: {
        error: form.formState.errors.lineTotal?.message
      },
      testId: 'input-line-total'
    },
    {
      key: 'workDate',
      label: 'Work Date',
      type: 'custom',
      customComponent: (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !selectedDate && "text-muted-foreground"
              )}
              data-testid="input-work-date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd-MM-yy") : "Select date..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ),
      testId: 'input-work-date'
    },
    {
      key: 'technicianNames',
      label: 'Technician',
      type: 'custom',
      customComponent: (
        <EmployeeSelectWithAdd
          value={selectedEmployeeId}
          onValueChange={handleEmployeeChange}
          testId="select-technician"
        />
      ),
      testId: 'select-technician'
    },
    {
      key: 'customerRateId',
      label: 'Rate',
      type: 'custom',
      customComponent: (
        <Popover open={rateOpen} onOpenChange={setRateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={rateOpen}
              className="w-full h-10 justify-between font-normal"
              data-testid="select-customer-rate"
            >
              <span className="truncate">
                {customerRateIdValue
                  ? (customerRateOptions.find(o => o.rateId === customerRateIdValue)?.label || "Select rate...")
                  : "Select rate..."}
              </span>
              <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            align="start"
            sideOffset={4}
            style={{ width: 'var(--radix-popover-trigger-width)' }}
          >
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <CommandInput
                  placeholder="Search rates..."
                  className="flex-1 border-0 bg-transparent outline-none focus:ring-0 pr-2"
                  value={rateSearchQuery}
                  onValueChange={setRateSearchQuery}
                />
              </div>
              <CommandList>
                <CommandEmpty>No rates found.</CommandEmpty>
                <CommandGroup>
                  {customerRateIdValue && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        handleCustomerRateChange("");
                        setRateOpen(false);
                        setRateSearchQuery("");
                      }}
                      className="text-muted-foreground italic"
                    >
                      — Clear selection —
                    </CommandItem>
                  )}
                  {filteredRateOptions.map(opt => (
                    <CommandItem
                      key={opt.rateId}
                      value={opt.rateId}
                      onSelect={() => {
                        handleCustomerRateChange(opt.rateId);
                        setRateOpen(false);
                        setRateSearchQuery("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          customerRateIdValue === opt.rateId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ),
      testId: 'select-customer-rate'
    },
    {
      key: 'descriptionInternal',
      label: 'Internal Description',
      type: 'textarea',
      placeholder: 'Internal description (not visible on invoice)',
      rows: 4,
      register: form.register('descriptionInternal'),
      validation: {
        error: form.formState.errors.descriptionInternal?.message
      },
      testId: 'textarea-description-internal'
    },
    {
      key: 'descriptionExternal',
      label: 'External Description',
      type: 'textarea',
      placeholder: 'External description (visible on invoice)',
      rows: 4,
      register: form.register('descriptionExternal'),
      validation: {
        error: form.formState.errors.descriptionExternal?.message
      },
      testId: 'textarea-description-external'
    }
  ];

  const formSections: FormSection2<LineItemFormData>[] = [
    {
      id: 'general',
      label: 'General',
      rows: [
        createTwoColumnRow(
          [
            formFields[0],  // Position No
            formFields[1],  // Line Type
            formFields[5],  // Work Date
            formFields[6],  // Technician
            formFields[7],  // Rate
            formFields[2],  // Quantity
          ],
          [
            formFields[3],  // Unit Price
            formFields[4],  // Line Total
            formFields[8],  // Internal Description (textarea)
            formFields[9],  // External Description (textarea)
          ]
        )
      ]
    }
  ];

  const snippetSelectionDialog = (
    <Dialog open={showSnippetDialog} onOpenChange={setShowSnippetDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Select text from library
          </DialogTitle>
          <DialogDescription>
            Choose a text block from the library to add to this line. The text will be copied and is independent from the original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search text blocks..."
                  value={snippetSearchTerm}
                  onChange={(e) => setSnippetSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-snippet-search"
                />
              </div>
            </div>
            <Select
              value={selectedSnippetCategory}
              onValueChange={setSelectedSnippetCategory}
            >
              <SelectTrigger className="w-48" data-testid="select-snippet-category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                {SNIPPET_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            {(isLoadingSnippets || isSearchingSnippets) ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredSnippets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No text blocks found</p>
                {snippetSearchTerm && (
                  <p className="text-sm mt-1">Try a different search term</p>
                )}
              </div>
            ) : (
              <Command>
                <CommandList className="max-h-[400px] overflow-y-auto">
                  <CommandGroup>
                    {filteredSnippets.map((snippet) => (
                      <CommandItem
                        key={snippet.id}
                        onSelect={() => handleSelectSnippet(snippet)}
                        className="p-4 cursor-pointer hover:bg-muted/50"
                        data-testid={`snippet-item-${snippet.id}`}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{snippet.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(snippet.category || 'general')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {snippet.locale?.toUpperCase() || 'NL'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {snippet.body}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Code: {snippet.code}</span>
                            <span>Version: {snippet.version}</span>
                          </div>
                        </div>
                        <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSnippetDialog(false)}
            data-testid="button-cancel-snippet"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <LayoutForm2
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        form={form}
        onSubmit={onSubmit}
        toolbar={toolbar}
        infoFields={headerFields}
        documentType="invoice_line_item"
        entityId={lineItemId}
        changeTracking={{
          enabled: true,
          onChangesDetected: handleChangesDetected
        }}
        originalValues={originalValues}
        isLoading={isLoadingLineItem}
      />
      {snippetSelectionDialog}
    </>
  );
}
