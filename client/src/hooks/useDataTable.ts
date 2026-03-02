import { useState, useMemo, useCallback } from 'react';
import { 
  ColumnFilter, 
  ColumnConfig, 
  SortConfig, 
  FilterType 
} from '@/components/layouts/DataTableLayout';

export interface UseDataTableProps {
  defaultColumns: ColumnConfig[];
  defaultSort?: SortConfig;
  tableKey?: string;
}

function loadColumnsFromStorage(tableKey: string, defaultColumns: ColumnConfig[]): ColumnConfig[] {
  try {
    const stored = localStorage.getItem(`table-columns-${tableKey}`);
    if (!stored) return defaultColumns;
    const parsed = JSON.parse(stored);
    // Support both plain array format and legacy { columns: [...] } format
    const savedCols: any[] = Array.isArray(parsed) ? parsed : (parsed?.columns ?? []);
    if (!savedCols.length) return defaultColumns;
    // Merge: keep renderCell from defaultColumns, restore width/visible from storage
    const merged = defaultColumns.map(defaultCol => {
      const saved = savedCols.find((c: any) => c.key === defaultCol.key);
      if (!saved) return defaultCol;
      return {
        ...defaultCol,
        width: saved.width ?? defaultCol.width,
        visible: saved.visible ?? defaultCol.visible,
      };
    });
    // Restore column order from saved state
    const ordered = savedCols
      .map((s: any) => merged.find(col => col.key === s.key))
      .filter(Boolean) as ColumnConfig[];
    const newCols = merged.filter(col => !savedCols.some((s: any) => s.key === col.key));
    return [...ordered, ...newCols];
  } catch {
    return defaultColumns;
  }
}

function saveColumnsToStorage(tableKey: string, columns: ColumnConfig[]) {
  try {
    const toSave = columns.map((col, i) => ({
      key: col.key,
      width: col.width,
      visible: col.visible,
      order: i,
    }));
    localStorage.setItem(`table-columns-${tableKey}`, JSON.stringify(toSave));
  } catch {}
}

export function useDataTable({ defaultColumns, defaultSort, tableKey }: UseDataTableProps) {
  // Initialize columns synchronously from localStorage (preserves renderCell from defaultColumns)
  const [columns, setColumnsState] = useState<ColumnConfig[]>(() => {
    if (!tableKey) return defaultColumns;
    return loadColumnsFromStorage(tableKey, defaultColumns);
  });

  // setColumns saves to localStorage automatically
  const setColumns = useCallback((newColumns: ColumnConfig[] | ((prev: ColumnConfig[]) => ColumnConfig[])) => {
    setColumnsState(prevColumns => {
      const updated = typeof newColumns === 'function' ? newColumns(prevColumns) : newColumns;
      if (tableKey) {
        saveColumnsToStorage(tableKey, updated);
      }
      return updated;
    });
  }, [tableKey]);

  // Search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);

  // Sorting — persisted to localStorage
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

  // Row selection
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) =>
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
  }, [setColumns]);

  const addFilter = useCallback((columnKey: string) => {
    const newFilter: ColumnFilter = { column: columnKey, type: 'contains', value: '' };
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
        return prev.direction === 'asc' ? { column, direction: 'desc' } : null;
      }
      return { column, direction: 'asc' };
    });
  }, [setSortConfig]);

  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  }, []);

  const toggleAllRows = useCallback((allIds: string[]) => {
    setSelectedRows(prev => prev.length === allIds.length ? [] : allIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRows([]);
  }, []);

  const applyFiltersAndSearch = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    return data.filter(item => {
      if (searchTerm) {
        const searchLower = (searchTerm ?? '').toString().toLowerCase();
        const searchMatch = Object.values(item).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchLower);
        });
        if (!searchMatch) return false;
      }
      return filters.every(filter => {
        const value = item[filter.column];
        const filterValue = (filter.value ?? '').toString().toLowerCase();
        const itemValue = (value ?? '').toString().toLowerCase();
        switch (filter.type) {
          case 'contains': return itemValue.includes(filterValue);
          case 'not_contains': return !itemValue.includes(filterValue);
          case 'equals': return itemValue === filterValue;
          case 'not_equals': return itemValue !== filterValue;
          case 'starts_with': return itemValue.startsWith(filterValue);
          case 'ends_with': return itemValue.endsWith(filterValue);
          case 'greater_than': return parseFloat(itemValue) > parseFloat(filterValue);
          case 'less_than': return parseFloat(itemValue) < parseFloat(filterValue);
          default: return true;
        }
      });
    });
  }, [searchTerm, filters]);

  const applySorting = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      let comparison = 0;
      if (aStr < bStr) comparison = -1;
      if (aStr > bStr) comparison = 1;
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
  }, [sortConfig]);

  const visibleColumns = useMemo(() =>
    columns.filter(col => col.visible),
    [columns]
  );

  return {
    columns,
    searchTerm,
    filters,
    sortConfig,
    selectedRows,
    visibleColumns,
    setColumns,
    setSearchTerm,
    setFilters,
    setSortConfig,
    setSelectedRows,
    toggleColumnVisibility,
    addFilter,
    updateFilter,
    removeFilter,
    handleSort,
    toggleRowSelection,
    toggleAllRows,
    clearSelection,
    applyFiltersAndSearch,
    applySorting,
  };
}
