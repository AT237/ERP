import { useState, useMemo, useEffect } from 'react';
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
  // Load columns from localStorage if available
  const getStoredColumns = (): ColumnConfig[] => {
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
  };

  // Column management
  const [columns, setColumnsState] = useState<ColumnConfig[]>(getStoredColumns());
  
  // Save columns to localStorage when they change
  const setColumns = (newColumns: ColumnConfig[] | ((prev: ColumnConfig[]) => ColumnConfig[])) => {
    const updatedColumns = typeof newColumns === 'function' ? newColumns(columns) : newColumns;
    setColumnsState(updatedColumns);
    
    if (tableKey) {
      try {
        localStorage.setItem(`table-columns-${tableKey}`, JSON.stringify(updatedColumns));
      } catch (error) {
        console.warn('Failed to save table columns to localStorage:', error);
      }
    }
  };
  
  // Search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort || null);
  
  // Row selection
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // Save to localStorage when columns change
  useEffect(() => {
    if (tableKey) {
      try {
        localStorage.setItem(`table-columns-${tableKey}`, JSON.stringify(columns));
      } catch (error) {
        console.warn('Failed to save table columns to localStorage:', error);
      }
    }
  }, [columns, tableKey]);

  // Helper functions
  const toggleColumnVisibility = (columnKey: string) => {
    setColumns((prev: ColumnConfig[]) => prev.map((col: ColumnConfig) => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
  };

  const addFilter = (columnKey: string) => {
    const newFilter: ColumnFilter = {
      column: columnKey,
      type: 'contains',
      value: ''
    };
    setFilters(prev => [...prev, newFilter]);
  };

  const updateFilter = (index: number, filter: ColumnFilter) => {
    setFilters(prev => prev.map((f, i) => i === index ? filter : f));
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' 
          ? { column, direction: 'desc' }
          : null;
      }
      return { column, direction: 'asc' };
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleAllRows = (allRowIds: string[]) => {
    setSelectedRows(prev => 
      prev.length === allRowIds.length ? [] : allRowIds
    );
  };

  const clearSelection = () => {
    setSelectedRows([]);
  };

  // Generic filter function
  const applyFilter = (value: any, filter: ColumnFilter): boolean => {
    if (!filter.value) return true;
    
    const cellValue = String(value || '').toLowerCase();
    const filterValue = filter.value?.toLowerCase() || '';
    
    switch (filter.type) {
      case 'contains':
        return cellValue.includes(filterValue);
      case 'not_contains':
        return !cellValue.includes(filterValue);
      case 'equals':
        return cellValue === filterValue;
      case 'not_equals':
        return cellValue !== filterValue;
      case 'greater_than':
        return Number(cellValue) > Number(filterValue);
      case 'less_than':
        return Number(cellValue) < Number(filterValue);
      case 'starts_with':
        return cellValue.startsWith(filterValue);
      case 'ends_with':
        return cellValue.endsWith(filterValue);
      default:
        return true;
    }
  };

  // Generic filter and search function
  const applyFiltersAndSearch = <T extends Record<string, any>>(
    data: T[], 
    searchTerm: string, 
    filters: ColumnFilter[]
  ): T[] => {
    return data.filter(item => {
      // Apply global search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(item).some(value => 
          String(value || '').toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      // Apply column filters
      return filters.every(filter => {
        const value = item[filter.column];
        return applyFilter(value, filter);
      });
    });
  };

  // Generic sorting function
  const applySorting = <T extends Record<string, any>>(
    data: T[], 
    sortConfig: SortConfig
  ): T[] => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Handle different data types
      let comparison = 0;
      
      // Check if values are dates
      if (sortConfig.column.includes('At') || sortConfig.column.includes('Date')) {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        comparison = aDate.getTime() - bDate.getTime();
      }
      // Check if values are numbers
      else if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
        comparison = Number(aValue) - Number(bValue);
      }
      // String comparison
      else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  return {
    // State
    columns,
    setColumns,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sortConfig,
    setSortConfig,
    selectedRows,
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
    
    // Helper functions
    applyFiltersAndSearch,
    applySorting,
  };
}