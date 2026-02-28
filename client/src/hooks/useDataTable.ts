import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ColumnFilter, 
  ColumnConfig, 
  SortConfig, 
  FilterType 
} from '@/components/layouts/DataTableLayout';

export interface UseDataTableProps {
  defaultColumns: ColumnConfig[];
  defaultSort?: SortConfig;
  tableKey?: string; // Unique identifier for localStorage
}

export function useDataTable({ defaultColumns, defaultSort, tableKey }: UseDataTableProps) {
  // Load columns from localStorage if available - memoized to prevent repeated parsing
  const getStoredColumns = useCallback((): ColumnConfig[] => {
    if (!tableKey) return defaultColumns;
    try {
      const stored = localStorage.getItem(`table-columns-${tableKey}`);
      if (stored) {
        const parsedColumns = JSON.parse(stored);
        // Merge stored columns with default to ensure new fields are included
        return defaultColumns.map(defaultCol => {
          const storedCol = parsedColumns.find((col: ColumnConfig) => col.key === defaultCol.key);
          return storedCol ? { ...defaultCol, ...storedCol } : defaultCol;
        });
      }
    } catch (error) {
      console.warn('Failed to load table columns from localStorage:', error);
    }
    return defaultColumns;
  }, [defaultColumns, tableKey]);

  // Column management - always start with defaultColumns to preserve renderCell functions
  const [columns, setColumnsState] = useState<ColumnConfig[]>(defaultColumns);
  
  // DataTableLayout handles localStorage/API persistence via saveColumnSettings
  const setColumns = useCallback((newColumns: ColumnConfig[] | ((prev: ColumnConfig[]) => ColumnConfig[])) => {
    setColumnsState(prevColumns => {
      const updatedColumns = typeof newColumns === 'function' ? newColumns(prevColumns) : newColumns;
      return updatedColumns;
    });
  }, []);
  
  // Search and filtering - stable state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  
  // Sorting - persist to localStorage
  const [sortConfig, setSortConfigState] = useState<SortConfig | null>(() => {
    if (!tableKey) return defaultSort || null;
    try {
      const stored = localStorage.getItem(`table-sort-${tableKey}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return defaultSort || null;
  });

  const setSortConfig = useCallback((value: SortConfig | null | ((prev: SortConfig | null) => SortConfig | null)) => {
    setSortConfigState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (tableKey) {
        try {
          if (newValue) {
            localStorage.setItem(`table-sort-${tableKey}`, JSON.stringify(newValue));
          } else {
            localStorage.removeItem(`table-sort-${tableKey}`);
          }
        } catch {}
      }
      return newValue;
    });
  }, [tableKey]);
  
  // Row selection - stable state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Memoized helper functions to prevent re-renders
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
  }, [setColumns]);

  const addFilter = useCallback((columnKey: string) => {
    const newFilter: ColumnFilter = {
      column: columnKey,
      type: 'contains',
      value: ''
    };
    setFilters(prev => [...prev, newFilter]);
  }, []);

  const updateFilter = useCallback((index: number, filter: ColumnFilter) => {
    setFilters(prev => prev.map((f, i) => i === index ? filter : f));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' 
          ? { column, direction: 'desc' }
          : null;
      }
      return { column, direction: 'asc' };
    });
  }, [setSortConfig]);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  }, []);

  const toggleAllRows = useCallback((allIds: string[]) => {
    setSelectedRows(prev => 
      prev.length === allIds.length ? [] : allIds
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows([]);
  }, []);

  // Memoized filter/search functions to prevent unnecessary calculations
  const applyFiltersAndSearch = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    return data.filter(item => {
      // Apply search term
      if (searchTerm) {
        const searchLower = (searchTerm ?? '').toString().toLowerCase();
        const searchMatch = Object.values(item).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
        if (!searchMatch) return false;
      }

      // Apply column filters
      return filters.every(filter => {
        const value = item[filter.column];
        const filterValue = (filter.value ?? '').toString().toLowerCase();
        const itemValue = (value ?? '').toString().toLowerCase();

        switch (filter.type) {
          case 'contains':
            return itemValue.includes(filterValue);
          case 'not_contains':
            return !itemValue.includes(filterValue);
          case 'equals':
            return itemValue === filterValue;
          case 'not_equals':
            return itemValue !== filterValue;
          case 'starts_with':
            return itemValue.startsWith(filterValue);
          case 'ends_with':
            return itemValue.endsWith(filterValue);
          case 'greater_than':
            return parseFloat(itemValue) > parseFloat(filterValue);
          case 'less_than':
            return parseFloat(itemValue) < parseFloat(filterValue);
          default:
            return true;
        }
      });
    });
  }, [searchTerm, filters]);

  const applySorting = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Convert to strings for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      let comparison = 0;
      if (aStr < bStr) comparison = -1;
      if (aStr > bStr) comparison = 1;

      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
  }, [sortConfig]);

  // Memoized visible columns to prevent re-calculations
  const visibleColumns = useMemo(() => 
    columns.filter(col => col.visible), 
    [columns]
  );

  return {
    // State
    columns,
    searchTerm,
    filters,
    sortConfig,
    selectedRows,
    visibleColumns,
    
    // Setters
    setColumns,
    setSearchTerm,
    setFilters,
    setSortConfig,
    setSelectedRows,
    
    // Actions
    toggleColumnVisibility,
    addFilter,
    updateFilter,
    removeFilter,
    handleSort,
    toggleRowSelection,
    toggleAllRows,
    clearSelection,
    
    // Processing functions
    applyFiltersAndSearch,
    applySorting,
  };
}