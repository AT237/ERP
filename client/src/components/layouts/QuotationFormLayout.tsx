import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, insertQuotationItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Save, X, FileText, Download, Clock, MessageSquare, Eye, EyeOff, ChevronsUpDown, Check, Printer, Send, Copy, Package2 as Package, Type, ArrowLeft, Search } from "lucide-react";
import { CustomerSelect } from "@/components/ui/customer-select";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Quotation, InsertQuotation, QuotationItem, InsertQuotationItem, Customer, InventoryItem, InsertInventoryItem } from "@shared/schema";
import { insertInventoryItemSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import jsPDF from 'jspdf';
import imageCompression from 'browser-image-compression';
import companyLogo from '@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg';

// Memo interface
interface Memo {
  id: string;
  title: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

// Form schemas
const quotationFormSchema = insertQuotationSchema.omit({
  subtotal: true,
  taxAmount: true, 
  totalAmount: true,
}).extend({
  subtotal: z.string().min(1, "Subtotal is required"),
  taxAmount: z.string().optional(),
  totalAmount: z.string().min(1, "Total amount is required"),
  quotationDate: z.string().optional(),
  validUntil: z.string().optional(),
  isBudgetQuotation: z.boolean().optional(),
  validityDays: z.number().optional(),
});

const quotationItemFormSchema = insertQuotationItemSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  lineTotal: z.string().min(1, "Line total is required"),
});

const inventoryItemFormSchema = insertInventoryItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs is verplicht"),
  costPrice: z.string().min(1, "Kostprijs is verplicht"),
  margin: z.string().optional(),
});

type QuotationFormData = z.infer<typeof quotationFormSchema>;
type QuotationItemFormData = z.infer<typeof quotationItemFormSchema>;
type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

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
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const [currentPDF, setCurrentPDF] = useState<jsPDF | null>(null);
  const [itemType, setItemType] = useState<'database' | 'new' | 'onetime' | 'text' | null>(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [showAddInventoryDialog, setShowAddInventoryDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
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

  // Lazy load customers only when needed
  const [shouldLoadCustomers, setShouldLoadCustomers] = useState(false);
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: shouldLoadCustomers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Lazy load inventory only when needed  
  const [shouldLoadInventory, setShouldLoadInventory] = useState(false);
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    enabled: shouldLoadInventory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch existing quotation details (combined: quotation + items + customer) if editing
  const { data: quotationDetails, isLoading: quotationLoading } = useQuery<{
    quotation: Quotation,
    items: QuotationItem[],
    customer: { id: string; name: string; email?: string; phone?: string; city?: string }
  }>({
    queryKey: ["/api/quotations", quotationId, "details"],
    enabled: !!quotationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // Extract data from combined response
  const existingQuotation = quotationDetails?.quotation;
  const existingQuotationItems = quotationDetails?.items || [];
  const quotationCustomer = quotationDetails?.customer;

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
      validityDays: 30,
      isBudgetQuotation: false,
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

  const inventoryForm = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      unitPrice: "0.00",
      costPrice: "0.00",
      margin: "0.00",
      category: "General",
      image: "",
      isComposite: false,
      unit: "pcs",
      status: "active",
    },
  });

  // Watch for price changes to auto-calculate margin
  const watchedCostPrice = inventoryForm.watch("costPrice");
  const watchedUnitPrice = inventoryForm.watch("unitPrice");

  React.useEffect(() => {
    if (watchedCostPrice && watchedUnitPrice) {
      const margin = calculateMargin(watchedCostPrice, watchedUnitPrice);
      inventoryForm.setValue("margin", margin);
    }
  }, [watchedCostPrice, watchedUnitPrice, inventoryForm]);

  // Watch for changes in quotation date and validity days to auto-calculate valid until
  const watchedQuotationDate = quotationForm.watch("quotationDate");
  const watchedValidityDays = quotationForm.watch("validityDays");

  React.useEffect(() => {
    if (watchedQuotationDate && watchedValidityDays) {
      const quotationDate = new Date(watchedQuotationDate);
      const validUntilDate = new Date(quotationDate);
      validUntilDate.setDate(quotationDate.getDate() + watchedValidityDays);
      const validUntilString = validUntilDate.toISOString().split('T')[0];
      
      // Only update if the calculated date is different from current value
      const currentValidUntil = quotationForm.getValues("validUntil");
      if (currentValidUntil !== validUntilString) {
        quotationForm.setValue("validUntil", validUntilString, { shouldTouch: false, shouldDirty: false });
      }
    }
  }, [watchedQuotationDate, watchedValidityDays]);

  // Calculate line total when quantity or unit price changes
  const watchedQuantity = itemForm.watch('quantity');
  const watchedItemUnitPrice = itemForm.watch('unitPrice');

  React.useEffect(() => {
    if (watchedQuantity && watchedItemUnitPrice) {
      const lineTotal = (watchedQuantity * parseFloat(watchedItemUnitPrice || '0')).toFixed(2);
      itemForm.setValue('lineTotal', lineTotal);
    }
  }, [watchedQuantity, watchedItemUnitPrice, itemForm]);

  // Update quotation totals when items change
  React.useEffect(() => {
    const subtotal = quotationItems.reduce((sum, item) => 
      sum + parseFloat(item.lineTotal || '0'), 0
    );
    const taxAmount = subtotal * 0.21; // 21% VAT
    const totalAmount = subtotal + taxAmount;
    
    quotationForm.setValue('subtotal', subtotal.toFixed(2));
    quotationForm.setValue('taxAmount', taxAmount.toFixed(2));
    quotationForm.setValue('totalAmount', totalAmount.toFixed(2));
  }, [quotationItems, quotationForm]);

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
        validityDays: existingQuotation.validityDays || 30,
        isBudgetQuotation: existingQuotation.isBudgetQuotation || false,
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
  }, [existingQuotation, existingQuotationItems, quotationLoading]);

  // Set document title based on quotation data
  useEffect(() => {
    if (existingQuotation) {
      // For existing quotations: show quotation number and revision
      const title = `${existingQuotation.quotationNumber} ${existingQuotation.revisionNumber || 'V1.0'}`;
      document.title = title;
    } else if (!quotationId) {
      // For new quotations: show "New Quotation" with the next quotation number
      document.title = `New Quotation - ${nextQuotationNumber}`;
    }
    
    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Business Management System';
    };
  }, [existingQuotation, quotationId, nextQuotationNumber]);

  // Image upload function
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      
      // Compress the image
      const options = {
        maxSizeMB: 1, // Max 1MB
        maxWidthOrHeight: 800, // Max dimensions
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Convert to base64 for storage (in real app, upload to cloud storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setPreviewImage(base64String);
        inventoryForm.setValue('image', base64String);
      };
      reader.readAsDataURL(compressedFile);
      
      toast({
        title: "Succes",
        description: `Afbeelding gecomprimeerd van ${(file.size / 1024 / 1024).toFixed(2)}MB naar ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      toast({
        title: "Fout",
        description: "Kan afbeelding niet verwerken",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Calculate margin when prices change
  const calculateMargin = (costPrice: string, unitPrice: string) => {
    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(unitPrice) || 0;
    if (cost === 0) return "0.00";
    const margin = ((selling - cost) / cost) * 100;
    return margin.toFixed(2);
  };

  // Mutations
  const createInventoryItemMutation = useMutation({
    mutationFn: async (data: InventoryItemFormData) => {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          currentStock: 0,
          minimumStock: 0,
          // Convert strings to numbers for decimal fields
          unitPrice: parseFloat(data.unitPrice || '0').toString(),
          costPrice: parseFloat(data.costPrice || '0').toString(),
          margin: parseFloat(data.margin || '0').toString()
        }),
      });
      if (!response.ok) throw new Error('Failed to create inventory item');
      return response.json();
    },
    onSuccess: (newItem) => {
      toast({
        title: "Succes",
        description: "Artikel toegevoegd aan database",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      
      // Auto-select the newly created item
      setSelectedInventoryItem(newItem);
      itemForm.setValue('description', newItem.name || newItem.description || '');
      itemForm.setValue('unitPrice', newItem.unitPrice || '0.00');
      itemForm.setValue('itemId', newItem.id);
      
      // Recalculate line total
      const quantity = itemForm.watch('quantity') || 1;
      const lineTotal = (quantity * parseFloat(newItem.unitPrice || '0')).toFixed(2);
      itemForm.setValue('lineTotal', lineTotal);
      
      // Close dialog and reset form
      setShowAddInventoryDialog(false);
      setPreviewImage("");
      inventoryForm.reset();
    },
    onError: (error) => {
      console.error('Error creating inventory item:', error);
      toast({
        title: "Fout",
        description: "Kan artikel niet toevoegen aan database",
        variant: "destructive",
      });
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          quotationNumber: nextQuotationNumber,
        }),
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
      const processedData = {
        ...data,
        quotationDate: data.quotationDate ? new Date(data.quotationDate) : new Date(),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        // Keep as strings as expected by backend schema
        subtotal: data.subtotal,
        taxAmount: data.taxAmount || "0",
        totalAmount: data.totalAmount,
      };
      
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
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
    if (quotationId) {
      updateQuotationMutation.mutate(data);
    } else {
      createQuotationMutation.mutate(data);
    }
  };

  // Item management functions
  const handleSaveItem = (data: QuotationItemFormData) => {
    const newItem: QuotationItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9),
      quotationId: quotationId || '',
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      lineTotal: data.lineTotal,
      itemId: data.itemId || null,
    };

    if (editingItem) {
      setQuotationItems(prev => prev.map(item => 
        item.id === editingItem.id ? newItem : item
      ));
    } else {
      setQuotationItems(prev => [...prev, newItem]);
    }

    setShowItemDialog(false);
    setEditingItem(null);
    setItemType(null);
    itemForm.reset();
    
    toast({
      title: "Success",
      description: editingItem ? "Item updated" : "Item added",
    });
  };

  const handleDeleteItem = (item: QuotationItem) => {
    setQuotationItems(prev => prev.filter(i => i.id !== item.id));
    toast({
      title: "Success",
      description: "Item deleted",
    });
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

  // Helper function to convert image URL to DataURL
  const imageUrlToDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = URL.createObjectURL(blob);
        })
        .catch(reject);
    });
  };

  // PDF generation function with proper logo loading
  const generateProfessionalPDF = async (): Promise<jsPDF> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;
    
    // Add company logo with proper conversion
    try {
      const logoDataUrl = await imageUrlToDataUrl(companyLogo);
      doc.addImage(logoDataUrl, 'JPEG', 20, yPos, 40, 30);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
      // Continue without logo
    }
    
    // Company info (right side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ATE Solutions', pageWidth - 60, yPos + 10);
    doc.text('Your Address Line 1', pageWidth - 60, yPos + 16);
    doc.text('Your Address Line 2', pageWidth - 60, yPos + 22);
    doc.text('Phone: +31 123 456 789', pageWidth - 60, yPos + 28);
    doc.text('Email: info@atesolutions.nl', pageWidth - 60, yPos + 34);
    
    yPos += 60;
    
    // Quotation header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const quotationNumber = quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber");
    doc.text(`QUOTATION ${quotationNumber}`, 20, yPos);
    
    yPos += 20;
    
    // Quotation details (left column)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(), 'dd-MM-yyyy')}`, 20, yPos);
    doc.text(`Valid until: ${quotationForm.watch("validUntil") || 'N/A'}`, 20, yPos + 8);
    doc.text(`Validity: ${quotationForm.watch("validityDays") || 30} days`, 20, yPos + 16);
    
    // Customer details (right column) - use quotationCustomer if available, fallback to customers array
    const customer = quotationCustomer || customers.find(c => c.id === quotationForm.watch("customerId"));
    if (customer) {
      doc.setFont('helvetica', 'bold');
      doc.text('Bill to:', pageWidth - 80, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(customer.name, pageWidth - 80, yPos + 8);
      // Handle different customer object structures
      const customerNumber = 'customerNumber' in customer ? customer.customerNumber : '';
      const phone = customer.phone || '';
      const email = 'generalEmail' in customer ? customer.generalEmail : customer.email;
      doc.text(customerNumber || '', pageWidth - 80, yPos + 16);
      doc.text(phone || '', pageWidth - 80, yPos + 24);
      doc.text(email || '', pageWidth - 80, yPos + 32);
    }
    
    yPos += 50;
    
    // Description
    const description = quotationForm.watch("description");
    if (description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(description, 20, yPos + 8);
      yPos += 20;
    }
    
    // Items table
    yPos += 10;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Description', 25, yPos + 2);
    doc.text('Qty', 130, yPos + 2);
    doc.text('Unit Price', 150, yPos + 2);
    doc.text('Line Total', 180, yPos + 2);
    
    // Table lines
    doc.line(20, yPos + 5, pageWidth - 20, yPos + 5);
    yPos += 15;
    
    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    quotationItems.forEach((item, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 30;
      }
      
      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPos - 5, pageWidth - 40, 12, 'F');
      }
      
      doc.text(item.description || '', 25, yPos + 2);
      doc.text((item.quantity || 0).toString(), 130, yPos + 2);
      doc.text(`€${parseFloat(item.unitPrice || '0').toFixed(2)}`, 150, yPos + 2);
      doc.text(`€${parseFloat(item.lineTotal || '0').toFixed(2)}`, 180, yPos + 2);
      yPos += 12;
    });
    
    // Table footer line
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 20;
    
    // Totals section
    const subtotal = parseFloat(quotationForm.watch("subtotal") || '0');
    const taxAmount = parseFloat(quotationForm.watch("taxAmount") || '0');
    const totalAmount = parseFloat(quotationForm.watch("totalAmount") || '0');
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, yPos);
    doc.text(`€${subtotal.toFixed(2)}`, 180, yPos);
    yPos += 8;
    
    doc.text('Tax (21%):', 140, yPos);
    doc.text(`€${taxAmount.toFixed(2)}`, 180, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 140, yPos);
    doc.text(`€${totalAmount.toFixed(2)}`, 180, yPos);
    
    // Footer
    yPos = pageHeight - 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', 20, yPos);
    doc.text('Payment terms: 30 days net', 20, yPos + 6);
    
    return doc;
  };

  const handlePreview = async () => {
    try {
      // Ensure customers are loaded if needed
      if (!quotationCustomer && !shouldLoadCustomers) {
        setShouldLoadCustomers(true);
      }
      
      const pdf = await generateProfessionalPDF();
      setCurrentPDF(pdf);
      
      // Create blob and URL for preview
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Show in modal
      setPdfBlobUrl(pdfUrl);
      setShowPDFPreview(true);
      
      toast({
        title: "Success", 
        description: "PDF preview opened",
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

  const handleSavePDF = async () => {
    try {
      let pdf = currentPDF;
      if (!pdf) {
        // Generate PDF if not already generated
        if (!quotationCustomer && !shouldLoadCustomers) {
          setShouldLoadCustomers(true);
        }
        pdf = await generateProfessionalPDF();
        setCurrentPDF(pdf);
      }
      
      const quotationNumber = quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber");
      const filename = `quotation-${quotationNumber}.pdf`;
      pdf.save(filename);
      toast({
        title: "Success",
        description: "PDF saved successfully",
      });
    } catch (error) {
      console.error("Error saving PDF:", error);
      toast({
        title: "Error",
        description: "Failed to save PDF",
        variant: "destructive",
      });
    }
  };

  const handlePrintPDF = () => {
    if (pdfBlobUrl) {
      const printWindow = window.open(pdfBlobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast({
        title: "Success",
        description: "PDF opened for printing",
      });
    }
  };

  const renderItemDialog = () => {
    if (!itemType) return null;

    // Common form for all item types
    return (
      <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="item-description">Description *</Label>
          <Textarea
            id="item-description"
            {...itemForm.register('description')}
            placeholder="Item description"
            data-testid="input-item-description"
          />
        </div>
        
        {itemType !== 'text' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-quantity">Quantity</Label>
                <Input
                  id="item-quantity"
                  type="number"
                  min="1"
                  step="1"
                  {...itemForm.register('quantity', { valueAsNumber: true })}
                  data-testid="input-item-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-unitPrice">Unit Price (€)</Label>
                <Input
                  id="item-unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...itemForm.register('unitPrice')}
                  data-testid="input-item-unitPrice"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item-lineTotal">Line Total (€)</Label>
              <Input
                id="item-lineTotal"
                type="number"
                step="0.01"
                min="0"
                {...itemForm.register('lineTotal')}
                className="bg-gray-50 dark:bg-gray-800"
                readOnly
                data-testid="input-item-lineTotal"
              />
            </div>
          </>
        )}
        
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowItemDialog(false);
              setItemType(null);
              setEditingItem(null);
              itemForm.reset();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700"
          >
            {editingItem ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </form>
    );
  };

  // Create header fields for BaseFormLayout - empty to remove orange header
  const headerFields: InfoField[] = [];

  // Create action buttons for BaseFormLayout
  const actionButtons: ActionButton[] = [
    {
      key: 'cancel',
      label: 'Cancel',
      icon: <X size={14} />,
      onClick: onSave,
      variant: 'outline',
      testId: 'button-cancel'
    },
    {
      key: 'preview',
      label: 'Preview',
      icon: <Eye size={14} />,
      onClick: handlePreview,
      variant: 'outline',
      testId: 'button-preview'
    },
    {
      key: 'save',
      label: 'Save Quotation',
      icon: <Save size={14} />,
      onClick: quotationForm.handleSubmit(handleSaveQuotation),
      variant: 'default',
      testId: 'button-save'
    }
  ];

  // Create tabs for BaseFormLayout
  const tabs: FormTab[] = [
    {
      id: "general",
      label: "General",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <Label htmlFor="customerId" className="text-sm font-medium text-right pt-2">Customer</Label>
            <div className="w-[30%]">
              <CustomerSelect
                value={quotationForm.watch("customerId")}
                onValueChange={(value) => quotationForm.setValue("customerId", value)}
                placeholder="Select customer..."
                testId="select-customer"
                onOpen={() => setShouldLoadCustomers(true)}
                customers={customers.map(c => ({ 
                  id: c.id, 
                  name: c.name, 
                  email: c.generalEmail || undefined, 
                  phone: c.phone || undefined, 
                  city: c.addressId || undefined 
                }))}
              />
            </div>

            <Label htmlFor="quotationDate" className="text-sm font-medium text-right pt-2">Quotation Date</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <Input
                  id="quotationDate"
                  type="date"
                  {...quotationForm.register("quotationDate")}
                  data-testid="input-quotation-date"
                />
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Validity (days)
              </div>
              <div>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  defaultValue="30"
                  {...quotationForm.register("validityDays", { valueAsNumber: true })}
                  data-testid="input-validity-days"
                />
              </div>
            </div>

            <Label htmlFor="validUntil" className="text-sm font-medium text-right pt-2">Valid Until</Label>
            <div className="w-[30%]">
              <Input
                id="validUntil"
                type="date"
                {...quotationForm.register("validUntil")}
                className="bg-gray-50 dark:bg-gray-800"
                readOnly
                data-testid="input-valid-until"
              />
            </div>

            <Label htmlFor="description" className="text-sm font-medium text-right pt-2">Quotation description</Label>
            <div>
              <Textarea
                id="description"
                {...quotationForm.register("description")}
                data-testid="input-description"
              />
            </div>

            <Label htmlFor="isBudgetQuotation" className="text-sm font-medium text-right pt-2">Budget quotation</Label>
            <div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isBudgetQuotation"
                  checked={quotationForm.watch("isBudgetQuotation") || false}
                  onCheckedChange={(checked) => {
                    quotationForm.setValue("isBudgetQuotation", checked === true);
                  }}
                  data-testid="checkbox-budget-quotation"
                />
                <Label 
                  htmlFor="isBudgetQuotation" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Budget quotation
                </Label>
              </div>
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
      id: "financial",
      label: "Financial",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-[130px_1fr] items-start gap-x-6 gap-y-6">
            <Label className="text-sm font-medium text-right pt-2">Subtotal</Label>
            <div className="w-[30%]">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-2xl font-bold">€{quotationForm.watch("subtotal") || "0.00"}</p>
              </div>
            </div>

            <Label className="text-sm font-medium text-right pt-2">Tax (21%)</Label>
            <div className="grid grid-cols-[30%_130px_30%] gap-4 items-center">
              <div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-2xl font-bold">€{quotationForm.watch("taxAmount") || "0.00"}</p>
                </div>
              </div>
              <div className="text-sm font-medium text-right pt-2">
                Total
              </div>
              <div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">€{quotationForm.watch("totalAmount") || "0.00"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="h-full">
      <BaseFormLayout
        headerFields={headerFields}
        actionButtons={actionButtons}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLoading={quotationLoading}
      />

      {/* Quotation Items Table */}
      <div className="mt-2 border-t border-orange-200 pt-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quotation Items</h2>
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
          compact={true}
          headerActions={[
            {
              key: 'add-onetime-item',
              label: 'Add Item',
              icon: <Plus className="h-4 w-4" />,
              onClick: () => {
                setItemType('onetime');
                setEditingItem(null);
                setSelectedInventoryItem(null);
                itemForm.reset({
                  quotationId: quotationId || "",
                  description: "",
                  quantity: 1,
                  unitPrice: "0.00", 
                  lineTotal: "0.00",
                });
                setShowItemDialog(true);
              },
              variant: 'default' as const
            },
            {
              key: 'add-text-item',
              label: 'Add Text Line',
              icon: <Type className="h-4 w-4" />,
              onClick: () => {
                setItemType('text');
                setEditingItem(null);
                setSelectedInventoryItem(null);
                itemForm.reset({
                  quotationId: quotationId || "",
                  description: "",
                  quantity: 1,
                  unitPrice: "0.00", 
                  lineTotal: "0.00",
                });
                setShowItemDialog(true);
              },
              variant: 'outline' as const
            }
          ]}
          rowActions={(item: QuotationItem) => [
            {
              key: 'edit',
              label: 'Edit',
              icon: <FileText className="h-4 w-4" />,
              onClick: () => {
                setEditingItem(item);
                itemForm.reset({
                  quotationId: item.quotationId,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal,
                  itemId: item.itemId,
                });
                setItemType('onetime'); // Default to onetime for editing
                setShowItemDialog(true);
              },
              variant: 'outline'
            },
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
            title: editingItem ? 'Edit Item' : 'Add Item',
            content: renderItemDialog()
          }}
        />
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={showPDFPreview} onOpenChange={setShowPDFPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
          </DialogHeader>
          {pdfBlobUrl && (
            <div className="w-full h-[70vh] mb-4">
              <iframe 
                src={pdfBlobUrl} 
                className="w-full h-full border rounded-md"
                title="PDF Preview"
              />
            </div>
          )}
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setShowPDFPreview(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintPDF}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button onClick={handleSavePDF}>
                <Download className="mr-2 h-4 w-4" />
                Save PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}