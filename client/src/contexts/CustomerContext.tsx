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
  setFilters: (filters: ColumnFilter[] | ((prev: ColumnFilter[]) => ColumnFilter[])) => void;
  addFilter: (column: string) => void;
  updateFilter: (index: number, field: keyof ColumnFilter, value: string) => void;
  removeFilter: (index: number) => void;
  columns: ColumnConfig[];
  setColumns: (columns: ColumnConfig[] | ((prev: ColumnConfig[]) => ColumnConfig[])) => void;
  toggleColumnVisibility: (columnKey: string) => void;
  selectedRows: string[];
  setSelectedRows: (rows: string[] | ((prev: string[]) => string[])) => void;
  toggleRowSelection: (id: string) => void;
  toggleAllRows: (customerIds: string[]) => void;
  deleteSelectedRows: () => void;
  confirmDeleteCustomers: () => void;
  showAddCustomerDialog: boolean;
  setShowAddCustomerDialog: (show: boolean) => void;
  showColumnDialog: boolean;
  setShowColumnDialog: (show: boolean) => void;
  showFilterDialog: boolean;
  setShowFilterDialog: (show: boolean) => void;
  showDeleteConfirmDialog: boolean;
  setShowDeleteConfirmDialog: (show: boolean) => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'customerNumber', label: 'Customer ID', visible: true, width: 120, filterable: true },
    { key: 'name', label: 'Name', visible: true, width: 180, filterable: true },
    { key: 'email', label: 'Email', visible: true, width: 200, filterable: true },
    { key: 'phone', label: 'Phone', visible: true, width: 140, filterable: true },
    { key: 'mobile', label: 'Mobile', visible: false, width: 140, filterable: true },
    { key: 'taxId', label: 'Tax ID', visible: true, width: 120, filterable: true },
    { key: 'bankAccount', label: 'Bank Account', visible: false, width: 150, filterable: true },
    { key: 'language', label: 'Language', visible: false, width: 100, filterable: true },
    { key: 'paymentTerms', label: 'Payment Terms', visible: true, width: 120, filterable: true },
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

  const deleteSelectedRows = () => {
    if (selectedRows.length > 0) {
      setShowDeleteConfirmDialog(true);
    }
  };

  const confirmDeleteCustomers = async () => {
    if (selectedRows.length > 0) {
      try {
        // Delete each customer
        for (const customerId of selectedRows) {
          const response = await fetch(`/api/customers/${customerId}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete customer ${customerId}`);
          }
        }
        
        // After successful deletion, clear the selection
        setSelectedRows([]);
        setShowDeleteConfirmDialog(false);
        
        // You might want to trigger a refetch of customers here
        console.log('Successfully deleted customers:', selectedRows);
      } catch (error) {
        console.error('Error deleting customers:', error);
        // Here you would typically show an error toast
      }
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
      deleteSelectedRows,
      confirmDeleteCustomers,
      showAddCustomerDialog,
      setShowAddCustomerDialog,
      showColumnDialog,
      setShowColumnDialog,
      showFilterDialog,
      setShowFilterDialog,
      showDeleteConfirmDialog,
      setShowDeleteConfirmDialog,
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