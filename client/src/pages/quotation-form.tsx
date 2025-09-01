import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormTabLayout } from '@/components/layouts/FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Save, X, FileText, Download, Clock, MessageSquare, Eye, EyeOff, ChevronsUpDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Quotation, InsertQuotation, QuotationItem, InsertQuotationItem, Customer, InventoryItem } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

// Memo interface
interface Memo {
  id: string;
  title: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

// Form schemas
const quotationFormSchema = insertQuotationSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  quotationDate: z.string().optional(),
  validUntil: z.string().optional(),
});

const quotationItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  lineTotal: z.string().min(1, "Line total is required"),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;
type QuotationItemFormData = z.infer<typeof quotationItemFormSchema>;

// Default column configuration for quotation items
const defaultItemColumns: ColumnConfig[] = [
  createIdColumn('id', 'Line ID'),
  { 
    key: 'description', 
    label: 'Description', 
    visible: true, 
    width: 300, 
    filterable: true, 
    sortable: true 
  },
  { 
    key: 'quantity', 
    label: 'Quantity', 
    visible: true, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: number) => value?.toString() || "0"
  },
  { 
    key: 'unitPrice', 
    label: 'Unit Price', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => `€${value || "0.00"}`
  },
  { 
    key: 'lineTotal', 
    label: 'Line Total', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => `€${value || "0.00"}`
  },
];

interface QuotationFormProps {
  onSave: () => void;
  quotationId?: string;
}

export default function QuotationForm({ onSave, quotationId }: QuotationFormProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const { toast } = useToast();

  // Data table state for quotation items
  const itemTableState = useDataTable({ 
    defaultColumns: defaultItemColumns,
    tableKey: 'quotation-form-items'
  });

  // Fetch data
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Forms
  const quotationForm = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: "Auto-generated",
      customerId: "",
      description: "",
      revisionNumber: "V1.0",
      status: "draft",
      quotationDate: format(new Date(), 'yyyy-MM-dd'),
      validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days from now
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      notes: "",
      incoTerms: "",
      paymentConditions: "",
      deliveryConditions: "",
    },
  });

  const itemForm = useForm<QuotationItemFormData>({
    resolver: zodResolver(quotationItemFormSchema),
    defaultValues: {
      quotationId: "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    },
  });

  // Helper functions
  const calculateLineTotal = (quantity: number, unitPrice: string) => {
    const total = quantity * parseFloat(unitPrice || "0");
    return total.toFixed(2);
  };

  const calculateQuotationTotals = () => {
    const subtotal = quotationItems.reduce((sum, item) => {
      return sum + parseFloat(item.lineTotal || "0");
    }, 0);
    
    const taxAmount = subtotal * 0.21; // 21% VAT
    const totalAmount = subtotal + taxAmount;
    
    quotationForm.setValue("subtotal", subtotal.toFixed(2));
    quotationForm.setValue("taxAmount", taxAmount.toFixed(2));
    quotationForm.setValue("totalAmount", totalAmount.toFixed(2));
  };

  // Mutations
  const createQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      // Send data as-is, let backend handle date conversion
      const response = await apiRequest("POST", "/api/quotations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: "Quotation created successfully",
      });
      onSave();
    },
    onError: (error: any) => {
      console.error("Quotation creation error:", error);
      toast({
        title: "Error",
        description: error?.error || error?.message || "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleSaveQuotation = (data: QuotationFormData) => {
    createQuotationMutation.mutate(data);
  };

  const handleAddItem = () => {
    itemForm.reset({
      quotationId: "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    });
    setEditingItem(null);
    setShowItemDialog(true);
  };

  const handleSaveItem = (data: QuotationItemFormData) => {
    const newItem: QuotationItem = {
      id: `temp-${Date.now()}`,
      quotationId: "",
      itemId: null,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      lineTotal: data.lineTotal,
    };
    
    setQuotationItems(prev => [...prev, newItem]);
    setShowItemDialog(false);
    itemForm.reset();
    
    // Recalculate totals
    setTimeout(calculateQuotationTotals, 100);
    
    toast({
      title: "Success",
      description: "Item added to quotation",
    });
  };

  const handleDeleteItem = (item: QuotationItem) => {
    setQuotationItems(prev => prev.filter(i => i.id !== item.id));
    calculateQuotationTotals();
    toast({
      title: "Success",
      description: "Item removed from quotation",
    });
  };

  // Update line total when quantity or unit price changes
  const watchQuantity = itemForm.watch("quantity");
  const watchUnitPrice = itemForm.watch("unitPrice");

  // Auto-calculate line total
  useEffect(() => {
    const lineTotal = calculateLineTotal(watchQuantity || 1, watchUnitPrice || "0.00");
    itemForm.setValue("lineTotal", lineTotal);
  }, [watchQuantity, watchUnitPrice, itemForm]);

  // Auto-update validity when quotation date changes
  const watchQuotationDate = quotationForm.watch("quotationDate");
  useEffect(() => {
    if (watchQuotationDate) {
      const quoteDate = new Date(watchQuotationDate);
      quoteDate.setDate(quoteDate.getDate() + 30);
      quotationForm.setValue("validUntil", format(quoteDate, 'yyyy-MM-dd'));
    }
  }, [watchQuotationDate, quotationForm]);

  // Memo handlers
  const handleAddMemo = () => {
    const newMemo: Memo = {
      id: `memo-${Date.now()}`,
      title: `Memo ${memos.length + 1}`,
      content: '',
      isInternal: true,
      createdAt: new Date()
    };
    setMemos(prev => [...prev, newMemo]);
    toast({
      title: "Success",
      description: "New memo added",
    });
  };

  const handleUpdateMemo = (memoId: string, updatedData: Partial<Memo>) => {
    setMemos(prev => prev.map(memo => 
      memo.id === memoId ? { ...memo, ...updatedData } : memo
    ));
  };

  const handleDeleteMemo = (memoId: string) => {
    setMemos(prev => prev.filter(memo => memo.id !== memoId));
    toast({
      title: "Success",
      description: "Memo deleted",
    });
  };

  const handleInsertTimestamp = (memoId: string, content: string) => {
    const timestamp = new Date().toLocaleString('nl-NL');
    const newContent = content + ` [${timestamp}] `;
    handleUpdateMemo(memoId, { content: newContent });
  };

  // Memo Card Component
  const MemoCard = ({ memo, index, onUpdate, onDelete, onInsertTimestamp }: {
    memo: Memo;
    index: number;
    onUpdate: (data: Partial<Memo>) => void;
    onDelete: () => void;
    onInsertTimestamp: (content: string) => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localTitle, setLocalTitle] = useState(memo.title);
    const [localContent, setLocalContent] = useState(memo.content);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleSave = () => {
      onUpdate({ title: localTitle, content: localContent });
      setIsEditing(false);
    };

    const insertTimestampAtCursor = () => {
      if (textareaRef.current) {
        const cursorPos = textareaRef.current.selectionStart;
        const timestamp = `[${new Date().toLocaleString('nl-NL')}]`;
        const newContent = localContent.slice(0, cursorPos) + timestamp + localContent.slice(cursorPos);
        setLocalContent(newContent);
        onUpdate({ content: newContent });
      } else {
        onInsertTimestamp(localContent);
      }
    };

    return (
      <Card className="border border-orange-200 dark:border-orange-700">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="font-semibold"
                    placeholder="Memo title"
                  />
                ) : (
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                    {memo.title}
                  </h4>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate({ isInternal: !memo.isInternal })}
                    className={memo.isInternal ? 'text-blue-600' : 'text-green-600'}
                  >
                    {memo.isInternal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {memo.isInternal ? 'Internal' : 'Print'}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={insertTimestampAtCursor}
                  title="Insert timestamp at cursor"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div>
              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder="Enter memo content..."
                  className="min-h-[100px]"
                />
              ) : (
                <div className="min-h-[100px] p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                  {memo.content || <span className="text-gray-400 italic">No content yet...</span>}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="text-xs text-gray-500 flex items-center justify-between">
              <span>Created: {memo.createdAt.toLocaleDateString('nl-NL')}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                memo.isInternal 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' 
                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
              }`}>
                {memo.isInternal ? 'Internal memo' : 'Will be printed'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>New Quotation</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSave}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={quotationForm.handleSubmit(handleSaveQuotation)}>
                <Save className="mr-2 h-4 w-4" />
                Save Quotation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Fixed Information Section */}
          <Card className="mb-6 border-orange-200 dark:border-orange-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-500" style={{fontFamily: 'Arial, sans-serif'}}>Quotation Number</Label>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded border">
                    <span className="text-sm text-blue-700 dark:text-blue-300" style={{fontFamily: 'Arial, sans-serif'}}>Q-2025-001</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-500" style={{fontFamily: 'Arial, sans-serif'}}>Revision Number</Label>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded border">
                    <span className="text-sm text-blue-700 dark:text-blue-300" style={{fontFamily: 'Arial, sans-serif'}}>V1.0</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-500" style={{fontFamily: 'Arial, sans-serif'}}>Status</Label>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded border">
                    <span className="text-sm text-blue-700 dark:text-blue-300" style={{fontFamily: 'Arial, sans-serif'}}>Draft</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <FormTabLayout
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              {
                id: "general",
                label: "General",
                content: (
                  <div className="space-y-6">
                    {/* General Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerId">Customer</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                              data-testid="select-customer"
                            >
                              {quotationForm.watch("customerId")
                                ? customers.find((customer) => customer.id === quotationForm.watch("customerId"))?.name
                                : "Select customer..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search customers..." />
                              <CommandList>
                                <CommandEmpty>No customer found.</CommandEmpty>
                                <CommandGroup>
                                  {customers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.name}
                                      onSelect={() => {
                                        quotationForm.setValue("customerId", customer.id);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          quotationForm.watch("customerId") === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {customer.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quotationDate">Quotation Date</Label>
                        <Input
                          id="quotationDate"
                          type="date"
                          {...quotationForm.register("quotationDate")}
                          data-testid="input-quotation-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validUntil">Valid Until</Label>
                        <Input
                          id="validUntil"
                          type="date"
                          {...quotationForm.register("validUntil")}
                          data-testid="input-valid-until"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Quotation description</Label>
                        <Textarea
                          id="description"
                          {...quotationForm.register("description")}
                          data-testid="input-description"
                        />
                      </div>
                    </div>
                  </div>
                )
              },
              {
                id: "memo",
                label: "Memo",
                content: (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">Memo Management</h3>
                      <Button onClick={handleAddMemo} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Memo
                      </Button>
                    </div>
                    
                    {memos.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                        <p>No memos created yet. Click "New Memo" to add one.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {memos.map((memo, index) => (
                          <MemoCard
                            key={memo.id}
                            memo={memo}
                            index={index}
                            onUpdate={(updatedMemo) => handleUpdateMemo(memo.id, updatedMemo)}
                            onDelete={() => handleDeleteMemo(memo.id)}
                            onInsertTimestamp={(content) => handleInsertTimestamp(memo.id, content)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              },
              {
                id: "conditions",
                label: "Conditions",
                content: (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="incoTerms">Incoterms</Label>
                      <Input
                        id="incoTerms"
                        {...quotationForm.register("incoTerms")}
                        placeholder="e.g., EXW, FOB, CIF"
                        data-testid="input-inco-terms"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentConditions">Payment Conditions</Label>
                      <Textarea
                        id="paymentConditions"
                        {...quotationForm.register("paymentConditions")}
                        placeholder="e.g., 30 days net, Payment upon delivery"
                        data-testid="input-payment-conditions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryConditions">Delivery Conditions</Label>
                      <Textarea
                        id="deliveryConditions"
                        {...quotationForm.register("deliveryConditions")}
                        placeholder="e.g., 2-3 weeks delivery time"
                        data-testid="input-delivery-conditions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        {...quotationForm.register("notes")}
                        placeholder="Additional notes..."
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                )
              },
              {
                id: "financial",
                label: "Financial",
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Financial Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <Label>Subtotal</Label>
                        <p className="text-2xl font-bold">€{quotationForm.watch("subtotal")}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <Label>Tax (21%)</Label>
                        <p className="text-2xl font-bold">€{quotationForm.watch("taxAmount")}</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
                        <Label>Total</Label>
                        <p className="text-2xl font-bold text-orange-600">€{quotationForm.watch("totalAmount")}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      💡 <strong>Tip:</strong> De totalen worden automatisch berekend op basis van de offerte regels die je toevoegt.
                    </div>
                  </div>
                )
              },
              {
                id: "documents",
                label: "Documents",
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Document Management</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">Upload documents related to this quotation</p>
                      <div className="space-x-2">
                        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                          <Plus className="inline mr-2 h-4 w-4" />
                          Upload Document
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }
            ]}
          />

          {/* Quotation Items - Always Visible */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">Quotation Lines</h3>
              <Button onClick={handleAddItem} data-testid="button-add-item">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            
            <DataTableLayout
              data={quotationItems}
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
                const allIds = quotationItems.map(item => item.id);
                itemTableState.toggleAllRows(allIds);
              }}
              getRowId={(item: QuotationItem) => item.id}
              entityName="Quotation Item"
              entityNamePlural="Quotation Items"
              applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
              applySorting={itemTableState.applySorting}
              rowActions={(item: QuotationItem) => [
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <X className="h-4 w-4" />,
                  onClick: () => handleDeleteItem(item),
                  variant: 'destructive'
                }
              ]}
              addEditDialog={{
                isOpen: showItemDialog,
                onOpenChange: setShowItemDialog,
                title: 'Add Item',
                content: (
                  <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...itemForm.register("description")}
                        data-testid="input-item-description"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          {...itemForm.register("quantity", { valueAsNumber: true })}
                          data-testid="input-quantity"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Unit Price (€)</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          {...itemForm.register("unitPrice")}
                          data-testid="input-unit-price"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lineTotal">Line Total (€)</Label>
                        <Input
                          id="lineTotal"
                          type="number"
                          step="0.01"
                          {...itemForm.register("lineTotal")}
                          readOnly
                          className="bg-muted"
                          data-testid="input-line-total"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-save-item">
                        Add Item
                      </Button>
                    </div>
                  </form>
                )
              }}
            />
          </div>

          {/* Totals - Always Visible */}
          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-2 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>€{quotationForm.watch("subtotal")}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (21%):</span>
                <span>€{quotationForm.watch("taxAmount")}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-orange-300 pt-2">
                <span>Total:</span>
                <span className="text-orange-600">€{quotationForm.watch("totalAmount")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}