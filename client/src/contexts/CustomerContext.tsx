import { createContext, useContext, useState, ReactNode } from 'react';

type FilterType = 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'starts_with' | 'ends_with';

type ColumnFilter = {
  column: string;
  type: FilterType;
  value: string;
};

type ColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  filterable: boolean;
};

interface CustomerContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: ColumnFilter[];
  setFilters: (filters: ColumnFilter[]) => void;
  addFilter: (column: string) => void;
  updateFilter: (index: number, field: keyof ColumnFilter, value: string) => void;
  removeFilter: (index: number) => void;
  columns: ColumnConfig[];
  setColumns: (columns: ColumnConfig[]) => void;
  toggleColumnVisibility: (columnKey: string) => void;
  selectedRows: string[];
  setSelectedRows: (rows: string[]) => void;
  toggleRowSelection: (id: string) => void;
  toggleAllRows: (customerIds: string[]) => void;
  showAddCustomerDialog: boolean;
  setShowAddCustomerDialog: (show: boolean) => void;
  showColumnDialog: boolean;
  setShowColumnDialog: (show: boolean) => void;
  showFilterDialog: boolean;
  setShowFilterDialog: (show: boolean) => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'name', label: 'Name', visible: true, width: 180, filterable: true },
    { key: 'email', label: 'Email', visible: true, width: 200, filterable: true },
    { key: 'phone', label: 'Phone', visible: true, width: 140, filterable: true },
    { key: 'address', label: 'Address', visible: true, width: 220, filterable: true },
    { key: 'contactPerson', label: 'Contact', visible: true, width: 150, filterable: true },
    { key: 'taxId', label: 'Tax ID', visible: true, width: 120, filterable: true },
    { key: 'paymentTerms', label: 'Terms', visible: true, width: 80, filterable: true },
    { key: 'status', label: 'Status', visible: true, width: 100, filterable: true },
    { key: 'createdAt', label: 'Created', visible: true, width: 100, filterable: true },
  ]);

  const addFilter = (column: string) => {
    setFilters(prev => [...prev, { column, type: 'contains', value: '' }]);
  };

  const updateFilter = (index: number, field: keyof ColumnFilter, value: string) => {
    setFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, [field]: value } : filter
    ));
  };

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  };

  const toggleColumnVisibility = (columnKey: string) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleAllRows = (customerIds: string[]) => {
    if (selectedRows.length === customerIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(customerIds);
    }
  };

  return (
    <CustomerContext.Provider value={{
      searchTerm,
      setSearchTerm,
      filters,
      setFilters,
      addFilter,
      updateFilter,
      removeFilter,
      columns,
      setColumns,
      toggleColumnVisibility,
      selectedRows,
      setSelectedRows,
      toggleRowSelection,
      toggleAllRows,
      showAddCustomerDialog,
      setShowAddCustomerDialog,
      showColumnDialog,
      setShowColumnDialog,
      showFilterDialog,
      setShowFilterDialog,
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomerContext() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomerContext must be used within a CustomerProvider');
  }
  return context;
}