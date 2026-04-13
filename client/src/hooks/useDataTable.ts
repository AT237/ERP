import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ColumnFilter, 
  ColumnConfig, 
  SortConfig, 
  FilterType 
} from '@/components/layouts/DataTableLayout';

const HIDDEN_KEYS = new Set([
  'id',
  'createdAt',
  'updatedAt',
]);

const HIDDEN_SUFFIXES = ['Id', 'Ids'];

function shouldAutoHide(key: string): boolean {
  if (HIDDEN_KEYS.has(key)) return true;
  for (const suffix of HIDDEN_SUFFIXES) {
    if (key.endsWith(suffix) && key !== suffix) return true;
  }
  return false;
}

function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function detectColumnType(value: any): 'currency' | 'date' | 'text' {
  if (value == null || value === '') return 'text';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) return 'date';
    if (/^-?\d+\.\d{2}$/.test(value)) return 'currency';
  }
  return 'text';
}

export function autoDiscoverColumns(
  data: any[],
  manualColumns: ColumnConfig[]
): ColumnConfig[] {
  if (!data || data.length === 0) return manualColumns;

  const manualKeys = new Set(manualColumns.map(c => c.key));
  const sample = data[0];
  const discovered: ColumnConfig[] = [];

  for (const key of Object.keys(sample)) {
    if (manualKeys.has(key)) continue;
    const value = sample[key];
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) continue;

    const colType = detectColumnType(value);
    const col: ColumnConfig = {
      key,
      label: camelToLabel(key),
      visible: !shouldAutoHide(key),
      width: colType === 'currency' ? 120 : colType === 'date' ? 120 : 150,
      filterable: true,
      sortable: true,
    };

    if (colType === 'currency') {
      col.align = 'right';
      col.renderCell = (v: any) => {
        const num = parseFloat(String(v || '0')) || 0;
        return `€\u00A0${num.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };
    } else if (colType === 'date') {
      col.renderCell = (v: any) => {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      };
    }

    discovered.push(col);
  }

  return [...manualColumns, ...discovered];
}

export interface UseDataTableProps {
  defaultColumns: ColumnConfig[];
  defaultSort?: SortConfig;
  tableKey?: string;
  data?: any[];
}

function loadColumnsFromStorage(tableKey: string, defaultColumns: ColumnConfig[]): ColumnConfig[] {
  try {
    const stored = localStorage.getItem(`table-columns-${tableKey}`);
    if (!stored) return defaultColumns;
    const parsed = JSON.parse(stored);
    // Support both plain array format and legacy { columns: [...] } format
    const savedCols: any[] = Array.isArray(parsed) ? parsed : (parsed?.columns ?? []);
    if (!savedCols.length) return defaultColumns;
    const defaultKeys = new Set(defaultColumns.map(c => c.key));
    const prevDefaultsRaw = localStorage.getItem(`table-columns-defaults-${tableKey}`);
    const prevDefaultKeys = new Set<string>(prevDefaultsRaw ? JSON.parse(prevDefaultsRaw) : []);
    localStorage.setItem(`table-columns-defaults-${tableKey}`, JSON.stringify([...defaultKeys]));
    const merged = defaultColumns.map(defaultCol => {
      const saved = savedCols.find((c: any) => c.key === defaultCol.key);
      if (!saved) return defaultCol;
      const isNewDefault = !prevDefaultKeys.has(defaultCol.key);
      return {
        ...defaultCol,
        width: saved.width ?? defaultCol.width,
        visible: defaultCol.forceVisible ? true : (isNewDefault && defaultCol.visible ? true : (saved.visible ?? defaultCol.visible)),
      };
    });
    const ordered = savedCols
      .map((s: any) => merged.find(col => col.key === s.key))
      .filter(Boolean) as ColumnConfig[];
    const newCols = merged.filter(col => !savedCols.some((s: any) => s.key === col.key));
    const extraSaved = savedCols
      .filter((s: any) => !defaultKeys.has(s.key))
      .map((s: any) => {
        const existing = ordered.find(o => o.key === s.key);
        return existing || {
          key: s.key,
          label: camelToLabel(s.key),
          visible: s.visible ?? false,
          width: s.width ?? 150,
          filterable: true,
          sortable: true,
        } as ColumnConfig;
      })
      .filter((s: any) => !ordered.some(o => o.key === s.key));
    return [...ordered, ...newCols, ...extraSaved];
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
      ...(col.align ? { align: col.align } : {}),
    }));
    localStorage.setItem(`table-columns-${tableKey}`, JSON.stringify(toSave));
  } catch {}
}

export function useDataTable({ defaultColumns, defaultSort, tableKey, data }: UseDataTableProps) {
  const [columns, setColumnsState] = useState<ColumnConfig[]>(() => {
    if (!tableKey) return defaultColumns;
    return loadColumnsFromStorage(tableKey, defaultColumns);
  });

  const discoveredKeysRef = useRef<string>('');

  useEffect(() => {
    if (!data || data.length === 0) return;
    const allColumns = autoDiscoverColumns(data, defaultColumns);
    const newKeys = allColumns.map(c => c.key).sort().join(',');
    if (newKeys === discoveredKeysRef.current) return;
    discoveredKeysRef.current = newKeys;

    setColumnsState(prev => {
      const existingKeys = new Set(prev.map(c => c.key));
      const brandNew = allColumns.filter(c => !existingKeys.has(c.key));
      const updated = prev.map(col => {
        const discovered = allColumns.find(d => d.key === col.key);
        if (!discovered) return col;
        return {
          ...col,
          renderCell: discovered.renderCell ?? col.renderCell,
          align: discovered.align ?? col.align,
        };
      });
      const merged = [...updated, ...brandNew];
      if (brandNew.length > 0 && tableKey) saveColumnsToStorage(tableKey, merged);
      return merged;
    });
  }, [data, defaultColumns, tableKey]);

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
  const [filters, setFiltersState] = useState<ColumnFilter[]>(() => {
    if (!tableKey) return [];
    try {
      const stored = localStorage.getItem(`table-filters-${tableKey}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const setFilters = useCallback((value: ColumnFilter[] | ((prev: ColumnFilter[]) => ColumnFilter[])) => {
    setFiltersState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      if (tableKey) {
        try {
          if (newValue.length > 0) {
            localStorage.setItem(`table-filters-${tableKey}`, JSON.stringify(newValue));
          } else {
            localStorage.removeItem(`table-filters-${tableKey}`);
          }
        } catch {}
      }
      return newValue;
    });
  }, [tableKey]);

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
      const aStr = String(aValue);
      const bStr = String(bValue);
      let comparison = 0;
      const isDottedNumber = /^\d+(\.\d+)*$/.test(aStr) && /^\d+(\.\d+)*$/.test(bStr);
      if (isDottedNumber) {
        const partsA = aStr.split('.').map(Number);
        const partsB = bStr.split('.').map(Number);
        const maxLen = Math.max(partsA.length, partsB.length);
        for (let i = 0; i < maxLen; i++) {
          const diff = (partsA[i] || 0) - (partsB[i] || 0);
          if (diff !== 0) { comparison = diff; break; }
        }
      } else {
        const aLower = aStr.toLowerCase();
        const bLower = bStr.toLowerCase();
        if (aLower < bLower) comparison = -1;
        if (aLower > bLower) comparison = 1;
      }
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
