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
  Sigma,
  PenLine,
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

export type SummaryType = 'none' | 'count' | 'sum' | 'average' | 'min' | 'max';

export type SummaryConfig = Record<string, SummaryType>;

export type DirectInputFieldType = 'text' | 'number' | 'currency' | 'select';

export type DirectInputColumn = {
  key: string;
  fieldType: DirectInputFieldType;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
};

export type DirectInputConfig = {
  columns: DirectInputColumn[];
  onSave: (rowData: Record<string, any>) => Promise<void>;
  onUpdate?: (rowId: string, rowData: Record<string, any>) => Promise<void>;
  defaults?: Record<string, any>;
};

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
  fullCell?: boolean;
  align?: 'left' | 'right' | 'center';
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
  align: 'right',
  renderCell: (value: string) => (
    value != null && value !== '' && value !== '0'
      ? `€\u00A0${parseFloat(String(value)).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '€\u00A00,00'
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
  align: 'right',
  renderCell: (value: any) => (
    value != null && value !== '' ? parseFloat(String(value)).toLocaleString('nl-NL') : '0'
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
  
  // Direct input mode
  directInput?: DirectInputConfig;
}

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'contains', label: 'Bevat' },
  { value: 'not_contains', label: 'Bevat niet' },
  { value: 'starts_with', label: 'Begint met' },
  { value: 'ends_with', label: 'Eindigt met' },
  { value: 'equals', label: 'Is gelijk aan' },
  { value: 'not_equals', label: 'Is niet gelijk aan' },
  { value: 'greater_than', label: 'Groter dan' },
  { value: 'less_than', label: 'Kleiner dan' },
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
  directInput,
}: DataTableLayoutProps<T>) {
  
  const [directInputMode, setDirectInputMode] = useState<boolean>(false);
  const [directInputRow, setDirectInputRow] = useState<Record<string, any>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, any>>({});
  const [directInputSaving, setDirectInputSaving] = useState(false);
  const directInputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  const initDirectInputRow = useCallback(() => {
    if (!directInput) return {};
    const row: Record<string, any> = {};
    for (const col of directInput.columns) {
      row[col.key] = col.defaultValue ?? (directInput.defaults?.[col.key] ?? '');
    }
    return row;
  }, [directInput]);

  const handleDirectInputSave = useCallback(async () => {
    if (!directInput || directInputSaving) return;
    const hasData = directInput.columns.some(col => {
      const val = directInputRow[col.key];
      return val !== '' && val !== undefined && val !== null && val !== (col.defaultValue ?? '');
    });
    if (!hasData) return;
    setDirectInputSaving(true);
    try {
      await directInput.onSave(directInputRow);
      setDirectInputRow(initDirectInputRow());
      setTimeout(() => {
        const firstCol = directInput.columns[0];
        if (firstCol) directInputRefs.current[firstCol.key]?.focus();
      }, 100);
    } catch {}
    setDirectInputSaving(false);
  }, [directInput, directInputRow, directInputSaving, initDirectInputRow]);

  const handleEditRowSave = useCallback(async () => {
    if (!directInput?.onUpdate || !editingRowId || directInputSaving) return;
    setDirectInputSaving(true);
    try {
      await directInput.onUpdate(editingRowId, editingRowData);
      setEditingRowId(null);
      setEditingRowData({});
    } catch {}
    setDirectInputSaving(false);
  }, [directInput, editingRowId, editingRowData, directInputSaving]);

  const handleDirectInputKeyDown = useCallback((e: React.KeyboardEvent, colIndex: number, isNewRow: boolean) => {
    if (!directInput) return;
    const cols = directInput.columns;
    if (e.key === 'Tab' && !e.shiftKey && colIndex === cols.length - 1) {
      e.preventDefault();
      if (isNewRow) {
        handleDirectInputSave();
      } else {
        handleEditRowSave();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isNewRow) {
        handleDirectInputSave();
      } else {
        handleEditRowSave();
      }
    } else if (e.key === 'Escape') {
      if (!isNewRow) {
        setEditingRowId(null);
        setEditingRowData({});
      }
    }
  }, [directInput, handleDirectInputSave, handleEditRowSave]);

  const startEditingRow = useCallback((row: T) => {
    if (!directInput?.onUpdate || !directInputMode) return;
    const rowId = getRowId(row);
    const rowData: Record<string, any> = {};
    for (const col of directInput.columns) {
      rowData[col.key] = (row as any)[col.key] ?? '';
    }
    setEditingRowId(rowId);
    setEditingRowData(rowData);
  }, [directInput, directInputMode, getRowId]);

  useEffect(() => {
    if (directInputMode && directInput) {
      setDirectInputRow(initDirectInputRow());
    }
  }, [directInputMode, directInput, initDirectInputRow]);

  const [showSummary, setShowSummary] = useState<boolean>(() => {
    if (!tableKey) return false;
    try {
      const stored = localStorage.getItem(`table-summary-show-${tableKey}`);
      return stored === 'true';
    } catch {}
    return false;
  });

  const [summaryConfig, setSummaryConfig] = useState<SummaryConfig>(() => {
    if (!tableKey) return {};
    try {
      const stored = localStorage.getItem(`table-summary-config-${tableKey}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const toggleShowSummary = useCallback(() => {
    setShowSummary(prev => {
      const next = !prev;
      if (tableKey) {
        try { localStorage.setItem(`table-summary-show-${tableKey}`, String(next)); } catch {}
      }
      return next;
    });
  }, [tableKey]);

  const setSummaryType = useCallback((columnKey: string, type: SummaryType) => {
    setSummaryConfig(prev => {
      const next = { ...prev, [columnKey]: type };
      if (type === 'none') delete next[columnKey];
      if (tableKey) {
        try {
          if (Object.keys(next).length > 0) {
            localStorage.setItem(`table-summary-config-${tableKey}`, JSON.stringify(next));
          } else {
            localStorage.removeItem(`table-summary-config-${tableKey}`);
          }
        } catch {}
      }
      return next;
    });
  }, [tableKey]);

  const sortedDataRef = useRef<T[]>([]);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onRowDoubleClickRef = useRef(onRowDoubleClick);
  onRowDoubleClickRef.current = onRowDoubleClick;
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const isMobileRef = useRef(false);

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

    const openRow = (rowId: string) => {
      const dataRow = sortedDataRef.current.find(r => getRowIdRef.current(r) === rowId);
      if (dataRow && onRowDoubleClickRef.current) onRowDoubleClickRef.current(dataRow);
    };

    const tryDoubleTap = (rowId: string) => {
      const now = Date.now();
      const timeDiff = now - lastTap.time;
      if (lastTap.rowId === rowId && timeDiff < 800) {
        openRow(rowId);
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
      // On mobile: single tap opens the row (double-tap is unreliable on touch screens)
      if (isMobileRef.current) {
        openRow(rowId);
        e.preventDefault();
      } else if (tryDoubleTap(rowId)) {
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
      const newWidth = Math.max(50, resizing.startWidth + diff);
      
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

  const summaryValues = useMemo(() => {
    if (!showSummary || Object.keys(summaryConfig).length === 0) return {};
    const result: Record<string, string> = {};
    for (const [colKey, type] of Object.entries(summaryConfig)) {
      if (type === 'none') continue;
      const values = sortedData
        .map(row => {
          const raw = row[colKey as keyof T];
          if (raw == null || raw === '') return null;
          const n = parseFloat(String(raw).replace(/[€\s]/g, '').replace(',', '.'));
          return isNaN(n) ? null : n;
        })
        .filter((v): v is number => v !== null);

      if (type === 'count') {
        result[colKey] = String(sortedData.filter(row => {
          const v = row[colKey as keyof T];
          return v != null && v !== '';
        }).length);
      } else if (values.length === 0) {
        result[colKey] = '-';
      } else if (type === 'sum') {
        result[colKey] = values.reduce((a, b) => a + b, 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (type === 'average') {
        result[colKey] = (values.reduce((a, b) => a + b, 0) / values.length).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (type === 'min') {
        result[colKey] = Math.min(...values).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (type === 'max') {
        result[colKey] = Math.max(...values).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
    return result;
  }, [showSummary, summaryConfig, sortedData]);

  const summaryTypeLabels: Record<SummaryType, string> = {
    none: 'Geen',
    count: 'Aantal',
    sum: 'Totaal',
    average: 'Gemiddelde',
    min: 'Minimum',
    max: 'Maximum',
  };

  // Mobile detection
  const isMobile = useIsMobile();
  isMobileRef.current = isMobile;

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
      <div className={isMobile ? "space-y-0 pb-10" : "space-y-4 pb-10"}>
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
                    className="h-8 w-8 p-0 relative bg-orange-500 text-white hover:bg-orange-600"
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
                    className="h-8 w-8 p-0 bg-orange-500 text-white hover:bg-orange-600"
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
                  className={`h-8 w-8 p-0 ${action.disabled ? 'opacity-30' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
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
                  className={`h-8 w-8 p-0 ${selectedRows.length === 0 ? 'opacity-30' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
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
                  className={`h-8 w-8 p-0 ${selectedRows.length !== 1 ? 'opacity-30' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
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
                        className="h-8 w-8 p-0 bg-orange-500 text-white hover:bg-orange-600"
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

              {/* Summary/Totals toggle */}
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${showSummary ? 'bg-orange-500 text-white hover:bg-orange-600' : 'opacity-30 hover:opacity-60'}`}
                onClick={toggleShowSummary}
                title={showSummary ? 'Totalenrij verbergen' : 'Totalenrij tonen'}
                data-testid="button-summary"
              >
                <Sigma className="h-4 w-4" />
              </Button>

              {/* Direct Input toggle */}
              {directInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${directInputMode ? 'bg-orange-500 text-white hover:bg-orange-600' : 'opacity-30 hover:opacity-60'}`}
                  onClick={() => {
                    setDirectInputMode(prev => !prev);
                    setEditingRowId(null);
                    setEditingRowData({});
                  }}
                  title={directInputMode ? 'Direct input uitschakelen' : 'Direct input inschakelen'}
                  data-testid="button-direct-input"
                >
                  <PenLine className="h-4 w-4" />
                </Button>
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
                  <span className="font-medium whitespace-nowrap">
                    {columns.find(col => col.key === filter.column)?.label}
                  </span>
                  <select
                    value={filter.type}
                    onChange={(e) => onUpdateFilter(index, { ...filter, type: e.target.value as FilterType })}
                    className="h-6 text-xs bg-transparent border border-gray-300 rounded px-1 outline-none focus:border-orange-400 cursor-pointer"
                  >
                    {filterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Waarde..."
                    value={filter.value}
                    onChange={(e) => onUpdateFilter(index, { ...filter, value: e.target.value })}
                    className="w-24 h-6 text-xs border-0 p-1"
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
                        
                        {/* Resize Handle - always visible, drag to resize */}
                        <div 
                          className="absolute top-0 bottom-0 w-4 cursor-col-resize z-10 touch-none group"
                          style={{ right: '-8px' }}
                          onMouseDown={(e) => handleMouseDown(e, column.key)}
                          onTouchStart={(e) => handleTouchStartResize(e, column.key)}
                          title="Sleep om kolombreedte aan te passen"
                        >
                          <div className="absolute inset-x-[7px] top-[20%] bottom-[20%] w-[2px] bg-orange-300/60 group-hover:bg-orange-500 group-active:bg-orange-600 transition-colors rounded-full" />
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
                            className={`border-r border-gray-100 dark:border-gray-700 ${column.fullCell ? 'p-0 overflow-hidden' : 'p-2 truncate'} ${column.key === currentVisibleColumns[0]?.key ? 'font-medium' : ''}`}
                            style={{ width: `${column.width}px`, minWidth: `${column.width}px`, maxWidth: `${column.width}px`, lineHeight: '1.2' }}
                          >
                            {column.fullCell ? (
                              <div className="w-full h-full flex items-center justify-center">
                                {column.renderCell
                                  ? column.renderCell(row[column.key as keyof T], row)
                                  : String(row[column.key as keyof T] || '-')
                                }
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="w-6 flex-shrink-0"></div>
                                <div className={`flex-1 min-w-0 truncate ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
                                  {column.renderCell 
                                    ? column.renderCell(row[column.key as keyof T], row)
                                    : String(row[column.key as keyof T] || '-')
                                  }
                                </div>
                              </div>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {showSummary && (
                <tfoot>
                  <tr className="bg-orange-50 dark:bg-orange-900/30 border-t-2 border-orange-300">
                    <td className="p-2 border-r border-orange-200/50 text-center" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
                      <Sigma className="h-3 w-3 mx-auto text-orange-500" />
                    </td>
                    {currentVisibleColumns.map((column) => {
                      const currentType = summaryConfig[column.key] || 'none';
                      const hasValue = summaryValues[column.key] != null;
                      return (
                        <td
                          key={column.key}
                          className="border-r border-orange-200/50 p-0"
                          style={{ width: `${column.width}px`, minWidth: `${column.width}px`, maxWidth: `${column.width}px` }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-full h-8 px-2 text-xs flex items-center gap-1 hover:bg-orange-100 dark:hover:bg-orange-800/30 transition-colors cursor-pointer outline-none">
                                {currentType !== 'none' ? (
                                  <div className={`flex-1 min-w-0 ${column.align === 'right' ? 'text-right' : ''}`}>
                                    <span className="text-[10px] text-orange-500 mr-1">{summaryTypeLabels[currentType]}:</span>
                                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                                      {hasValue ? summaryValues[column.key] : '-'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">klik...</span>
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[140px]">
                              {(Object.entries(summaryTypeLabels) as [SummaryType, string][]).map(([type, label]) => (
                                <DropdownMenuItem
                                  key={type}
                                  onClick={() => setSummaryType(column.key, type)}
                                  className={`text-xs ${currentType === type ? 'bg-orange-100 text-orange-700 font-medium' : ''}`}
                                >
                                  {label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
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