import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
import type { InfoField } from './InfoHeaderLayout';
import type { FormTab } from './FormTabLayout';
import { LayoutForm2, type FormSection2, type FormRow, type FormField2, createFieldRow, createFieldsRow, createSectionHeaderRow, createCustomRow, type ChangeTrackingConfig } from './LayoutForm2';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Popover, PopoverContent, PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList 
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuotationSchema, insertQuotationItemSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Plus, Save, X, FileText, Download, Clock, MessageSquare, Eye, EyeOff, Printer, Search, ChevronsUpDown } from "lucide-react";
import { CustomerSelect } from "@/components/ui/customer-select";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, createIdColumn, createPositionColumn, createCurrencyColumn, createNumericColumn } from '@/components/layouts/DataTableLayout';
import { QuotationPrintDialog } from "@/components/print/QuotationPrintDialog";
import { useDataTable } from '@/hooks/useDataTable';
import type { Quotation, QuotationItem, InsertQuotationItem, Customer, InventoryItem, Project } from "@shared/schema";
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
  projectId: z.string().optional(),
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
  const [, navigate] = useLocation();
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
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const { toast } = useToast();

  // Data table state for quotation items
  // Uses standardized helper functions for consistent column styling (see replit.md)
  const itemTableState = useDataTable({ 
    defaultColumns: [
      createPositionColumn(),
      createIdColumn('id', 'Line ID'),
      { 
        key: 'description', 
        label: 'Description', 
        visible: true, 
        width: 300, 
        filterable: true, 
        sortable: true
      },
      createNumericColumn('quantity', 'Quantity'),
      createCurrencyColumn('unitPrice', 'Unit Price'),
      createCurrencyColumn('lineTotal', 'Line Total'),
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

  // Lazy load projects only when needed
  const [shouldLoadProjects, setShouldLoadProjects] = useState(false);
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: shouldLoadProjects,
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

  // Helper function to convert yyyy-MM-dd to dd-mm-yyyy
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd-mm-yyyy
    }
    return dateString;
  };

  // Helper function to convert dd-mm-yyyy to yyyy-MM-dd
  const formatDateForStorage = (dateString: string): string => {
    if (!dateString) return "";
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-MM-dd
    }
    return dateString;
  };

  // Forms
  const quotationForm = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotationNumber: "Auto-generated",
      customerId: "",
      projectId: "",
      description: "",
      revisionNumber: "V1.0",
      status: "draft",
      quotationDate: format(new Date(), 'dd-MM-yyyy'),
      validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd-MM-yyyy'), // 30 days from now
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

  // Track if we're currently updating to prevent circular updates
  const [isUpdatingDates, setIsUpdatingDates] = React.useState(false);

  React.useEffect(() => {
    if (watchedQuotationDate && watchedValidityDays && !isUpdatingDates) {
      // Parse dd-mm-yyyy format
      const parts = watchedQuotationDate.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        const quotationDate = new Date(year, month, day);
        
        // Check if the date is valid before processing
        if (!isNaN(quotationDate.getTime())) {
          const validUntilDate = new Date(quotationDate);
          validUntilDate.setDate(quotationDate.getDate() + watchedValidityDays);
          
          // Only proceed if the calculated date is also valid
          if (!isNaN(validUntilDate.getTime())) {
            // Format as dd-mm-yyyy
            const validUntilString = format(validUntilDate, 'dd-MM-yyyy');
            
            // Only update if the calculated date is different from current value
            const currentValidUntil = quotationForm.getValues("validUntil");
            if (currentValidUntil !== validUntilString) {
              setIsUpdatingDates(true);
              quotationForm.setValue("validUntil", validUntilString, { shouldTouch: false, shouldDirty: false });
              setTimeout(() => setIsUpdatingDates(false), 0);
            }
          }
        }
      }
    }
  }, [watchedQuotationDate, watchedValidityDays, isUpdatingDates]);

  // Watch for changes in valid until to auto-calculate validity days (reverse calculation)
  const watchedValidUntil = quotationForm.watch("validUntil");

  React.useEffect(() => {
    if (watchedQuotationDate && watchedValidUntil && !isUpdatingDates) {
      // Parse both dates (dd-mm-yyyy format)
      const quotationParts = watchedQuotationDate.split('-');
      const validUntilParts = watchedValidUntil.split('-');
      
      if (quotationParts.length === 3 && validUntilParts.length === 3) {
        const quotationDate = new Date(
          parseInt(quotationParts[2], 10),
          parseInt(quotationParts[1], 10) - 1,
          parseInt(quotationParts[0], 10)
        );
        
        const validUntilDate = new Date(
          parseInt(validUntilParts[2], 10),
          parseInt(validUntilParts[1], 10) - 1,
          parseInt(validUntilParts[0], 10)
        );
        
        // Check if both dates are valid
        if (!isNaN(quotationDate.getTime()) && !isNaN(validUntilDate.getTime())) {
          // Calculate difference in days
          const diffTime = validUntilDate.getTime() - quotationDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          // Only update if positive and different from current value
          const currentValidityDays = quotationForm.getValues("validityDays");
          if (diffDays >= 0 && currentValidityDays !== diffDays) {
            setIsUpdatingDates(true);
            quotationForm.setValue("validityDays", diffDays, { shouldTouch: false, shouldDirty: false });
            setTimeout(() => setIsUpdatingDates(false), 0);
          }
        }
      }
    }
  }, [watchedQuotationDate, watchedValidUntil, isUpdatingDates]);

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
        projectId: existingQuotation.projectId || "",
        description: existingQuotation.description || "",
        revisionNumber: existingQuotation.revisionNumber || "V1.0",
        status: existingQuotation.status || "draft",
        quotationDate: existingQuotation.quotationDate ? format(new Date(existingQuotation.quotationDate), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy'),
        validUntil: existingQuotation.validUntil ? format(new Date(existingQuotation.validUntil), 'dd-MM-yyyy') : "",
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
    // Convert dates from dd-mm-yyyy to yyyy-MM-dd for storage
    const dataWithConvertedDates = {
      ...data,
      quotationDate: formatDateForStorage(data.quotationDate || ""),
      validUntil: formatDateForStorage(data.validUntil || ""),
    };
    
    if (quotationId) {
      updateQuotationMutation.mutate(dataWithConvertedDates);
    } else {
      createQuotationMutation.mutate(dataWithConvertedDates);
    }
  };

  // Item management functions
  const handleSaveItem = (data: QuotationItemFormData) => {
    // Calculate next position number for new items
    const nextPositionNo = editingItem?.positionNo || 
      String((quotationItems.length + 1) * 10).padStart(3, '0');
    
    const newItem: QuotationItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9),
      quotationId: quotationId || '',
      description: data.description,
      quantity: data.quantity ?? 0,
      unitPrice: data.unitPrice,
      lineTotal: data.lineTotal,
      itemId: data.itemId || null,
      lineType: data.lineType || 'standard',
      position: null,
      positionNo: nextPositionNo,
      sourceSnippetId: null,
      sourceSnippetVersion: null,
    };

    if (editingItem) {
      setQuotationItems(prev => prev.map(item => 
        item.id === editingItem.id ? newItem : item
      ));
    } else {
      setQuotationItems(prev => [...prev, newItem]);
    }

    const wasEditing = !!editingItem;
    
    // Reset form and navigate back to general tab
    setEditingItem(null);
    setItemType(null);
    itemForm.reset({
      quotationId: quotationId || "",
      description: "",
      quantity: 1,
      unitPrice: "0.00",
      lineTotal: "0.00",
      lineType: "standard",
      itemId: null,
    });
    setActiveTab("general");
    
    toast({
      title: "Success",
      description: wasEditing ? "Item updated" : "Item added",
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

  // Helper function to convert number to words (for amount in words)
  const numberToWords = (amount: number): string => {
    // Simple implementation for Euro amounts
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    
    if (amount === 0) return 'zero euro';
    
    const euros = Math.floor(amount);
    const cents = Math.round((amount - euros) * 100);
    
    let result = '';
    
    if (euros >= 1000000) {
      const millions = Math.floor(euros / 1000000);
      result += numberToWords(millions).replace(' euro', '') + ' million ';
      const remainder = euros % 1000000;
      if (remainder > 0) result += numberToWords(remainder).replace(' euro', '') + ' ';
    } else if (euros >= 1000) {
      const thousands = Math.floor(euros / 1000);
      result += numberToWords(thousands).replace(' euro', '') + ' thousand ';
      const remainder = euros % 1000;
      if (remainder > 0) result += numberToWords(remainder).replace(' euro', '') + ' ';
    } else if (euros >= 100) {
      const hundreds = Math.floor(euros / 100);
      result += ones[hundreds] + ' hundred ';
      const remainder = euros % 100;
      if (remainder > 0) result += numberToWords(remainder).replace(' euro', '') + ' ';
    } else if (euros >= 20) {
      result += tens[Math.floor(euros / 10)] + ' ';
      if (euros % 10 > 0) result += ones[euros % 10] + ' ';
    } else if (euros >= 10) {
      result += teens[euros - 10] + ' ';
    } else if (euros > 0) {
      result += ones[euros] + ' ';
    }
    
    result += 'euro';
    
    if (cents > 0) {
      result += ' and ' + numberToWords(cents).replace(' euro', '') + ' cent';
    }
    
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  // PDF generation function matching the professional layout
  const generateProfessionalPDF = async (): Promise<jsPDF> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPos = 15;
    
    // Page number (top right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('1 of 1', pageWidth - margin - 15, yPos);
    
    yPos += 15;
    
    // Date (top right)
    const quotationDate = quotationForm.watch("quotationDate") || format(new Date(), 'dd-MM-yyyy');
    doc.text(`Date: ${quotationDate}`, pageWidth - margin - 35, yPos);
    
    yPos += 10;
    
    // Quotation title (centered)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const quotationNumber = quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber");
    const titleWidth = doc.getTextWidth(`QUOTATION ${quotationNumber}`);
    doc.text(`QUOTATION ${quotationNumber}`, (pageWidth - titleWidth) / 2, yPos);
    
    yPos += 10;
    
    // Supplier and Customer info (two columns)
    const leftCol = margin;
    const rightCol = pageWidth / 2 + 10;
    
    // Supplier info (left)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier: ATE Solutions B.V.', leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('Oude Telgterweg 255', leftCol + 15, yPos + 5);
    doc.text('3853PG, ERMELO', leftCol + 15, yPos + 10);
    doc.text('0031 682332087', leftCol + 15, yPos + 15);
    doc.text('info@atesolutions.nl', leftCol + 15, yPos + 20);
    doc.text('VAT no. NL 8656 38792 B01', leftCol + 15, yPos + 25);
    doc.text('C.o.c. no. 91385415', leftCol + 15, yPos + 30);
    doc.text('IBAN: NL28INGB 0102962979', leftCol + 15, yPos + 35);
    doc.text('The Netherlands', leftCol + 15, yPos + 40);
    
    // Customer info (right)
    const customer = quotationCustomer || customers.find(c => c.id === quotationForm.watch("customerId"));
    if (customer) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer: ${customer.name}`, rightCol, yPos);
      doc.setFont('helvetica', 'normal');
      
      // Handle different customer object structures
      const address = ('address' in customer ? customer.address : '') || '';
      const city = ('city' in customer ? customer.city : '') || '';
      const postalCode = ('postalCode' in customer ? customer.postalCode : '') || '';
      const country = ('country' in customer ? customer.country : '') || '';
      
      let customerYPos = yPos + 5;
      if (address) {
        doc.text(String(address), rightCol + 15, customerYPos);
        customerYPos += 5;
      }
      if (city || postalCode) {
        doc.text(`${postalCode}${postalCode && city ? ', ' : ''}${city}`, rightCol + 15, customerYPos);
        customerYPos += 5;
      }
      if (country) {
        doc.text(String(country), rightCol + 15, customerYPos);
      }
    }
    
    yPos += 55;
    
    // Quotation description
    const description = quotationForm.watch("description");
    if (description) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Quotation description: ${description}`, margin, yPos);
      yPos += 10;
    }
    
    yPos += 10;
    
    // Items table header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Position', margin, yPos);
    doc.text('Description', margin + 20, yPos);
    doc.text('Quantity', 130, yPos);
    doc.text('Unit Price:', 155, yPos);
    doc.text('Total Price:', 180, yPos);
    
    yPos += 5;
    
    // Items
    doc.setFont('helvetica', 'normal');
    quotationItems.forEach((item, index) => {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 30;
      }
      
      const position = String((index + 1) * 10).padStart(3, '0');
      doc.setFont('helvetica', 'bold');
      doc.text(position, margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      // Handle multi-line descriptions
      const descLines = doc.splitTextToSize(item.description || '', 105);
      descLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 20, yPos + (idx * 5));
      });
      
      doc.text(`${item.quantity || 0} Pcs.`, 130, yPos);
      doc.text(`€ ${parseFloat(item.unitPrice || '0').toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 155, yPos);
      doc.text(`€ ${parseFloat(item.lineTotal || '0').toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 180, yPos);
      
      yPos += Math.max(descLines.length * 5, 5) + 10;
    });
    
    yPos += 5;
    
    // Total
    const totalAmount = parseFloat(quotationForm.watch("totalAmount") || '0');
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 155, yPos);
    doc.text(`€ ${totalAmount.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 180, yPos);
    
    yPos += 10;
    
    // Amount in words
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Amount in words: ${numberToWords(totalAmount)}`, margin + 80, yPos);
    
    yPos += 10;
    
    // Notes
    const notes = quotationForm.watch("notes");
    if (notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 5;
      const noteLines = doc.splitTextToSize(notes, pageWidth - 2 * margin);
      noteLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 5;
    }
    
    yPos += 10;
    
    // Payment conditions and delivery info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const paymentConditions = quotationForm.watch("paymentConditions") || 'Payment within 30 days';
    const incoTerms = quotationForm.watch("incoTerms") || 'Ex Works';
    const validityDays = quotationForm.watch("validityDays") || 30;
    
    doc.text(`Payment conditions: ${paymentConditions}`, margin + 20, yPos);
    yPos += 5;
    doc.text(`Delivery: ${incoTerms}`, margin + 40, yPos);
    yPos += 5;
    doc.text(`Delivery time: To be discussed`, margin + 30, yPos);
    yPos += 5;
    doc.text(`Validity: ${validityDays} Days`, margin + 40, yPos);
    
    yPos += 15;
    
    // Signature
    doc.setFont('helvetica', 'normal');
    doc.text('Kind regards, A. Tomassen', margin + 30, yPos);
    
    // Footer
    yPos = pageHeight - 20;
    doc.setFontSize(8);
    doc.text('Our general terms and conditions apply to all our deliveries.', margin, yPos);
    
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
      
      // Open PDF in new window for better compatibility
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open in new tab/window
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "Success", 
        description: "PDF preview geopend in nieuw tabblad",
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

  // Create form sections for LayoutForm2
  const createQuotationFormSections = (): FormSection2<QuotationFormData>[] => {
    return [
      {
        id: "general",
        label: "General",
        rows: [
          createFieldsRow([
            // Positie 1-2: Customer (full width)
            {
              key: "customerId",
              label: "Customer",
              type: "custom",
              layout: "single",
              customComponent: (
                <CustomerSelect
                  value={quotationForm.watch("customerId")}
                  onValueChange={(value) => quotationForm.setValue("customerId", value)}
                  placeholder="Select customer..."
                  testId="select-customer"
                  onOpen={() => setShouldLoadCustomers(true)}
                  customers={customers.map(c => ({ 
                    id: c.id, 
                    customerNumber: c.customerNumber || '', 
                    name: c.name, 
                    email: c.generalEmail || undefined, 
                    phone: c.phone || undefined 
                  }))}
                />
              ),
              validation: {
                error: quotationForm.formState.errors.customerId?.message,
                isRequired: true
              },
              testId: "field-customer"
            },
            // Positie 2: Project
            {
              key: "projectId",
              label: "Project",
              type: "custom",
              layout: "single",
              customComponent: (
                <Popover open={projectPopoverOpen} onOpenChange={(isOpen) => {
                  setProjectPopoverOpen(isOpen);
                  if (isOpen) setShouldLoadProjects(true);
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectPopoverOpen}
                      className="w-full justify-between"
                      data-testid="select-project"
                    >
                      {quotationForm.watch("projectId") 
                        ? projects.find(p => p.id === quotationForm.watch("projectId"))?.name || "Selecteer project..."
                        : "Selecteer project..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="p-0 max-h-[300px]" 
                    align="start" 
                    sideOffset={4}
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                  >
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput placeholder="Zoek project..." className="border-0 focus:ring-0" />
                      </div>
                      <CommandList>
                        <CommandEmpty>Geen projecten gevonden</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              quotationForm.setValue("projectId", "");
                              setProjectPopoverOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">Geen project</span>
                          </CommandItem>
                          {projects.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={project.name}
                              onSelect={() => {
                                quotationForm.setValue("projectId", project.id);
                                setProjectPopoverOpen(false);
                              }}
                            >
                              <span className="font-medium">{project.projectNumber}</span>
                              <span className="ml-2 text-muted-foreground">{project.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => {
                            setProjectPopoverOpen(false);
                            navigate("/projects/new");
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Nieuw project aanmaken
                        </Button>
                      </div>
                    </Command>
                  </PopoverContent>
                </Popover>
              ),
              validation: {
                error: quotationForm.formState.errors.projectId?.message
              },
              testId: "field-project"
            },
            // Positie 3: Quotation Date
            {
              key: "quotationDate",
              label: "Quotation Date",
              type: "date",
              placeholder: "dd-mm-yyyy",
              setValue: (value) => quotationForm.setValue("quotationDate", value),
              watch: () => quotationForm.watch("quotationDate"),
              validation: {
                error: quotationForm.formState.errors.quotationDate?.message,
                isRequired: true
              },
              testId: "input-quotation-date"
            },
            // Positie 4: Status
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "draft", label: "Draft" },
                { value: "sent", label: "Sent" },
                { value: "accepted", label: "Accepted" },
                { value: "rejected", label: "Rejected" },
                { value: "expired", label: "Expired" }
              ],
              setValue: (value) => quotationForm.setValue("status", value),
              watch: () => quotationForm.watch("status"),
              validation: {
                error: quotationForm.formState.errors.status?.message
              },
              testId: "select-status"
            },
            // Positie 5: Validity Days
            {
              key: "validityDays",
              label: "Validity (days)",
              type: "text",
              register: quotationForm.register("validityDays", { valueAsNumber: true }),
              validation: {
                error: quotationForm.formState.errors.validityDays?.message,
                isRequired: true
              },
              testId: "input-validity-days"
            },
            // Positie 6: Valid Until
            {
              key: "validUntil",
              label: "Valid Until",
              type: "date",
              placeholder: "dd-mm-yyyy",
              setValue: (value) => quotationForm.setValue("validUntil", value),
              watch: () => quotationForm.watch("validUntil"),
              validation: {
                error: quotationForm.formState.errors.validUntil?.message
              },
              testId: "input-valid-until"
            },
            // Positie 7: Budget Quotation
            {
              key: "isBudgetQuotation",
              label: "Budget Quotation",
              type: "custom",
              customComponent: (
                <div className="flex items-center space-x-2 mt-2">
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
                    Mark as budget quotation
                  </Label>
                </div>
              ),
              validation: {
                error: quotationForm.formState.errors.isBudgetQuotation?.message
              },
              testId: "field-budget-quotation"
            }
            // Positie 8-12: automatisch leeg
          ]),
          // Custom row voor Description veld dat over de gehele breedte loopt
          {
            type: 'custom',
            customContent: (
              <div className="grid grid-cols-[130px_1fr] items-start gap-3 mt-4">
                <Label 
                  htmlFor="description" 
                  className="text-sm font-medium text-right pt-2"
                >
                  Description
                </Label>
                <div>
                  <Textarea
                    id="description"
                    {...quotationForm.register("description")}
                    placeholder="Quotation description..."
                    className="min-h-[80px]"
                    data-testid="textarea-quotation-description"
                  />
                  {quotationForm.formState.errors.description && (
                    <span className="text-sm text-red-600 mt-1 block">
                      {quotationForm.formState.errors.description.message}
                    </span>
                  )}
                </div>
              </div>
            )
          }
        ]
      },
      {
        id: "memo",
        label: "Memo",
        rows: [
          createCustomRow(
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-orange-600">Memo Management</h3>
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
        ]
      },
      {
        id: "line-item",
        label: editingItem ? "Adjust Line" : "Add Line",
        rows: [
          createCustomRow(
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-orange-600">
                {editingItem ? `Regel Aanpassen - Pos. ${editingItem.positionNo}` : 'Nieuwe Regel Toevoegen'}
              </h3>
              <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="item-description" className="text-sm font-medium text-right pt-2">
                    Description *
                  </Label>
                  <Textarea
                    id="item-description"
                    {...itemForm.register('description')}
                    placeholder="Item description"
                    className="min-h-[100px]"
                    data-testid="input-item-description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <Label htmlFor="item-quantity" className="text-sm font-medium text-right">
                      Quantity
                    </Label>
                    <Input
                      id="item-quantity"
                      type="number"
                      min="1"
                      step="1"
                      {...itemForm.register('quantity', { valueAsNumber: true })}
                      data-testid="input-item-quantity"
                    />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                    <Label htmlFor="item-unitPrice" className="text-sm font-medium text-right">
                      Unit Price (€)
                    </Label>
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
                
                <div className="grid grid-cols-[130px_1fr] items-center gap-3">
                  <Label htmlFor="item-lineTotal" className="text-sm font-medium text-right">
                    Line Total (€)
                  </Label>
                  <Input
                    id="item-lineTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    {...itemForm.register('lineTotal')}
                    className="bg-gray-50 dark:bg-gray-800 max-w-[200px]"
                    readOnly
                    data-testid="input-item-lineTotal"
                  />
                </div>
                
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(null);
                      setItemType(null);
                      itemForm.reset({
                        quotationId: quotationId || "",
                        description: "",
                        quantity: 1,
                        unitPrice: "0.00",
                        lineTotal: "0.00",
                        lineType: "standard",
                        itemId: null,
                      });
                      setActiveTab("general");
                    }}
                    data-testid="button-cancel-item"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700"
                    data-testid="button-save-item"
                  >
                    {editingItem ? 'UPDATE LINE' : 'ADD LINE'}
                  </Button>
                </div>
              </form>
            </div>
          )
        ]
      },
      {
        id: "financial",
        label: "Financial",
        rows: [
          createSectionHeaderRow("Financial Summary", "mb-6"),
          createFieldRow({
            key: "subtotal",
            label: "Subtotal",
            type: "display",
            displayValue: (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-2xl font-bold">€{quotationForm.watch("subtotal") || "0.00"}</p>
              </div>
            ),
            testId: "text-subtotal"
          }),
          createFieldsRow([
            {
              key: "taxAmount",
              label: "Tax (21%)",
              type: "display",
              displayValue: (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-2xl font-bold">€{quotationForm.watch("taxAmount") || "0.00"}</p>
                </div>
              ),
              testId: "text-tax"
            },
            {
              key: "totalAmount",
              label: "Total",
              type: "display",
              displayValue: (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200">
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">€{quotationForm.watch("totalAmount") || "0.00"}</p>
                </div>
              ),
              testId: "text-total"
            }
          ])
        ]
      }
    ];
  };

  // Create header fields for LayoutForm2
  const headerFields: InfoField[] = [
    {
      label: 'Quotation Number',
      value: quotationId ? existingQuotation?.quotationNumber || '...' : nextQuotationNumber
    },
    {
      label: 'Customer',
      value: quotationCustomer?.name || 'No customer selected'
    }
  ];

  // Create action buttons for LayoutForm2
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

  // Additional action: Print button (only for existing quotations)
  const additionalHeaderActions = quotationId && existingQuotation ? (
    <QuotationPrintDialog
      quotationId={quotationId}
      quotationNumber={existingQuotation.quotationNumber}
    />
  ) : null;

  return (
    <div className="h-full">
      {/* Additional header actions */}
      {additionalHeaderActions && (
        <div className="px-6 py-3 bg-white border-b flex justify-end">
          {additionalHeaderActions}
        </div>
      )}
      
      <LayoutForm2
        sections={createQuotationFormSections()}
        activeSection={activeTab}
        onSectionChange={setActiveTab}
        form={quotationForm}
        onSubmit={handleSaveQuotation}
        actionButtons={actionButtons}
        isLoading={quotationLoading}
      />
      {/* Quotation Items Table */}
      <div className="px-6 py-4 bg-white ml-[15px] mr-[15px]">
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
          onRowDoubleClick={(item: QuotationItem) => {
            setEditingItem(item);
            setItemType('onetime');
            itemForm.reset({
              quotationId: item.quotationId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice || "0.00",
              lineTotal: item.lineTotal || "0.00",
              itemId: item.itemId,
              lineType: item.lineType || "standard",
            });
            setActiveTab("line-item");
          }}
          headerActions={[
            {
              key: 'add-onetime-item',
              label: 'ADD LINE',
              icon: <Plus className="h-4 w-4" />,
              onClick: () => {
                setEditingItem(null);
                setItemType('onetime');
                itemForm.reset({
                  quotationId: quotationId || "",
                  description: "",
                  quantity: 1,
                  unitPrice: "0.00",
                  lineTotal: "0.00",
                  lineType: "standard",
                  itemId: null,
                });
                setActiveTab("line-item");
              },
              variant: 'default' as const
            }
          ]}
          rowActions={(item: QuotationItem) => [
            {
              key: 'edit',
              label: 'Edit',
              icon: <FileText className="h-4 w-4" />,
              onClick: () => {
                setEditingItem(item);
                setItemType('onetime');
                itemForm.reset({
                  quotationId: item.quotationId,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice || "0.00",
                  lineTotal: item.lineTotal || "0.00",
                  itemId: item.itemId,
                  lineType: item.lineType || "standard",
                });
                setActiveTab("line-item");
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
              <object 
                data={pdfBlobUrl} 
                type="application/pdf"
                className="w-full h-full border rounded-md"
                title="PDF Preview"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-500 mb-4">PDF preview not supported in this browser</p>
                  <Button onClick={handleSavePDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </object>
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