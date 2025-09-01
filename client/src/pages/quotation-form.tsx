import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Quotation, InsertQuotation, QuotationItem, InsertQuotationItem, Customer, InventoryItem } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

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
      quotationNumber: `Q${Date.now()}`,
      customerId: "",
      description: "",
      revisionNumber: "V1.0",
      status: "draft",
      quotationDate: format(new Date(), 'yyyy-MM-dd'),
      validUntil: "",
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
      const processedData = {
        ...data,
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("POST", "/api/quotations", processedData);
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quotation",
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-orange-50 dark:bg-orange-900/20 p-1 rounded-lg border border-orange-200 dark:border-orange-700">
              <TabsTrigger 
                value="general" 
                data-testid="tab-general"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-orange-700 dark:data-[state=inactive]:text-orange-300 font-semibold px-4 py-2 rounded-md transition-all"
              >
                General
              </TabsTrigger>
              <TabsTrigger 
                value="conditions" 
                data-testid="tab-conditions"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:text-orange-700 dark:data-[state=inactive]:text-orange-300 font-semibold px-4 py-2 rounded-md transition-all"
              >
                Conditions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-6">
              {/* General Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quotationNumber">Quotation Number</Label>
                  <Input
                    id="quotationNumber"
                    {...quotationForm.register("quotationNumber")}
                    data-testid="input-quotation-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revisionNumber">Revision Number</Label>
                  <Input
                    id="revisionNumber"
                    {...quotationForm.register("revisionNumber")}
                    data-testid="input-revision-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer</Label>
                  <Select 
                    value={quotationForm.watch("customerId")} 
                    onValueChange={(value) => quotationForm.setValue("customerId", value)}
                  >
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={quotationForm.watch("status")} 
                    onValueChange={(value) => quotationForm.setValue("status", value)}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...quotationForm.register("description")}
                    data-testid="input-description"
                  />
                </div>
              </div>

              {/* Quotation Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Quotation Lines</h3>
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

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>€{quotationForm.watch("subtotal")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (21%):</span>
                    <span>€{quotationForm.watch("taxAmount")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>€{quotationForm.watch("totalAmount")}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="conditions" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}