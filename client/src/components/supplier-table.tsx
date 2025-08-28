import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Filter, ChevronDown, Plus, Search, Settings, Eye, EyeOff, GripVertical, Trash2, Copy, Download, Mail, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type InsertSupplier, type Supplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Drag and drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formSchema = insertSupplierSchema.extend({
  paymentTerms: z.string().min(1, "Payment terms is required"),
});

type FormData = z.infer<typeof formSchema>;

// Draggable column header component
interface DraggableColumnHeaderProps {
  column: ColumnConfig;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function DraggableColumnHeader({ column, children, className, style }: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...style,
  };

  return (
    <TableHead 
      ref={setNodeRef} 
      className={className}
      style={dragStyle}
    >
      <div className="flex items-center justify-between h-full">
        {children}
        <div 
          className="cursor-grab hover:cursor-grabbing opacity-30 hover:opacity-60 ml-1 flex-shrink-0"
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={12} />
        </div>
      </div>
    </TableHead>
  );
}

// Column configuration
interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: string;
  sortable: boolean;
  filterable: boolean;
}

interface FilterConfig {
  column: string;
  value: string;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// Format date helper
const formatDate = (dateStr: string | Date) => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function SupplierTable() {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'supplierNumber', label: 'Supplier #', visible: true, width: '120px', sortable: true, filterable: true },
    { key: 'name', label: 'Name', visible: true, width: '200px', sortable: true, filterable: true },
    { key: 'contactPerson', label: 'Contact Person', visible: true, width: '150px', sortable: true, filterable: true },
    { key: 'email', label: 'Email', visible: true, width: '180px', sortable: true, filterable: true },
    { key: 'phone', label: 'Phone', visible: true, width: '120px', sortable: true, filterable: true },
    { key: 'address', label: 'Address', visible: false, width: '200px', sortable: false, filterable: true },
    { key: 'taxId', label: 'Tax ID', visible: false, width: '120px', sortable: true, filterable: true },
    { key: 'paymentTerms', label: 'Payment Terms', visible: true, width: '120px', sortable: true, filterable: false },
    { key: 'status', label: 'Status', visible: true, width: '100px', sortable: true, filterable: true },
    { key: 'createdAt', label: 'Created', visible: false, width: '120px', sortable: true, filterable: false },
  ]);
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [selectedSupplierForReport, setSelectedSupplierForReport] = useState<Supplier | null>(null);
  const [showSupplierReport, setShowSupplierReport] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showContactPersonDialog, setShowContactPersonDialog] = useState(false);
  const [showPaymentTermsDialog, setShowPaymentTermsDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredAndSortedSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    
    let result = [...suppliers];

    // Apply filters
    filters.forEach(filter => {
      if (filter.value) {
        result = result.filter(supplier => {
          const value = supplier[filter.column as keyof Supplier];
          return String(value || '').toLowerCase().includes(filter.value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.column as keyof Supplier];
        const bValue = b[sortConfig.column as keyof Supplier];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [suppliers, filters, sortConfig]);

  // Column order state - get visible columns in their current order
  const currentVisibleColumns = columns.filter(col => col.visible);
  const columnOrder = currentVisibleColumns.map(col => col.key);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      
      // Create new column order
      const newColumnOrder = arrayMove(columnOrder, oldIndex, newIndex);
      
      // Reorder the columns array to match the new order
      const reorderedColumns = columns.map(col => {
        if (!col.visible) return col; // Keep non-visible columns as is
        
        const newPosition = newColumnOrder.indexOf(col.key);
        return { ...col };
      });

      // Sort the visible columns by their new order
      const visibleCols = reorderedColumns.filter(col => col.visible);
      const nonVisibleCols = reorderedColumns.filter(col => !col.visible);
      
      const sortedVisibleCols = newColumnOrder.map(key => 
        visibleCols.find(col => col.key === key)!
      );

      setColumns([...sortedVisibleCols, ...nonVisibleCols]);
    }
  };

  // Form setup for Add Supplier dialog
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      taxId: "",
      paymentTerms: "30",
      status: "active",
    }
  });

  // Mutation for creating new supplier
  const createSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const supplierData: InsertSupplier = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        contactPerson: data.contactPerson || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
      };
      
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplierData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create supplier");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowAddSupplierDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add supplier. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to add supplier:", error);
    }
  });

  // Mutation for deleting suppliers
  const deleteSuppliersMutation = useMutation({
    mutationFn: async (supplierIds: string[]) => {
      for (const supplierId of supplierIds) {
        const response = await fetch(`/api/suppliers/${supplierId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete supplier ${supplierId}`);
        }
      }
    },
    onSuccess: (_, supplierIds) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSelectedRows([]);
      setShowDeleteConfirmDialog(false);
      toast({
        title: "Success",
        description: `${supplierIds.length} ${supplierIds.length === 1 ? 'supplier' : 'suppliers'} deleted`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete suppliers. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to delete suppliers:", error);
    }
  });

  // Mutation for updating supplier
  const updateSupplierMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingSupplier) throw new Error("No supplier to update");
      
      const supplierData: Partial<InsertSupplier> = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        contactPerson: data.contactPerson || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
      };

      const response = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplierData),
      });

      if (!response.ok) {
        throw new Error('Failed to update supplier');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowAddSupplierDialog(false);
      setEditingSupplier(null);
      form.reset();
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update supplier. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to update supplier:", error);
    }
  });

  // Update form when editing supplier changes
  React.useEffect(() => {
    if (editingSupplier) {
      form.reset({
        name: editingSupplier.name || "",
        email: editingSupplier.email || "",
        phone: editingSupplier.phone || "",
        address: editingSupplier.address || "",
        contactPerson: editingSupplier.contactPerson || "",
        taxId: editingSupplier.taxId || "",
        paymentTerms: editingSupplier.paymentTerms?.toString() || "30",
        status: editingSupplier.status || "active",
      });
    } else {
      // Reset form to default values when adding new supplier
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        contactPerson: "",
        taxId: "",
        paymentTerms: "30",
        status: "active",
      });
    }
  }, [editingSupplier, form]);

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowAddSupplierDialog(true);
    setShowSupplierReport(false);
  };

  const handleSupplierDoubleClick = (supplier: Supplier) => {
    handleEditSupplier(supplier);
  };

  const onSubmit = (data: FormData) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate(data);
    } else {
      createSupplierMutation.mutate(data);
    }
  };

  // Row selection functions
  const toggleRowSelection = (supplierId: string) => {
    setSelectedRows(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const toggleAllRows = (allSupplierIds: string[]) => {
    setSelectedRows(prev => 
      prev.length === allSupplierIds.length ? [] : allSupplierIds
    );
  };

  // Filter functions
  const addFilter = (column: string) => {
    if (!filters.find(f => f.column === column)) {
      setFilters([...filters, { column, value: '' }]);
    }
  };

  const updateFilter = (column: string, value: string) => {
    setFilters(filters.map(f => 
      f.column === column ? { ...f, value } : f
    ));
  };

  const removeFilter = (column: string) => {
    setFilters(filters.filter(f => f.column !== column));
  };

  // Sorting functions
  const handleSort = (column: string) => {
    setSortConfig(prevSort => {
      if (prevSort?.column === column) {
        // If clicking the same column, cycle through: asc -> desc -> null
        if (prevSort.direction === 'asc') {
          return { column, direction: 'desc' };
        } else {
          return null; // Remove sorting
        }
      } else {
        // New column, start with ascending
        return { column, direction: 'asc' };
      }
    });
  };

  // Column visibility toggle
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns(columns.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
  };

  // Bulk delete function
  const deleteSelectedRows = () => {
    if (selectedRows.length > 0) {
      setShowDeleteConfirmDialog(true);
    }
  };

  // Column resizing
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    const startX = e.clientX;
    const column = columns.find(col => col.key === columnKey);
    if (!column) return;
    
    const startWidth = parseInt(column.width);
    
    setResizing({
      column: columnKey,
      startX,
      startWidth,
    });

    e.preventDefault();
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.startX;
      const newWidth = Math.max(80, resizing.startWidth + deltaX);
      
      setColumns(columns.map(col => 
        col.key === resizing.column ? { ...col, width: `${newWidth}px` } : col
      ));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, columns]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Search and Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search and Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" size={16} />
              <Input
                placeholder="Search suppliers..."
                className="pl-10 w-64 border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    // Add or update name filter
                    const nameFilter = filters.find(f => f.column === 'name');
                    if (nameFilter) {
                      updateFilter('name', value);
                    } else {
                      setFilters([...filters, { column: 'name', value }]);
                    }
                  } else {
                    // Remove name filter when search is empty
                    removeFilter('name');
                  }
                }}
                data-testid="input-search-suppliers"
              />
            </div>

            {/* Active Filters */}
            {filters.map(filter => (
              <div key={filter.column} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-md p-2">
                <span className="text-xs text-orange-700 font-medium">
                  {columns.find(col => col.key === filter.column)?.label}:
                </span>
                <Input
                  size={10}
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.column, e.target.value)}
                  className="h-6 text-xs border-orange-200 focus:border-orange-400 w-24"
                  data-testid={`filter-${filter.column}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(filter.column)}
                  className="h-6 w-6 p-0 hover:bg-orange-100"
                  data-testid={`remove-filter-${filter.column}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Settings size={14} className="mr-1" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-48" 
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="text-xs font-medium p-2 border-b">Column Visibility</div>
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={column.visible}
                    onCheckedChange={(checked) => {
                      toggleColumnVisibility(column.key);
                    }}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              size="sm" 
              className="h-8 text-xs bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                setEditingSupplier(null);
                setShowAddSupplierDialog(true);
              }}
            >
              <Plus size={14} className="mr-1" />
              Add Supplier
            </Button>
            
            <Button 
              size="sm" 
              variant="destructive" 
              className={`h-8 text-xs w-28 ${selectedRows.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={selectedRows.length === 0}
              onClick={deleteSelectedRows}
            >
              <Trash2 size={14} className="mr-1" />
              <span className="min-w-[4rem] text-left">
                Delete{selectedRows.length > 0 ? ` ${selectedRows.length}` : ''}
              </span>
            </Button>
            
            {/* Duplicate button - always visible, disabled when not exactly 1 row selected */}
            <Button 
              size="sm" 
              variant="outline"
              className={`h-8 text-xs ${selectedRows.length !== 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={selectedRows.length !== 1}
              onClick={() => {
                // TODO: Implement duplicate functionality
                console.log('Duplicate supplier:', selectedRows[0]);
              }}
            >
              <Copy size={14} className="mr-1" />
              Duplicate
            </Button>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg border border-orange-200 shadow-lg shadow-orange-100">
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-bold tracking-tight drop-shadow-sm">
              Suppliers Management ({filteredAndSortedSuppliers.length})
            </h2>
          </div>
          
          <div className="overflow-auto max-h-[600px] border border-orange-100 rounded-b-lg">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table className="relative">
                <TableHeader className="sticky top-0 bg-orange-50 border-b-2 border-orange-200 shadow-sm z-10">
                  <TableRow className="hover:bg-orange-50">
                    <TableHead className="w-8 p-2">
                      <div className="flex items-center justify-center h-4 w-4">
                        <Checkbox
                          checked={selectedRows.length === filteredAndSortedSuppliers.length && filteredAndSortedSuppliers.length > 0}
                          onCheckedChange={() => toggleAllRows(filteredAndSortedSuppliers.map(supplier => supplier.id))}
                          className="h-4 w-4 border-2 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 flex-shrink-0"
                          style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
                        />
                      </div>
                    </TableHead>
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {currentVisibleColumns.map((column) => (
                        <DraggableColumnHeader
                          key={column.key}
                          column={column}
                          className="font-bold text-xs p-2 relative uppercase text-orange-800 dark:text-orange-200"
                          style={{ width: column.width }}
                        >
                          <div className="flex items-center gap-2 pr-2">
                            <div 
                              className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-800/30 rounded px-1 py-1"
                              onClick={() => column.sortable && handleSort(column.key)}
                            >
                              <span className="truncate">{column.label}</span>
                              {column.sortable && (
                                <div className="flex items-center">
                                  {sortConfig?.column === column.key ? (
                                    sortConfig.direction === 'asc' ? (
                                      <ChevronUp size={14} className="text-orange-600" />
                                    ) : (
                                      <ChevronDown size={14} className="text-orange-600" />
                                    )
                                  ) : (
                                    <ChevronsUpDown size={14} className="opacity-30" />
                                  )}
                                </div>
                              )}
                            </div>
                            {column.filterable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => addFilter(column.key)}
                                className="h-6 w-6 p-1 opacity-50 hover:opacity-100 flex-shrink-0 hover:bg-orange-100 dark:hover:bg-orange-800/30"
                              >
                                <Filter size={12} />
                              </Button>
                            )}
                          </div>
                          {/* Resize Handle */}
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40"
                            onMouseDown={(e) => handleMouseDown(e, column.key)}
                          />
                        </DraggableColumnHeader>
                      ))}
                    </SortableContext>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={currentVisibleColumns.length + 1} className="text-center py-4 text-xs text-muted-foreground">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedSuppliers.map((supplier) => (
                      <TableRow 
                        key={supplier.id} 
                        className={`hover:bg-muted/30 text-xs cursor-pointer ${
                          selectedRows.includes(supplier.id) ? 'bg-muted/50' : 'bg-transparent'
                        }`}
                        style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}
                        onDoubleClick={() => handleSupplierDoubleClick(supplier)}
                      >
                        <TableCell className="p-2" style={{ height: '32px', lineHeight: '1.2' }}>
                          <div className="flex items-center justify-center h-4 w-4">
                            <Checkbox
                              checked={selectedRows.includes(supplier.id)}
                              onCheckedChange={() => toggleRowSelection(supplier.id)}
                              className="h-4 w-4 border-2 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 flex-shrink-0"
                              style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
                            />
                          </div>
                        </TableCell>
                        {currentVisibleColumns.map((column) => (
                        <TableCell 
                          key={column.key} 
                          className="p-2 text-xs truncate"
                          style={{ width: column.width, height: '32px', lineHeight: '1.2' }}
                        >
                          {column.key === 'supplierNumber' ? (
                            <span className="font-mono text-xs">{supplier.supplierNumber || supplier.id.slice(0, 8)}</span>
                          ) : column.key === 'name' ? (
                            <span className="font-medium">{supplier.name}</span>
                          ) : column.key === 'contactPerson' ? (
                            supplier.contactPerson || '-'
                          ) : column.key === 'email' ? (
                            supplier.email || '-'
                          ) : column.key === 'phone' ? (
                            supplier.phone || '-'
                          ) : column.key === 'address' ? (
                            supplier.address || '-'
                          ) : column.key === 'taxId' ? (
                            supplier.taxId || '-'
                          ) : column.key === 'paymentTerms' ? (
                            `${supplier.paymentTerms}d`
                          ) : column.key === 'status' ? (
                            <span className={`inline-flex px-1 py-0.5 rounded text-xs font-medium ${
                              supplier.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {supplier.status}
                            </span>
                          ) : column.key === 'createdAt' ? (
                            supplier.createdAt ? formatDate(supplier.createdAt) : '-'
                          ) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex justify-center">
            <DialogTitle className="text-2xl font-bold text-orange-600">
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </div>
          <div className="w-full h-px bg-gray-300 mt-4"></div>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Company Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="name" className="w-32 text-right">Company Name *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter supplier company name"
                  data-testid="input-supplier-name"
                  className="flex-1"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1 ml-36">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="taxId" className="w-32 text-right">Tax ID</Label>
                <Input
                  id="taxId"
                  {...form.register("taxId")}
                  placeholder="Tax identification number"
                  data-testid="input-supplier-tax-id"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="contactPerson" className="w-32 text-right">Contact Person</Label>
                <div className="flex gap-2 flex-1">
                  <Input
                    id="contactPerson"
                    {...form.register("contactPerson")}
                    placeholder="Primary contact person name"
                    data-testid="input-contact-person"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowContactPersonDialog(true)}
                    data-testid="button-add-contact-person"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="email" className="w-32 text-right">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="supplier@example.com"
                  data-testid="input-supplier-email"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="phone" className="w-32 text-right">Phone Number</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+31 20 123 4567"
                  data-testid="input-supplier-phone"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="address" className="w-32 text-right">Address</Label>
                <Textarea
                  id="address"
                  {...form.register("address")}
                  placeholder="Enter complete supplier address"
                  data-testid="textarea-supplier-address"
                  className="flex-1"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Business Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="paymentTerms" className="w-32 text-right">Payment Terms *</Label>
                <div className="flex gap-2 flex-1">
                  <Select onValueChange={(value) => form.setValue("paymentTerms", value)}>
                    <SelectTrigger data-testid="select-payment-terms" className="flex-1">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediate payment</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowPaymentTermsDialog(true)}
                    data-testid="button-add-payment-terms"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                {form.formState.errors.paymentTerms && (
                  <p className="text-sm text-destructive mt-1 ml-36">
                    {form.formState.errors.paymentTerms.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="status" className="w-32 text-right">Status</Label>
                <div className="flex gap-2 flex-1">
                  <Select onValueChange={(value) => form.setValue("status", value)}>
                    <SelectTrigger data-testid="select-supplier-status" className="flex-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setShowStatusDialog(true)}
                    data-testid="button-add-status"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddSupplierDialog(false)}
              data-testid="button-cancel-supplier"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={createSupplierMutation.isPending}
              data-testid="button-save-supplier"
            >
              {editingSupplier 
                ? (updateSupplierMutation.isPending ? "Updating..." : "Update Supplier")
                : (createSupplierMutation.isPending ? "Adding..." : "Add Supplier")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Supplier{selectedRows.length > 1 ? 's' : ''}</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedRows.length === 1 ? (
              <>
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {filteredAndSortedSuppliers.find(s => s.id === selectedRows[0])?.name || 'this supplier'}
                </span>
                ?<br />
                This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete these {selectedRows.length} suppliers?<br />
                <div className="mt-2 text-sm">
                  {selectedRows.slice(0, 3).map(id => {
                    const supplier = filteredAndSortedSuppliers.find(s => s.id === id);
                    return supplier ? (
                      <div key={id} className="font-semibold">• {supplier.name}</div>
                    ) : null;
                  })}
                  {selectedRows.length > 3 && (
                    <div className="text-muted-foreground">... and {selectedRows.length - 3} more</div>
                  )}
                </div>
                This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              deleteSuppliersMutation.mutate(selectedRows);
            }}
            disabled={deleteSuppliersMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteSuppliersMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Contact Person Dialog */}
    <Dialog open={showContactPersonDialog} onOpenChange={setShowContactPersonDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-orange-600">Add Contact Person</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="contactName">Name</Label>
            <Input id="contactName" placeholder="Enter contact person name" data-testid="input-contact-name" />
          </div>
          <div>
            <Label htmlFor="contactRole">Role</Label>
            <Input id="contactRole" placeholder="Enter role (e.g., Procurement Manager)" data-testid="input-contact-role" />
          </div>
          <div>
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" placeholder="Enter email address" data-testid="input-contact-email" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" placeholder="Enter phone number" data-testid="input-contact-phone" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowContactPersonDialog(false)} data-testid="button-cancel-contact">
            Cancel
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setShowContactPersonDialog(false)}
            data-testid="button-save-contact"
          >
            Add Contact Person
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Payment Terms Dialog */}
    <Dialog open={showPaymentTermsDialog} onOpenChange={setShowPaymentTermsDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-orange-600">Add Payment Terms</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="termDays">Payment Days</Label>
            <Input id="termDays" type="number" placeholder="Enter number of days" data-testid="input-payment-days" />
          </div>
          <div>
            <Label htmlFor="termDescription">Description</Label>
            <Input id="termDescription" placeholder="Enter description (e.g., Net 45 days)" data-testid="input-payment-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPaymentTermsDialog(false)} data-testid="button-cancel-payment">
            Cancel
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setShowPaymentTermsDialog(false)}
            data-testid="button-save-payment"
          >
            Add Payment Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Status Dialog */}
    <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-orange-600">Add Supplier Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="statusName">Status Name</Label>
            <Input id="statusName" placeholder="Enter status name (e.g., Preferred)" data-testid="input-status-name" />
          </div>
          <div>
            <Label htmlFor="statusDescription">Description</Label>
            <Input id="statusDescription" placeholder="Enter status description" data-testid="input-status-description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowStatusDialog(false)} data-testid="button-cancel-status">
            Cancel
          </Button>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => setShowStatusDialog(false)}
            data-testid="button-save-status"
          >
            Add Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}