import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, FileText, Download, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function Quotations() {
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const { toast } = useToast();

  // Data table state for quotation items
  const itemTableState = useDataTable({ 
    defaultColumns: defaultItemColumns,
    tableKey: 'quotation-items'
  });

  // Fetch data
  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: quotationItems = [], isLoading: isLoadingItems } = useQuery<QuotationItem[]>({
    queryKey: ["/api/quotations", selectedQuotation?.id, "items"],
    queryFn: async () => {
      if (!selectedQuotation?.id) return [];
      const response = await fetch(`/api/quotations/${selectedQuotation.id}/items`);
      if (!response.ok) throw new Error('Failed to fetch quotation items');
      return response.json();
    },
    enabled: !!selectedQuotation?.id,
  });

  // Forms
  const quotationForm = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: "",
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
    onSuccess: (newQuotation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setSelectedQuotation(newQuotation);
      setIsEditMode(false);
      toast({
        title: "Success",
        description: "Quotation created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const processedData = {
        ...data,
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("PUT", `/api/quotations/${selectedQuotation!.id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", selectedQuotation?.id, "items"] });
      setIsEditMode(false);
      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: QuotationItemFormData) => {
      const processedData = {
        ...data,
        unitPrice: parseFloat(data.unitPrice),
        lineTotal: parseFloat(data.lineTotal),
      };
      const quotationId = selectedQuotation?.id || data.quotationId;
      if (!quotationId) throw new Error('No quotation selected');
      
      const response = await apiRequest("POST", `/api/quotations/${quotationId}/items`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations", selectedQuotation?.id, "items"] });
      setShowItemDialog(false);
      itemForm.reset();
      calculateQuotationTotals();
      toast({
        title: "Success",
        description: "Quotation item added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add quotation item",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleNewQuotation = () => {
    quotationForm.reset({
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
    });
    setSelectedQuotation(null);
    setIsEditMode(true);
    setActiveTab("general");
  };

  const handleSelectQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    quotationForm.reset({
      ...quotation,
      quotationDate: quotation.quotationDate ? format(new Date(quotation.quotationDate), 'yyyy-MM-dd') : '',
      validUntil: quotation.validUntil ? format(new Date(quotation.validUntil), 'yyyy-MM-dd') : '',
      subtotal: quotation.subtotal?.toString() || "0.00",
      taxAmount: quotation.taxAmount?.toString() || "0.00",
      totalAmount: quotation.totalAmount?.toString() || "0.00",
    });
    setIsEditMode(false);
    setActiveTab("general");
  };

  const handleSaveQuotation = (data: QuotationFormData) => {
    if (selectedQuotation) {
      updateQuotationMutation.mutate(data);
    } else {
      createQuotationMutation.mutate(data);
    }
  };

  const handleAddItem = () => {
    if (!selectedQuotation && !isEditMode) {
      toast({
        title: "Warning",
        description: "Please create or select a quotation first",
        variant: "destructive",
      });
      return;
    }
    
    itemForm.reset({
      quotationId: selectedQuotation?.id || "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    });
    setEditingItem(null);
    setShowItemDialog(true);
  };

  const handleEditItem = (item: QuotationItem) => {
    itemForm.reset({
      ...item,
      unitPrice: item.unitPrice?.toString() || "0.00",
      lineTotal: item.lineTotal?.toString() || "0.00",
    });
    setEditingItem(item);
    setShowItemDialog(true);
  };

  const handleSaveItem = (data: QuotationItemFormData) => {
    createItemMutation.mutate(data);
  };

  const handleGeneratePDF = () => {
    // TODO: Implement PDF generation
    toast({
      title: "Coming Soon",
      description: "PDF generation will be implemented soon",
    });
  };

  // Update line total when quantity or unit price changes
  const watchQuantity = itemForm.watch("quantity");
  const watchUnitPrice = itemForm.watch("unitPrice");

  // Auto-calculate line total
  React.useEffect(() => {
    const lineTotal = calculateLineTotal(watchQuantity || 1, watchUnitPrice || "0.00");
    itemForm.setValue("lineTotal", lineTotal);
  }, [watchQuantity, watchUnitPrice, itemForm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
          <p className="text-muted-foreground">Manage your quotations and generate PDFs</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewQuotation} data-testid="button-new-quotation">
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
          {selectedQuotation && (
            <Button 
              variant="outline" 
              onClick={handleGeneratePDF}
              data-testid="button-generate-pdf"
            >
              <Download className="mr-2 h-4 w-4" />
              Generate PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Quotations List */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : quotations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No quotations found
                  </p>
                ) : (
                  quotations.map((quotation) => {
                    const customer = customers.find(c => c.id === quotation.customerId);
                    return (
                      <div
                        key={quotation.id}
                        className={`p-3 border rounded cursor-pointer hover:bg-muted/50 ${
                          selectedQuotation?.id === quotation.id ? 'bg-muted border-primary' : ''
                        }`}
                        onClick={() => handleSelectQuotation(quotation)}
                        data-testid={`quotation-item-${quotation.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{quotation.quotationNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer?.name || 'Unknown Customer'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              €{quotation.totalAmount?.toString() || '0.00'}
                            </p>
                          </div>
                          <Badge variant={quotation.status === 'draft' ? 'secondary' : 'default'}>
                            {quotation.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quotation Details */}
        <div className="col-span-8">
          {(selectedQuotation || isEditMode) ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {isEditMode ? (selectedQuotation ? 'Edit Quotation' : 'New Quotation') : 'Quotation Details'}
                  </CardTitle>
                  <div className="flex gap-2">
                    {!isEditMode && (
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditMode(true)}
                        data-testid="button-edit-quotation"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    {isEditMode && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditMode(false)}
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={quotationForm.handleSubmit(handleSaveQuotation)}
                          data-testid="button-save-quotation"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
                    <TabsTrigger value="conditions" data-testid="tab-conditions">Conditions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-6">
                    {/* General Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quotationNumber">Quotation Number</Label>
                        <Input
                          id="quotationNumber"
                          {...quotationForm.register("quotationNumber")}
                          readOnly={!isEditMode}
                          data-testid="input-quotation-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="revisionNumber">Revision Number</Label>
                        <Input
                          id="revisionNumber"
                          {...quotationForm.register("revisionNumber")}
                          readOnly={!isEditMode}
                          data-testid="input-revision-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerId">Customer</Label>
                        <Select 
                          value={quotationForm.watch("customerId")} 
                          onValueChange={(value) => quotationForm.setValue("customerId", value)}
                          disabled={!isEditMode}
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
                          readOnly={!isEditMode}
                          data-testid="input-quotation-date"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          {...quotationForm.register("description")}
                          readOnly={!isEditMode}
                          data-testid="input-description"
                        />
                      </div>
                    </div>

                    {/* Quotation Items Table */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Quotation Lines</h3>
                        {isEditMode && (
                          <Button onClick={handleAddItem} data-testid="button-add-item">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        )}
                      </div>
                      
                      <DataTableLayout
                        data={quotationItems}
                        isLoading={isLoadingItems}
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
                        onRowDoubleClick={handleEditItem}
                        getRowId={(item: QuotationItem) => item.id}
                        entityName="Quotation Item"
                        entityNamePlural="Quotation Items"
                        applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
                        applySorting={itemTableState.applySorting}
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
                          readOnly={!isEditMode}
                          placeholder="e.g., EXW, FOB, CIF"
                          data-testid="input-inco-terms"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentConditions">Payment Conditions</Label>
                        <Textarea
                          id="paymentConditions"
                          {...quotationForm.register("paymentConditions")}
                          readOnly={!isEditMode}
                          placeholder="e.g., 30 days net, Payment upon delivery"
                          data-testid="input-payment-conditions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryConditions">Delivery Conditions</Label>
                        <Textarea
                          id="deliveryConditions"
                          {...quotationForm.register("deliveryConditions")}
                          readOnly={!isEditMode}
                          placeholder="e.g., 2-3 weeks delivery time"
                          data-testid="input-delivery-conditions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          {...quotationForm.register("notes")}
                          readOnly={!isEditMode}
                          placeholder="Additional notes..."
                          data-testid="input-notes"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Quotation Selected</h3>
                  <p className="text-muted-foreground">
                    Select a quotation from the list or create a new one to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}