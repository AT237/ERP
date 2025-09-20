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

interface ProspectsContextType {
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
  toggleAllRows: (prospectIds: string[]) => void;
  deleteSelectedRows: () => void;
  confirmDeleteProspects: () => void;
  sortConfig: SortConfig;
  handleSort: (column: string) => void;
  showAddProspectDialog: boolean;
  setShowAddProspectDialog: (show: boolean) => void;
  showColumnDialog: boolean;
  setShowColumnDialog: (show: boolean) => void;
  showFilterDialog: boolean;
  setShowFilterDialog: (show: boolean) => void;
  showDeleteConfirmDialog: boolean;
  setShowDeleteConfirmDialog: (show: boolean) => void;
}

const ProspectsContext = createContext<ProspectsContextType | undefined>(undefined);

export function ProspectsProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showAddProspectDialog, setShowAddProspectDialog] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'id', label: 'Prospect ID', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'prospectNumber', label: 'Prospect Number', visible: true, width: 140, filterable: true, sortable: true },
    { key: 'firstName', label: 'First Name', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'lastName', label: 'Last Name', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'companyName', label: 'Company', visible: true, width: 180, filterable: true, sortable: true },
    { key: 'email', label: 'Email', visible: true, width: 200, filterable: true, sortable: true },
    { key: 'phone', label: 'Phone', visible: true, width: 140, filterable: true, sortable: true },
    { key: 'mobile', label: 'Mobile', visible: true, width: 140, filterable: true, sortable: true },
    { key: 'position', label: 'Position', visible: true, width: 150, filterable: true, sortable: true },
    { key: 'industry', label: 'Industry', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'source', label: 'Source', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'status', label: 'Status', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'priority', label: 'Priority', visible: true, width: 100, filterable: true, sortable: true },
    { key: 'estimatedValue', label: 'Est. Value', visible: true, width: 120, filterable: true, sortable: true },
    { key: 'assignedTo', label: 'Assigned To', visible: true, width: 140, filterable: true, sortable: true },
    { key: 'nextFollowUp', label: 'Next Follow Up', visible: false, width: 140, filterable: true, sortable: true },
    { key: 'lastContactDate', label: 'Last Contact', visible: false, width: 140, filterable: true, sortable: true },
    { key: 'notes', label: 'Notes', visible: false, width: 200, filterable: true, sortable: true },
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

  const toggleAllRows = (prospectIds: string[]) => {
    if (selectedRows.length === prospectIds.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(prospectIds);
    }
  };

  const deleteSelectedRows = () => {
    if (selectedRows.length > 0) {
      setShowDeleteConfirmDialog(true);
    }
  };

  const confirmDeleteProspects = async () => {
    if (selectedRows.length > 0) {
      try {
        // Delete each prospect
        for (const prospectId of selectedRows) {
          const response = await fetch(`/api/prospects/${prospectId}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error(`Failed to delete prospect ${prospectId}`);
          }
        }
        
        // After successful deletion, clear the selection
        setSelectedRows([]);
        setShowDeleteConfirmDialog(false);
        
        console.log('Successfully deleted prospects:', selectedRows);
      } catch (error) {
        console.error('Error deleting prospects:', error);
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
    <ProspectsContext.Provider value={{
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
      confirmDeleteProspects,
      sortConfig,
      handleSort,
      showAddProspectDialog,
      setShowAddProspectDialog,
      showColumnDialog,
      setShowColumnDialog,
      showFilterDialog,
      setShowFilterDialog,
      showDeleteConfirmDialog,
      setShowDeleteConfirmDialog,
    }}>
      {children}
    </ProspectsContext.Provider>
  );
}

export function useProspectsContext() {
  const context = useContext(ProspectsContext);
  if (context === undefined) {
    throw new Error('useProspectsContext must be used within a ProspectsProvider');
  }
  return context;
}