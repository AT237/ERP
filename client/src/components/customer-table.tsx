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
import { Filter, ChevronDown, Plus, Search, Trash2, Settings, Eye, EyeOff, GripVertical } from "lucide-react";

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
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const queryClient = useQueryClient();

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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('nl-NL');
  };

  const toggleColumnVisibility = (columnKey: string) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, visible: !col.visible } : col
    ));
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
      setColumns(prev => prev.map(col => 
        col.key === resizing.column ? { ...col, width: newWidth } : col
      ));
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

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleAllRows = () => {
    if (selectedRows.length === filteredCustomers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredCustomers.map(customer => customer.id));
    }
  };

  const visibleColumns = columns.filter(col => col.visible);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Compact Controls - Only delete button now */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-end gap-2 py-1">
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-8 text-xs"
          >
            <Trash2 size={14} className="mr-1" />
            Verwijderen ({selectedRows.length})
          </Button>
        </div>
      )}

      {/* Active Filters - Compact */}
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

      {/* Compact Results count */}
      <div className="text-xs text-muted-foreground py-1">
        {filteredCustomers.length} of {customers.length} customers
        {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
      </div>

      {/* Compact Table with Resizable Columns */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 h-8">
              <TableHead className="w-8 p-2">
                <Checkbox
                  checked={selectedRows.length === filteredCustomers.length && filteredCustomers.length > 0}
                  onCheckedChange={toggleAllRows}
                  className="h-3 w-3"
                />
              </TableHead>
              {visibleColumns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className="font-medium text-xs p-2 relative"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-1 pr-2">
                    <span className="truncate">{column.label}</span>
                    {column.filterable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addFilter(column.key)}
                        className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                      >
                        <Filter size={10} />
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
                  className={`hover:bg-muted/30 h-8 text-xs ${
                    selectedRows.includes(customer.id) ? 'bg-muted/50' : ''
                  }`}
                >
                  <TableCell className="p-2">
                    <Checkbox
                      checked={selectedRows.includes(customer.id)}
                      onCheckedChange={() => toggleRowSelection(customer.id)}
                      className="h-3 w-3"
                    />
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className="p-2 text-xs truncate"
                      style={{ width: column.width }}
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
  );
}