import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useCustomerContext } from "@/contexts/CustomerContext";
import { Filter, ChevronDown, Plus, Search, Settings, Eye, EyeOff, GripVertical, Trash2, Copy, Download, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


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

// Form schema for the Add Customer dialog
const formSchema = insertCustomerSchema.extend({
  paymentTerms: z.string().min(1, "Payment terms is required"),
  // Address fields
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  // Primary contact fields
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  primaryContactMobile: z.string().optional(),
  primaryContactPosition: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
    showColumnDialog,
    setShowColumnDialog,
  } = customerContext;
  
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const [selectedCustomerForReport, setSelectedCustomerForReport] = useState<Customer | null>(null);
  const [showCustomerReport, setShowCustomerReport] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form setup for Add Customer dialog
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      mobile: "",
      taxId: "",
      paymentTerms: "30",
      status: "active",
      bankAccount: "",
      language: "en",
      // Address fields
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "",
      // Primary contact fields
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      primaryContactMobile: "",
      primaryContactPosition: "",
    }
  });

  // Mutation for creating new customer
  const createCustomerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const customerData: InsertCustomer = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
        bankAccount: data.bankAccount || null,
        language: data.language,
      };
      
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create customer");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowAddCustomerDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to add customer:", error);
    }
  });

  // Mutation for updating customer
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editingCustomer) throw new Error("No customer to update");
      
      const customerData: Partial<InsertCustomer> = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        taxId: data.taxId || null,
        paymentTerms: parseInt(data.paymentTerms),
        status: data.status,
        bankAccount: data.bankAccount || null,
        language: data.language,
      };
      
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update customer");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      setShowAddCustomerDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
      console.error("Failed to update customer:", error);
    }
  });

  // Update form when editing customer changes
  React.useEffect(() => {
    if (editingCustomer) {
      form.reset({
        name: editingCustomer.name || "",
        email: editingCustomer.email || "",
        phone: editingCustomer.phone || "",
        mobile: editingCustomer.mobile || "",
        taxId: editingCustomer.taxId || "",
        paymentTerms: editingCustomer.paymentTerms?.toString() || "30",
        status: editingCustomer.status || "active",
        bankAccount: editingCustomer.bankAccount || "",
        language: editingCustomer.language || "en",
        // Address fields - need to be handled separately when addresses are implemented
        street: "",
        houseNumber: "",
        postalCode: "",
        city: "",
        country: "",
        // Primary contact fields
        primaryContactName: "",
        primaryContactEmail: "",
        primaryContactPhone: "",
        primaryContactMobile: "",
        primaryContactPosition: "",
      });
    }
  }, [editingCustomer, form]);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddCustomerDialog(true);
    setShowCustomerReport(false);
  };

  const onSubmit = (data: FormData) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate(data);
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleCustomerDoubleClick = (customer: Customer) => {
    setSelectedCustomerForReport(customer);
    setShowCustomerReport(true);
  };

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

  // Handle Email PDF functionality
  const handleEmailPDF = async (customer: Customer) => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we prepare the customer report.",
      });

      // Generate PDF content in A4 format
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Page header - center aligned document title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      const currentDate = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const title = `CUSTOMER REPORT ${customer.customerNumber}`;
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pageWidth - titleWidth) / 2, 25);
      
      // Date on the right
      pdf.setFontSize(12);
      pdf.text(`Date: ${currentDate}`, pageWidth - 50, 25);
      
      // Company details header (left side)
      let yPos = 45;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Company: Your Company Name', 20, yPos);
      
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      pdf.text('Address Line 1', 28, yPos);
      yPos += 5;
      pdf.text('Address Line 2', 28, yPos);
      yPos += 5;
      pdf.text('Phone: +31 (0)xx xxx xxxx', 28, yPos);
      yPos += 5;
      pdf.text('Email: info@company.nl', 28, yPos);
      yPos += 5;
      pdf.text('VAT no. NL xxxx xxxxx Bxx', 28, yPos);
      yPos += 5;
      pdf.text('C.o.c. no. xxxxxxxx', 28, yPos);
      
      // Customer details header (right side)
      yPos = 45;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Customer: ${customer.name}`, pageWidth - 80, yPos);
      
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      if (customer.email) {
        pdf.text(customer.email, pageWidth - 72, yPos);
        yPos += 5;
      }
      if (customer.phone) {
        pdf.text(`Phone: ${customer.phone}`, pageWidth - 72, yPos);
        yPos += 5;
      }
      if (customer.mobile) {
        pdf.text(`Mobile: ${customer.mobile}`, pageWidth - 72, yPos);
        yPos += 5;
      }
      if (customer.taxId) {
        pdf.text(`VAT: ${customer.taxId}`, pageWidth - 72, yPos);
        yPos += 5;
      }
      
      // Main content section
      yPos = 100;
      
      // Customer Information Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Customer Information:', 20, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Create table-like structure
      const leftCol = 20;
      const rightCol = 90;
      const lineHeight = 6;
      
      pdf.text('Customer ID:', leftCol, yPos);
      pdf.text(customer.customerNumber || '-', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Name:', leftCol, yPos);
      pdf.text(customer.name, rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Email:', leftCol, yPos);
      pdf.text(customer.email || '-', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Phone:', leftCol, yPos);
      pdf.text(customer.phone || '-', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Mobile:', leftCol, yPos);
      pdf.text(customer.mobile || '-', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Tax ID:', leftCol, yPos);
      pdf.text(customer.taxId || '-', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Bank Account:', leftCol, yPos);
      pdf.text(customer.bankAccount || '-', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Payment Terms:', leftCol, yPos);
      pdf.text(`${customer.paymentTerms} days`, rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Status:', leftCol, yPos);
      pdf.text(customer.status.toUpperCase(), rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Created:', leftCol, yPos);
      pdf.text(customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : '-', rightCol, yPos);
      yPos += lineHeight * 2;
      
      // Statistics Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Customer Statistics:', 20, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      pdf.text('Total Projects:', leftCol, yPos);
      pdf.text('0', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Total Invoices:', leftCol, yPos);
      pdf.text('0', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Total Revenue:', leftCol, yPos);
      pdf.text('€0,00', rightCol, yPos);
      yPos += lineHeight;
      
      pdf.text('Active Orders:', leftCol, yPos);
      pdf.text('0', rightCol, yPos);
      yPos += lineHeight * 3;
      
      // Notes section
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', leftCol, yPos);
      yPos += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Customer report automatically generated from business management system.', leftCol, yPos);
      
      // Footer section (similar to packing list)
      const footerY = pageHeight - 40;
      
      // Terms line
      pdf.setFontSize(9);
      pdf.text('Our general terms and conditions apply to all our services.', 20, footerY - 10);
      
      // Signature section
      pdf.setFontSize(10);
      pdf.text('Kind regards, Management', 20, footerY);
      
      pdf.text('Name receiver:', pageWidth - 100, footerY);
      pdf.text('Signature receiver:', pageWidth - 100, footerY + 15);
      pdf.text('Date:', pageWidth - 100, footerY + 30);
      
      // Draw signature lines
      pdf.line(pageWidth - 60, footerY + 2, pageWidth - 20, footerY + 2);
      pdf.line(pageWidth - 60, footerY + 17, pageWidth - 20, footerY + 17);
      pdf.line(pageWidth - 60, footerY + 32, pageWidth - 20, footerY + 32);
      
      // Save PDF
      const fileName = `Customer_Report_${customer.customerNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      // Open Outlook with pre-filled email
      const subject = `Customer Report - ${customer.name} (${customer.customerNumber})`;
      const body = `Dear colleague,%0A%0APlease find attached the customer report for ${customer.name} (Customer ID: ${customer.customerNumber}).%0A%0AGenerated on ${currentDate}.%0A%0ABest regards`;
      
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.open(mailtoLink, '_blank');
      
      toast({
        title: "PDF Generated Successfully",
        description: `Customer report saved as ${fileName}. Outlook should open with a pre-filled email.`,
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
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
    <>
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
            <DropdownMenuContent 
              className="w-48" 
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs font-medium p-2 border-b">Column Visibility</div>
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={column.visible}
                  onCheckedChange={(checked) => {
                    toggleColumnVisibility(column.key);
                  }}
                  onSelect={(e) => e.preventDefault()}
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
                  className={`hover:bg-muted/30 text-xs cursor-pointer ${
                    selectedRows.includes(customer.id) ? 'bg-muted/50' : 'bg-transparent'
                  }`}
                  style={{ height: '32px', minHeight: '32px', maxHeight: '32px' }}
                  onDoubleClick={() => handleCustomerDoubleClick(customer)}
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
                      {column.key === 'customerNumber' ? (
                        <span className="font-mono text-xs">{customer.customerNumber || customer.id.slice(0, 8)}</span>
                      ) : column.key === 'name' ? (
                        <span className="font-medium">{customer.name}</span>
                      ) : column.key === 'email' ? (
                        customer.email || '-'
                      ) : column.key === 'phone' ? (
                        customer.phone || '-'
                      ) : column.key === 'mobile' ? (
                        customer.mobile || '-'
                      ) : column.key === 'taxId' ? (
                        customer.taxId || '-'
                      ) : column.key === 'bankAccount' ? (
                        customer.bankAccount || '-'
                      ) : column.key === 'language' ? (
                        customer.language || '-'
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
                        customer.createdAt ? formatDate(customer.createdAt) : '-'
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

    {/* Add Customer Dialog */}
    <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex justify-center">
            <DialogTitle className="text-2xl font-bold text-orange-600">
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </div>
          <div className="w-full h-px bg-gray-300 mt-4"></div>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Company Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="name" className="w-32 text-right">Company Name *</Label>
                <div className="flex-1">
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Enter company name"
                    data-testid="input-customer-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="taxId" className="w-32 text-right">Tax ID</Label>
                <Input
                  id="taxId"
                  {...form.register("taxId")}
                  placeholder="Tax identification number"
                  data-testid="input-customer-tax-id"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="email" className="w-32 text-right">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="company@example.com"
                  data-testid="input-customer-email"
                  className="flex-1"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="phone" className="w-32 text-right">Phone Number</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+31 20 123 4567"
                  data-testid="input-customer-phone"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="mobile" className="w-32 text-right">Mobile Number</Label>
                <Input
                  id="mobile"
                  {...form.register("mobile")}
                  placeholder="+31 6 12 34 56 78"
                  data-testid="input-customer-mobile"
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="bankAccount" className="w-32 text-right">Bank Account</Label>
                <Input
                  id="bankAccount"
                  {...form.register("bankAccount")}
                  placeholder="NL91 ABNA 0417 1643 00"
                  data-testid="input-customer-bank-account"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Contact Persons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Contact Persons
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="contactPersons" className="w-32 text-right">Contact Persons</Label>
                <div className="flex gap-2 flex-1">
                  <Select>
                    <SelectTrigger data-testid="select-contact-persons" className="flex-1">
                      <SelectValue placeholder="Select existing contact persons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="john-doe">John Doe - Sales Manager</SelectItem>
                      <SelectItem value="jane-smith">Jane Smith - Project Manager</SelectItem>
                      <SelectItem value="mike-jones">Mike Jones - Technical Lead</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {/* TODO: Open contact person dialog */}}
                    data-testid="button-add-contact-person"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Business Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
              Business Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="paymentTerms" className="w-32 text-right">Payment Terms *</Label>
                <div className="flex gap-2 flex-1">
                  <Select onValueChange={(value) => form.setValue("paymentTerms", value)}>
                    <SelectTrigger data-testid="select-payment-terms" className="flex-1">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediate payment</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {/* TODO: Open payment terms dialog */}}
                    data-testid="button-add-payment-terms"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                {form.formState.errors.paymentTerms && (
                  <p className="text-sm text-destructive mt-1 ml-36">
                    {form.formState.errors.paymentTerms.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="status" className="w-32 text-right">Status</Label>
                <div className="flex gap-2 flex-1">
                  <Select onValueChange={(value) => form.setValue("status", value)}>
                    <SelectTrigger data-testid="select-customer-status" className="flex-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {/* TODO: Open status dialog */}}
                    data-testid="button-add-status"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="language" className="w-32 text-right">Language</Label>
                <div className="flex gap-2 flex-1">
                  <Select onValueChange={(value) => form.setValue("language", value)}>
                    <SelectTrigger data-testid="select-customer-language" className="flex-1">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="nl">Dutch</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {/* TODO: Open language dialog */}}
                    data-testid="button-add-language"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddCustomerDialog(false)}
              data-testid="button-cancel-customer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={createCustomerMutation.isPending}
              data-testid="button-save-customer"
            >
              {editingCustomer 
                ? (updateCustomerMutation.isPending ? "Updating..." : "Update Customer")
                : (createCustomerMutation.isPending ? "Adding..." : "Add Customer")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Customer Report Dialog */}
    <Dialog open={showCustomerReport} onOpenChange={setShowCustomerReport}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex justify-center">
            <DialogTitle className="text-2xl font-bold text-orange-600">Customer Report</DialogTitle>
          </div>
          <div className="w-full h-px bg-gray-300 mt-4"></div>
        </DialogHeader>
        
        {selectedCustomerForReport && (
          <div className="space-y-6">
            {/* Customer Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-800">{selectedCustomerForReport.name}</h2>
              <p className="text-sm text-gray-600">Customer ID: {selectedCustomerForReport.customerNumber}</p>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span>{selectedCustomerForReport.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Phone:</span>
                    <span>{selectedCustomerForReport.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Address:</span>
                    <span className="text-right max-w-48">{selectedCustomerForReport.addressId ? 'Address linked' : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Contact Person:</span>
                    <span>N/A</span>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                  Business Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Tax ID:</span>
                    <span>{selectedCustomerForReport.taxId || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Payment Terms:</span>
                    <span>{selectedCustomerForReport.paymentTerms} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      selectedCustomerForReport.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCustomerForReport.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Created:</span>
                    <span>{selectedCustomerForReport.createdAt ? new Date(selectedCustomerForReport.createdAt).toLocaleDateString('en-US') : '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2">
                Customer Statistics
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-gray-600">Total Projects</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Total Invoices</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">€0</div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Active Orders</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomerReport(false)}
                data-testid="button-close-report"
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                onClick={() => handleEmailPDF(selectedCustomerForReport!)}
                data-testid="button-email-pdf"
              >
                <Mail size={16} className="mr-2" />
                Email as PDF
              </Button>
              <Button
                type="button"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => handleEditCustomer(selectedCustomerForReport!)}
                data-testid="button-edit-customer"
              >
                Edit Customer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    {/* Column Visibility Dialog */}
    <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Toggle column visibility:</p>
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.key} className="flex items-center justify-between">
                <label className="text-sm font-medium">{column.label}</label>
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={() => toggleColumnVisibility(column.key)}
                  className="h-4 w-4 border-2 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowColumnDialog(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    </>
  );
}