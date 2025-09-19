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
  sortable: boolean;
};

type SortConfig = {
  column: string;
  direction: 'asc' | 'desc';
} | null;

interface ContactPersonsContextType {
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
  toggleAllRows: (contactIds: string[]) => void;
  deleteSelectedRows: () => void;
  confirmDeleteContacts: () => void;
  sortConfig: SortConfig;
  handleSort: (column: string) => void;
  showAddContactDialog: boolean;
  setShowAddContactDialog: (show: boolean) => void;
  showColumnDialog: boolean;
  setShowColumnDialog: (show: boolean) => void;
  showFilterDialog: boolean;
  setShowFilterDialog: (show: boolean) => void;
  showDeleteConfirmDialog: boolean;
  setShowDeleteConfirmDialog: (show: boolean) => void;
}

const ContactPersonsContext = createContext<ContactPersonsContextType | undefined>(undefined);

export function ContactPersonsProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'id', label: 'Contact ID', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'firstName', label: 'First Name', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'lastName', label: 'Last Name', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'email', label: 'Email', visible: true, width: 200, filterable: true, sortable: true },
    { key: 'phone', label: 'Phone', visible: true, width: 140, filterable: true, sortable: true },
    { key: 'mobile', label: 'Mobile', visible: true, width: 140, filterable: true, sortable: true },
    { key: 'position', label: 'Position', visible: true, width: 150, filterable: true, sortable: true },
    { key: 'isPrimary', label: 'Primary', visible: true, width: 100, filterable: true, sortable: true },
    { key: 'dateOfBirth', label: 'Date of Birth', visible: false, width: 120, filterable: true, sortable: true },
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

  const toggleAllRows = (contactIds: string[]) => {
    if (selectedRows.length === contactIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(contactIds);
    }
  };

  const deleteSelectedRows = () => {
    if (selectedRows.length > 0) {
      setShowDeleteConfirmDialog(true);
    }
  };

  const confirmDeleteContacts = async () => {
    if (selectedRows.length > 0) {
      try {
        // Delete each contact person
        for (const contactId of selectedRows) {
          const response = await fetch(`/api/customer-contacts/${contactId}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete contact person ${contactId}`);
          }
        }
        
        // After successful deletion, clear the selection
        setSelectedRows([]);
        setShowDeleteConfirmDialog(false);
        
        console.log('Successfully deleted contact persons:', selectedRows);
      } catch (error) {
        console.error('Error deleting contact persons:', error);
      }
    }
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' ? { column, direction: 'desc' } : { column, direction: 'asc' };
      } else {
        return { column, direction: 'asc' };
      }
    });
  };

  return (
    <ContactPersonsContext.Provider value={{
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
      confirmDeleteContacts,
      sortConfig,
      handleSort,
      showAddContactDialog,
      setShowAddContactDialog,
      showColumnDialog,
      setShowColumnDialog,
      showFilterDialog,
      setShowFilterDialog,
      showDeleteConfirmDialog,
      setShowDeleteConfirmDialog,
    }}>
      {children}
    </ContactPersonsContext.Provider>
  );
}

export function useContactPersonsContext() {
  const context = useContext(ContactPersonsContext);
  if (context === undefined) {
    throw new Error('useContactPersonsContext must be used within a ContactPersonsProvider');
  }
  return context;
}