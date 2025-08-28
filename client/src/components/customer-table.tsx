import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useCustomerContext } from "@/contexts/CustomerContext";
import { Filter, ChevronDown, Plus, Search, Settings, Eye, EyeOff, GripVertical, Trash2, Copy, Download } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  taxId: string | null;
  paymentTerms: number;
  status: string;
  createdAt: Date;
};

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

export default function CustomerTable() {
  const customerContext = useCustomerContext();
  const {
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
    showAddCustomerDialog,
    setShowAddCustomerDialog,
  } = customerContext;
  
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const applyFilter = (value: any, filter: ColumnFilter): boolean => {
    if (!filter.value) return true;
    
    const cellValue = String(value || '').toLowerCase();
    const filterValue = filter.value.toLowerCase();
    
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

  const filteredCustomers = customers.filter(customer => {
    // Apply global search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = Object.values(customer).some(value => 
        String(value || '').toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Apply column filters
    return filters.every(filter => {
      const value = customer[filter.column as keyof Customer];
      return applyFilter(value, filter);
    });
  });


  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('nl-NL');
  };


  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    const column = columns.find(col => col.key === columnKey);
    if (column) {
      setResizing({
        column: columnKey,
        startX: e.clientX,
        startWidth: column.width
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizing) {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(60, resizing.startWidth + diff);
      setColumns(prev => prev.map((col: ColumnConfig) => 
        col.key === resizing.column ? { ...col, width: newWidth } : col
      ) as ColumnConfig[]);
    }
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing]);


  const visibleColumns = columns.filter(col => col.visible);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Customer Controls Toolbar */}
      <div className="flex items-center gap-12 p-2">
        {/* Title Section */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-12 py-3 shadow-lg shadow-orange-500/20 ring-1 ring-orange-500/10">
          <h2 className="text-xl font-bold text-orange-800 dark:text-orange-200">Customers</h2>
        </div>
        
        {/* Actions Section */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm w-64"
              data-testid="search-customers"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
          </div>
          
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs w-20">
                <Filter size={14} className="mr-1" />
                Filter{filters.length > 0 ? ` ${filters.length}` : ''}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columns.filter(col => col.filterable).map((column) => (
                <DropdownMenuItem
                  key={column.key}
                  onClick={() => addFilter(column.key)}
                  className="text-xs"
                >
                  {column.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Settings size={14} className="mr-1" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="text-xs font-medium p-2 border-b">Column Visibility</div>
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={column.visible}
                  onCheckedChange={() => toggleColumnVisibility(column.key)}
                  className="text-xs"
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            size="sm" 
            className="h-8 text-xs bg-green-600 text-white hover:bg-green-700"
            onClick={() => setShowAddCustomerDialog(true)}
          >
            <Plus size={14} className="mr-1" />
            Add Customer
          </Button>
          
          <Button 
            size="sm" 
            variant="destructive" 
            className={`h-8 text-xs w-28 ${selectedRows.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={selectedRows.length === 0}
            onClick={deleteSelectedRows}
          >
            <Trash2 size={14} className="mr-1" />
            <span className="min-w-[4rem] text-left">
              Delete{selectedRows.length > 0 ? ` ${selectedRows.length}` : ''}
            </span>
          </Button>
          
          {/* Duplicate button - always visible, disabled when not exactly 1 row selected */}
          <Button 
            size="sm" 
            variant="outline"
            className={`h-8 text-xs ${selectedRows.length !== 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={selectedRows.length !== 1}
            onClick={() => {
              // TODO: Implement duplicate functionality
              console.log('Duplicate customer:', selectedRows[0]);
            }}
          >
            <Copy size={14} className="mr-1" />
            Duplicate
          </Button>
          
          {/* Export button - always visible, disabled when no rows selected */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 text-xs w-28 ${selectedRows.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={selectedRows.length === 0}
              >
                <Download size={14} className="mr-1" />
                <span className="min-w-[4rem] text-left">
                  Export{selectedRows.length > 0 ? ` ${selectedRows.length}` : ''}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  // TODO: Implement Excel export
                  console.log('Export to Excel:', selectedRows);
                }}
                className="text-xs"
              >
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // TODO: Implement PDF export
                  console.log('Export to PDF:', selectedRows);
                }}
                className="text-xs"
              >
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // TODO: Implement Word export
                  console.log('Export to Word:', selectedRows);
                }}
                className="text-xs"
              >
                Export to Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    <div className="space-y-4">

      {/* Active Filters - Compact */}
      <div className="min-h-[2rem] flex items-start">
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-1">
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
              <span className="font-medium">
                {visibleColumns.find(col => col.key === filter.column)?.label}
              </span>
              <Select 
                value={filter.type} 
                onValueChange={(value) => updateFilter(index, 'type', value)}
              >
                <SelectTrigger className="w-24 h-6 text-xs border-0 p-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Value"
                value={filter.value}
                onChange={(e) => updateFilter(index, 'value', e.target.value)}
                className="w-20 h-6 text-xs border-0 p-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(index)}
                className="h-6 w-6 p-0 text-xs"
              >
                ×
              </Button>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Compact Results count */}
      <div className="text-xs text-muted-foreground py-1">
        {filteredCustomers.length} of {customers.length} customers
        {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
      </div>

      {/* Compact Table with Resizable Columns */}
      <div className="rounded-lg overflow-hidden border-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 h-6">
              <TableHead className="w-8 p-2">
                <div className="flex items-center justify-center h-4 w-4">
                  <Checkbox
                    checked={selectedRows.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={() => toggleAllRows(filteredCustomers.map(customer => customer.id))}
                    className="h-4 w-4 border-2 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 flex-shrink-0"
                    style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
                  />
                </div>
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className="font-bold text-xs p-2 relative uppercase"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span className="truncate">{column.label}</span>
                    {column.filterable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => addFilter(column.key)}
                        className="h-3 w-3 p-0 opacity-50 hover:opacity-100 flex-shrink-0"
                      >
                        <Filter size={8} />
                      </Button>
                    )}
                  </div>
                  {/* Resize Handle */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40"
                    onMouseDown={(e) => handleMouseDown(e, column.key)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-4 text-xs text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className={`hover:bg-muted/30 text-xs ${
                    selectedRows.includes(customer.id) ? 'bg-muted/50' : 'bg-transparent'
                  }`}
                  style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}
                >
                  <TableCell className="p-2" style={{ height: '32px', lineHeight: '1.2' }}>
                    <div className="flex items-center justify-center h-4 w-4">
                      <Checkbox
                        checked={selectedRows.includes(customer.id)}
                        onCheckedChange={() => toggleRowSelection(customer.id)}
                        className="h-4 w-4 border-2 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 flex-shrink-0"
                        style={{ minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
                      />
                    </div>
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className="p-2 text-xs truncate"
                      style={{ width: column.width, height: '32px', lineHeight: '1.2' }}
                    >
                      {column.key === 'name' ? (
                        <span className="font-medium">{customer.name}</span>
                      ) : column.key === 'email' ? (
                        customer.email || '-'
                      ) : column.key === 'phone' ? (
                        customer.phone || '-'
                      ) : column.key === 'address' ? (
                        <span className="truncate" title={customer.address || '-'}>
                          {customer.address || '-'}
                        </span>
                      ) : column.key === 'contactPerson' ? (
                        customer.contactPerson || '-'
                      ) : column.key === 'taxId' ? (
                        customer.taxId || '-'
                      ) : column.key === 'paymentTerms' ? (
                        `${customer.paymentTerms}d`
                      ) : column.key === 'status' ? (
                        <span className={`inline-flex px-1 py-0.5 rounded text-xs font-medium ${
                          customer.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.status}
                        </span>
                      ) : column.key === 'createdAt' ? (
                        formatDate(customer.createdAt)
                      ) : null}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}