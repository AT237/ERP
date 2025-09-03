import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormTabLayout } from '@/components/layouts/FormTabLayout';
import { InfoHeaderLayout } from '@/components/layouts/InfoHeaderLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Save, X, FileText, Download, Clock, MessageSquare, Eye, EyeOff, ChevronsUpDown, Check, Printer, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Quotation, InsertQuotation, QuotationItem, InsertQuotationItem, Customer, InventoryItem } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import jsPDF from 'jspdf';

// Memo interface
interface Memo {
  id: string;
  title: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

// Form schemas
const quotationFormSchema = insertQuotationSchema.extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  quotationDate: z.string().optional(),
  validUntil: z.string().optional(),
});

const quotationItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  lineTotal: z.string().min(1, "Line total is required"),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;
type QuotationItemFormData = z.infer<typeof quotationItemFormSchema>;

interface QuotationFormLayoutProps {
  onSave: () => void;
  quotationId?: string;
}

export function QuotationFormLayout({ onSave, quotationId }: QuotationFormLayoutProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [nextQuotationNumber, setNextQuotationNumber] = useState<string>("Q-2025-001");
  const { toast } = useToast();

  // Data table state for quotation items
  const itemTableState = useDataTable({ 
    defaultColumns: [
      createIdColumn('id', 'Line ID'),
      { 
        key: 'description', 
        label: 'Description', 
        visible: true, 
        width: 300, 
        filterable: true, 
        sortable: true
      },
      { 
        key: 'quantity', 
        label: 'Quantity', 
        visible: true, 
        width: 100, 
        filterable: true, 
        sortable: true,
        renderCell: (value: number) => value?.toString() || "0"
      },
      { 
        key: 'unitPrice', 
        label: 'Unit Price', 
        visible: true, 
        width: 120, 
        filterable: true, 
        sortable: true,
        renderCell: (value: string) => `€${value || "0.00"}`
      },
      { 
        key: 'lineTotal', 
        label: 'Line Total', 
        visible: true, 
        width: 120, 
        filterable: true, 
        sortable: true,
        renderCell: (value: string) => `€${value || "0.00"}`
      },
    ],
    tableKey: 'quotation-form-items'
  });

  // Fetch data
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Fetch existing quotation if editing
  const { data: existingQuotation, isLoading: quotationLoading } = useQuery<Quotation>({
    queryKey: ["/api/quotations", quotationId],
    enabled: !!quotationId,
  });

  // Fetch existing quotation items if editing
  const { data: existingQuotationItems = [] } = useQuery<QuotationItem[]>({
    queryKey: ["/api/quotations", quotationId, "items"],
    enabled: !!quotationId,
  });

  // Fetch all quotations to calculate next number for new quotations
  const { data: allQuotations = [] } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    enabled: !quotationId, // Only fetch when creating new quotation
  });

  // Forms
  const quotationForm = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: "Auto-generated",
      customerId: "",
      description: "",
      revisionNumber: "V1.0",
      status: "draft",
      quotationDate: format(new Date(), 'yyyy-MM-dd'),
      validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days from now
      subtotal: "0.00",
      taxAmount: "0.00",
      totalAmount: "0.00",
      notes: "",
      incoTerms: "",
      paymentConditions: "",
      deliveryConditions: "",
    },
  });

  const itemForm = useForm<QuotationItemFormData>({
    resolver: zodResolver(quotationItemFormSchema),
    defaultValues: {
      quotationId: "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
    },
  });

  // Calculate next quotation number for new quotations
  useEffect(() => {
    if (!quotationId && allQuotations.length >= 0) {
      const currentYear = new Date().getFullYear();
      
      // Filter quotations for current year and find the highest number
      const currentYearQuotations = allQuotations
        .filter(q => q.quotationNumber && q.quotationNumber.startsWith(`Q-${currentYear}`))
        .map(q => {
          const match = q.quotationNumber?.match(/Q-(\d{4})-(\d{3})/);
          return match ? parseInt(match[2]) : 0;
        })
        .filter(num => !isNaN(num));
      
      const lastNumber = currentYearQuotations.length > 0 ? Math.max(...currentYearQuotations) : 0;
      const nextNumber = lastNumber + 1;
      const newQuotationNumber = `Q-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
      
      setNextQuotationNumber(newQuotationNumber);
    }
  }, [allQuotations, quotationId]);

  // Load existing quotation data when editing
  useEffect(() => {
    if (existingQuotation && !quotationLoading) {
      quotationForm.reset({
        quotationNumber: existingQuotation.quotationNumber,
        customerId: existingQuotation.customerId,
        description: existingQuotation.description || "",
        revisionNumber: existingQuotation.revisionNumber || "V1.0",
        status: existingQuotation.status || "draft",
        quotationDate: existingQuotation.quotationDate ? format(new Date(existingQuotation.quotationDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        validUntil: existingQuotation.validUntil ? format(new Date(existingQuotation.validUntil), 'yyyy-MM-dd') : "",
        subtotal: existingQuotation.subtotal?.toString() || "0.00",
        taxAmount: existingQuotation.taxAmount?.toString() || "0.00",
        totalAmount: existingQuotation.totalAmount?.toString() || "0.00",
        notes: existingQuotation.notes || "",
        incoTerms: existingQuotation.incoTerms || "",
        paymentConditions: existingQuotation.paymentConditions || "",
        deliveryConditions: existingQuotation.deliveryConditions || "",
      });
      setQuotationItems(existingQuotationItems);
    }
  }, [existingQuotation, existingQuotationItems, quotationLoading, quotationForm]);

  // Mutations
  const createQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create quotation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      onSave();
    },
    onError: (error) => {
      console.error('Error creating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update quotation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      onSave();
    },
    onError: (error) => {
      console.error('Error updating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const handleSaveQuotation = (data: QuotationFormData) => {
    console.log('Received quotation data:', data);
    if (quotationId) {
      updateQuotationMutation.mutate(data);
    } else {
      createQuotationMutation.mutate(data);
    }
  };

  // Memo functionality
  const handleAddMemo = () => {
    const newMemo: Memo = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Memo ${memos.length + 1}`,
      content: "",
      isInternal: true,
      createdAt: new Date()
    };
    setMemos(prev => [...prev, newMemo]);
  };

  const handleUpdateMemo = (memoId: string, updates: Partial<Memo>) => {
    setMemos(prev => prev.map(memo => 
      memo.id === memoId ? { ...memo, ...updates } : memo
    ));
  };

  const handleDeleteMemo = (memoId: string) => {
    setMemos(prev => prev.filter(memo => memo.id !== memoId));
  };

  const handleInsertTimestamp = (memoId: string, existingContent: string) => {
    const timestamp = new Date().toLocaleString('nl-NL');
    const newContent = existingContent ? `${existingContent}\n\n[${timestamp}] ` : `[${timestamp}] `;
    handleUpdateMemo(memoId, { content: newContent });
  };

  // Item functionality
  const handleAddItem = () => {
    setEditingItem(null);
    itemForm.reset({
      quotationId: "",
      description: "",
      quantity: 1,
      unitPrice: "0.00", 
      lineTotal: "0.00",
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = (data: QuotationItemFormData) => {
    const newItem: QuotationItem = {
      id: Math.random().toString(36).substr(2, 9),
      quotationId: quotationId || "",
      itemId: null,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      lineTotal: data.lineTotal,
    };
    
    setQuotationItems(prev => [...prev, newItem]);
    setShowItemDialog(false);
    itemForm.reset();
    
    // Recalculate totals
    const currentSubtotal = parseFloat(quotationForm.watch("subtotal") || "0");
    const newSubtotal = currentSubtotal + parseFloat(data.lineTotal);
    const newTaxAmount = newSubtotal * 0.21;
    const newTotalAmount = newSubtotal + newTaxAmount;
    
    quotationForm.setValue("subtotal", newSubtotal.toFixed(2));
    quotationForm.setValue("taxAmount", newTaxAmount.toFixed(2));
    quotationForm.setValue("totalAmount", newTotalAmount.toFixed(2));
  };

  const handleDeleteItem = (item: QuotationItem) => {
    setQuotationItems(prev => prev.filter(i => i.id !== item.id));
    
    // Recalculate totals
    const remainingItems = quotationItems.filter(i => i.id !== item.id);
    const subtotal = remainingItems.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
    const taxAmount = subtotal * 0.21;
    const totalAmount = subtotal + taxAmount;
    
    quotationForm.setValue("subtotal", subtotal.toFixed(2));
    quotationForm.setValue("taxAmount", taxAmount.toFixed(2));
    quotationForm.setValue("totalAmount", totalAmount.toFixed(2));
  };

  // PDF and Email functionality
  const generatePDF = (title: string) => {
    const doc = new jsPDF();
    
    // Company header
    doc.setFontSize(20);
    doc.text('ATE Solutions B.V.', 20, 30);
    
    doc.setFontSize(12);
    doc.text(title, 20, 50);
    
    // Quotation details
    const quotationNumber = quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber");
    doc.text(`Quotation Number: ${quotationNumber}`, 20, 70);
    doc.text(`Date: ${format(new Date(), 'dd-MM-yyyy')}`, 20, 80);
    doc.text(`Valid Until: ${quotationForm.watch("validUntil") ? format(new Date(quotationForm.watch("validUntil")), 'dd-MM-yyyy') : 'N/A'}`, 20, 90);
    
    // Customer info
    const customer = customers.find(c => c.id === quotationForm.watch("customerId"));
    if (customer) {
      doc.text(`Customer: ${customer.name}`, 20, 110);
      if (customer.email) doc.text(`Email: ${customer.email}`, 20, 120);
      if (customer.phone) doc.text(`Phone: ${customer.phone}`, 20, 130);
    }
    
    // Items table header
    doc.text('Items:', 20, 150);
    doc.text('Description', 20, 160);
    doc.text('Qty', 120, 160);
    doc.text('Unit Price', 140, 160);
    doc.text('Total', 170, 160);
    
    // Draw line under header
    doc.line(20, 165, 190, 165);
    
    // Items
    let yPos = 175;
    quotationItems.forEach((item) => {
      doc.text(item.description || '', 20, yPos);
      doc.text(item.quantity?.toString() || '0', 120, yPos);
      doc.text(`€${item.unitPrice || '0.00'}`, 140, yPos);
      doc.text(`€${item.lineTotal || '0.00'}`, 170, yPos);
      yPos += 10;
    });
    
    // Total
    const total = quotationItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || '0'), 0);
    doc.line(20, yPos + 5, 190, yPos + 5);
    doc.text(`Total: €${total.toFixed(2)}`, 170, yPos + 15);
    
    return doc;
  };

  const handlePrintDraft = () => {
    try {
      const pdf = generatePDF('DRAFT QUOTATION');
      pdf.save(`draft-quotation-${nextQuotationNumber}.pdf`);
      
      toast({
        title: "Success",
        description: "Draft PDF generated successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendQuotation = () => {
    try {
      // First save the quotation if needed
      const formData = quotationForm.getValues();
      
      // Generate PDF
      const pdf = generatePDF('QUOTATION');
      const pdfBlob = pdf.output('blob');
      
      // Create a temporary URL for the PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Get customer email
      const customer = customers.find(c => c.id === formData.customerId);
      const customerEmail = customer?.email || '';
      
      // Create mailto link
      const quotationNumber = quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber");
      const subject = encodeURIComponent(`Quotation ${quotationNumber} - ATE Solutions B.V.`);
      const body = encodeURIComponent(`Dear ${customer?.name || 'Customer'},

Please find attached our quotation ${quotationNumber}.

If you have any questions, please don't hesitate to contact us.

Best regards,
ATE Solutions B.V.`);
      
      const mailtoLink = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
      
      // Open Outlook
      window.open(mailtoLink, '_blank');
      
      // Download PDF separately since mailto can't attach files
      pdf.save(`quotation-${quotationNumber}.pdf`);
      
      toast({
        title: "Email Prepared",
        description: "Outlook opened with email draft. PDF downloaded separately for attachment.",
      });
      
    } catch (error) {
      console.error("Error sending quotation:", error);
      toast({
        title: "Error",
        description: "Failed to prepare quotation email",
        variant: "destructive",
      });
    }
  };

  // Memo card component
  const MemoCard = ({ memo, index, onUpdate, onDelete, onInsertTimestamp }: {
    memo: Memo;
    index: number;
    onUpdate: (updates: Partial<Memo>) => void;
    onDelete: () => void;
    onInsertTimestamp: (content: string) => void;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localContent, setLocalContent] = useState(memo.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      setLocalContent(memo.content);
    }, [memo.content]);

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
      }
    }, [isEditing]);

    const handleSave = () => {
      onUpdate({ content: localContent });
      setIsEditing(false);
    };

    return (
      <Card className="border-l-4 border-l-orange-400">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-orange-700 dark:text-orange-300">
                Memo {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate({ isInternal: !memo.isInternal })}
                className={`text-xs px-2 py-1 ${
                  memo.isInternal 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' 
                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                }`}
              >
                {memo.isInternal ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                {memo.isInternal ? 'Internal' : 'Print'}
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onInsertTimestamp(localContent)}>
                <Clock className="h-4 w-4" />
              </Button>
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div>
            {isEditing ? (
              <Textarea
                ref={textareaRef}
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                placeholder="Enter memo content..."
                className="min-h-[100px]"
              />
            ) : (
              <div className="min-h-[100px] p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                {memo.content || <span className="text-gray-400 italic">No content yet...</span>}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span>Created: {memo.createdAt.toLocaleDateString('nl-NL')}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              memo.isInternal 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200' 
                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
            }`}>
              {memo.isInternal ? 'Internal memo' : 'Will be printed'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <div className="space-y-4">
        {/* Header with Title and Controls - matching DataTableLayout */}
        <div className="relative p-2">
          {/* Title Section */}
          <InfoHeaderLayout 
            fields={[
              {
                label: "Quotation Number",
                value: quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber")
              },
              {
                label: "Revision Number",
                value: quotationForm.watch("revisionNumber")
              },
              {
                label: "Status",
                value: quotationForm.watch("status") ? (quotationForm.watch("status") || "").charAt(0).toUpperCase() + (quotationForm.watch("status") || "").slice(1) : "Draft"
              }
            ]}
            className="absolute left-2 w-fit"
          />
          
          {/* Actions Section - starts at fixed coordinate like DataTableLayout */}
          <div className="ml-[350px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onSave}
              className="h-8 text-xs"
              data-testid="button-cancel"
            >
              <X size={14} className="mr-1" />
              Cancel
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handlePrintDraft}
              className="h-8 text-xs"
              data-testid="button-print-draft"
            >
              <Printer size={14} className="mr-1" />
              Print Draft
            </Button>
            <Button 
              size="sm"
              onClick={quotationForm.handleSubmit(handleSaveQuotation)}
              className="h-8 text-xs bg-green-600 text-white hover:bg-green-700"
              data-testid="button-save"
            >
              <Save size={14} className="mr-1" />
              Save Quotation
            </Button>
            <Button 
              size="sm"
              onClick={handleSendQuotation}
              className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700"
              data-testid="button-send-quotation"
            >
              <Send size={14} className="mr-1" />
              Send Quotation
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-none ml-2">
        <CardContent className="p-0">
          <FormTabLayout
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              {
                id: "general",
                label: "General",
                content: (
                  <div className="space-y-6">
                    {/* General Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerId">Customer</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                              data-testid="select-customer"
                            >
                              {quotationForm.watch("customerId")
                                ? customers.find((customer) => customer.id === quotationForm.watch("customerId"))?.name
                                : "Select customer..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search customers..." />
                              <CommandList>
                                <CommandEmpty>No customer found.</CommandEmpty>
                                <CommandGroup>
                                  {customers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.name}
                                      onSelect={() => {
                                        quotationForm.setValue("customerId", customer.id);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          quotationForm.watch("customerId") === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {customer.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quotationDate">Quotation Date</Label>
                        <Input
                          id="quotationDate"
                          type="date"
                          {...quotationForm.register("quotationDate")}
                          data-testid="input-quotation-date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validUntil">Valid Until</Label>
                        <Input
                          id="validUntil"
                          type="date"
                          {...quotationForm.register("validUntil")}
                          data-testid="input-valid-until"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Quotation description</Label>
                        <Textarea
                          id="description"
                          {...quotationForm.register("description")}
                          data-testid="input-description"
                        />
                      </div>
                    </div>
                  </div>
                )
              },
              {
                id: "memo",
                label: "Memo",
                content: (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">Memo Management</h3>
                      <Button onClick={handleAddMemo} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Memo
                      </Button>
                    </div>
                    
                    {memos.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                        <p>No memos created yet. Click "New Memo" to add one.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {memos.map((memo, index) => (
                          <MemoCard
                            key={memo.id}
                            memo={memo}
                            index={index}
                            onUpdate={(updatedMemo) => handleUpdateMemo(memo.id, updatedMemo)}
                            onDelete={() => handleDeleteMemo(memo.id)}
                            onInsertTimestamp={(content) => handleInsertTimestamp(memo.id, content)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              },
              {
                id: "conditions",
                label: "Conditions",
                content: (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="incoTerms">Incoterms</Label>
                      <Input
                        id="incoTerms"
                        {...quotationForm.register("incoTerms")}
                        placeholder="e.g., EXW, FOB, CIF"
                        data-testid="input-inco-terms"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentConditions">Payment Conditions</Label>
                      <Textarea
                        id="paymentConditions"
                        {...quotationForm.register("paymentConditions")}
                        placeholder="e.g., 30 days net, Payment upon delivery"
                        data-testid="input-payment-conditions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryConditions">Delivery Conditions</Label>
                      <Textarea
                        id="deliveryConditions"
                        {...quotationForm.register("deliveryConditions")}
                        placeholder="e.g., 2-3 weeks delivery time"
                        data-testid="input-delivery-conditions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        {...quotationForm.register("notes")}
                        placeholder="Additional notes..."
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                )
              },
              {
                id: "financial",
                label: "Financial",
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Financial Summary</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <Label>Subtotal</Label>
                        <p className="text-2xl font-bold">€{quotationForm.watch("subtotal") || "0.00"}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <Label>Tax (21%)</Label>
                        <p className="text-2xl font-bold">€{quotationForm.watch("taxAmount") || "0.00"}</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
                        <Label>Total</Label>
                        <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">€{quotationForm.watch("totalAmount") || "0.00"}</p>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                id: "documents",
                label: "Documents",
                content: (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Document Management</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">Upload documents related to this quotation</p>
                      <div className="space-x-2">
                        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                          <Plus className="inline mr-2 h-4 w-4" />
                          Upload Document
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }
            ]}
          />

          {/* Quotation Items - Left aligned with title */}
          <div className="mt-8 space-y-4 ml-2">
            <div className="flex items-center justify-between">
              <Button onClick={handleAddItem} data-testid="button-add-item">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            
            <DataTableLayout
              data={quotationItems}
              isLoading={false}
              columns={itemTableState.columns}
              setColumns={itemTableState.setColumns}
              searchTerm={itemTableState.searchTerm}
              setSearchTerm={itemTableState.setSearchTerm}
              filters={itemTableState.filters}
              setFilters={itemTableState.setFilters}
              onAddFilter={itemTableState.addFilter}
              onUpdateFilter={itemTableState.updateFilter}
              onRemoveFilter={itemTableState.removeFilter}
              sortConfig={itemTableState.sortConfig}
              onSort={itemTableState.handleSort}
              selectedRows={itemTableState.selectedRows}
              setSelectedRows={itemTableState.setSelectedRows}
              onToggleRowSelection={itemTableState.toggleRowSelection}
              onToggleAllRows={() => {
                const allIds = quotationItems.map(item => item.id);
                itemTableState.toggleAllRows(allIds);
              }}
              getRowId={(item: QuotationItem) => item.id}
              entityName="Quotation Item"
              entityNamePlural="Quotation Items"
              applyFiltersAndSearch={itemTableState.applyFiltersAndSearch}
              applySorting={itemTableState.applySorting}
              rowActions={(item: QuotationItem) => [
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <X className="h-4 w-4" />,
                  onClick: () => handleDeleteItem(item),
                  variant: 'destructive'
                }
              ]}
              addEditDialog={{
                isOpen: showItemDialog,
                onOpenChange: setShowItemDialog,
                title: 'Add Item',
                content: (
                  <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...itemForm.register("description")}
                        data-testid="input-item-description"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          {...itemForm.register("quantity", { valueAsNumber: true })}
                          data-testid="input-quantity"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Unit Price (€)</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          {...itemForm.register("unitPrice")}
                          onChange={(e) => {
                            const quantity = itemForm.watch("quantity") || 1;
                            const unitPrice = e.target.value;
                            const lineTotal = (quantity * parseFloat(unitPrice || "0")).toFixed(2);
                            itemForm.setValue("lineTotal", lineTotal);
                          }}
                          data-testid="input-unit-price"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lineTotal">Line Total (€)</Label>
                        <Input
                          id="lineTotal"
                          type="number"
                          step="0.01"
                          {...itemForm.register("lineTotal")}
                          readOnly
                          className="bg-gray-50"
                          data-testid="input-line-total"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Add Item
                      </Button>
                    </div>
                  </form>
                )
              }}
            />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}