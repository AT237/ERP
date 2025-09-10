import React, { useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Filter, 
  ChevronDown, 
  Plus, 
  Search, 
  Settings, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Trash2, 
  Copy, 
  Download,
  ChevronUp, 
  ChevronsUpDown 
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

export type FilterType = 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with';

export type ColumnFilter = {
  column: string;
  type: FilterType;
  value: string;
};

export type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  filterable: boolean;
  sortable: boolean;
  renderCell?: (value: any, row: any) => ReactNode;
};

// Helper function for consistent ID column styling
export const createIdColumn = (key: string, label: string, width = 120): ColumnConfig => ({
  key,
  label,
  visible: true,
  width,
  filterable: true,
  sortable: true,
  renderCell: (value: string) => (
    <span className="font-mono text-xs">{value}</span>
  )
});

export type SortConfig = {
  column: string;
  direction: 'asc' | 'desc';
} | null;

export type DataTableAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  disabled?: boolean;
};

export interface DataTableLayoutProps<T = any> {
  // Data and loading state
  data: T[];
  isLoading: boolean;
  
  // Table configuration
  columns: ColumnConfig[];
  setColumns: (columns: ColumnConfig[] | ((prev: ColumnConfig[]) => ColumnConfig[])) => void;
  
  // Search and filtering
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: ColumnFilter[];
  setFilters: (filters: ColumnFilter[]) => void;
  onAddFilter: (columnKey: string) => void;
  onUpdateFilter: (index: number, filter: ColumnFilter) => void;
  onRemoveFilter: (index: number) => void;
  
  // Sorting
  sortConfig: SortConfig;
  onSort: (column: string) => void;
  
  // Row selection
  selectedRows: string[];
  setSelectedRows: (rows: string[]) => void;
  onToggleRowSelection: (id: string) => void;
  onToggleAllRows: () => void;
  
  // Actions
  headerActions?: DataTableAction[];
  rowActions?: (row: T) => DataTableAction[];
  onDuplicate?: (row: T) => void;
  onExport?: () => void;
  
  // Dialogs
  addEditDialog?: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    content: ReactNode;
  };
  
  detailDialog?: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    content: ReactNode;
  };
  
  deleteConfirmDialog?: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    itemCount: number;
  };
  
  // Event handlers
  onRowDoubleClick?: (row: T) => void;
  getRowId: (row: T) => string;
  
  // Customization
  entityName: string; // e.g., "Customer", "Supplier", "Product"
  entityNamePlural: string; // e.g., "Customers", "Suppliers", "Products"
  
  // Filter and search function
  applyFiltersAndSearch: (data: T[], searchTerm: string, filters: ColumnFilter[]) => T[];
  applySorting: (data: T[], sortConfig: SortConfig) => T[];
}

const filterOptions = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
];

// Draggable Column Header Component
function DraggableColumnHeader({ 
  column, 
  children, 
  className,
  style,
  onDoubleClick
}: { 
  column: ColumnConfig;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onDoubleClick?: (e: React.MouseEvent, columnKey: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.key,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...style,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={dragStyle}
      className={`${className} ${isDragging ? 'z-50' : ''} whitespace-nowrap relative border-r border-orange-200/50`}
      data-testid={`column-header-${column.key}`}
      onDoubleClick={(e) => onDoubleClick?.(e, column.key)}
      title="Double-click to auto-resize, drag to reorder"
    >
      <div className="flex items-center h-full">
        {/* Fixed position grip icon - always at left edge */}
        <div
          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-orange-100 dark:hover:bg-orange-800/30 rounded w-6 flex items-center justify-center flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-orange-400" />
        </div>
        
        {/* Content area with consistent left margin */}
        <div className="flex-1 min-w-0 pr-2">
          {children}
        </div>
        
        {/* Visual separator line */}
        <div className="absolute right-0 top-1 bottom-1 w-px bg-orange-300/30"></div>
      </div>
    </TableHead>
  );
}

export function DataTableLayout<T = any>({
  data,
  isLoading,
  columns,
  setColumns,
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  sortConfig,
  onSort,
  selectedRows,
  setSelectedRows,
  onToggleRowSelection,
  onToggleAllRows,
  headerActions = [],
  rowActions,
  addEditDialog,
  detailDialog,
  deleteConfirmDialog,
  onRowDoubleClick,
  getRowId,
  entityName,
  entityNamePlural,
  applyFiltersAndSearch,
  applySorting,
  onDuplicate,
  onExport,
}: DataTableLayoutProps<T>) {
  
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [resizing, setResizing] = useState<{ 
    column: string; 
    startX: number; 
    startWidth: number;
    frozenWidths: { [key: string]: number }; // Freeze other column widths
  } | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Column resizing handlers
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const column = columns.find(col => col.key === columnKey);
    if (column) {
      // Capture ALL current column widths to freeze them during resize
      const frozenWidths: { [key: string]: number } = {};
      columns.forEach(col => {
        frozenWidths[col.key] = col.width;
      });
      
      setResizing({
        column: columnKey,
        startX: e.clientX,
        startWidth: column.width,
        frozenWidths
      });
    }
  };

  // Auto-resize column to fit content on double-click
  const handleColumnDoubleClick = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate the optimal width by measuring content
    const column = columns.find(col => col.key === columnKey);
    if (!column) return;
    
    // Create temporary element to measure text width
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Set font to match table header
    context.font = 'bold 12px system-ui';
    
    let maxWidth = 0;
    
    // Measure header text
    const headerWidth = context.measureText(column.label).width + 40; // Add padding
    maxWidth = Math.max(maxWidth, headerWidth);
    
    // Measure content in visible rows
    sortedData.slice(0, 100).forEach((row) => { // Check first 100 rows for performance
      const cellValue = String(row[column.key as keyof T] || '');
      context.font = '14px system-ui'; // Regular font for content
      const contentWidth = context.measureText(cellValue).width + 50; // Add padding
      maxWidth = Math.max(maxWidth, contentWidth);
    });
    
    // Set new width with reasonable bounds
    const newWidth = Math.min(Math.max(50, maxWidth), 400);
    
    setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) => 
      col.key === columnKey ? { ...col, width: newWidth } : col
    ));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizing) {
      const diff = e.clientX - resizing.startX;
      // Universal minimum width of 1px for all columns - allow very narrow columns
      const newWidth = Math.max(1, resizing.startWidth + diff);
      
      setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) => {
        if (col.key === resizing.column) {
          // Only change the column being resized
          return { ...col, width: newWidth };
        } else {
          // Keep all other columns at their frozen width
          return { ...col, width: resizing.frozenWidths[col.key] };
        }
      }));
    }
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing]);

  // Column visibility toggle
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
  };

  // Apply filters and search
  const filteredData = applyFiltersAndSearch(data, searchTerm, filters);
  const sortedData = applySorting(filteredData, sortConfig);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading {entityNamePlural.toLowerCase()}...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with Title and Controls - original layout for search/filter */}
        <div className="relative p-2">
          {/* Title Section - Left aligned */}
          <div className="absolute left-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2 shadow-lg shadow-orange-500/20 ring-1 ring-orange-500/10 w-fit">
            <h2 className="text-xl font-bold text-orange-800 dark:text-orange-200 whitespace-nowrap">{entityNamePlural}</h2>
          </div>
          
          {/* Actions Section - Right of title like original */}
          <div className="ml-[350px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder={`Search ${entityNamePlural.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm w-64"
                data-testid="input-search"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
            </div>
            
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs w-20">
                  <Filter size={14} className="mr-1 text-orange-500" />
                  Filter{filters.length > 0 ? ` ${filters.length}` : ''}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {columns.filter(col => col.filterable).map((column) => (
                  <DropdownMenuItem
                    key={column.key}
                    onClick={() => onAddFilter(column.key)}
                    className="text-xs"
                  >
                    {column.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Column Visibility Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Settings size={14} className="mr-1 text-orange-500" />
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
                    onCheckedChange={() => toggleColumnVisibility(column.key)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Header Actions - matching original customer layout */}
            {headerActions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant={action.variant || 'default'}
                onClick={action.onClick}
                disabled={action.disabled}
                data-testid={`button-${action.key}`}
                className={action.variant === 'default' ? 'h-8 text-xs bg-green-600 text-white hover:bg-green-700' : 'h-8 text-xs'}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </Button>
            ))}

            {/* Delete button */}
            {deleteConfirmDialog && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteConfirmDialog.onOpenChange(true)}
                className={`h-8 text-xs w-28 ${selectedRows.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={selectedRows.length === 0}
                data-testid="button-delete-selected"
              >
                <Trash2 size={14} className="mr-1" />
                <span className="min-w-[4rem] text-left">
                  Delete{selectedRows.length > 0 ? ` ${selectedRows.length}` : ''}
                </span>
              </Button>
            )}

            {/* Duplicate button */}
            {onDuplicate && (
              <Button
                size="sm"
                variant="outline"
                className={`h-8 text-xs ${selectedRows.length !== 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={selectedRows.length !== 1}
                onClick={() => {
                  if (selectedRows.length === 1) {
                    const selectedItem = sortedData.find(item => getRowId(item) === selectedRows[0]);
                    if (selectedItem) {
                      onDuplicate(selectedItem);
                    }
                  }
                }}
                data-testid="button-duplicate"
              >
                <Copy size={14} className="mr-1" />
                Duplicate
              </Button>
            )}

            {/* Export button */}
            {onExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 text-xs w-28 ${selectedRows.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={selectedRows.length === 0}
                    data-testid="button-export"
                  >
                    <Download size={14} className="mr-1" />
                    <span className="min-w-[4rem] text-left">
                      Export{selectedRows.length > 0 ? ` ${selectedRows.length}` : ''}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={onExport} className="text-xs">
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExport} className="text-xs">
                    Export to PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExport} className="text-xs">
                    Export to Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 ml-2">
        {/* Active Filters - Left aligned with title */}
        <div className="min-h-[2rem] flex items-start">
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.map((filter, index) => (
                <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                  <span className="font-medium">
                    {columns.find(col => col.key === filter.column)?.label}
                  </span>
                  <Input
                    placeholder="Value"
                    value={filter.value}
                    onChange={(e) => onUpdateFilter(index, { ...filter, value: e.target.value })}
                    className="w-20 h-6 text-xs border-0 p-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFilter(index)}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results count - Left aligned with title */}
        <div className="text-xs text-muted-foreground py-1">
          {sortedData.length} of {data.length} {entityNamePlural.toLowerCase()}
          {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
        </div>

        {/* Table - Left aligned with title */}
        <div className="rounded-lg overflow-hidden border-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table className="table-fixed w-full" style={{ tableLayout: 'fixed' }}>
              <TableHeader className="bg-orange-50 dark:bg-orange-900/20">
                <TableRow>
                  <TableHead className="w-12 p-2 border-r border-orange-200/50" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
                    <div className="flex items-center justify-center h-4 w-4 mx-auto">
                      <Checkbox
                        checked={selectedRows.length === sortedData.length && sortedData.length > 0}
                        onCheckedChange={onToggleAllRows}
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
                        className="font-medium"
                        style={{ width: `${column.width}px`, minWidth: `${column.width}px`, maxWidth: `${column.width}px` }}
                        onDoubleClick={handleColumnDoubleClick}
                      >
                        <div className="flex items-center w-full">
                          {/* Label and sort area with consistent alignment */}
                          <div 
                            className="flex items-center gap-1 flex-1 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-800/30 rounded px-1 py-1 min-w-0"
                            onClick={() => column.sortable && onSort(column.key)}
                          >
                            <span className="whitespace-nowrap uppercase font-bold text-xs text-orange-800 dark:text-orange-200 truncate">{column.label}</span>
                            {column.sortable && (
                              <div className="flex items-center flex-shrink-0">
                                {sortConfig?.column === column.key ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ChevronUp size={12} className="text-orange-500" />
                                  ) : (
                                    <ChevronDown size={12} className="text-orange-500" />
                                  )
                                ) : (
                                  <ChevronsUpDown size={12} className="opacity-30 text-orange-500" />
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Filter button with consistent positioning */}
                          {column.filterable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAddFilter(column.key)}
                              className="h-5 w-5 p-0.5 opacity-50 hover:opacity-100 flex-shrink-0 hover:bg-muted ml-1"
                            >
                              <Filter size={10} className="text-orange-500" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Enhanced Resize Handle - more visible */}
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-400/30 active:bg-orange-500/40 transition-colors border-r-2 border-transparent hover:border-orange-400"
                          onMouseDown={(e) => handleMouseDown(e, column.key)}
                          title="Drag to resize column"
                        />
                      </DraggableColumnHeader>
                    ))}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentVisibleColumns.length + 1} className="text-center py-4 text-xs text-muted-foreground">
                      No {entityNamePlural.toLowerCase()} found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((row, index) => {
                    const rowId = getRowId(row);
                    const isSelected = selectedRows.includes(rowId);
                    const isEven = index % 2 === 0;
                    
                    return (
                      <TableRow 
                        key={rowId} 
                        className={`hover:bg-muted/30 text-sm font-normal cursor-pointer ${
                          isSelected 
                            ? 'bg-muted/50' 
                            : isEven 
                              ? 'bg-white dark:bg-gray-950' 
                              : 'bg-gray-50 dark:bg-gray-900/50'
                        }`}
                        style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}
                        onDoubleClick={() => onRowDoubleClick?.(row)}
                      >
                        <TableCell className="p-2 border-r border-gray-100 dark:border-gray-700" style={{ width: '48px', minWidth: '48px', maxWidth: '48px', height: '32px', lineHeight: '1.2' }}>
                          <div className="flex items-center justify-center h-4 w-4 mx-auto">
                            <Checkbox
                              checked={selectedRows.includes(rowId)}
                              onCheckedChange={() => onToggleRowSelection(rowId)}
                              className="h-4 w-4 border-2 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 flex-shrink-0"
                              style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
                            />
                          </div>
                        </TableCell>
                        {currentVisibleColumns.map((column) => (
                          <TableCell 
                            key={column.key} 
                            className={`p-2 truncate border-r border-gray-100 dark:border-gray-700 ${column.key === currentVisibleColumns[0]?.key ? 'font-medium' : ''}`}
                            style={{ width: `${column.width}px`, minWidth: `${column.width}px`, maxWidth: `${column.width}px`, height: '32px', lineHeight: '1.2' }}
                          >
                            {/* Content area with consistent left margin matching header */}
                            <div className="flex items-center">
                              <div className="w-6 flex-shrink-0"></div>
                              <div className="flex-1 min-w-0 truncate">
                                {column.renderCell 
                                  ? column.renderCell(row[column.key as keyof T], row)
                                  : String(row[column.key as keyof T] || '-')
                                }
                              </div>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {addEditDialog && (
        <Dialog open={addEditDialog.isOpen} onOpenChange={addEditDialog.onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <div className="flex justify-center">
                <DialogTitle className="text-2xl font-bold text-orange-600">
                  {addEditDialog.title}
                </DialogTitle>
              </div>
              <DialogDescription className="sr-only">
                Form to {addEditDialog.title.toLowerCase()}
              </DialogDescription>
              <div className="w-full h-px bg-gray-300 mt-4"></div>
            </DialogHeader>
            {addEditDialog.content}
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      {detailDialog && (
        <Dialog open={detailDialog.isOpen} onOpenChange={detailDialog.onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <div className="flex justify-center">
                <DialogTitle className="text-2xl font-bold text-orange-600">
                  {detailDialog.title}
                </DialogTitle>
              </div>
              <DialogDescription className="sr-only">
                Detailed view of {detailDialog.title.toLowerCase()}
              </DialogDescription>
              <div className="w-full h-px bg-gray-300 mt-4"></div>
            </DialogHeader>
            {detailDialog.content}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <AlertDialog open={deleteConfirmDialog.isOpen} onOpenChange={deleteConfirmDialog.onOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteConfirmDialog.itemCount} {deleteConfirmDialog.itemCount === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteConfirmDialog.onConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}