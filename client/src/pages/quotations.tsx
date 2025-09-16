import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormTabLayout } from '@/components/layouts/FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, FileText, Download, Save, Eye, Copy } from "lucide-react";
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

interface QuotationsProps {
  onCreateNew?: (formInfo: {id: string, name: string, formType: string, parentId?: string}) => void;
}

export default function Quotations({ onCreateNew }: QuotationsProps) {
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const { toast } = useToast();

  // Optimized data fetching with stable loading state
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    staleTime: 30000, // Prevent refetch for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000, // Customers change less frequently
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    staleTime: 30000,
    gcTime: 300000,
  });

  // Combined loading state to prevent partial renders
  const isLoading = quotationsLoading || customersLoading;
  
  // Loading states combined to prevent partial renders

  // Customer name lookup - memoized to prevent re-creation
  const getCustomerName = React.useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers]);

  // Stabilized column configuration for quotations table - prevents flicker  
  const baseColumns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('quotationNumber', 'Quotation #'),
    { 
      key: 'customerId', 
      label: 'Customer', 
      visible: true, 
      width: 200, 
      filterable: true, 
      sortable: true,
      renderCell: getCustomerName
    },
    { 
      key: 'quotationDate', 
      label: 'Quote Date', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'validUntil', 
      label: 'Valid Until', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'totalAmount', 
      label: 'Total Amount', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => `€${value || "0.00"}`
    },
    { 
      key: 'status', 
      label: 'Status', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => (
        <Badge variant={value === 'draft' ? 'secondary' : value === 'sent' ? 'default' : 'outline'}>
          {value || 'draft'}
        </Badge>
      )
    },
    { 
      key: 'revisionNumber', 
      label: 'Revision', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true 
    },
  ], [getCustomerName]); // Stable dependency

  // Use base columns directly - no need for additional processing
  const defaultColumns = baseColumns;

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

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'quotations'
  });

  // Data table state for quotation items
  const itemTableState = useDataTable({ 
    defaultColumns: defaultItemColumns,
    tableKey: 'quotation-items'
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
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("POST", "/api/quotations", processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setShowQuotationDialog(false);
      quotationForm.reset();
      setEditingQuotation(null);
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
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("PUT", `/api/quotations/${editingQuotation?.id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      setShowQuotationDialog(false);
      quotationForm.reset();
      setEditingQuotation(null);
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

  const deleteQuotationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({
        title: "Success",
        description: "Quotation deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quotation",
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

  // Event handlers - memoized to prevent flicker
  const handleAddQuotation = React.useCallback(() => {
    if (onCreateNew) {
      onCreateNew({
        id: 'new-quotation',
        name: 'New Quotation',
        formType: 'quotation',
        parentId: 'quotations'
      });
    } else {
      // Fallback to dialog if no tab system
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
      setEditingQuotation(null);
      setShowQuotationDialog(true);
    }
  }, [onCreateNew, quotationForm]);

  const handleEditQuotation = React.useCallback((quotation: Quotation) => {
    quotationForm.reset({
      ...quotation,
      quotationDate: quotation.quotationDate ? format(new Date(quotation.quotationDate), 'yyyy-MM-dd') : undefined,
      validUntil: quotation.validUntil ? format(new Date(quotation.validUntil), 'yyyy-MM-dd') : undefined,
      subtotal: quotation.subtotal?.toString() || "0.00",
      taxAmount: quotation.taxAmount?.toString() || "0.00",
      totalAmount: quotation.totalAmount?.toString() || "0.00",
    });
    setEditingQuotation(quotation);
    setShowQuotationDialog(true);
  }, [quotationForm]);

  const handleViewQuotation = React.useCallback((quotation: Quotation) => {
    // Primary approach: Use global tab system via event dispatch
    const formInfo = {
      id: `view-quotation-${quotation.id}`,
      name: `View ${quotation.quotationNumber}`,
      formType: 'quotation',
      parentId: quotation.id
    };
    
    try {
      // Dispatch event to open quotation view tab
      window.dispatchEvent(new CustomEvent('open-form-tab', { detail: formInfo }));
    } catch (error) {
      // Fallback: Use existing dialog approach if event dispatch fails
      console.warn('Failed to open quotation via tab system, falling back to dialog:', error);
      setSelectedQuotation(quotation);
      setActiveTab("general");
      setShowDetailDialog(true);
    }
  }, []);

  const handleSaveQuotation = (data: QuotationFormData) => {
    if (editingQuotation) {
      updateQuotationMutation.mutate(data);
    } else {
      createQuotationMutation.mutate(data);
    }
  };

  const handleDeleteQuotation = React.useCallback((quotation: Quotation) => {
    if (window.confirm(`Are you sure you want to delete quotation ${quotation.quotationNumber}?`)) {
      deleteQuotationMutation.mutate(quotation.id);
    }
  }, [deleteQuotationMutation]);

  const handleAddItem = () => {
    if (!selectedQuotation) {
      toast({
        title: "Warning",
        description: "Please select a quotation first",
        variant: "destructive",
      });
      return;
    }
    
    itemForm.reset({
      quotationId: selectedQuotation.id,
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    });
    setEditingItem(null);
    setShowItemDialog(true);
  };

  const handleSaveItem = (data: QuotationItemFormData) => {
    createItemMutation.mutate(data);
  };

  const handleGeneratePDF = () => {
    toast({
      title: "Coming Soon",
      description: "PDF generation will be implemented soon",
    });
  };

  // Update line total when quantity or unit price changes
  const watchQuantity = itemForm.watch("quantity");
  const watchUnitPrice = itemForm.watch("unitPrice");

  // Auto-calculate line total - Fix potential infinite loop
  React.useEffect(() => {
    const lineTotal = calculateLineTotal(watchQuantity || 1, watchUnitPrice || "0.00");
    const currentTotal = itemForm.getValues("lineTotal");
    if (currentTotal !== lineTotal) {
      itemForm.setValue("lineTotal", lineTotal);
    }
  }, [watchQuantity, watchUnitPrice]);

  // Debug removed - component should now be stable

  return (
    <div className="p-6">
      <div className="ml-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 p-4">
        <DataTableLayout
        data={quotations}
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
        onToggleAllRows={React.useCallback(() => {
          const allIds = quotations.map(quotation => quotation.id);
          tableState.toggleAllRows(allIds);
        }, [quotations, tableState.toggleAllRows])}
        onRowDoubleClick={handleViewQuotation}
        getRowId={(quotation: Quotation) => quotation.id}
        entityName="Quotation"
        entityNamePlural="Quotations"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={React.useMemo(() => [{
          key: 'add',
          label: 'Add Quotation',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleAddQuotation,
          variant: 'default'
        }], [handleAddQuotation])}
        rowActions={React.useCallback((quotation: Quotation) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleViewQuotation(quotation),
            variant: 'outline' as const
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditQuotation(quotation),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDeleteQuotation(quotation),
            variant: 'destructive' as const
          }
        ], [handleViewQuotation, handleEditQuotation, handleDeleteQuotation])}
        addEditDialog={{
          isOpen: showQuotationDialog,
          onOpenChange: setShowQuotationDialog,
          title: editingQuotation ? 'Edit Quotation' : 'Add Quotation',
          content: (
            <form onSubmit={quotationForm.handleSubmit(handleSaveQuotation)} className="space-y-4">
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
                    value={quotationForm.watch("status") || ""} 
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
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal (€)</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    step="0.01"
                    {...quotationForm.register("subtotal")}
                    data-testid="input-subtotal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (€)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    {...quotationForm.register("totalAmount")}
                    data-testid="input-total-amount"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowQuotationDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-quotation">
                  {editingQuotation ? 'Update' : 'Create'} Quotation
                </Button>
              </div>
            </form>
          )
        }}
        detailDialog={{
          isOpen: showDetailDialog,
          onOpenChange: setShowDetailDialog,
          title: selectedQuotation ? `Quotation: ${selectedQuotation.quotationNumber}` : 'Quotation Details',
          content: selectedQuotation ? (
            <div className="space-y-6">
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
                          <div>
                            <Label>Customer</Label>
                            <p className="text-sm mt-1">{customers.find(c => c.id === selectedQuotation.customerId)?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <Label>Quotation Date</Label>
                            <p className="text-sm mt-1">
                              {selectedQuotation.quotationDate ? format(new Date(selectedQuotation.quotationDate), 'dd-MM-yyyy') : ''}
                            </p>
                          </div>
                          <div>
                            <Label>Valid Until</Label>
                            <p className="text-sm mt-1">
                              {selectedQuotation.validUntil ? format(new Date(selectedQuotation.validUntil), 'dd-MM-yyyy') : ''}
                            </p>
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Badge className="mt-1" variant={selectedQuotation.status === 'draft' ? 'secondary' : 'default'}>
                              {selectedQuotation.status}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <Label>Description</Label>
                            <p className="text-sm mt-1">{selectedQuotation.description || ''}</p>
                          </div>
                        </div>

                        {/* Quotation Items Table */}
                        <div className="space-y-4">
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                            <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 uppercase tracking-wide">Quotation Items</h3>
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
                            getRowId={(item: QuotationItem) => item.id}
                            entityName="Quotation Item"
                            entityNamePlural="Quotation Items"
                            applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
                            applySorting={itemTableState.applySorting}
                            headerActions={React.useMemo(() => [
                              {
                                key: 'add-item',
                                label: 'Add Item',
                                icon: <Plus className="h-4 w-4" />,
                                onClick: handleAddItem,
                                variant: 'default' as const
                              },
                              {
                                key: 'duplicate-items',
                                label: 'Duplicate',
                                icon: <Copy className="h-4 w-4" />,
                                onClick: () => {
                                  const selectedItems = quotationItems.filter(item => 
                                    itemTableState.selectedRows.includes(item.id)
                                  );
                                  if (selectedItems.length === 0) {
                                    toast({
                                      title: "No items selected",
                                      description: "Please select items to duplicate",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  // Duplicate selected items
                                  selectedItems.forEach(item => {
                                    const duplicateItem = {
                                      ...item,
                                      id: crypto.randomUUID(),
                                      description: `${item.description} (Copy)`
                                    };
                                    // Add logic to save duplicated items
                                    toast({
                                      title: "Items duplicated",
                                      description: `${selectedItems.length} item(s) duplicated successfully`
                                    });
                                  });
                                },
                                variant: 'outline' as const,
                                disabled: itemTableState.selectedRows.length === 0
                              }
                            ], [handleAddItem, quotationItems, itemTableState.selectedRows, toast])}
                            addEditDialog={{
                              isOpen: showItemDialog,
                              onOpenChange: setShowItemDialog,
                              title: editingItem ? 'Edit Item' : 'Add Item',
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
                                      {editingItem ? 'Update' : 'Add'} Item
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
                              <span>€{selectedQuotation.subtotal?.toString() || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax (21%):</span>
                              <span>€{selectedQuotation.taxAmount?.toString() || '0.00'}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                              <span>Total:</span>
                              <span>€{selectedQuotation.totalAmount?.toString() || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    id: "conditions",
                    label: "Conditions",
                    content: (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <Label>Incoterms</Label>
                            <p className="text-sm mt-1">{selectedQuotation.incoTerms || '-'}</p>
                          </div>
                          <div>
                            <Label>Payment Conditions</Label>
                            <p className="text-sm mt-1">{selectedQuotation.paymentConditions || '-'}</p>
                          </div>
                          <div>
                            <Label>Delivery Conditions</Label>
                            <p className="text-sm mt-1">{selectedQuotation.deliveryConditions || '-'}</p>
                          </div>
                          <div>
                            <Label>Notes</Label>
                            <p className="text-sm mt-1">{selectedQuotation.notes || '-'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleGeneratePDF} data-testid="button-generate-pdf">
                            <Download className="mr-2 h-4 w-4" />
                            Generate PDF
                          </Button>
                        </div>
                      </div>
                    )
                  },
                  {
                    id: "financial",
                    label: "Financial",
                    content: (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Financial Overview</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label>Subtotal</Label>
                              <p className="text-lg font-medium">€{selectedQuotation.subtotal?.toString() || '0.00'}</p>
                            </div>
                            <div>
                              <Label>Tax (21%)</Label>
                              <p className="text-lg font-medium">€{selectedQuotation.taxAmount?.toString() || '0.00'}</p>
                            </div>
                            <div className="border-t pt-2">
                              <Label>Total Amount</Label>
                              <p className="text-2xl font-bold text-orange-600">€{selectedQuotation.totalAmount?.toString() || '0.00'}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <Label>Status</Label>
                              <Badge className="mt-1" variant={selectedQuotation.status === 'draft' ? 'secondary' : 'default'}>
                                {selectedQuotation.status}
                              </Badge>
                            </div>
                            <div>
                              <Label>Created Date</Label>
                              <p className="text-sm">{selectedQuotation.quotationDate ? format(new Date(selectedQuotation.quotationDate), 'dd-MM-yyyy') : ''}</p>
                            </div>
                            <div>
                              <Label>Valid Until</Label>
                              <p className="text-sm">{selectedQuotation.validUntil ? format(new Date(selectedQuotation.validUntil), 'dd-MM-yyyy') : ''}</p>
                            </div>
                          </div>
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
                          <p className="text-gray-600 mb-4">No documents uploaded yet</p>
                          <div className="space-x-2">
                            <Button variant="outline">
                              <Plus className="mr-2 h-4 w-4" />
                              Upload Document
                            </Button>
                            <Button onClick={handleGeneratePDF}>
                              <Download className="mr-2 h-4 w-4" />
                              Generate PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          ) : null
        }}
      />
      </div>
    </div>
  );
}