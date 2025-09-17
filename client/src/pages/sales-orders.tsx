import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSalesOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Eye, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { LayoutForm2, createFieldRow, createSectionHeaderRow } from '@/components/layouts/LayoutForm2';
import type { SalesOrder, InsertSalesOrder, Customer } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Form schema
const salesOrderFormSchema = insertSalesOrderSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type SalesOrderFormData = z.infer<typeof salesOrderFormSchema>;

interface SalesOrdersProps {
  onCreateNew?: (formInfo: {id: string, name: string, formType: string, parentId?: string}) => void;
}

const defaultColumns: ColumnConfig[] = [
  createIdColumn('orderNumber', 'Order Number'),
  { 
    key: 'customerName', 
    label: 'Customer', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder & { customerName?: string }) => (
      <span data-testid={`text-customer-${row.id}`}>{value || "Unknown Customer"}</span>
    )
  },
  { 
    key: 'status', 
    label: 'Status', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => {
      const getStatusVariant = (status: string) => {
        switch (status) {
          case "completed": return "default";
          case "shipped": return "secondary";
          case "pending": return "outline";
          case "cancelled": return "destructive";
          default: return "outline";
        }
      };
      return (
        <Badge variant={getStatusVariant(value || "")} data-testid={`badge-status-${row.id}`}>
          {value}
        </Badge>
      );
    }
  },
  { 
    key: 'orderDate', 
    label: 'Order Date', 
    visible: true, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-order-date-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'expectedDeliveryDate', 
    label: 'Expected Delivery', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-expected-delivery-${row.id}`}>
        {value ? format(new Date(value), "MMM dd, yyyy") : "-"}
      </span>
    )
  },
  { 
    key: 'totalAmount', 
    label: 'Total Amount', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: string, row: SalesOrder) => (
      <span data-testid={`text-total-amount-${row.id}`}>
        €{parseFloat(value).toFixed(2)}
      </span>
    )
  },
];

export default function SalesOrders({ onCreateNew }: SalesOrdersProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSalesOrder, setEditingSalesOrder] = useState<SalesOrder | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<SalesOrder | null>(null);
  const [activeSection, setActiveSection] = useState('general');
  const { toast } = useToast();

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    defaultSort: { column: 'orderDate', direction: 'desc' },
    tableKey: 'sales-orders'
  });

  // Data fetching
  const { data: salesOrders = [], isLoading: salesOrdersLoading } = useQuery<SalesOrder[]>({
    queryKey: ["/api/sales-orders"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const isLoading = salesOrdersLoading || customersLoading;

  // Enhance sales orders with customer names for display
  const enhancedSalesOrders = salesOrders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    return {
      ...order,
      customerName: customer?.name || "Unknown Customer"
    };
  });

  // Form
  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderFormSchema),
    defaultValues: {
      orderNumber: "",
      customerId: "",
      status: "pending",
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDeliveryDate: "",
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      notes: "",
    },
  });

  // Mutations
  const createSalesOrderMutation = useMutation({
    mutationFn: async (data: SalesOrderFormData) => {
      const processedData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("POST", "/api/sales-orders", processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setShowDialog(false);
      form.reset();
      setEditingSalesOrder(null);
      toast({
        title: "Success",
        description: "Sales order created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive",
      });
    },
  });

  const updateSalesOrderMutation = useMutation({
    mutationFn: async (data: SalesOrderFormData) => {
      const processedData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        subtotal: parseFloat(data.subtotal),
        taxAmount: parseFloat(data.taxAmount || "0"),
        totalAmount: parseFloat(data.totalAmount),
      };
      const response = await apiRequest("PUT", `/api/sales-orders/${editingSalesOrder?.id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      setShowDialog(false);
      form.reset();
      setEditingSalesOrder(null);
      toast({
        title: "Success",
        description: "Sales order updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sales order",
        variant: "destructive",
      });
    },
  });

  const deleteSalesOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-orders"] });
      toast({
        title: "Success",
        description: "Sales order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sales order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SalesOrderFormData) => {
    if (editingSalesOrder) {
      updateSalesOrderMutation.mutate(data);
    } else {
      createSalesOrderMutation.mutate(data);
    }
  };

  const handleEdit = (salesOrder: SalesOrder) => {
    setEditingSalesOrder(salesOrder);
    form.reset({
      orderNumber: salesOrder.orderNumber,
      customerId: salesOrder.customerId,
      status: salesOrder.status || "pending",
      orderDate: salesOrder.orderDate ? format(new Date(salesOrder.orderDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      expectedDeliveryDate: salesOrder.expectedDeliveryDate ? format(new Date(salesOrder.expectedDeliveryDate), "yyyy-MM-dd") : "",
      subtotal: salesOrder.subtotal.toString(),
      taxAmount: salesOrder.taxAmount?.toString() || "0",
      totalAmount: salesOrder.totalAmount.toString(),
      notes: salesOrder.notes || "",
    });
    setShowDialog(true);
  };

  const handleView = (salesOrder: SalesOrder) => {
    setSelectedSalesOrder(salesOrder);
    setShowDetailDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this sales order?")) {
      deleteSalesOrderMutation.mutate(id);
    }
  };

  const handleNewSalesOrder = () => {
    setEditingSalesOrder(null);
    form.reset({
      orderNumber: "",
      customerId: "",
      status: "pending",
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDeliveryDate: "",
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleRowDoubleClick = (salesOrder: SalesOrder) => {
    handleView(salesOrder);
  };

  // Apply search and filters using the table state
  const filteredAndSortedSalesOrders = tableState.applySorting(
    tableState.applyFiltersAndSearch(enhancedSalesOrders)
  );

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Sales Order"
        entityNamePlural="Sales Orders"
        data={filteredAndSortedSalesOrders}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        isLoading={isLoading}
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
          const allIds = salesOrders.map(so => so.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: SalesOrder & { customerName?: string }) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-sales-order',
            label: 'Add Sales Order',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewSalesOrder,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: SalesOrder & { customerName?: string }) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleView(row),
            variant: 'outline' as const
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(row),
            variant: 'outline' as const
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDelete(row.id),
            variant: 'outline' as const,
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSalesOrder ? "Edit Sales Order" : "Add New Sales Order"}
            </DialogTitle>
            <DialogDescription>
              {editingSalesOrder ? "Update the sales order information below." : "Fill in the details to create a new sales order."}
            </DialogDescription>
          </DialogHeader>
          
          <LayoutForm2
            sections={[
              {
                id: 'general',
                label: 'Sales Order Details',
                rows: [
                  createSectionHeaderRow<SalesOrderFormData>('Basic Information'),
                  createFieldRow<SalesOrderFormData>({
                    key: 'orderNumber',
                    label: 'Order Number',
                    type: 'text',
                    placeholder: 'Auto-generated',
                    disabled: true,
                    register: form.register('orderNumber'),
                    testId: 'input-order-number'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'customerId',
                    label: 'Customer',
                    type: 'select',
                    options: customers?.map(customer => ({
                      value: customer.id,
                      label: customer.name
                    })) || [],
                    setValue: (value) => form.setValue('customerId', value),
                    watch: () => form.watch('customerId'),
                    validation: { 
                      isRequired: true,
                      error: form.formState.errors.customerId?.message 
                    },
                    testId: 'select-customer'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'status',
                    label: 'Status',
                    type: 'select',
                    options: [
                      { value: 'pending', label: 'Pending' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'processing', label: 'Processing' },
                      { value: 'shipped', label: 'Shipped' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ],
                    setValue: (value) => form.setValue('status', value),
                    watch: () => form.watch('status'),
                    testId: 'select-status'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'orderDate',
                    label: 'Order Date',
                    type: 'text',
                    placeholder: 'YYYY-MM-DD',
                    register: form.register('orderDate'),
                    testId: 'input-order-date'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'expectedDeliveryDate',
                    label: 'Expected Delivery Date',
                    type: 'text',
                    placeholder: 'YYYY-MM-DD',
                    register: form.register('expectedDeliveryDate'),
                    testId: 'input-expected-delivery-date'
                  }),

                  createSectionHeaderRow<SalesOrderFormData>('Financial Information'),
                  createFieldRow<SalesOrderFormData>({
                    key: 'subtotal',
                    label: 'Subtotal',
                    type: 'text',
                    placeholder: '0.00',
                    register: form.register('subtotal'),
                    validation: { 
                      isRequired: true,
                      error: form.formState.errors.subtotal?.message 
                    },
                    testId: 'input-subtotal'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'taxAmount',
                    label: 'Tax Amount',
                    type: 'text',
                    placeholder: '0.00',
                    register: form.register('taxAmount'),
                    testId: 'input-tax-amount'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'totalAmount',
                    label: 'Total Amount',
                    type: 'text',
                    placeholder: '0.00',
                    register: form.register('totalAmount'),
                    validation: { 
                      isRequired: true,
                      error: form.formState.errors.totalAmount?.message 
                    },
                    testId: 'input-total-amount'
                  }),
                  createFieldRow<SalesOrderFormData>({
                    key: 'notes',
                    label: 'Notes',
                    type: 'textarea',
                    rows: 3,
                    placeholder: 'Additional notes...',
                    register: form.register('notes'),
                    testId: 'textarea-notes'
                  })
                ]
              }
            ]}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            form={form}
            onSubmit={onSubmit}
            actionButtons={[
              {
                key: 'cancel',
                label: 'Cancel',
                icon: <ArrowLeft size={14} />,
                onClick: () => setShowDialog(false),
                variant: 'outline',
                testId: 'button-cancel'
              },
              {
                key: 'save',
                label: editingSalesOrder ? 'Update Sales Order' : 'Create Sales Order',
                icon: <Save size={14} />,
                onClick: form.handleSubmit(onSubmit),
                variant: 'default',
                testId: 'button-save'
              }
            ]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
