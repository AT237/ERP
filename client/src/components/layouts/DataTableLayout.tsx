import React, { useState, useEffect, ReactNode, useMemo, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  CopyPlus, 
  Download,
  ChevronUp, 
  ChevronsUpDown,
  Columns3,
  FileSpreadsheet,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
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

// ============================================================================
// TABLE COLUMN HELPERS - Use these for consistent styling across all tables
// ============================================================================
// - All columns use the same sans-serif font (font-sans text-sm)
// - Position columns are 70px wide, IDs are 120px wide
// - Numeric columns should be right-aligned
// - Column order: checkbox, position, ID, description, numeric values, actions
// ============================================================================

// Helper function for consistent ID column styling
const createIdColumn = (key: string, label: string, width = 120): ColumnConfig => ({
  key,
  label,
  visible: true,
  width,
  filterable: true,
  sortable: true,
});

// Helper function for position/line number columns (010, 020, etc.)
const createPositionColumn = (key = 'positionNo', label = 'Pos.', width = 70): ColumnConfig => ({
  key,
  label,
  visible: true,
  width,
  filterable: false,
  sortable: true,
});

// Helper function for currency columns (right-aligned with € symbol)
const createCurrencyColumn = (key: string, label: string, width = 120): ColumnConfig => ({
  key,
  label,
  visible: true,
  width,
  filterable: true,
  sortable: true,
  renderCell: (value: string) => (
    <span className="text-right w-full block">{`€${value || "0.00"}`}</span>
  )
});

// Helper function for numeric columns (right-aligned)
const createNumericColumn = (key: string, label: string, width = 100): ColumnConfig => ({
  key,
  label,
  visible: true,
  width,
  filterable: true,
  sortable: true,
  renderCell: (value: number) => (
    <span className="text-right w-full block">{value?.toString() || "0"}</span>
  )
});

// Export helpers separately to fix Fast Refresh compatibility
export { createIdColumn, createPositionColumn, createCurrencyColumn, createNumericColumn };

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
  
  // Column persistence
  tableKey?: string; // Unique identifier for persisting column settings
  
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
  
  // Layout options
  compact?: boolean; // Removes header padding for embedded use
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
          <GripVertical className="h-3 w-3 text-orange-500" />
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
  tableKey,
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
  compact = false,
}: DataTableLayoutProps<T>) {
  
  const sortedDataRef = useRef<T[]>([]);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onRowDoubleClickRef = useRef(onRowDoubleClick);
  onRowDoubleClickRef.current = onRowDoubleClick;
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;

  const attachClickListeners = useCallback((container: HTMLDivElement) => {
    if (cleanupRef.current) cleanupRef.current();

    let lastTap = { time: 0, rowId: '' };
    let touchMoved = false;
    let touchHandled = false;

    const findRowId = (target: HTMLElement): string | null => {
      if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('[role="checkbox"]')) return null;
      const row = target.closest('tr[data-row-id]') as HTMLElement | null;
      return row ? (row.getAttribute('data-row-id') || null) : null;
    };

    const tryDoubleTap = (rowId: string) => {
      const now = Date.now();
      const timeDiff = now - lastTap.time;
      if (lastTap.rowId === rowId && timeDiff < 800) {
        const dataRow = sortedDataRef.current.find(r => getRowIdRef.current(r) === rowId);
        if (dataRow && onRowDoubleClickRef.current) onRowDoubleClickRef.current(dataRow);
        lastTap = { time: 0, rowId: '' };
        return true;
      } else {
        lastTap = { time: now, rowId };
        return false;
      }
    };

    const onTouchStart = () => { touchMoved = false; };
    const onTouchMove = () => { touchMoved = true; };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchMoved) return;
      const rowId = findRowId(e.target as HTMLElement);
      if (!rowId) return;
      touchHandled = true;
      if (tryDoubleTap(rowId)) {
        e.preventDefault();
      }
      setTimeout(() => { touchHandled = false; }, 300);
    };

    const onClick = (e: MouseEvent) => {
      if (touchHandled) return;
      const rowId = findRowId(e.target as HTMLElement);
      if (!rowId) return;
      if (tryDoubleTap(rowId)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('click', onClick);

    cleanupRef.current = () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('click', onClick);
    };
  }, []);

  const tableContainerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    tableContainerRef.current = node;
    if (node) {
      attachClickListeners(node);
    } else if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, [attachClickListeners]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  
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
  const startResize = (clientX: number, columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (column) {
      const frozenWidths: { [key: string]: number } = {};
      columns.forEach(col => {
        frozenWidths[col.key] = col.width;
      });
      
      setResizing({
        column: columnKey,
        startX: clientX,
        startWidth: column.width,
        frozenWidths
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(e.clientX, columnKey);
  };

  const handleTouchStartResize = (e: React.TouchEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 1) {
      startResize(e.touches[0].clientX, columnKey);
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

  const applyResize = (clientX: number) => {
    if (resizing) {
      const diff = clientX - resizing.startX;
      const newWidth = Math.max(1, resizing.startWidth + diff);
      
      setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) => {
        if (col.key === resizing.column) {
          return { ...col, width: newWidth };
        } else {
          return { ...col, width: resizing.frozenWidths[col.key] };
        }
      }));
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    applyResize(e.clientX);
  };

  const handleTouchMoveResize = (e: TouchEvent) => {
    if (resizing && e.touches.length === 1) {
      e.preventDefault();
      applyResize(e.touches[0].clientX);
    }
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMoveResize, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      document.addEventListener('touchcancel', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMoveResize);
        document.removeEventListener('touchend', handleMouseUp);
        document.removeEventListener('touchcancel', handleMouseUp);
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
  sortedDataRef.current = sortedData;

  // Mobile detection
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="h-64 space-y-3 p-4">
        <div className="bg-gray-200 dark:bg-gray-800 h-8 w-3/4 rounded animate-pulse"></div>
        <div className="bg-gray-200 dark:bg-gray-800 h-6 w-1/2 rounded animate-pulse"></div>
        <div className="bg-gray-200 dark:bg-gray-800 h-6 w-2/3 rounded animate-pulse"></div>
        <div className="bg-gray-200 dark:bg-gray-800 h-6 w-1/3 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <>
      <div className={isMobile ? "space-y-0" : "space-y-4"}>
        {/* Header with Controls */}
        <div className={`${compact ? 'p-0 mx-0' : isMobile ? 'px-1 pt-0 pb-0' : 'p-2'}`}>
          {/* Mobile Layout - Compact stacked */}
          {isMobile ? (
            <div className="space-y-0.5">
              {/* Table Name */}
              <h2 className="text-base font-semibold text-orange-600 px-1 py-0">{entityNamePlural}</h2>
              {/* Search - Full width */}
              <div className="relative">
                <Input
                  placeholder={`Zoeken...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm w-full"
                  data-testid="input-search-mobile"
                />
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-orange-500" size={16} />
              </div>
              
              {/* Filter & Column Buttons - Side by side */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 text-sm flex-1 justify-start">
                      <Filter size={16} className="mr-1.5 text-orange-500" />
                      Filter{filters.length > 0 ? ` (${filters.length})` : ''}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)]">
                    {columns.filter(col => col.filterable).map((column) => (
                      <DropdownMenuItem
                        key={column.key}
                        onClick={() => onAddFilter(column.key)}
                        className="text-sm py-2"
                      >
                        {column.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 text-sm flex-1 justify-start">
                      <Settings size={16} className="mr-1.5 text-orange-500" />
                      Kolommen
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-[calc(100vw-2rem)]" 
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="text-xs font-medium p-2 border-b">Kolommen zichtbaarheid</div>
                    {columns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.key}
                        checked={column.visible}
                        onCheckedChange={() => toggleColumnVisibility(column.key)}
                        onSelect={(e) => e.preventDefault()}
                        className="text-sm py-2"
                      >
                        {column.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Action Buttons - hidden, actions are in bottom nav */}
            </div>
          ) : (
            /* Desktop Layout - FormToolbar style icon bar */
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 flex items-center gap-1 w-fit">
              {/* Search */}
              <div className="relative">
                <Input
                  placeholder={`Search ${entityNamePlural.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm w-64"
                  data-testid="input-search"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-orange-500" size={14} />
              </div>

              <Separator orientation="vertical" className="h-6 mx-1" />
              
              {/* Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 relative"
                    title="Filter"
                    data-testid="toolbar-filter"
                  >
                    <Filter className="h-4 w-4" />
                    {filters.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                        {filters.length}
                      </span>
                    )}
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
              
              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Column Visibility"
                    data-testid="toolbar-columns"
                  >
                    <Columns3 className="h-4 w-4" />
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

              {/* Header Actions as icon buttons */}
              {headerActions.length > 0 && (
                <Separator orientation="vertical" className="h-6 mx-1" />
              )}
              {headerActions.map((action) => (
                <Button
                  key={action.key}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  title={action.label}
                  data-testid={`button-${action.key}`}
                >
                  {action.icon || <Plus className="h-4 w-4" />}
                </Button>
              ))}

              {/* Delete */}
              {deleteConfirmDialog && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${selectedRows.length === 0 ? 'opacity-40' : ''}`}
                  onClick={() => deleteConfirmDialog.onOpenChange(true)}
                  disabled={selectedRows.length === 0}
                  title={`Delete${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
                  data-testid="button-delete-selected"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {/* Duplicate */}
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${selectedRows.length !== 1 ? 'opacity-40' : ''}`}
                  disabled={selectedRows.length !== 1}
                  onClick={() => {
                    if (selectedRows.length === 1) {
                      const selectedItem = sortedData.find(item => getRowId(item) === selectedRows[0]);
                      if (selectedItem) {
                        onDuplicate(selectedItem);
                      }
                    }
                  }}
                  title="Duplicate"
                  data-testid="button-duplicate"
                >
                  <CopyPlus className="h-4 w-4" />
                </Button>
              )}

              {/* Export */}
              {onExport && (
                <>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Export"
                        data-testid="button-export"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
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
                </>
              )}
            </div>
          )}
        </div>

        {/* Active Filters */}
        <div className={`min-h-[2rem] flex items-start ${compact ? 'pl-0' : ''}`}>
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

        {/* Results count */}
        <div className={`text-xs text-orange-500 py-1 ${compact ? 'pl-0' : ''}`}>
          {sortedData.length} of {data.length} {entityNamePlural.toLowerCase()}
          {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
        </div>

        {/* Table */}
        <div ref={tableContainerCallbackRef} className={`rounded-lg overflow-x-auto border-0 ${compact ? 'ml-0' : ''}`}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table 
              className="w-auto" 
              style={{ 
                tableLayout: 'fixed',
                width: `${currentVisibleColumns.reduce((sum, col) => sum + col.width, 0) + 48}px` // +48 for checkbox column
              }}
            >
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
                        <div className="flex items-center w-full gap-0.5">
                          {/* Label and sort area with consistent alignment */}
                          <div 
                            className="flex items-center gap-0.5 flex-1 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-800/30 rounded px-0.5 py-0.5 min-w-0"
                            onClick={() => column.sortable && onSort(column.key)}
                          >
                            <span className="whitespace-nowrap uppercase font-bold text-xs text-orange-600 truncate">{column.label}</span>
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
                          
                          {/* Filter button with minimal spacing */}
                          {column.filterable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onAddFilter(column.key)}
                              className="h-4 w-4 p-0 opacity-50 hover:opacity-100 flex-shrink-0 hover:bg-orange-100 dark:hover:bg-orange-800/30"
                            >
                              <Filter size={10} className="text-orange-500" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Enhanced Resize Handle - touch-friendly */}
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-4 -mr-2 cursor-col-resize z-10 touch-none"
                          onMouseDown={(e) => handleMouseDown(e, column.key)}
                          onTouchStart={(e) => handleTouchStartResize(e, column.key)}
                          title="Drag to resize column"
                        >
                          <div className="absolute right-2 top-0 bottom-0 w-[2px] hover:bg-orange-400 active:bg-orange-500 transition-colors" />
                        </div>
                      </DraggableColumnHeader>
                    ))}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentVisibleColumns.length + 1} className="text-center py-4 text-xs text-orange-500">
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
                        data-row-id={rowId}
                        className={`hover:bg-orange-100 dark:hover:bg-orange-800/30/30 text-sm font-normal font-sans cursor-pointer ${
                          isSelected 
                            ? 'bg-orange-50 dark:bg-orange-900/20' 
                            : isEven 
                              ? 'bg-white dark:bg-gray-950' 
                              : 'bg-white dark:bg-gray-900/50'
                        }`}
                        style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}
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