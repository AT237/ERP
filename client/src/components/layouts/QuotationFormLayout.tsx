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
      validityDays: 30,
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

  // Item functionality - handleAddItem is now replaced by direct item type handlers in headerActions

  const renderItemDialog = () => {
    // Render specific form based on selected type
    switch (itemType) {
      case 'database':
        return renderDatabaseItemForm();
      case 'new':
        return renderNewItemForm();
      case 'onetime':
        return renderOnetimeItemForm();
      case 'text':
        return renderTextItemForm();
      default:
        return null;
    }
  };

  const renderDatabaseItemForm = () => {
    const currentDescription = itemForm.watch('description') || '';
    const isItemInDatabase = inventoryItems.some(item => 
      item.description?.toLowerCase().includes(currentDescription.toLowerCase()) && currentDescription.length > 3
    );
    const shouldShowPlusButton = currentDescription.length > 3 && !isItemInDatabase && !selectedInventoryItem;

    return (
      <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setShowItemDialog(false);
              setItemType(null);
            }}
            className="text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug
          </Button>
          <span className="text-sm text-muted-foreground">Artikel uit database</span>
        </div>
        
        <div className="space-y-2">
          <Label>Selecteer artikel</Label>
          <div className="flex items-center gap-2">
            <Select onValueChange={(value) => {
              const item = inventoryItems.find(i => i.id === value);
              if (item) {
                setSelectedInventoryItem(item);
                itemForm.setValue('description', item.name || item.description || '');
                itemForm.setValue('unitPrice', item.unitPrice || '0.00');
                itemForm.setValue('itemId', item.id);
                // Recalculate line total
                const quantity = itemForm.watch('quantity') || 1;
                const lineTotal = (quantity * parseFloat(item.unitPrice || '0')).toFixed(2);
                itemForm.setValue('lineTotal', lineTotal);
              }
            }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Kies een artikel..." />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - €{item.unitPrice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0 border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={() => setShowAddInventoryDialog(true)}
              title="Artikel toevoegen aan database"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschrijving</Label>
          <Textarea
            id="description"
            {...itemForm.register("description")}
            data-testid="input-item-description"
            placeholder="Typ om te zoeken of voer nieuwe beschrijving in..."
            onChange={(e) => {
              // Reset selected item when description changes
              if (selectedInventoryItem) {
                setSelectedInventoryItem(null);
              }
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Aantal</Label>
            <Input
              id="quantity"
              type="number"
              {...itemForm.register("quantity", { valueAsNumber: true })}
              onChange={(e) => {
                const unitPrice = itemForm.watch("unitPrice") || "0";
                const quantity = e.target.value;
                const lineTotal = (parseFloat(quantity || "1") * parseFloat(unitPrice)).toFixed(2);
                itemForm.setValue("lineTotal", lineTotal);
              }}
              data-testid="input-quantity"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Eenheidsprijs (€)</Label>
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
            <Label htmlFor="lineTotal">Regeltotaal (€)</Label>
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
            Annuleren
          </Button>
          <Button type="submit">
            Artikel toevoegen
          </Button>
        </div>
      </form>
    );
  };

  const renderNewItemForm = () => {
    return (
      <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setItemType(null)}
            className="text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug
          </Button>
          <span className="text-sm text-muted-foreground">Nieuw artikel aanmaken</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschrijving</Label>
          <Textarea
            id="description"
            {...itemForm.register("description")}
            placeholder="Voer artikel beschrijving in..."
            data-testid="input-item-description"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Aantal</Label>
            <Input
              id="quantity"
              type="number"
              {...itemForm.register("quantity", { valueAsNumber: true })}
              onChange={(e) => {
                const unitPrice = itemForm.watch("unitPrice") || "0";
                const quantity = e.target.value;
                const lineTotal = (parseFloat(quantity || "1") * parseFloat(unitPrice)).toFixed(2);
                itemForm.setValue("lineTotal", lineTotal);
              }}
              data-testid="input-quantity"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Eenheidsprijs (€)</Label>
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
            <Label htmlFor="lineTotal">Regeltotaal (€)</Label>
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
            Annuleren
          </Button>
          <Button type="submit">
            Artikel toevoegen
          </Button>
        </div>
      </form>
    );
  };

  const renderOnetimeItemForm = () => {
    return (
      <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setItemType(null)}
            className="text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug
          </Button>
          <span className="text-sm text-muted-foreground">Eenmalig artikel</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschrijving</Label>
          <Textarea
            id="description"
            {...itemForm.register("description")}
            placeholder="Voer eenmalige artikel beschrijving in..."
            data-testid="input-item-description"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Aantal</Label>
            <Input
              id="quantity"
              type="number"
              {...itemForm.register("quantity", { valueAsNumber: true })}
              onChange={(e) => {
                const unitPrice = itemForm.watch("unitPrice") || "0";
                const quantity = e.target.value;
                const lineTotal = (parseFloat(quantity || "1") * parseFloat(unitPrice)).toFixed(2);
                itemForm.setValue("lineTotal", lineTotal);
              }}
              data-testid="input-quantity"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Eenheidsprijs (€)</Label>
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
            <Label htmlFor="lineTotal">Regeltotaal (€)</Label>
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
            Annuleren
          </Button>
          <Button type="submit">
            Artikel toevoegen
          </Button>
        </div>
      </form>
    );
  };

  const renderTextItemForm = () => {
    return (
      <form onSubmit={itemForm.handleSubmit((data) => {
        const newItem: QuotationItem = {
          id: Math.random().toString(36).substr(2, 9),
          quotationId: quotationId || "",
          itemId: null,
          description: data.description,
          quantity: 0, // Text items have no quantity
          unitPrice: "0.00", // Text items have no price
          lineTotal: "0.00", // Text items don't affect totals
        };
        
        setQuotationItems(prev => [...prev, newItem]);
        setShowItemDialog(false);
        itemForm.reset();
      })} className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setItemType(null)}
            className="text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug
          </Button>
          <span className="text-sm text-muted-foreground">Tekst regel</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Tekst</Label>
          <Textarea
            id="description"
            {...itemForm.register("description")}
            placeholder="Voer tekst in (geen prijs berekening)..."
            data-testid="input-item-description"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
            Annuleren
          </Button>
          <Button type="submit">
            Tekst toevoegen
          </Button>
        </div>
      </form>
    );
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

  // Helper function to convert number to words
  const numberToWords = (amount: number): string => {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const thousands = ['', 'thousand', 'million', 'billion'];

    if (amount === 0) return 'zero euro';

    const euros = Math.floor(amount);
    const cents = Math.round((amount - euros) * 100);

    const convertHundreds = (num: number): string => {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };

    const convertNumber = (num: number): string => {
      if (num === 0) return '';
      let result = '';
      let thousandIndex = 0;
      
      while (num > 0) {
        const chunk = num % 1000;
        if (chunk !== 0) {
          result = convertHundreds(chunk) + thousands[thousandIndex] + ' ' + result;
        }
        num = Math.floor(num / 1000);
        thousandIndex++;
      }
      return result.trim();
    };

    let result = convertNumber(euros) + ' euro';
    if (cents > 0) {
      result += ' and ' + convertNumber(cents) + ' cent';
    }
    
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  // PDF and Email functionality
  const generatePDF = (title: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header - Date (top right)
    doc.setFontSize(11);
    doc.text(`Date: ${format(new Date(), 'dd-MM-yyyy')}`, pageWidth - 20, 20, { align: 'right' });
    
    // Main title (centered)
    const quotationNumber = quotationForm.watch("quotationNumber") === "Auto-generated" ? nextQuotationNumber : quotationForm.watch("quotationNumber");
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`QUOTATION ${quotationNumber}`, pageWidth / 2, 35, { align: 'center' });
    
    // Supplier and Customer info (two columns)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier: ATE Solutions B.V.', 20, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Oude Telgterweg 255', 20, 60);
    doc.text('3853PG, ERMELO', 20, 67);
    doc.text('0031 682332087', 20, 74);
    doc.text('info@atesolutions.nl', 20, 81);
    doc.text('VAT no. NL 8656 38792 B01', 20, 88);
    doc.text('C.o.c. no. 91385415', 20, 95);
    doc.text('IBAN: NL28INGB 0102962979', 20, 102);
    doc.text('The Netherlands', 20, 109);
    
    // Customer info (right column)
    const customer = customers.find(c => c.id === quotationForm.watch("customerId"));
    if (customer) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer: ${customer.name}`, 120, 50);
      doc.setFont('helvetica', 'normal');
      
      // Add customer information with proper spacing
      let customerYPos = 60;
      if (customer.email) {
        doc.text(customer.email, 120, customerYPos);
        customerYPos += 7;
      }
      if (customer.phone) {
        doc.text(customer.phone, 120, customerYPos);
        customerYPos += 7;
      }
      if (customer.mobile) {
        doc.text(customer.mobile, 120, customerYPos);
        customerYPos += 7;
      }
      
      // Add customer number if available
      if (customer.customerNumber) {
        doc.text(`Customer No: ${customer.customerNumber}`, 120, customerYPos);
      }
    }
    
    // Quotation description
    const description = quotationForm.watch("description");
    if (description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Quotation description:', 20, 125);
      doc.setFont('helvetica', 'normal');
      doc.text(description, 20, 135);
    }
    
    // Items table
    let yPos = 155;
    
    // Table headers
    doc.setFont('helvetica', 'bold');
    doc.text('Position', 20, yPos);
    doc.text('Description', 40, yPos);
    doc.text('Quantity', 120, yPos);
    doc.text('Unit Price:', 140, yPos);
    doc.text('Total Price:', 170, yPos);
    
    // Line under headers
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    
    // Items
    quotationItems.forEach((item, index) => {
      const position = String(index + 1).padStart(3, '0');
      doc.text(position, 20, yPos);
      
      // Description (with word wrap)
      const description = item.description || '';
      const splitDescription = doc.splitTextToSize(description, 75);
      doc.text(splitDescription, 40, yPos);
      
      doc.text(`${item.quantity || 0} Pcs.`, 120, yPos);
      doc.text(`€ ${parseFloat(item.unitPrice || '0').toLocaleString('nl-NL', {minimumFractionDigits: 2})}`, 140, yPos);
      doc.text(`€ ${parseFloat(item.lineTotal || '0').toLocaleString('nl-NL', {minimumFractionDigits: 2})}`, 170, yPos);
      
      yPos += Math.max(10, splitDescription.length * 5);
    });
    
    // Total
    yPos += 10;
    const total = quotationItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || '0'), 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 140, yPos);
    doc.text(`€ ${total.toLocaleString('nl-NL', {minimumFractionDigits: 2})}`, 170, yPos);
    
    // Amount in words
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(`Amount in words: ${numberToWords(total)}`, 20, yPos);
    
    // Notes
    const notes = quotationForm.watch("notes");
    if (notes) {
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(notes, 170);
      doc.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 5;
    }
    
    // Payment conditions, Delivery, etc.
    yPos += 20;
    const paymentConditions = quotationForm.watch("paymentConditions") || "Payment within 30 days";
    const deliveryConditions = quotationForm.watch("deliveryConditions") || "Ex Works";
    const validUntilValue = quotationForm.watch("validUntil");
    const validity = validUntilValue ? `${Math.ceil((new Date(validUntilValue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days` : "30 Days";
    
    doc.text(`Payment conditions: ${paymentConditions}`, 20, yPos);
    doc.text(`Delivery: ${deliveryConditions}`, 20, yPos + 7);
    doc.text('Delivery time: To be discussed', 20, yPos + 14);
    doc.text(`Validity: ${validity}`, 20, yPos + 21);
    
    // Signature
    yPos += 40;
    doc.text('Kind regards, A. Tomassen', 20, yPos);
    
    // Footer
    yPos += 20;
    doc.setFontSize(9);
    doc.text('Our general terms and conditions apply to all our deliveries.', 20, yPos);
    
    return doc;
  };

  const handlePreview = () => {
    try {
      const pdf = generatePDF('DRAFT QUOTATION');
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

  const handleSavePDF = () => {
    if (currentPDF) {
      const filename = `draft-quotation-${nextQuotationNumber}.pdf`;
      currentPDF.save(filename);
      toast({
        title: "Success",
        description: "PDF saved successfully",
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

  const handleSendQuotation = () => {
    try {
      // First save the quotation if needed
      const formData = quotationForm.getValues();
      
      // Generate PDF
      const pdf = generatePDF('QUOTATION');
      
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
      
      // Show PDF for preview
      setCurrentPDF(pdf);
      const emailPdfBlob = pdf.output('blob');
      const emailPdfUrl = URL.createObjectURL(emailPdfBlob);
      setPdfBlobUrl(emailPdfUrl);
      setShowPDFPreview(true);
      
      toast({
        title: "Email Prepared",
        description: "Outlook opened with email draft. PDF preview opened for attachment.",
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
              onClick={handlePreview}
              className="h-8 text-xs"
              data-testid="button-preview"
            >
              <Eye size={14} className="mr-1" />
              Preview
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
                        <CustomerSelect
                          value={quotationForm.watch("customerId")}
                          onValueChange={(value) => quotationForm.setValue("customerId", value)}
                          placeholder="Select customer..."
                          testId="select-customer"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="grid grid-cols-3 gap-4">
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
                            <Label htmlFor="validityDays">Validity (days)</Label>
                            <Input
                              id="validityDays"
                              type="number"
                              min="1"
                              defaultValue="30"
                              {...quotationForm.register("validityDays", { valueAsNumber: true })}
                              data-testid="input-validity-days"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="validUntil">Valid Until</Label>
                            <Input
                              id="validUntil"
                              type="date"
                              {...quotationForm.register("validUntil")}
                              className="bg-gray-50 dark:bg-gray-800"
                              readOnly
                              data-testid="input-valid-until"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Quotation description</Label>
                        <Textarea
                          id="description"
                          {...quotationForm.register("description")}
                          data-testid="input-description"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
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
          <div className="mt-8 space-y-4">
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
                  key: 'add-database-item',
                  label: 'Database artikel',
                  icon: <Package className="h-4 w-4" />,
                  onClick: () => {
                    setItemType('database');
                    setEditingItem(null);
                    setSelectedInventoryItem(null);
                    itemForm.reset({
                      quotationId: "",
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
                  key: 'add-onetime-item',
                  label: 'Eenmalig artikel',
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => {
                    setItemType('onetime');
                    setEditingItem(null);
                    setSelectedInventoryItem(null);
                    itemForm.reset({
                      quotationId: "",
                      description: "",
                      quantity: 1,
                      unitPrice: "0.00", 
                      lineTotal: "0.00",
                    });
                    setShowItemDialog(true);
                  },
                  variant: 'outline' as const
                },
                {
                  key: 'add-text-item',
                  label: 'Tekst regel',
                  icon: <Type className="h-4 w-4" />,
                  onClick: () => {
                    setItemType('text');
                    setEditingItem(null);
                    setSelectedInventoryItem(null);
                    itemForm.reset({
                      quotationId: "",
                      description: "",
                      quantity: 1,
                      unitPrice: "0.00", 
                      lineTotal: "0.00",
                    });
                    setShowItemDialog(true);
                  },
                  variant: 'outline' as const
                },
                {
                  key: 'duplicate-items',
                  label: 'Duplicate',
                  icon: <Copy className="h-4 w-4" />,
                  onClick: () => {
                    const selectedItems = quotationItems.filter(item => 
                      itemTableState.selectedRows.includes(item.id)
                    );
                    if (selectedItems.length === 0) {
                      // Show toast notification
                      return;
                    }
                    // Duplicate selected items logic here
                  },
                  variant: 'outline' as const,
                  disabled: itemTableState.selectedRows.length === 0
                }
              ]}
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
                content: renderItemDialog()
              }}
            />
          </div>
        </CardContent>
      </Card>
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

      {/* Add Inventory Item Dialog */}
      <Dialog open={showAddInventoryDialog} onOpenChange={setShowAddInventoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Artikel toevoegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={inventoryForm.handleSubmit((data) => createInventoryItemMutation.mutate(data))} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600">Basisinformatie</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventory-name">Naam *</Label>
                  <Input
                    id="inventory-name"
                    {...inventoryForm.register("name")}
                    placeholder="Artikelnaam"
                    data-testid="input-inventory-name"
                  />
                  {inventoryForm.formState.errors.name && (
                    <p className="text-sm text-red-600">{inventoryForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory-sku">SKU *</Label>
                  <Input
                    id="inventory-sku"
                    {...inventoryForm.register("sku")}
                    placeholder="SKU/Artikelcode"
                    data-testid="input-inventory-sku"
                  />
                  {inventoryForm.formState.errors.sku && (
                    <p className="text-sm text-red-600">{inventoryForm.formState.errors.sku.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-description">Beschrijving</Label>
                <Textarea
                  id="inventory-description"
                  {...inventoryForm.register("description")}
                  placeholder="Beschrijving van het artikel"
                  data-testid="input-inventory-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventory-category">Categorie</Label>
                <Select 
                  onValueChange={(value) => inventoryForm.setValue("category", value)}
                  defaultValue="General"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">Algemeen</SelectItem>
                    <SelectItem value="Electronics">Elektronica</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Services">Diensten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600">Afbeelding</h3>
              
              <div className="space-y-2">
                <Label htmlFor="inventory-image">Productafbeelding</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {previewImage ? (
                    <div className="space-y-2">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="mx-auto h-32 w-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewImage("");
                          inventoryForm.setValue("image", "");
                        }}
                      >
                        Verwijderen
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-gray-500">
                        Sleep een afbeelding hierheen of klik om te selecteren
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        disabled={uploadingImage}
                        className="cursor-pointer"
                        data-testid="input-inventory-image"
                      />
                      {uploadingImage && <div className="text-sm text-orange-600">Comprimeren...</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600">Prijzen</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inventory-costPrice">Kostprijs (€) *</Label>
                  <Input
                    id="inventory-costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...inventoryForm.register("costPrice")}
                    placeholder="0.00"
                    data-testid="input-inventory-costPrice"
                  />
                  {inventoryForm.formState.errors.costPrice && (
                    <p className="text-sm text-red-600">{inventoryForm.formState.errors.costPrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory-unitPrice">Verkoopprijs (€) *</Label>
                  <Input
                    id="inventory-unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    {...inventoryForm.register("unitPrice")}
                    placeholder="0.00"
                    data-testid="input-inventory-unitPrice"
                  />
                  {inventoryForm.formState.errors.unitPrice && (
                    <p className="text-sm text-red-600">{inventoryForm.formState.errors.unitPrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory-margin">Marge (%)</Label>
                  <Input
                    id="inventory-margin"
                    {...inventoryForm.register("margin")}
                    placeholder="0.00"
                    readOnly
                    className="bg-gray-50"
                    data-testid="input-inventory-margin"
                  />
                </div>
              </div>
            </div>

            {/* Composite Article Option */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-600">Samengesteld artikel</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inventory-isComposite"
                  checked={inventoryForm.watch("isComposite") || false}
                  onCheckedChange={(checked) => inventoryForm.setValue("isComposite", !!checked)}
                  data-testid="checkbox-inventory-isComposite"
                />
                <Label htmlFor="inventory-isComposite">
                  Dit artikel bestaat uit andere artikelen
                </Label>
              </div>
              
              {inventoryForm.watch("isComposite") && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700">
                    Na het aanmaken van dit artikel kun je componenten toevoegen via de inventory pagina.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddInventoryDialog(false);
                  setPreviewImage("");
                  inventoryForm.reset();
                }}
                disabled={createInventoryItemMutation.isPending}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={createInventoryItemMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {createInventoryItemMutation.isPending ? "Toevoegen..." : "Artikel toevoegen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}