import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Download, Eye, Save, FileText, Receipt, Package, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Grid3x3, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Maximize2, Database, ArrowUp, ArrowDown, Type, Image, Table2, Printer, Bold, Italic, Underline, Copy, Trash2, Group, Ungroup, Minus, Square } from 'lucide-react';
import { BlockRenderers, UnknownBlockRenderer, TEXT_VARIABLES } from '@/components/print/BlockRenderers';
import { PrintData, blockHasContent } from '@/utils/field-resolver';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function LayoutDesigner() {
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<'quotation' | 'invoice' | 'packing_list'>('quotation');
  const [showNewLayoutDialog, setShowNewLayoutDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutOrientation, setNewLayoutOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [activeTab, setActiveTab] = useState('layouts');
  const { toast } = useToast();
  
  // Load existing layouts
  const { data: layouts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/layouts'],
  });

  // Create new layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/layouts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      setShowNewLayoutDialog(false);
      setNewLayoutName('');
      toast({
        title: 'Success',
        description: 'Layout created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create layout',
        variant: 'destructive',
      });
    },
  });

  const handleCreateLayout = () => {
    if (!newLayoutName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a layout name',
        variant: 'destructive',
      });
      return;
    }

    createLayoutMutation.mutate({
      name: newLayoutName,
      documentType,
      pageFormat: 'a4',
      orientation: newLayoutOrientation,
      isDefault: false,
      isActive: true,
    });
  };

  // Duplicate layout mutation
  const duplicateLayoutMutation = useMutation({
    mutationFn: async (layoutId: number) => {
      const layoutToDuplicate = (layouts as any[]).find((l: any) => l.id === layoutId);
      if (!layoutToDuplicate) throw new Error('Layout not found');
      
      // Create new layout with copied data
      const newLayoutResponse = await apiRequest('POST', '/api/layouts', {
        name: `${layoutToDuplicate.name} (kopie)`,
        documentType: layoutToDuplicate.documentType,
        pageFormat: layoutToDuplicate.pageFormat,
        orientation: layoutToDuplicate.orientation,
        isDefault: false,
        isActive: true,
        metadata: layoutToDuplicate.metadata,
      });
      const newLayout = await newLayoutResponse.json();
      
      // Also copy sections if they exist
      const sectionsResponse = await fetch(`/api/layout-sections?layoutId=${layoutId}`);
      if (sectionsResponse.ok) {
        const sections = await sectionsResponse.json();
        for (const section of sections) {
          await apiRequest('POST', '/api/layout-sections', {
            layoutId: newLayout.id,
            name: section.name,
            sectionType: section.sectionType,
            position: section.position,
            config: section.config,
          });
        }
      }
      
      return newLayout;
    },
    onSuccess: (newLayout: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      toast({
        title: 'Layout gedupliceerd',
        description: 'De layout is succesvol gekopieerd',
      });
      setSelectedLayoutId(newLayout.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Fout',
        description: error.message || 'Kon layout niet dupliceren',
        variant: 'destructive',
      });
    },
  });

  const handleDuplicateLayout = (layoutId: number) => {
    duplicateLayoutMutation.mutate(layoutId);
  };

  // Filter layouts by document type
  const filteredLayouts = (layouts as any[]).filter((layout: any) => 
    layout.documentType === documentType
  );

  const selectedLayout = (layouts as any[]).find((layout: any) => layout.id === selectedLayoutId);

  const documentTypeIcons = {
    quotation: FileText,
    invoice: Receipt,
    packing_list: Package,
  };

  const documentTypeLabels = {
    quotation: 'Quotation',
    invoice: 'Invoice',
    packing_list: 'Packing List',
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - only show on Layout Manager tab */}
      {activeTab !== 'designer' && (
        <div className="border-b border-border bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-orange-600">Layout Designer</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and customize document templates for quotations, invoices, and packing lists
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNewLayoutDialog(true)}
                  data-testid="button-new-layout"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Layout
                </Button>
              </div>
            </div>

            {/* Document Type Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">Document Type:</label>
              <Select value={documentType} onValueChange={(value: any) => setDocumentType(value)}>
                <SelectTrigger className="w-[200px]" data-testid="select-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = documentTypeIcons[key as keyof typeof documentTypeIcons];
                          return <Icon className="h-4 w-4" />;
                        })()}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="ml-2">
                {filteredLayouts.length} {filteredLayouts.length === 1 ? 'layout' : 'layouts'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b border-border px-6 bg-white">
            <TabsList className="bg-transparent h-12">
              <TabsTrigger value="layouts" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">
                Layout Manager
              </TabsTrigger>
              <TabsTrigger value="designer" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600" disabled={!selectedLayoutId}>
                Visual Designer
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600" disabled={!selectedLayoutId}>
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <div className={`flex-1 overflow-auto ${activeTab === 'designer' ? 'p-2' : 'p-6'}`}>
            <TabsContent value="layouts" className="h-full m-0">
              <LayoutManagerView
                layouts={filteredLayouts}
                documentType={documentType}
                isLoading={isLoading}
                onSelectLayout={setSelectedLayoutId}
                selectedLayoutId={selectedLayoutId}
                onCreateNew={() => setShowNewLayoutDialog(true)}
                onDuplicate={handleDuplicateLayout}
              />
            </TabsContent>

            <TabsContent value="designer" className="h-full m-0">
              <VisualDesignerView layout={selectedLayout} />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0">
              <PreviewView layout={selectedLayout} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* New Layout Dialog */}
      <Dialog open={showNewLayoutDialog} onOpenChange={setShowNewLayoutDialog}>
        <DialogContent data-testid="dialog-new-layout">
          <DialogHeader>
            <DialogTitle>Create New Layout</DialogTitle>
            <DialogDescription>
              Create a new document layout for {documentTypeLabels[documentType]}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="layout-name">Layout Name</Label>
              <Input
                id="layout-name"
                placeholder="e.g., Standard Quotation Layout"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                data-testid="input-layout-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select value={newLayoutOrientation} onValueChange={(value: any) => setNewLayoutOrientation(value)}>
                <SelectTrigger id="orientation" data-testid="select-orientation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border p-3 bg-muted/50">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Type:</span>
                  <span className="font-medium">{documentTypeLabels[documentType]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Page Format:</span>
                  <span className="font-medium">A4</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewLayoutDialog(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateLayout}
              disabled={createLayoutMutation.isPending}
              data-testid="button-create"
            >
              {createLayoutMutation.isPending ? 'Creating...' : 'Create Layout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Layout Manager Component
function LayoutManagerView({
  layouts,
  documentType,
  isLoading,
  onSelectLayout,
  selectedLayoutId,
  onCreateNew,
  onDuplicate,
}: {
  layouts: any[];
  documentType: string;
  isLoading: boolean;
  onSelectLayout: (id: number) => void;
  selectedLayoutId: number | null;
  onCreateNew: () => void;
  onDuplicate: (layoutId: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading layouts...</div>
      </div>
    );
  }

  if (layouts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-center">No Layouts Found</CardTitle>
          <CardDescription className="text-center">
            Create your first {documentType} layout to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button onClick={onCreateNew} data-testid="button-create-first-layout">
            <Plus className="h-4 w-4 mr-2" />
            Create First Layout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {layouts.map((layout) => (
        <Card
          key={layout.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedLayoutId === layout.id ? 'ring-2 ring-orange-500' : ''
          }`}
          onClick={() => onSelectLayout(layout.id)}
          data-testid={`card-layout-${layout.id}`}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{layout.name}</CardTitle>
                <CardDescription className="mt-1">
                  {layout.pageFormat} · {layout.orientation}
                </CardDescription>
              </div>
              {layout.isDefault && (
                <Badge variant="secondary" className="ml-2">Default</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Page Size:</span>
                <span className="font-medium">{layout.pageFormat.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Orientation:</span>
                <span className="font-medium capitalize">{layout.orientation}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={layout.isActive ? 'default' : 'outline'} className="text-xs">
                  {layout.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1" 
                data-testid={`button-edit-${layout.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayout(layout.id);
                }}
              >
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1" 
                data-testid={`button-duplicate-${layout.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(layout.id);
                }}
              >
                Duplicate
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Conversion constants: 1mm = 3.78px at 96 DPI
const MM_TO_PX = 3.78;
const PX_TO_MM = 1 / MM_TO_PX;

// Helper functions for mm/px conversion
const pxToMm = (px: number): number => Math.round(px * PX_TO_MM * 10) / 10;
const mmToPx = (mm: number): number => Math.round(mm * MM_TO_PX);

// Data Field Insert Menu Component with collapsible categories
function DataFieldInsertMenu({ 
  blockId, 
  currentText, 
  onInsert, 
  availableTables 
}: { 
  blockId: string; 
  currentText: string; 
  onInsert: (newText: string) => void;
  availableTables: { name: string; label: string; fields: string[] }[];
}) {
  const [expandedTables, setExpandedTables] = useState<string[]>([]);

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const insertField = (tableName: string, fieldName: string) => {
    const placeholder = `{{${tableName}.${fieldName}}}`;
    const textarea = document.getElementById(`text-content-${blockId}`) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = currentText.substring(0, start) + placeholder + currentText.substring(end);
      onInsert(newText);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + placeholder.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      onInsert(currentText + placeholder);
    }
  };

  return (
    <div className="border rounded-md max-h-80 overflow-y-auto">
      {availableTables.map((table) => (
        <div key={table.name} className="border-b last:border-b-0">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-muted"
            onClick={() => toggleTable(table.name)}
          >
            <span>{table.name}</span>
            <span className="text-muted-foreground">
              {expandedTables.includes(table.name) ? '−' : '+'}
            </span>
          </button>
          {expandedTables.includes(table.name) && (
            <div className="bg-muted/30 px-2 py-1">
              {table.fields.map((field) => (
                <button
                  key={field}
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-orange-100 rounded flex items-center gap-2"
                  onClick={() => insertField(table.name, field)}
                >
                  <span className="text-orange-600">+</span>
                  <span>{field}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{`{{${table.name}.${field}}}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Visual Designer Component
function VisualDesignerView({ layout }: { layout: any }) {
  // Section-based state
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]); // Multi-select support
  const [selectedChildBlock, setSelectedChildBlock] = useState<{ block: any; parentGroupId: string } | null>(null); // Child block within group
  const [draggedBlockType, setDraggedBlockType] = useState<string | null>(null);
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('layout-designer-zoom');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [leftPanelTab, setLeftPanelTab] = useState<'sections' | 'blocks'>('sections');
  const [showNewSectionDialog, setShowNewSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionType, setNewSectionType] = useState('custom');
  const [showTableSelectorDialog, setShowTableSelectorDialog] = useState(false);
  const [allowedTables, setAllowedTables] = useState<string[]>(layout?.allowedTables || []);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'block' | 'section'; id: string; sectionId?: string } | null>(null);
  const { toast } = useToast();
  
  // Drag state for block positioning with alignment guides
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'h' | 'v'; position: number }[]>([]);
  
  // Available database tables for selection - all tables related to quotations and documents
  const availableTables = [
    // Document Types
    { name: 'quotation', label: 'Offerte', fields: ['quotationNumber', 'quotationDate', 'validUntil', 'validityDays', 'description', 'revisionNumber', 'status', 'isBudgetQuotation', 'subtotal', 'taxAmount', 'totalAmount', 'incoTerms', 'paymentConditions', 'deliveryConditions', 'notes'] },
    { name: 'quotationItems', label: 'Offerte Regels', fields: ['lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'taxRate', 'lineTotal', 'notes'] },
    { name: 'invoice', label: 'Factuur', fields: ['invoiceNumber', 'status', 'dueDate', 'subtotal', 'taxAmount', 'totalAmount', 'paidAmount', 'notes'] },
    { name: 'invoiceItems', label: 'Factuur Regels', fields: ['lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'taxRate', 'lineTotal'] },
    { name: 'proformaInvoice', label: 'Proforma Factuur', fields: ['invoiceNumber', 'status', 'dueDate', 'subtotal', 'taxAmount', 'totalAmount'] },
    { name: 'purchaseOrder', label: 'Inkooporder', fields: ['orderNumber', 'orderDate', 'expectedDate', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
    { name: 'purchaseOrderItems', label: 'Inkooporder Regels', fields: ['lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'] },
    { name: 'salesOrder', label: 'Verkooporder', fields: ['orderNumber', 'orderDate', 'expectedDeliveryDate', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
    { name: 'salesOrderItems', label: 'Verkooporder Regels', fields: ['lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'] },
    { name: 'workOrder', label: 'Werkorder', fields: ['workOrderNumber', 'orderDate', 'dueDate', 'status', 'priority', 'description', 'assignedTo', 'notes'] },
    { name: 'packingList', label: 'Paklijst', fields: ['packingListNumber', 'packingDate', 'status', 'shippingMethod', 'trackingNumber', 'totalWeight', 'totalPackages', 'notes'] },
    { name: 'packingListItems', label: 'Paklijst Regels', fields: ['lineNumber', 'description', 'quantity', 'weight', 'packageNumber'] },
    { name: 'quotationRequest', label: 'Offerte Aanvraag', fields: ['requestNumber', 'requestDate', 'status', 'description', 'notes'] },
    
    // Relations
    { name: 'customer', label: 'Klant', fields: ['customerNumber', 'name', 'kvkNummer', 'generalEmail', 'email', 'phone', 'mobile', 'contactPersonEmail', 'taxId', 'bankAccount', 'invoiceEmail', 'invoiceNotes', 'memo', 'paymentTerms', 'status', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },
    { name: 'customerContact', label: 'Klant Contact', fields: ['name', 'email', 'phone', 'function', 'isPrimary'] },
    { name: 'supplier', label: 'Leverancier', fields: ['supplierNumber', 'name', 'email', 'phone', 'contactPerson', 'taxId', 'paymentTerms', 'status', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },
    { name: 'prospect', label: 'Prospect', fields: ['prospectNumber', 'companyName', 'contactName', 'email', 'phone', 'status', 'source', 'notes'] },
    { name: 'project', label: 'Project', fields: ['projectNumber', 'name', 'description', 'status', 'startDate', 'endDate', 'totalValue', 'progress'] },
    { name: 'company', label: 'Bedrijf (Eigen)', fields: ['name', 'legalName', 'email', 'phone', 'website', 'kvkNummer', 'btwNummer', 'iban', 'bankName', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },
    
    // Products & Inventory
    { name: 'inventoryItem', label: 'Product/Artikel', fields: ['name', 'sku', 'description', 'category', 'unit', 'unitPrice', 'costPrice', 'margin', 'currentStock', 'minimumStock', 'status'] },
    
    // Addresses & Locations
    { name: 'address', label: 'Adres', fields: ['street', 'houseNumber', 'postalCode', 'city', 'country', 'province', 'type'] },
    { name: 'country', label: 'Land', fields: ['code', 'name', 'region', 'phoneCode'] },
    { name: 'city', label: 'Stad', fields: ['name', 'postalCode', 'province'] },
    { name: 'language', label: 'Taal', fields: ['code', 'name'] },
    
    // Master Data
    { name: 'unitOfMeasure', label: 'Eenheid', fields: ['code', 'name', 'description', 'symbol'] },
    { name: 'paymentDays', label: 'Betalingsdagen', fields: ['code', 'days', 'description'] },
    { name: 'paymentSchedule', label: 'Betalingsschema', fields: ['code', 'name', 'description'] },
    { name: 'paymentTerms', label: 'Betalingsvoorwaarden', fields: ['code', 'description', 'days'] },
    { name: 'incoterms', label: 'Incoterms', fields: ['code', 'name', 'description'] },
    { name: 'vatRate', label: 'BTW Tarief', fields: ['code', 'percentage', 'description', 'isDefault'] },
    { name: 'status', label: 'Status', fields: ['code', 'name', 'category', 'color', 'order'] },
    
    // Content
    { name: 'textSnippet', label: 'Tekst Snippet', fields: ['title', 'content', 'category', 'language', 'version'] },
    { name: 'image', label: 'Afbeelding', fields: ['name', 'description', 'url', 'category', 'width', 'height'] },
  ];

  // Load existing sections for this layout
  const { data: existingSections } = useQuery<any[]>({
    queryKey: [`/api/layout-sections?layoutId=${layout?.id}`],
    enabled: !!layout?.id,
  });

  // Load sections into state when they're fetched
  useEffect(() => {
    if (existingSections && existingSections.length > 0 && sections.length === 0) {
      const loadedSections = existingSections.map((section: any) => ({
        id: section.id,
        name: section.name,
        sectionType: section.sectionType,
        position: section.position,
        config: {
          ...section.config, // Preserve all config properties (including heightCanShrink, widthCanShrink, etc.)
          printRules: section.config?.printRules || { everyPage: true },
          dimensions: section.config?.dimensions || { height: 200, unit: 'px' },
          style: section.config?.style || {},
          blocks: section.config?.blocks || [],
          layoutGrid: section.config?.layoutGrid,
          metadata: section.config?.metadata || {},
          canGrow: section.config?.canGrow || false,
          canShrink: section.config?.canShrink || false,
        },
      }));
      setSections(loadedSections.sort((a, b) => a.position - b.position));
    }
  }, [existingSections]);

  // Save zoom setting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('layout-designer-zoom', zoom.toString());
  }, [zoom]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Select a layout to start designing</div>
      </div>
    );
  }

  // Create new section
  const handleCreateSection = () => {
    if (!newSectionName.trim()) {
      toast({
        title: 'Naam vereist',
        description: 'Geef de sectie een naam',
        variant: 'destructive',
      });
      return;
    }

    const newSection = {
      id: `section-${Date.now()}`,
      name: newSectionName,
      sectionType: newSectionType,
      position: sections.length,
      config: {
        printRules: { everyPage: true },
        dimensions: { height: 200, unit: 'px' as const },
        style: { backgroundColor: '#ffffff' },
        blocks: [],
        metadata: {},
      },
    };

    setSections([...sections, newSection]);
    setSelectedSection(newSection);
    setShowNewSectionDialog(false);
    setNewSectionName('');
    setNewSectionType('custom');
  };

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      // Update layout metadata with print margins
      await apiRequest('PUT', `/api/layouts/${layout.id}`, {
        metadata: {
          ...layout.metadata,
          printMargins,
        },
      });

      // Delete existing sections first
      if (existingSections && existingSections.length > 0) {
        for (const section of existingSections) {
          await apiRequest('DELETE', `/api/layout-sections/${section.id}`);
        }
      }

      // Save all sections with their blocks
      for (const section of sections) {
        await apiRequest('POST', '/api/layout-sections', {
          layoutId: layout.id,
          name: section.name,
          sectionType: section.sectionType,
          position: section.position,
          config: section.config,
        });
      }

      return sections;
    },
    onSuccess: () => {
      toast({
        title: 'Opgeslagen!',
        description: `Layout "${layout.name}" is succesvol opgeslagen`,
      });
      // Invalidate both layouts and sections to refetch from database
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/layout-sections?layoutId=${layout.id}`] });
      // Reset sections state so useEffect reloads from database
      setSections([]);
      setSelectedSection(null);
      setSelectedBlock(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Fout bij opslaan',
        description: error.message || 'Kon layout niet opslaan',
        variant: 'destructive',
      });
    },
  });

  const handleDragStart = (blockType: string) => {
    setDraggedBlockType(blockType);
  };

  const handleDropOnSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBlockType) return;

    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    // Get drop position relative to section
    const sectionElement = e.currentTarget as HTMLElement;
    const rect = sectionElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newBlock = {
      id: `block-${Date.now()}`,
      type: draggedBlockType,
      position: { x: pxToMm(x), y: pxToMm(y) },
      size: { width: 50, height: 25 },
      style: {
        fontSize: 9,
        fontFamily: 'helvetica',
        fontStyle: 'normal',
      },
      zIndex: (section.config.blocks?.length || 0),
      config: getDefaultConfig(draggedBlockType),
    };

    // Add block to section
    const updatedSections = sections.map(s => 
      s.id === sectionId 
        ? { ...s, config: { ...s.config, blocks: [...(s.config.blocks || []), newBlock] } }
        : s
    );

    setSections(updatedSections);
    setSelectedBlock(newBlock);
    setDraggedBlockType(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveBlock = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId 
        ? { ...s, config: { ...s.config, blocks: (s.config.blocks || []).filter((b: any) => b.id !== blockId) } }
        : s
    );
    setSections(updatedSections);
    
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  // Move block forward (on top of others) - higher index = rendered later = on top
  const handleMoveBlockUp = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      const blocks = [...(s.config.blocks || [])];
      const index = blocks.findIndex((b: any) => b.id === blockId);
      
      if (index >= 0 && index < blocks.length - 1) {
        // Swap with next block (move to higher index = on top)
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }
      
      return { ...s, config: { ...s.config, blocks } };
    });
    
    setSections(updatedSections);
  };

  // Move block backward (behind others) - lower index = rendered first = behind
  const handleMoveBlockDown = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      const blocks = [...(s.config.blocks || [])];
      const index = blocks.findIndex((b: any) => b.id === blockId);
      
      if (index > 0) {
        // Swap with previous block (move to lower index = behind)
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
      }
      
      return { ...s, config: { ...s.config, blocks } };
    });
    
    setSections(updatedSections);
  };

  const handleBlockClick = (block: any, e?: React.MouseEvent) => {
    const isCtrlPressed = e?.ctrlKey || e?.metaKey;
    
    if (isCtrlPressed) {
      // Multi-select with Ctrl/Cmd
      setSelectedBlockIds(prev => {
        if (prev.includes(block.id)) {
          // Remove from selection
          return prev.filter(id => id !== block.id);
        } else {
          // Add to selection
          return [...prev, block.id];
        }
      });
      setSelectedBlock(null);
    } else {
      // Single select - clear multi-select
      setSelectedBlock(block);
      setSelectedBlockIds([]);
    }
    setSelectedSection(null);
    setSelectedChildBlock(null); // Clear child selection when clicking a block
  };

  // Handle clicking on a child block within a group
  const handleChildBlockClick = (childBlock: any, parentGroupId: string) => {
    setSelectedChildBlock({ block: childBlock, parentGroupId });
    setSelectedBlock(null);
    setSelectedBlockIds([]);
    setSelectedSection(null);
  };

  const handleSectionClick = (section: any) => {
    setSelectedSection(section);
    setSelectedBlock(null); // Deselect block when section is selected
  };

  // Group selected blocks into a single Group block
  const handleGroupBlocks = () => {
    if (selectedBlockIds.length < 2) return;
    
    // Find the section containing the selected blocks
    let targetSection: any = null;
    let blocksToGroup: any[] = [];
    
    for (const section of sections) {
      const sectionBlocks = section.config.blocks || [];
      const matchingBlocks = sectionBlocks.filter((b: any) => selectedBlockIds.includes(b.id));
      if (matchingBlocks.length > 0) {
        targetSection = section;
        blocksToGroup = matchingBlocks;
        break;
      }
    }
    
    if (!targetSection || blocksToGroup.length < 2) {
      toast({ title: 'Fout', description: 'Selecteer minimaal 2 blokken in dezelfde sectie', variant: 'destructive' });
      return;
    }
    
    // Calculate bounding box of all selected blocks
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const block of blocksToGroup) {
      const x = block.position?.x || 0;
      const y = block.position?.y || 0;
      const w = block.size?.width || 50;
      const h = block.size?.height || 25;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    
    // Convert child blocks to relative positions within the group
    const childBlocks = blocksToGroup.map((block: any) => ({
      ...block,
      position: {
        x: (block.position?.x || 0) - minX,
        y: (block.position?.y || 0) - minY,
      }
    }));
    
    // Create the group block
    const groupBlock = {
      id: `group-${Date.now()}`,
      type: 'Group',
      position: { x: minX, y: minY },
      size: { width: maxX - minX, height: maxY - minY },
      config: {
        childBlocks,
        collapseEmpty: false, // Default: don't collapse when empty
      },
      style: {},
    };
    
    // Update the section: remove grouped blocks, add group block
    const updatedSections = sections.map(s => {
      if (s.id !== targetSection.id) return s;
      
      const remainingBlocks = (s.config.blocks || []).filter(
        (b: any) => !selectedBlockIds.includes(b.id)
      );
      
      return {
        ...s,
        config: {
          ...s.config,
          blocks: [...remainingBlocks, groupBlock],
        },
      };
    });
    
    setSections(updatedSections);
    setSelectedBlockIds([]);
    setSelectedBlock(groupBlock);
    toast({ title: 'Gegroepeerd', description: `${blocksToGroup.length} blokken zijn gegroepeerd` });
  };

  // Ungroup a Group block back into individual blocks
  const handleUngroupBlock = () => {
    if (!selectedBlock || selectedBlock.type !== 'Group') return;
    
    // Find the section containing the group
    let targetSection: any = null;
    for (const section of sections) {
      if (section.config.blocks?.some((b: any) => b.id === selectedBlock.id)) {
        targetSection = section;
        break;
      }
    }
    
    if (!targetSection) return;
    
    // Get child blocks and convert back to absolute positions
    const childBlocks = (selectedBlock.config?.childBlocks || []).map((block: any) => ({
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: (selectedBlock.position?.x || 0) + (block.position?.x || 0),
        y: (selectedBlock.position?.y || 0) + (block.position?.y || 0),
      }
    }));
    
    // Update the section: remove group block, add child blocks
    const updatedSections = sections.map(s => {
      if (s.id !== targetSection.id) return s;
      
      const otherBlocks = (s.config.blocks || []).filter(
        (b: any) => b.id !== selectedBlock.id
      );
      
      return {
        ...s,
        config: {
          ...s.config,
          blocks: [...otherBlocks, ...childBlocks],
        },
      };
    });
    
    setSections(updatedSections);
    setSelectedBlock(null);
    toast({ title: 'Ontgroepeerd', description: `${childBlocks.length} blokken zijn vrijgegeven` });
  };

  // Block dragging with alignment guides
  const SNAP_THRESHOLD = 5; // mm tolerance for snapping (increased for easier snapping)
  
  const handleBlockDragStart = (e: React.MouseEvent, block: any, sectionId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDragBlockId(block.id);
    setDragSectionId(sectionId);
    setIsDraggingBlock(true);
    setSelectedBlock(block);
    setSelectedSection(null);
  };

  const handleBlockDragMove = (e: React.MouseEvent, sectionElement: HTMLElement) => {
    if (!isDraggingBlock || !dragBlockId || !dragSectionId) return;
    
    const section = sections.find(s => s.id === dragSectionId);
    if (!section) return;
    
    const sectionRect = sectionElement.getBoundingClientRect();
    const rawX = (e.clientX - sectionRect.left - dragOffset.x) / zoom;
    const rawY = (e.clientY - sectionRect.top - dragOffset.y) / zoom;
    
    // Convert to mm
    let newXMm = pxToMm(rawX);
    let newYMm = pxToMm(rawY);
    
    // Get current block being dragged
    const currentBlock = section.config.blocks?.find((b: any) => b.id === dragBlockId);
    if (!currentBlock) return;
    
    const blockWidth = currentBlock.size?.width || 50;
    const blockHeight = currentBlock.size?.height || 25;
    
    // Calculate alignment guides
    const guides: { type: 'h' | 'v'; position: number }[] = [];
    const otherBlocks = (section.config.blocks || []).filter((b: any) => b.id !== dragBlockId);
    
    // Track if we snapped to prevent multiple snaps
    let snappedX = false;
    let snappedY = false;
    
    for (const other of otherBlocks) {
      const ox = other.position?.x || 0;
      const oy = other.position?.y || 0;
      const ow = other.size?.width || 50;
      const oh = other.size?.height || 25;
      
      // Left edge alignment (both blocks have same left edge)
      if (!snappedX && Math.abs(newXMm - ox) < SNAP_THRESHOLD) {
        newXMm = ox;
        guides.push({ type: 'v', position: mmToPx(ox) });
        snappedX = true;
      }
      // Right edge alignment (both blocks have same right edge)
      if (!snappedX && Math.abs(newXMm + blockWidth - (ox + ow)) < SNAP_THRESHOLD) {
        newXMm = ox + ow - blockWidth;
        guides.push({ type: 'v', position: mmToPx(ox + ow) });
        snappedX = true;
      }
      // Left edge to right edge (block's left aligns with other's right)
      if (!snappedX && Math.abs(newXMm - (ox + ow)) < SNAP_THRESHOLD) {
        newXMm = ox + ow;
        guides.push({ type: 'v', position: mmToPx(ox + ow) });
        snappedX = true;
      }
      // Right edge to left edge (block's right aligns with other's left)
      if (!snappedX && Math.abs(newXMm + blockWidth - ox) < SNAP_THRESHOLD) {
        newXMm = ox - blockWidth;
        guides.push({ type: 'v', position: mmToPx(ox) });
        snappedX = true;
      }
      
      // Top edge alignment (same top)
      if (!snappedY && Math.abs(newYMm - oy) < SNAP_THRESHOLD) {
        newYMm = oy;
        guides.push({ type: 'h', position: mmToPx(oy) });
        snappedY = true;
      }
      // Bottom edge alignment (same bottom)
      if (!snappedY && Math.abs(newYMm + blockHeight - (oy + oh)) < SNAP_THRESHOLD) {
        newYMm = oy + oh - blockHeight;
        guides.push({ type: 'h', position: mmToPx(oy + oh) });
        snappedY = true;
      }
      // Top to bottom (block's top aligns with other's bottom - stacking vertically)
      if (!snappedY && Math.abs(newYMm - (oy + oh)) < SNAP_THRESHOLD) {
        newYMm = oy + oh;
        guides.push({ type: 'h', position: mmToPx(oy + oh) });
        snappedY = true;
      }
      // Bottom to top (block's bottom aligns with other's top)
      if (!snappedY && Math.abs(newYMm + blockHeight - oy) < SNAP_THRESHOLD) {
        newYMm = oy - blockHeight;
        guides.push({ type: 'h', position: mmToPx(oy) });
        snappedY = true;
      }
      
      // Center horizontal alignment
      if (!snappedX) {
        const centerX = newXMm + blockWidth / 2;
        const otherCenterX = ox + ow / 2;
        if (Math.abs(centerX - otherCenterX) < SNAP_THRESHOLD) {
          newXMm = otherCenterX - blockWidth / 2;
          guides.push({ type: 'v', position: mmToPx(otherCenterX) });
          snappedX = true;
        }
      }
      // Center vertical alignment
      if (!snappedY) {
        const centerY = newYMm + blockHeight / 2;
        const otherCenterY = oy + oh / 2;
        if (Math.abs(centerY - otherCenterY) < SNAP_THRESHOLD) {
          newYMm = otherCenterY - blockHeight / 2;
          guides.push({ type: 'h', position: mmToPx(otherCenterY) });
          snappedY = true;
        }
      }
    }
    
    setAlignmentGuides(guides);
    
    // Clamp to section bounds
    newXMm = Math.max(0, Math.min(newXMm, 210 - blockWidth));
    newYMm = Math.max(0, newYMm);
    
    // Update block position
    updateBlockProperty(dragSectionId, dragBlockId, 'position', { x: newXMm, y: newYMm });
  };

  const handleBlockDragEnd = () => {
    setIsDraggingBlock(false);
    setDragBlockId(null);
    setDragSectionId(null);
    setAlignmentGuides([]);
  };

  const updateSectionProperty = (sectionId: string, path: string, value: any) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      const pathParts = path.split('.');
      const updated = { ...s };
      let current: any = updated;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        current[pathParts[i]] = { ...current[pathParts[i]] };
        current = current[pathParts[i]];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      return updated;
    });
    
    setSections(updatedSections);
    
    if (selectedSection?.id === sectionId) {
      const updated = updatedSections.find(s => s.id === sectionId);
      if (updated) setSelectedSection(updated);
    }
  };

  const updateBlockProperty = (sectionId: string, blockId: string, property: string, value: any) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      return {
        ...s,
        config: {
          ...s.config,
          blocks: (s.config.blocks || []).map((b: any) => 
            b.id === blockId ? { ...b, [property]: value } : b
          ),
        },
      };
    });
    
    setSections(updatedSections);
    
    // Update selectedBlock if it's the one being modified
    if (selectedBlock?.id === blockId) {
      const updatedSection = updatedSections.find(s => s.id === sectionId);
      const updatedBlock = updatedSection?.config.blocks?.find((b: any) => b.id === blockId);
      if (updatedBlock) {
        setSelectedBlock(updatedBlock);
      }
    }
  };

  // Move block from one section to another
  const moveBlockToSection = (fromSectionId: string, toSectionId: string, blockId: string) => {
    if (fromSectionId === toSectionId) return;
    
    // Find the block to move
    const fromSection = sections.find(s => s.id === fromSectionId);
    const blockToMove = fromSection?.config.blocks?.find((b: any) => b.id === blockId);
    if (!blockToMove) return;
    
    const updatedSections = sections.map(s => {
      if (s.id === fromSectionId) {
        // Remove block from source section
        return {
          ...s,
          config: {
            ...s.config,
            blocks: (s.config.blocks || []).filter((b: any) => b.id !== blockId),
          },
        };
      }
      if (s.id === toSectionId) {
        // Add block to target section
        return {
          ...s,
          config: {
            ...s.config,
            blocks: [...(s.config.blocks || []), blockToMove],
          },
        };
      }
      return s;
    });
    
    setSections(updatedSections);
    
    // Update selected section to the new section
    const newSection = updatedSections.find(s => s.id === toSectionId);
    if (newSection) {
      setSelectedSection(newSection);
    }
  };

  // Update property of a child block within a group
  const updateChildBlockProperty = (sectionId: string, parentGroupId: string, childBlockId: string, property: string, value: any) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      return {
        ...s,
        config: {
          ...s.config,
          blocks: (s.config.blocks || []).map((b: any) => {
            if (b.id !== parentGroupId || b.type !== 'Group') return b;
            
            // Update the child block within the group
            const updatedChildBlocks = (b.config?.childBlocks || []).map((child: any) =>
              child.id === childBlockId ? { ...child, [property]: value } : child
            );
            
            return {
              ...b,
              config: {
                ...b.config,
                childBlocks: updatedChildBlocks,
              },
            };
          }),
        },
      };
    });
    
    setSections(updatedSections);
    
    // Update selectedChildBlock if it's the one being modified
    if (selectedChildBlock?.block.id === childBlockId) {
      const updatedSection = updatedSections.find(s => s.id === sectionId);
      const updatedGroup = updatedSection?.config.blocks?.find((b: any) => b.id === parentGroupId);
      const updatedChild = updatedGroup?.config?.childBlocks?.find((c: any) => c.id === childBlockId);
      if (updatedChild) {
        setSelectedChildBlock({ block: updatedChild, parentGroupId });
      }
    }
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
    if (selectedSection?.id === sectionId) {
      setSelectedSection(null);
    }
  };

  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  
  // Print margins state (in mm) - load from layout metadata
  const [printMargins, setPrintMargins] = useState({ top: 10, right: 10, bottom: 10, left: 10 });
  const [showPrintMarginsDialog, setShowPrintMarginsDialog] = useState(false);
  const [showPrintMargins, setShowPrintMargins] = useState(true);

  // Load print margins from layout metadata
  useEffect(() => {
    if (layout?.metadata?.printMargins) {
      setPrintMargins(layout.metadata.printMargins);
    }
  }, [layout?.metadata?.printMargins]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border bg-white px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:bg-orange-500 hover:text-white" onClick={() => saveLayoutMutation.mutate()} disabled={saveLayoutMutation.isPending}>
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Save</p>
                <p className="text-xs text-muted-foreground">Save layout changes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Copy Block */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${selectedBlock ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedBlock}
                  onClick={() => {
                    if (!selectedBlock) return;
                    const sectionId = sections.find(s => s.config.blocks?.some((b: any) => b.id === selectedBlock.id))?.id;
                    if (!sectionId) return;
                    const section = sections.find(s => s.id === sectionId);
                    if (!section) return;
                    const copiedBlock = {
                      ...selectedBlock,
                      id: `block-${Date.now()}`,
                      position: { x: (selectedBlock.position?.x || 0) + 5, y: (selectedBlock.position?.y || 0) + 5 },
                    };
                    const updatedBlocks = [...(section.config.blocks || []), copiedBlock];
                    setSections(sections.map(s => s.id === sectionId ? { ...s, config: { ...s.config, blocks: updatedBlocks } } : s));
                    setSelectedBlock(copiedBlock);
                    toast({ title: 'Blok gekopieerd', description: 'Het blok is gekopieerd' });
                  }}
                  data-testid="btn-copy-block"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Kopiëren</p>
                <p className="text-xs text-muted-foreground">Kopieer geselecteerd blok</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete (Block or Section) */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${(selectedBlock || selectedSection) ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedBlock && !selectedSection}
                  onClick={() => {
                    if (selectedBlock) {
                      const sectionId = sections.find(s => s.config.blocks?.some((b: any) => b.id === selectedBlock.id))?.id;
                      if (sectionId) {
                        setDeleteTarget({ type: 'block', id: selectedBlock.id, sectionId });
                        setShowDeleteConfirmDialog(true);
                      }
                    } else if (selectedSection) {
                      setDeleteTarget({ type: 'section', id: selectedSection.id });
                      setShowDeleteConfirmDialog(true);
                    }
                  }}
                  data-testid="btn-delete-toolbar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Verwijderen</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBlock ? 'Verwijder geselecteerd blok' : selectedSection ? 'Verwijder geselecteerde sectie' : 'Selecteer een blok of sectie'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Section Move Up */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${selectedSection && sections.findIndex(s => s.id === selectedSection.id) > 0 ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedSection || sections.findIndex(s => s.id === selectedSection.id) <= 0}
                  onClick={() => {
                    if (!selectedSection) return;
                    const currentIndex = sections.findIndex(s => s.id === selectedSection.id);
                    if (currentIndex <= 0) return;
                    
                    setSections(prev => {
                      const newSections = [...prev];
                      const sectionToMove = newSections.find(s => s.id === selectedSection.id);
                      if (!sectionToMove) return prev;
                      
                      const filtered = newSections.filter(s => s.id !== selectedSection.id);
                      filtered.splice(currentIndex - 1, 0, sectionToMove);
                      
                      return filtered.map((s, index) => ({ ...s, position: index }));
                    });
                  }}
                  data-testid="btn-section-up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Sectie omhoog</p>
                <p className="text-xs text-muted-foreground">Verplaats sectie naar boven</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Section Move Down */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${selectedSection && sections.findIndex(s => s.id === selectedSection.id) < sections.length - 1 ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedSection || sections.findIndex(s => s.id === selectedSection.id) >= sections.length - 1}
                  onClick={() => {
                    if (!selectedSection) return;
                    const currentIndex = sections.findIndex(s => s.id === selectedSection.id);
                    if (currentIndex >= sections.length - 1) return;
                    
                    setSections(prev => {
                      const newSections = [...prev];
                      const sectionToMove = newSections.find(s => s.id === selectedSection.id);
                      if (!sectionToMove) return prev;
                      
                      const filtered = newSections.filter(s => s.id !== selectedSection.id);
                      filtered.splice(currentIndex + 1, 0, sectionToMove);
                      
                      return filtered.map((s, index) => ({ ...s, position: index }));
                    });
                  }}
                  data-testid="btn-section-down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Sectie omlaag</p>
                <p className="text-xs text-muted-foreground">Verplaats sectie naar beneden</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Bring to Front (z-index up) */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${selectedBlock ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedBlock}
                  onClick={() => {
                    if (!selectedBlock) return;
                    for (const section of sections) {
                      if (section.config.blocks?.some((b: any) => b.id === selectedBlock.id)) {
                        handleMoveBlockUp(section.id, selectedBlock.id);
                        break;
                      }
                    }
                  }}
                  data-testid="btn-bring-forward"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="6" width="8" height="8" rx="1" fill="white" />
                    <rect x="6" y="2" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.3" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Naar voren</p>
                <p className="text-xs text-muted-foreground">Breng blok naar voren</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Send to Back (z-index down) */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${selectedBlock ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedBlock}
                  onClick={() => {
                    if (!selectedBlock) return;
                    for (const section of sections) {
                      if (section.config.blocks?.some((b: any) => b.id === selectedBlock.id)) {
                        handleMoveBlockDown(section.id, selectedBlock.id);
                        break;
                      }
                    }
                  }}
                  data-testid="btn-send-backward"
                >
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="6" y="2" width="8" height="8" rx="1" fill="white" />
                    <rect x="2" y="6" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.3" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Naar achteren</p>
                <p className="text-xs text-muted-foreground">Stuur blok naar achteren</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Group Blocks - always visible, active when multiple blocks selected */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${
                    selectedBlockIds.length >= 2 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : 'text-gray-400 opacity-50'
                  }`}
                  disabled={selectedBlockIds.length < 2}
                  onClick={() => handleGroupBlocks()}
                  data-testid="btn-group-blocks"
                >
                  <Group className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Groeperen</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBlockIds.length >= 2 
                    ? `Groepeer ${selectedBlockIds.length} geselecteerde blokken` 
                    : 'Selecteer minimaal 2 blokken met Ctrl+klik'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Ungroup Block - always visible, active when group is selected */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`h-8 w-8 p-0 ${
                    selectedBlock?.type === 'Group' 
                      ? 'bg-orange-500 text-white hover:bg-orange-600' 
                      : 'text-gray-400 opacity-50'
                  }`}
                  disabled={selectedBlock?.type !== 'Group'}
                  onClick={() => handleUngroupBlock()}
                  data-testid="btn-ungroup-blocks"
                >
                  <Ungroup className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Ontgroeperen</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBlock?.type === 'Group' 
                    ? 'Haal blokken uit groep' 
                    : 'Selecteer eerst een groep'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Add Section & Draggable Block Icons */}
          <TooltipProvider delayDuration={2000}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-gray-500 hover:bg-orange-500 hover:text-white"
                    onClick={() => setShowNewSectionDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Add Section</p>
                  <p className="text-xs text-muted-foreground">Create a new page section</p>
                </TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-border mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={() => handleDragStart("Text")}
                    className="h-8 w-8 flex items-center justify-center rounded cursor-grab hover:bg-muted transition-colors"
                  >
                    <Type className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Text</p>
                  <p className="text-xs text-muted-foreground">Free text with formatting</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={() => handleDragStart("Image")}
                    className="h-8 w-8 flex items-center justify-center rounded cursor-grab hover:bg-muted transition-colors"
                  >
                    <Image className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Image</p>
                  <p className="text-xs text-muted-foreground">Upload or link an image</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={() => handleDragStart("Line")}
                    className="h-8 w-8 flex items-center justify-center rounded cursor-grab hover:bg-muted transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Lijn</p>
                  <p className="text-xs text-muted-foreground">Horizontale of verticale lijn</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={() => handleDragStart("Rectangle")}
                    className="h-8 w-8 flex items-center justify-center rounded cursor-grab hover:bg-muted transition-colors"
                  >
                    <Square className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Kader</p>
                  <p className="text-xs text-muted-foreground">Rechthoek met rand</p>
                </TooltipContent>
              </Tooltip>

            </div>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Grid Toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant={showGrid ? "default" : "ghost"} 
                  onClick={() => setShowGrid(!showGrid)}
                  className="px-2"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Raster</p>
                <p className="text-xs text-muted-foreground">Toon/verberg rasterlijnen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Print Margins */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant={showPrintMargins ? "default" : "ghost"} 
                  onClick={() => setShowPrintMarginsDialog(true)}
                  className="px-2"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Print Marges</p>
                <p className="text-xs text-muted-foreground">Stel printmarges in</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Table Selection */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowTableSelectorDialog(true)}
          >
            <Database className="h-4 w-4 mr-2" />
            Databron ({allowedTables.length})
          </Button>

          {/* Info */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {sections.length} {sections.length === 1 ? 'sectie' : 'secties'}
            </span>
          </div>
        </div>
      </div>

      {/* New Section Dialog */}
      <Dialog open={showNewSectionDialog} onOpenChange={setShowNewSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Sectie Maken</DialogTitle>
            <DialogDescription>
              Maak een nieuwe pagina-sectie voor deze layout
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Naam</Label>
              <Input
                id="section-name"
                placeholder="bijv. Header, Footer, Body"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-type">Type</Label>
              <Select value={newSectionType} onValueChange={setNewSectionType}>
                <SelectTrigger id="section-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                  <SelectItem value="body">Body</SelectItem>
                  <SelectItem value="table">Tabel</SelectItem>
                  <SelectItem value="custom">Aangepast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSectionDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateSection}>
              Maken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Selector Dialog */}
      <Dialog open={showTableSelectorDialog} onOpenChange={setShowTableSelectorDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Databronnen Selecteren</DialogTitle>
            <DialogDescription>
              Selecteer welke tabellen beschikbaar zijn voor Data Fields in dit rapport
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 overflow-auto max-h-[50vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b">
                <tr>
                  <th className="text-left py-2 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={allowedTables.length === availableTables.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAllowedTables(availableTables.map(t => t.name));
                        } else {
                          setAllowedTables([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left py-2 px-3 font-medium">Tabel</th>
                  <th className="text-left py-2 px-3 font-medium">Naam</th>
                  <th className="text-left py-2 px-3 font-medium text-right">Velden</th>
                </tr>
              </thead>
              <tbody>
                {availableTables.map((table) => (
                  <tr 
                    key={table.name}
                    className={`border-b cursor-pointer hover:bg-gray-50 ${
                      allowedTables.includes(table.name) ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => {
                      if (allowedTables.includes(table.name)) {
                        setAllowedTables(allowedTables.filter(t => t !== table.name));
                      } else {
                        setAllowedTables([...allowedTables, table.name]);
                      }
                    }}
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={allowedTables.includes(table.name)}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="py-2 px-3 font-medium">{table.label}</td>
                    <td className="py-2 px-3 text-muted-foreground">{table.name}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{table.fields.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <div className="text-sm text-muted-foreground mr-auto">
              {allowedTables.length} van {availableTables.length} geselecteerd
            </div>
            <Button variant="outline" onClick={() => setShowTableSelectorDialog(false)}>
              Sluiten
            </Button>
            <Button onClick={() => {
              setShowTableSelectorDialog(false);
              toast({
                title: 'Databronnen bijgewerkt',
                description: `${allowedTables.length} ${allowedTables.length === 1 ? 'tabel' : 'tabellen'} geselecteerd`,
              });
            }}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verwijderen bevestigen</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'block' 
                ? 'Weet je zeker dat je dit blok wilt verwijderen?' 
                : 'Weet je zeker dat je deze sectie wilt verwijderen? Alle blokken in deze sectie worden ook verwijderd.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirmDialog(false);
              setDeleteTarget(null);
            }}>
              Annuleren
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteTarget?.type === 'block' && deleteTarget.sectionId) {
                  handleRemoveBlock(deleteTarget.sectionId, deleteTarget.id);
                  toast({ title: 'Blok verwijderd', description: 'Het blok is verwijderd' });
                } else if (deleteTarget?.type === 'section') {
                  handleRemoveSection(deleteTarget.id);
                  toast({ title: 'Sectie verwijderd', description: 'De sectie is verwijderd' });
                }
                setShowDeleteConfirmDialog(false);
                setDeleteTarget(null);
              }}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Margins Dialog */}
      <Dialog open={showPrintMarginsDialog} onOpenChange={setShowPrintMarginsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Marges</DialogTitle>
            <DialogDescription>
              Stel de printmarges in (in millimeters). Deze worden als grijs gebied weergegeven.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="margin-top">Boven (mm)</Label>
                <Input
                  id="margin-top"
                  type="number"
                  min="0"
                  max="50"
                  value={printMargins.top}
                  onChange={(e) => setPrintMargins({ ...printMargins, top: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin-bottom">Onder (mm)</Label>
                <Input
                  id="margin-bottom"
                  type="number"
                  min="0"
                  max="50"
                  value={printMargins.bottom}
                  onChange={(e) => setPrintMargins({ ...printMargins, bottom: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin-left">Links (mm)</Label>
                <Input
                  id="margin-left"
                  type="number"
                  min="0"
                  max="50"
                  value={printMargins.left}
                  onChange={(e) => setPrintMargins({ ...printMargins, left: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin-right">Rechts (mm)</Label>
                <Input
                  id="margin-right"
                  type="number"
                  min="0"
                  max="50"
                  value={printMargins.right}
                  onChange={(e) => setPrintMargins({ ...printMargins, right: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="show-margins"
                checked={showPrintMargins}
                onChange={(e) => setShowPrintMargins(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="show-margins" className="text-sm font-normal">Toon marges in ontwerp</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintMarginsDialog(false)}>
              Sluiten
            </Button>
            <Button onClick={() => {
              setShowPrintMarginsDialog(false);
              toast({
                title: 'Marges bijgewerkt',
                description: `Marges: ${printMargins.top}mm (boven), ${printMargins.bottom}mm (onder), ${printMargins.left}mm (links), ${printMargins.right}mm (rechts)`,
              });
            }}>
              Toepassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="grid grid-cols-[1fr_300px] gap-4 h-full p-4">
        {/* Canvas - A4 Page Layout */}
        <Card className="flex flex-col bg-gray-50 overflow-auto">
          <div className="flex-1 p-8">
            <div 
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'top left',
              }}
            >
              {/* Layout Container with Rulers */}
              <div className="flex flex-col">
                {/* Top Ruler - Horizontal (210mm) */}
                <div className="flex pointer-events-none">
                  <div style={{ width: sections.length > 0 ? '40px' : '0px' }}></div>
                  <div 
                    className="bg-gray-100 border-b border-gray-300 relative"
                    style={{ width: '794px', height: '20px' }}
                  >
                    {Array.from({ length: 211 }).map((_, i) => {
                      const xPos = i * MM_TO_PX;
                      const isMajor = i % 10 === 0;
                      const isMid = i % 5 === 0 && !isMajor;
                      return (
                        <div key={`h-tick-${i}`} className="absolute bottom-0" style={{ left: `${xPos}px` }}>
                          <div 
                            className="bg-gray-500"
                            style={{ 
                              width: '1px', 
                              height: isMajor ? '10px' : isMid ? '6px' : '3px' 
                            }}
                          />
                          {isMajor && i > 0 && (
                            <span 
                              className="absolute text-gray-600"
                              style={{ 
                                fontSize: '8px', 
                                left: '-6px', 
                                top: '-10px' 
                              }}
                            >
                              {i}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ width: '20px' }}></div>
                </div>

                {/* Main Content Row */}
                <div className="flex gap-0">
                  {sections.length === 0 ? (
                    <>
                      <div className="flex-shrink-0" style={{ width: '40px' }}></div>
                      <div className="bg-white shadow-2xl relative" style={{ width: '794px', minHeight: '1123px' }}>
                        {/* Print Margin Overlays for empty state */}
                        {showPrintMargins && (
                          <>
                            <div 
                              className="absolute top-0 left-0 right-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                              style={{ height: `${mmToPx(printMargins.top)}px` }}
                            >
                              <span className="text-xs text-gray-600 font-medium">{printMargins.top}mm</span>
                            </div>
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                              style={{ height: `${mmToPx(printMargins.bottom)}px` }}
                            >
                              <span className="text-xs text-gray-600 font-medium">{printMargins.bottom}mm</span>
                            </div>
                            <div 
                              className="absolute left-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                              style={{ 
                                width: `${mmToPx(printMargins.left)}px`,
                                top: `${mmToPx(printMargins.top)}px`,
                                bottom: `${mmToPx(printMargins.bottom)}px`,
                              }}
                            >
                              <span className="text-xs text-gray-600 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{printMargins.left}mm</span>
                            </div>
                            <div 
                              className="absolute right-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                              style={{ 
                                width: `${mmToPx(printMargins.right)}px`,
                                top: `${mmToPx(printMargins.top)}px`,
                                bottom: `${mmToPx(printMargins.bottom)}px`,
                              }}
                            >
                              <span className="text-xs text-gray-600 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{printMargins.right}mm</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-center" style={{ minHeight: '1123px' }}>
                          <div className="text-center text-muted-foreground">
                            <div className="text-4xl mb-4">📄</div>
                            <div className="text-lg font-medium">No Sections</div>
                            <div className="text-sm mt-2">Create a new section to start</div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Left Side Panel - All Section Labels */}
                      <div className="flex-shrink-0 flex flex-col" style={{ width: '40px' }}>
                        {sections.map((section) => {
                          const sectionHeight = section.config.dimensions?.height || 200;
                          return (
                            <div 
                              key={`label-${section.id}`}
                              className="bg-orange-50 border border-orange-200 px-1 py-2" 
                              style={{ 
                                height: `${sectionHeight}px`, 
                                boxSizing: 'border-box',
                                writingMode: 'vertical-rl',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                width: '100%'
                              }}
                            >
                              <span className="font-medium text-sm text-gray-700" style={{ transform: 'rotate(180deg)' }}>
                                {section.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Center: A4 Document - Single container with all sections */}
                      <div 
                        className="shadow-lg relative"
                        style={{
                          width: '794px',
                          height: '1123px',
                          border: '2px solid #666',
                          overflow: 'hidden',
                        }}
                      >
                          {/* Print Margin Overlays */}
                          {showPrintMargins && (
                            <>
                              {/* Top margin */}
                              <div 
                                className="absolute top-0 left-0 right-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                                style={{ height: `${mmToPx(printMargins.top)}px` }}
                              >
                                <span className="text-xs text-gray-600 font-medium">{printMargins.top}mm</span>
                              </div>
                              {/* Bottom margin */}
                              <div 
                                className="absolute bottom-0 left-0 right-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                                style={{ height: `${mmToPx(printMargins.bottom)}px` }}
                              >
                                <span className="text-xs text-gray-600 font-medium">{printMargins.bottom}mm</span>
                              </div>
                              {/* Left margin */}
                              <div 
                                className="absolute top-0 bottom-0 left-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                                style={{ 
                                  width: `${mmToPx(printMargins.left)}px`,
                                  top: `${mmToPx(printMargins.top)}px`,
                                  bottom: `${mmToPx(printMargins.bottom)}px`,
                                }}
                              >
                                <span className="text-xs text-gray-600 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{printMargins.left}mm</span>
                              </div>
                              {/* Right margin */}
                              <div 
                                className="absolute top-0 bottom-0 right-0 bg-gray-200 opacity-50 pointer-events-none z-20 flex items-center justify-center"
                                style={{ 
                                  width: `${mmToPx(printMargins.right)}px`,
                                  top: `${mmToPx(printMargins.top)}px`,
                                  bottom: `${mmToPx(printMargins.bottom)}px`,
                                }}
                              >
                                <span className="text-xs text-gray-600 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{printMargins.right}mm</span>
                              </div>
                            </>
                          )}
                          <div className="bg-white h-full overflow-y-auto" style={{ boxSizing: 'border-box' }}>
                          {sections.map((section, index) => {
                            const sectionHeight = section.config.dimensions?.height || 200;
                            return (
                              <div 
                                key={section.id}
                                className={`transition-all ${
                                  selectedSection?.id === section.id 
                                    ? 'ring-4 ring-orange-500 ring-inset' 
                                    : ''
                                } ${index > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}
                                style={{
                                  backgroundColor: section.config.style?.backgroundColor || '#ffffff',
                                  height: `${sectionHeight}px`,
                                  minHeight: `${sectionHeight}px`,
                                  boxSizing: 'border-box',
                                }}
                                onClick={() => handleSectionClick(section)}
                              >
                            <div
                              className="relative p-4 h-full section-container"
                              data-section-id={section.id}
                              style={{
                                boxSizing: 'border-box',
                              backgroundImage: showGrid ? `
                                linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                                linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                              ` : 'none',
                              backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : 'auto',
                              cursor: isDraggingBlock ? 'grabbing' : 'default',
                            }}
                            onDrop={(e) => handleDropOnSection(e, section.id)}
                            onDragOver={handleDragOver}
                            onMouseMove={(e) => {
                              if (isDraggingBlock && dragSectionId === section.id) {
                                handleBlockDragMove(e, e.currentTarget);
                              }
                            }}
                            onMouseUp={handleBlockDragEnd}
                            onMouseLeave={handleBlockDragEnd}
                          >
                            {/* Height Grid Overlay */}
                            {section.config.layoutGrid && (() => {
                              const gridSectionHeight = section.config.dimensions?.height || 200;
                              const { rows, gutter } = section.config.layoutGrid;
                              const totalGutterSpace = (rows - 1) * gutter;
                              const availableHeight = gridSectionHeight - totalGutterSpace - 32;
                              const rowHeight = availableHeight / rows;
                              
                              return Array.from({ length: rows - 1 }).map((_, index) => {
                                const yPosition = (index + 1) * rowHeight + (index + 1) * gutter;
                                return (
                                  <div
                                    key={`grid-line-${index}`}
                                    className="absolute left-0 right-0 border-t-2 border-orange-400 border-dashed pointer-events-none"
                                    style={{
                                      top: `${yPosition}px`,
                                      opacity: 0.5,
                                    }}
                                  >
                                    <div className="absolute -top-3 right-2 text-xs text-orange-600 bg-white px-1 rounded">
                                      Rij {index + 2}
                                    </div>
                                  </div>
                                );
                              });
                            })()}

                            {(!section.config.blocks || section.config.blocks.length === 0) ? (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center text-muted-foreground">
                                  <div className="text-2xl mb-2">📦</div>
                                  <div className="text-sm">Sleep blokken hierheen</div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {section.config.blocks.map((block: any, blockIndex: number) => (
                                  <SectionBlock
                                    key={block.id}
                                    block={block}
                                    sectionId={section.id}
                                    layerIndex={blockIndex}
                                    isSelected={selectedBlock?.id === block.id}
                                    isMultiSelected={selectedBlockIds.includes(block.id)}
                                    isDragging={isDraggingBlock && dragBlockId === block.id}
                                    onClick={(e: React.MouseEvent) => handleBlockClick(block, e)}
                                    onDragStart={(e: React.MouseEvent) => handleBlockDragStart(e, block, section.id)}
                                    selectedChildId={selectedChildBlock && selectedChildBlock.parentGroupId === block.id ? selectedChildBlock.block.id : null}
                                    onChildClick={handleChildBlockClick}
                                  />
                                ))}
                                {/* Alignment Guides */}
                                {isDraggingBlock && dragSectionId === section.id && alignmentGuides.map((guide, i) => (
                                  guide.type === 'v' ? (
                                    <div
                                      key={`guide-v-${i}`}
                                      className="absolute top-0 bottom-0 pointer-events-none z-50"
                                      style={{
                                        left: `${guide.position}px`,
                                        width: '2px',
                                        backgroundColor: '#22c55e',
                                      }}
                                    />
                                  ) : (
                                    <div
                                      key={`guide-h-${i}`}
                                      className="absolute left-0 right-0 pointer-events-none z-50"
                                      style={{
                                        top: `${guide.position}px`,
                                        height: '2px',
                                        backgroundColor: '#22c55e',
                                      }}
                                    />
                                  )
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* Right Ruler - Vertical (297mm) */}
                  <div 
                    className="bg-gray-100 border-l border-gray-300 relative flex-shrink-0 pointer-events-none"
                    style={{ width: '20px', height: '1123px' }}
                  >
                    {Array.from({ length: 298 }).map((_, i) => {
                      const yPos = i * MM_TO_PX;
                      const isMajor = i % 10 === 0;
                      const isMid = i % 5 === 0 && !isMajor;
                      return (
                        <div key={`v-tick-${i}`} className="absolute left-0" style={{ top: `${yPos}px` }}>
                          <div 
                            className="bg-gray-500"
                            style={{ 
                              height: '1px', 
                              width: isMajor ? '10px' : isMid ? '6px' : '3px' 
                            }}
                          />
                          {isMajor && i > 0 && (
                            <span 
                              className="absolute text-gray-600"
                              style={{ 
                                fontSize: '8px', 
                                left: '12px', 
                                top: '-4px' 
                              }}
                            >
                              {i}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
              
              {/* Page Info */}
              <div className="text-center mt-4 text-xs text-gray-500">
                A4 Format: 210 × 297 mm
              </div>
            </div>
          </div>
        </Card>

        {/* Right Sidebar - Properties */}
        <Card className="overflow-auto">
          <CardHeader>
            <CardTitle className="text-base text-orange-600">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSection ? (
              <SectionProperties 
                section={selectedSection}
                sections={sections}
                onUpdateProperty={updateSectionProperty}
                onReorderSection={(sectionId, newPosition) => {
                  setSections(prev => {
                    const sectionToMove = prev.find(s => s.id === sectionId);
                    if (!sectionToMove) return prev;
                    
                    // Remove section from current position
                    const filtered = prev.filter(s => s.id !== sectionId);
                    
                    // Insert at new position
                    filtered.splice(newPosition, 0, sectionToMove);
                    
                    // Renumber all positions
                    return filtered.map((s, index) => ({ ...s, position: index }));
                  });
                }}
              />
            ) : selectedChildBlock ? (
              // Child block properties - show within context of parent group
              <div className="space-y-3">
                <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  Bewerken in Groep
                </div>
                <BlockProperties 
                  block={selectedChildBlock.block}
                  sectionId={sections.find(s => s.config.blocks?.some((b: any) => b.id === selectedChildBlock.parentGroupId))?.id}
                  sections={sections}
                  allowedTables={allowedTables}
                  availableTables={availableTables}
                  onUpdateProperty={(sectionId, _blockId, property, value) => {
                    updateChildBlockProperty(sectionId, selectedChildBlock.parentGroupId, selectedChildBlock.block.id, property, value);
                  }}
                />
              </div>
            ) : selectedBlock ? (
              <BlockProperties 
                block={selectedBlock}
                sectionId={sections.find(s => s.config.blocks?.some((b: any) => b.id === selectedBlock.id))?.id}
                sections={sections}
                allowedTables={allowedTables}
                availableTables={availableTables}
                onUpdateProperty={updateBlockProperty}
                onMoveBlock={moveBlockToSection}
              />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Selecteer een sectie of blok
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to get default config for each block type
function getDefaultConfig(blockType: string) {
  const companyData = {
    name: "Your Company Name B.V.",
    address: "Business Street 123",
    postalCode: "1234 AB",
    city: "Amsterdam",
    phone: "+31 20 123 4567",
    email: "info@yourcompany.nl",
    vatNumber: "NL123456789B01",
    cocNumber: "12345678",
    iban: "NL12 ABCD 0123 4567 89",
    country: "Netherlands"
  };

  switch (blockType) {
    case "Text":
      return {
        text: "",
        editable: true,
      };
    case "Image":
      return {
        src: null,
        alt: "Image",
        width: 100,
        height: 100,
        fit: "contain", // 'contain', 'cover', 'fill'
      };
    case "Line":
      return {
        orientation: "horizontal", // 'horizontal' or 'vertical'
        strokeWidth: 1,
        strokeColor: "#000000",
        strokeStyle: "solid", // 'solid', 'dashed', 'dotted'
      };
    case "Rectangle":
      return {
        strokeWidth: 1,
        strokeColor: "#000000",
        strokeStyle: "solid", // 'solid', 'dashed', 'dotted'
        fillColor: "transparent",
        borderRadius: 0,
      };
    case "Company Header":
      return {
        company: companyData,
        showLabel: true,
        labelText: "Supplier:",
      };
    case "Date Block":
      return {
        label: "Date:",
        dateSource: "quotation", // 'today', 'quotation', 'validUntil', 'custom'
      };
    case "Document Title":
      return {
        text: "QUOTATION",
      };
    case "Text Block":
      return {
        text: "Enter your text here...",
      };
    case "Page Number":
      return {
        format: "of_total",
        currentPage: 1,
        totalPages: 1,
      };
    default:
      return {};
  }
}

// Preview Component
function PreviewView({ layout }: { layout: any }) {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Print geblokkeerd',
        description: 'Sta pop-ups toe om te kunnen printen',
        variant: 'destructive',
      });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Preview</title>
        <style>
          @page { size: A4; margin: 0; }
          @media print {
            body { margin: 0; padding: 0; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Fetch all quotations
  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ['/api/quotations'],
  });

  // Fetch selected quotation print data
  const { data: printData, isLoading: isPrintDataLoading } = useQuery({
    queryKey: ['/api/quotations', selectedQuotationId, 'print-data'],
    queryFn: async () => {
      if (!selectedQuotationId) return null;
      const response = await fetch(`/api/quotations/${selectedQuotationId}/print-data`);
      if (!response.ok) {
        throw new Error('Failed to fetch quotation print data');
      }
      return response.json();
    },
    enabled: !!selectedQuotationId,
  });

  // Fetch layout sections
  const { data: sections = [] } = useQuery<any[]>({
    queryKey: [`/api/layout-sections?layoutId=${layout?.id}`],
    enabled: !!layout?.id,
  });

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Select a layout to preview</div>
      </div>
    );
  }

  const handleSelectQuotation = () => {
    if (quotations.length === 0) {
      toast({
        title: 'No quotations found',
        description: 'Create a quotation first to preview the layout',
        variant: 'destructive',
      });
      return;
    }
    setShowQuotationDialog(true);
  };

  const selectedQuotation = quotations.find((q: any) => q.id === selectedQuotationId);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleSelectQuotation}
          data-testid="button-select-quotation"
        >
          <FileText className="h-4 w-4 mr-2" />
          {selectedQuotation ? `Offerte: ${selectedQuotation.quotationNumber}` : 'Selecteer Offerte'}
        </Button>
        {selectedQuotationId && (
          <>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSelectedQuotationId(null)}
              data-testid="button-clear-selection"
            >
              Wis Selectie
            </Button>
            <Button 
              size="sm" 
              variant="default"
              onClick={handlePrint}
              data-testid="button-print-preview"
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Printer className="h-4 w-4 mr-2" />
              Afdrukken
            </Button>
          </>
        )}
      </div>

      {!selectedQuotationId ? (
        <div className="w-full flex justify-center">
          <div className="bg-white mx-auto" style={{ width: '794px', height: '1123px' }}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">📄</div>
                <div className="text-lg font-medium">Selecteer een offerte</div>
                <div className="text-sm mt-2">Klik op "Selecteer Offerte" om een preview te zien</div>
              </div>
            </div>
          </div>
        </div>
      ) : isPrintDataLoading ? (
        <div className="w-full flex justify-center">
          <div className="bg-white mx-auto" style={{ width: '794px', height: '1123px' }}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">⏳</div>
                <div className="text-lg font-medium">Laden...</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <div ref={printRef} className="bg-white mx-auto" style={{ width: '794px', minHeight: '1123px' }}>
            <LayoutPreview 
              layout={layout}
              sections={sections}
              printData={printData}
            />
          </div>
        </div>
      )}

      {/* Quotation Selection Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent data-testid="dialog-select-quotation">
          <DialogHeader>
            <DialogTitle>Selecteer Offerte voor Preview</DialogTitle>
            <DialogDescription>
              Kies een offerte om te zien hoe deze eruit ziet in de geselecteerde layout
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {quotations.map((quotation: any) => (
                <div
                  key={quotation.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedQuotationId === quotation.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-border hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                  onClick={() => {
                    setSelectedQuotationId(quotation.id);
                    setShowQuotationDialog(false);
                  }}
                  data-testid={`quotation-item-${quotation.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{quotation.quotationNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {quotation.customerName || 'Geen klant'}
                      </div>
                    </div>
                    <Badge variant={quotation.status === 'sent' ? 'default' : 'secondary'}>
                      {quotation.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to calculate dynamic block positions
// When a block is hidden (hideWhenEmpty), blocks below it shift up automatically
function calculateDynamicPositions(
  blocks: any[], 
  printData: PrintData
): Map<string, { y: number; visible: boolean }> {
  const positions = new Map<string, { y: number; visible: boolean }>();
  
  // First pass: determine which blocks are visible
  const blockVisibility = new Map<string, boolean>();
  for (const block of blocks) {
    const hasContent = blockHasContent(block, printData);
    blockVisibility.set(block.id, hasContent);
  }
  
  // Sort ALL blocks by Y position
  const sortedBlocks = [...blocks].sort((a, b) => 
    (a.position?.y || 0) - (b.position?.y || 0)
  );
  
  // Calculate cumulative offset from hidden blocks for each visible block
  // All blocks below a hidden block shift up by the hidden block's height
  for (const block of sortedBlocks) {
    const isVisible = blockVisibility.get(block.id) ?? true;
    const originalY = block.position?.y || 0;
    
    if (!isVisible) {
      // Hidden block - store original position but mark as not visible
      positions.set(block.id, { y: originalY, visible: false });
    } else {
      // Visible block - calculate offset from all hidden blocks above it
      let offsetFromAbove = 0;
      for (const otherBlock of sortedBlocks) {
        const otherY = otherBlock.position?.y || 0;
        const otherBottom = otherY + (otherBlock.size?.height || 0);
        
        // Only consider blocks that are fully above this one
        if (otherBottom <= originalY) {
          const otherVisible = blockVisibility.get(otherBlock.id) ?? true;
          if (!otherVisible) {
            offsetFromAbove += otherBlock.size?.height || 0;
          }
        }
      }
      
      positions.set(block.id, { y: originalY - offsetFromAbove, visible: true });
    }
  }
  
  return positions;
}

// Layout Preview Renderer Component
function LayoutPreview({ layout, sections, printData }: { layout: any; sections: any[]; printData: any }) {
  if (!printData) {
    return (
      <div className="border border-gray-200 h-full p-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-medium">Geen data beschikbaar</div>
        </div>
      </div>
    );
  }

  // Convert printData to PrintData type
  const typedPrintData: PrintData = {
    quotation: printData.quotation || {},
    customer: printData.customer || null,
    project: printData.project || null,
    company: printData.company || null,
    items: printData.items || [],
  };

  return (
    <div className="font-['Arial',sans-serif]">
      {sections.map((section: any) => {
        const configuredHeight = section.config?.dimensions?.height || 200;
        const blocks = section.config?.blocks || [];
        
        // Calculate dynamic positions for blocks in this section
        const dynamicPositions = calculateDynamicPositions(blocks, typedPrintData);
        
        // Calculate actual content height (bottom of lowest visible block)
        let contentHeight = 0;
        for (const block of blocks) {
          const dynamicPos = dynamicPositions.get(block.id);
          if (dynamicPos?.visible !== false) {
            const adjustedY = dynamicPos?.y ?? (block.position?.y || 0);
            const blockHeight = block.size?.height || 25;
            const blockBottom = mmToPx(adjustedY + blockHeight);
            contentHeight = Math.max(contentHeight, blockBottom);
          }
        }
        
        // Get bottom margin from config (in mm, convert to px)
        const bottomMarginMm = section.config?.bottomMarginMm || 0;
        const bottomMarginPx = mmToPx(bottomMarginMm);
        
        // Add bottom margin to content height
        contentHeight = contentHeight > 0 ? contentHeight + bottomMarginPx : 0;
        
        // Determine final section height based on canGrow/canShrink
        let sectionHeight = configuredHeight;
        const heightCanShrink = section.config?.heightCanShrink || false;
        const heightCanGrow = section.config?.heightCanGrow || false;
        
        if (heightCanShrink && contentHeight > 0 && contentHeight < configuredHeight) {
          // Shrink section to fit content (includes bottom margin)
          sectionHeight = contentHeight;
        }
        if (heightCanGrow && contentHeight > configuredHeight) {
          // Grow section to fit content
          sectionHeight = contentHeight;
        }
        
        // Ensure minimum bottom margin even when not shrinking
        if (!heightCanShrink && bottomMarginPx > 0) {
          sectionHeight = configuredHeight + bottomMarginPx;
        }
        
        return (
        <div
          key={section.id}
          className="relative overflow-hidden"
          style={{
            backgroundColor: section.config?.style?.backgroundColor || '#ffffff',
            height: `${sectionHeight}px`,
            minHeight: heightCanShrink ? 'auto' : `${sectionHeight}px`,
            maxHeight: heightCanGrow ? 'none' : `${sectionHeight}px`,
            borderColor: section.config?.style?.borderColor || 'transparent',
            borderStyle: section.config?.style?.borderStyle || 'none',
            borderWidth: section.config?.style?.borderWidth || 0,
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {/* Render blocks within section */}
          {blocks.length > 0 ? (
            <>
              {blocks.map((block: any, index: number) => {
                const dynamicPos = dynamicPositions.get(block.id);
                
                // Skip rendering if block should be collapsed
                if (dynamicPos && !dynamicPos.visible) {
                  return null;
                }
                
                const BlockRenderer = BlockRenderers[block.type];
                const adjustedY = dynamicPos?.y ?? (block.position?.y || 0);
                
                const blockStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${mmToPx(block.position?.x || 0)}px`,
                  top: `${mmToPx(adjustedY)}px`,
                  width: `${mmToPx(block.size?.width || 50)}px`,
                  height: `${mmToPx(block.size?.height || 25)}px`,
                };
                
                if (BlockRenderer) {
                  return (
                    <div key={block.id || index} style={blockStyle}>
                      <BlockRenderer block={block} printData={typedPrintData} />
                    </div>
                  );
                } else {
                  return (
                    <div key={block.id || index} style={blockStyle}>
                      <UnknownBlockRenderer block={block} printData={typedPrintData} />
                    </div>
                  );
                }
              })}
            </>
          ) : (
            <div className="text-sm text-gray-400 italic text-center py-8">
              Geen blokken in deze sectie - sleep blokken hierheen in de Designer tab
            </div>
          )}
        </div>
        );
      })}
      
      {sections.length === 0 && (
        <div className="text-center text-gray-400 italic py-8">
          Geen secties geconfigureerd - maak secties aan in de Designer tab
        </div>
      )}
    </div>
  );
}

// Section Block Component (blocks within sections)
function SectionBlock({ block, sectionId, layerIndex, isSelected, isMultiSelected, isDragging, onClick, onDragStart, selectedChildId, onChildClick }: any) {
  const isGroup = block.type === "Group";
  const childBlocks = block.config?.childBlocks || [];

  const blockStyle: React.CSSProperties = {
    left: `${mmToPx(block.position.x || 0)}px`, 
    top: `${mmToPx(block.position.y || 0)}px`,
    width: `${mmToPx(block.size?.width || 50)}px`,
    height: `${mmToPx(block.size?.height || 25)}px`,
    zIndex: layerIndex + 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.8 : 1,
  };

  // Special styling for Group blocks
  const groupName = block.config?.groupName || 'Groep';
  
  if (isGroup) {
    return (
      <div
        className={`absolute rounded transition-all select-none ${
          isSelected ? 'ring-2 ring-orange-500 ring-offset-1' : isMultiSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
        } ${isDragging ? 'shadow-lg' : ''}`}
        style={{
          ...blockStyle,
          border: '2px dashed #f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.05)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        onMouseDown={(e) => {
          // Only start drag if not clicking on a child block or label
          if (!(e.target as HTMLElement).closest('[data-child-block]') && !(e.target as HTMLElement).closest('[data-group-label]')) {
            e.preventDefault();
            onDragStart(e);
          }
        }}
      >
        {/* Group header label - clickable to select group */}
        <div 
          data-group-label="true"
          className="absolute -top-4 left-1 px-1.5 bg-orange-500 text-white text-[8px] font-medium rounded-t cursor-pointer whitespace-nowrap hover:bg-orange-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClick(e);
          }}
        >
          {groupName} ({childBlocks.length})
        </div>
        
        {/* Render child blocks inside the group - clickable */}
        <div className="relative w-full h-full overflow-visible">
          {childBlocks.map((child: any, idx: number) => {
            const isChildSelected = selectedChildId === child.id;
            const childStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${mmToPx(child.position?.x || 0)}px`,
              top: `${mmToPx(child.position?.y || 0)}px`,
              width: `${mmToPx(child.size?.width || 40)}px`,
              height: `${mmToPx(child.size?.height || 20)}px`,
              cursor: 'pointer',
            };
            
            return (
              <div
                key={child.id || idx}
                data-child-block="true"
                className={`rounded text-[7px] p-0.5 truncate transition-all ${
                  isChildSelected 
                    ? 'border-2 border-orange-500 bg-orange-50 shadow-md' 
                    : 'border border-gray-300 bg-white/80 hover:border-orange-300'
                }`}
                style={childStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onChildClick) {
                    onChildClick(child, block.id);
                  }
                }}
              >
                {child.type === "Text" ? (child.config?.text || 'Tekst') : 
                 child.type === "Data Field" ? `${child.config?.tableName || ''}.${child.config?.fieldName || ''}` :
                 child.type}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // For Line and Rectangle, use minimal styling to show the actual shape
  const isDrawingBlock = block.type === "Line" || block.type === "Rectangle";
  
  return (
    <div
      className={`absolute transition-all select-none ${
        isDrawingBlock 
          ? `${isSelected ? 'ring-2 ring-orange-500 ring-offset-1' : isMultiSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-2 hover:ring-orange-300 hover:ring-offset-1'}`
          : `border-2 rounded shadow-sm p-1 bg-white ${isSelected ? 'border-orange-500 shadow-md' : isMultiSelected ? 'border-blue-500 shadow-md' : 'border-gray-300 hover:border-orange-300'}`
      } ${isDragging ? 'shadow-lg' : ''}`}
      style={blockStyle}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onDragStart(e);
      }}
    >
      {/* Line Block - visual representation */}
      {block.type === "Line" ? (
        <div 
          className="w-full h-full flex items-center justify-center pointer-events-none"
          style={{
            flexDirection: block.config?.orientation === 'vertical' ? 'row' : 'column',
          }}
        >
          <div 
            style={{
              width: block.config?.orientation === 'vertical' ? `${block.config?.strokeWidth || 1}px` : '100%',
              height: block.config?.orientation === 'vertical' ? '100%' : `${block.config?.strokeWidth || 1}px`,
              backgroundColor: block.config?.strokeColor || '#000000',
              borderStyle: block.config?.strokeStyle === 'dashed' ? 'dashed' : block.config?.strokeStyle === 'dotted' ? 'dotted' : 'solid',
            }}
          />
        </div>
      ) : block.type === "Rectangle" ? (
        /* Rectangle Block - visual representation */
        <div 
          className="w-full h-full pointer-events-none"
          style={{
            border: `${block.config?.strokeWidth || 1}px ${block.config?.strokeStyle === 'dashed' ? 'dashed' : block.config?.strokeStyle === 'dotted' ? 'dotted' : 'solid'} ${block.config?.strokeColor || '#000000'}`,
            backgroundColor: block.config?.fillColor || 'transparent',
            borderRadius: `${block.config?.borderRadius || 0}px`,
            boxSizing: 'border-box',
          }}
        />
      ) : (
        /* Default text display for other block types */
        <div className="text-[9px] font-medium truncate pointer-events-none">
          {block.type === "Image" 
            ? (block.config?.imageDescription || block.config?.alt || 'Select image...') 
            : block.type === "Text" 
              ? (block.config?.text || 'Tekst...') 
              : block.type === "Data Field" && block.config?.tableName && block.config?.fieldName
                ? `${block.config.tableName}.${block.config.fieldName}`
                : block.type === "Company Header"
                  ? (block.config?.company?.name || 'Company Name')
                  : block.type === "Document Title"
                    ? (block.config?.text || 'Document Title')
                    : block.type === "Date Block"
                      ? (block.config?.dateSource === 'quotation' ? 'Offertedatum' : block.config?.dateSource === 'validUntil' ? 'Geldig tot' : block.config?.dateSource === 'custom' ? 'Handmatig' : 'Vandaag')
                      : block.type === "Text Block"
                        ? (block.config?.text || 'Text Block')
                        : block.type}
        </div>
      )}
    </div>
  );
}

// Block Properties Component
function BlockProperties({ 
  block, 
  sectionId,
  sections,
  allowedTables,
  availableTables,
  onUpdateProperty,
  onMoveBlock
}: { 
  block: any; 
  sectionId: string;
  sections: any[];
  allowedTables: string[];
  availableTables: any[];
  onUpdateProperty: (sectionId: string, blockId: string, property: string, value: any) => void;
  onMoveBlock?: (fromSectionId: string, toSectionId: string, blockId: string) => void;
}) {
  const updateConfig = (property: string, value: any) => {
    onUpdateProperty(sectionId, block.id, 'config', { ...block.config, [property]: value });
  };

  const updateStyle = (property: string, value: any) => {
    onUpdateProperty(sectionId, block.id, 'style', { ...block.style, [property]: value });
  };

  const selectedTable = availableTables.find(t => t.name === block.config?.tableName);
  const currentSection = sections.find(s => s.id === sectionId);
  
  // Fetch images from master data
  const { data: images } = useQuery<any[]>({
    queryKey: ['/api/masterdata/images'],
  });

  return (
    <div className="space-y-3">
      {/* Header with editable title and Section name */}
      <div className="pb-2 border-b">
        <Input
          value={block.config?.title || block.type}
          onChange={(e) => updateConfig('title', e.target.value)}
          className="h-7 text-sm font-bold border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={block.type}
          data-testid="input-block-title"
        />
        <div className="text-xs text-muted-foreground">Sectie: {currentSection?.name || 'Unknown'}</div>
      </div>

      {/* Two-tab layout */}
      <Tabs defaultValue="inhoud" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 bg-orange-100">
          <TabsTrigger value="inhoud" className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white" data-testid="tabs-trigger-inhoud">Inhoud</TabsTrigger>
          <TabsTrigger value="layout" className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white" data-testid="tabs-trigger-layout">Layout</TabsTrigger>
        </TabsList>

        {/* INHOUD TAB - Content, text, data bindings */}
        <TabsContent value="inhoud" className="space-y-3 mt-3">
          {/* Group Block Content */}
          {block.type === "Group" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="group-name" className="text-xs">Groepnaam</Label>
                <Input
                  id="group-name"
                  value={block.config?.groupName || ''}
                  onChange={(e) => updateConfig('groupName', e.target.value)}
                  placeholder="Groep"
                  className="h-8 text-xs"
                  data-testid="input-group-name"
                />
              </div>
              
              <div className="bg-orange-50 p-2 rounded text-xs">
                <div className="font-medium mb-1">Bevat {block.config?.childBlocks?.length || 0} blokken</div>
                {block.config?.childBlocks?.map((child: any, idx: number) => (
                  <div key={idx} className="text-muted-foreground pl-2">
                    • {child.type}
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="collapse-empty"
                  checked={block.config?.collapseEmpty || false}
                  onChange={(e) => updateConfig('collapseEmpty', e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                  data-testid="checkbox-collapse-empty"
                />
                <Label htmlFor="collapse-empty" className="text-xs font-normal">
                  Opschuiven bij lege velden
                </Label>
              </div>
            </div>
          )}

          {/* Image Selection - for Image blocks */}
          {block.type === "Image" && (
            <div>
              <Label className="text-xs font-semibold">Afbeelding</Label>
              <Select 
                value={block.config?.imageId || ''}
                onValueChange={(value) => {
                  const selectedImage = images?.find(img => img.id === value);
                  onUpdateProperty(sectionId, block.id, 'config', { 
                    ...block.config, 
                    imageId: value,
                    src: selectedImage?.imageData || '',
                    alt: selectedImage?.name || '',
                    imageDescription: selectedImage?.name || 'Image'
                  });
                }}
              >
                <SelectTrigger id="image-select" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Selecteer afbeelding..." />
                </SelectTrigger>
                <SelectContent>
                  {images?.map((img: any) => (
                    <SelectItem key={img.id} value={img.id}>
                      {img.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Text Block Properties */}
          {block.type === "Text" && (
            <div className="space-y-3 border-t pt-3">
              {/* Text Styling */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">Tekststijl</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="font-family" className="text-[10px] text-muted-foreground">Lettertype</Label>
                    <Select 
                      value={block.style?.fontFamily || 'helvetica'}
                      onValueChange={(value) => updateStyle('fontFamily', value)}
                    >
                      <SelectTrigger id="font-family" className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="courier">Courier</SelectItem>
                        <SelectItem value="georgia">Georgia</SelectItem>
                        <SelectItem value="verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="font-size" className="text-[10px] text-muted-foreground">Grootte</Label>
                    <Select 
                      value={String(block.style?.fontSize || 9)}
                      onValueChange={(value) => updateStyle('fontSize', parseInt(value))}
                    >
                      <SelectTrigger id="font-size" className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6pt</SelectItem>
                        <SelectItem value="7">7pt</SelectItem>
                        <SelectItem value="8">8pt</SelectItem>
                        <SelectItem value="9">9pt</SelectItem>
                        <SelectItem value="10">10pt</SelectItem>
                        <SelectItem value="11">11pt</SelectItem>
                        <SelectItem value="12">12pt</SelectItem>
                        <SelectItem value="14">14pt</SelectItem>
                        <SelectItem value="16">16pt</SelectItem>
                        <SelectItem value="18">18pt</SelectItem>
                        <SelectItem value="20">20pt</SelectItem>
                        <SelectItem value="24">24pt</SelectItem>
                        <SelectItem value="28">28pt</SelectItem>
                        <SelectItem value="32">32pt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Bold, Italic, Underline toggles */}
                <div className="flex items-center gap-1 mt-2">
                  <Button
                    type="button"
                    variant={block.style?.fontWeight === 'bold' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => updateStyle('fontWeight', block.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
                    data-testid="btn-bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.style?.fontStyle === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => updateStyle('fontStyle', block.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
                    data-testid="btn-italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant={block.style?.textDecoration === 'underline' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => updateStyle('textDecoration', block.style?.textDecoration === 'underline' ? 'none' : 'underline')}
                    data-testid="btn-underline"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </Button>
                  
                  {/* Color picker */}
                  <div className="flex items-center gap-1 ml-2">
                    <Label className="text-[10px] text-muted-foreground">Kleur:</Label>
                    <input
                      type="color"
                      value={block.style?.color || '#000000'}
                      onChange={(e) => updateStyle('color', e.target.value)}
                      className="h-7 w-7 p-0.5 border rounded cursor-pointer"
                      data-testid="input-text-color"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor={`text-content-${block.id}`} className="text-xs">Tekst</Label>
                <textarea
                  id={`text-content-${block.id}`}
                  value={block.config?.text || ''}
                  onChange={(e) => updateConfig('text', e.target.value)}
                  className="w-full min-h-[80px] p-2 text-xs border rounded placeholder:text-gray-400 placeholder:italic"
                  placeholder="Voer tekst in..."
                  style={{
                    fontFamily: block.style?.fontFamily || 'helvetica',
                    fontWeight: block.style?.fontWeight || 'normal',
                    fontStyle: block.style?.fontStyle || 'normal',
                    textDecoration: block.style?.textDecoration || 'none',
                    color: block.style?.color || '#000000',
                  }}
                />
              </div>
              
              {/* Text Variables */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">Variabelen invoegen</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!value) return;
                    const textarea = document.getElementById(`text-content-${block.id}`) as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const currentText = block.config?.text || '';
                      const newText = currentText.substring(0, start) + value + currentText.substring(end);
                      updateConfig('text', newText);
                    } else {
                      updateConfig('text', (block.config?.text || '') + value);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-variable">
                    <SelectValue placeholder="Kies variabele..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_VARIABLES.map((variable) => (
                      <SelectItem key={variable.code} value={variable.code}>
                        <div className="flex flex-col">
                          <span>{variable.label}</span>
                          <span className="text-[10px] text-muted-foreground">{variable.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Fields Insert */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">Data invoegen</Label>
                <DataFieldInsertMenu 
                  blockId={block.id}
                  currentText={block.config?.text || ''}
                  onInsert={(newText) => updateConfig('text', newText)}
                  availableTables={availableTables}
                />
              </div>
            </div>
          )}

          {/* Data Field Block Properties */}
          {block.type === "Data Field" && (
            <div className="space-y-3 border-t pt-3">
              {allowedTables.length === 0 ? (
                <div className="p-3 border border-orange-200 bg-orange-50 rounded text-xs text-orange-700">
                  Geen databronnen geselecteerd. Klik op "Databron" in de werkbalk.
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="data-table" className="text-xs">Tabel</Label>
                    <Select 
                      value={block.config?.tableName || ''}
                      onValueChange={(value) => updateConfig('tableName', value)}
                    >
                      <SelectTrigger id="data-table" className="h-8 text-xs">
                        <SelectValue placeholder="Selecteer tabel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedTables.map(tableName => {
                          const table = availableTables.find(t => t.name === tableName);
                          return table ? (
                            <SelectItem key={table.name} value={table.name}>
                              {table.label}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTable && (
                    <div>
                      <Label htmlFor="data-field" className="text-xs">Veld</Label>
                      <Select 
                        value={block.config?.fieldName || ''}
                        onValueChange={(value) => updateConfig('fieldName', value)}
                      >
                        <SelectTrigger id="data-field" className="h-8 text-xs">
                          <SelectValue placeholder="Selecteer veld..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedTable.fields.map((field: string) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="data-label" className="text-xs">Label</Label>
                    <Input
                      id="data-label"
                      value={block.config?.label || ''}
                      onChange={(e) => updateConfig('label', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Veldlabel:"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Date Block Properties */}
          {block.type === "Date Block" && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <Label htmlFor="date-label" className="text-xs">Label</Label>
                <Input
                  id="date-label"
                  value={block.config?.label || 'Datum:'}
                  onChange={(e) => updateConfig('label', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Datum:"
                  data-testid="input-date-label"
                />
              </div>
              <div>
                <Label htmlFor="date-source" className="text-xs">Datumbron</Label>
                <Select 
                  value={block.config?.dateSource || 'quotation'}
                  onValueChange={(value) => updateConfig('dateSource', value)}
                >
                  <SelectTrigger id="date-source" className="h-8 text-xs" data-testid="select-date-source">
                    <SelectValue placeholder="Kies datumbron..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotation">Offertedatum</SelectItem>
                    <SelectItem value="validUntil">Geldig tot</SelectItem>
                    <SelectItem value="today">Vandaag</SelectItem>
                    <SelectItem value="custom">Handmatig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {block.config?.dateSource === 'custom' && (
                <div>
                  <Label htmlFor="date-custom" className="text-xs">Datum</Label>
                  <Input
                    id="date-custom"
                    type="date"
                    value={block.config?.date || ''}
                    onChange={(e) => updateConfig('date', e.target.value)}
                    className="h-8 text-xs"
                    data-testid="input-date-custom"
                  />
                </div>
              )}
            </div>
          )}

          {/* Line Block Properties */}
          {block.type === "Line" && (
            <div className="space-y-3 border-t pt-3">
              <div>
                <Label htmlFor="line-orientation" className="text-xs">Richting</Label>
                <Select 
                  value={block.config?.orientation || 'horizontal'}
                  onValueChange={(value) => updateConfig('orientation', value)}
                >
                  <SelectTrigger id="line-orientation" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontaal</SelectItem>
                    <SelectItem value="vertical">Verticaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="line-stroke-width" className="text-xs">Dikte (px)</Label>
                  <Input
                    id="line-stroke-width"
                    type="number"
                    min="1"
                    max="20"
                    value={block.config?.strokeWidth || 1}
                    onChange={(e) => updateConfig('strokeWidth', parseInt(e.target.value) || 1)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="line-stroke-color" className="text-xs">Kleur</Label>
                  <input
                    id="line-stroke-color"
                    type="color"
                    value={block.config?.strokeColor || '#000000'}
                    onChange={(e) => updateConfig('strokeColor', e.target.value)}
                    className="h-8 w-full p-1 border rounded cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="line-stroke-style" className="text-xs">Stijl</Label>
                <Select 
                  value={block.config?.strokeStyle || 'solid'}
                  onValueChange={(value) => updateConfig('strokeStyle', value)}
                >
                  <SelectTrigger id="line-stroke-style" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Doorgetrokken</SelectItem>
                    <SelectItem value="dashed">Gestreept</SelectItem>
                    <SelectItem value="dotted">Gestippeld</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Rectangle Block Properties */}
          {block.type === "Rectangle" && (
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="rect-stroke-width" className="text-xs">Randdikte (px)</Label>
                  <Input
                    id="rect-stroke-width"
                    type="number"
                    min="0"
                    max="20"
                    value={block.config?.strokeWidth || 1}
                    onChange={(e) => updateConfig('strokeWidth', parseInt(e.target.value) || 1)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="rect-stroke-color" className="text-xs">Randkleur</Label>
                  <input
                    id="rect-stroke-color"
                    type="color"
                    value={block.config?.strokeColor || '#000000'}
                    onChange={(e) => updateConfig('strokeColor', e.target.value)}
                    className="h-8 w-full p-1 border rounded cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="rect-stroke-style" className="text-xs">Randstijl</Label>
                <Select 
                  value={block.config?.strokeStyle || 'solid'}
                  onValueChange={(value) => updateConfig('strokeStyle', value)}
                >
                  <SelectTrigger id="rect-stroke-style" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Doorgetrokken</SelectItem>
                    <SelectItem value="dashed">Gestreept</SelectItem>
                    <SelectItem value="dotted">Gestippeld</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="rect-fill-color" className="text-xs">Vulkleur</Label>
                  <div className="flex gap-1">
                    <input
                      id="rect-fill-color"
                      type="color"
                      value={block.config?.fillColor === 'transparent' ? '#ffffff' : (block.config?.fillColor || '#ffffff')}
                      onChange={(e) => updateConfig('fillColor', e.target.value)}
                      className="h-8 flex-1 p-1 border rounded cursor-pointer"
                    />
                    <Button
                      type="button"
                      variant={block.config?.fillColor === 'transparent' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs px-2"
                      onClick={() => updateConfig('fillColor', 'transparent')}
                    >
                      Geen
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="rect-border-radius" className="text-xs">Hoekradius (px)</Label>
                  <Input
                    id="rect-border-radius"
                    type="number"
                    min="0"
                    max="50"
                    value={block.config?.borderRadius || 0}
                    onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hide When Empty - for all block types */}
          <div className="pt-2 border-t">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hide-when-empty"
                checked={block.config?.hideWhenEmpty || false}
                onChange={(e) => updateConfig('hideWhenEmpty', e.target.checked)}
                className="h-4 w-4 accent-orange-500"
                data-testid="checkbox-hide-when-empty"
              />
              <Label htmlFor="hide-when-empty" className="text-xs font-normal">
                Verberg als leeg
              </Label>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Blok wordt niet getoond wanneer de data leeg is.
            </p>
          </div>
        </TabsContent>

        {/* LAYOUT TAB - Position, size, alignment, dynamic behavior */}
        <TabsContent value="layout" className="space-y-3 mt-3">
          {/* Move to Section */}
          {onMoveBlock && sections.length > 1 && (
            <div>
              <Label htmlFor="move-to-section" className="text-xs font-bold">Verplaats naar sectie</Label>
              <Select 
                value={sectionId}
                onValueChange={(newSectionId) => {
                  if (newSectionId !== sectionId) {
                    onMoveBlock(sectionId, newSectionId, block.id);
                  }
                }}
              >
                <SelectTrigger id="move-to-section" className="h-8 text-xs mt-1" data-testid="select-move-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Position */}
          <div>
            <div className="text-xs font-bold mb-2">Positie</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="block-x" className="text-xs">X (mm)</Label>
                <Input
                  id="block-x"
                  type="number"
                  step="1"
                  value={block.position?.x ?? 0}
                  onChange={(e) => onUpdateProperty(sectionId, block.id, 'position', { ...block.position, x: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="block-y" className="text-xs">Y (mm)</Label>
                <Input
                  id="block-y"
                  type="number"
                  step="1"
                  value={block.position?.y ?? 0}
                  onChange={(e) => onUpdateProperty(sectionId, block.id, 'position', { ...block.position, y: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          
          {/* Size */}
          <div>
            <div className="text-xs font-bold mb-2">Afmetingen</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="block-width" className="text-xs">Breedte (mm)</Label>
                <Input
                  id="block-width"
                  type="number"
                  step="1"
                  value={block.size?.width ?? 50}
                  onChange={(e) => {
                    const newWidth = parseFloat(e.target.value) || 50;
                    if (block.type === "Image" && block.config?.lockAspectRatio && block.config?.aspectRatio) {
                      const newHeight = Math.round(newWidth / block.config.aspectRatio * 10) / 10;
                      onUpdateProperty(sectionId, block.id, 'size', { width: newWidth, height: newHeight });
                    } else {
                      onUpdateProperty(sectionId, block.id, 'size', { ...block.size, width: newWidth });
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="block-height" className="text-xs">Hoogte (mm)</Label>
                <Input
                  id="block-height"
                  type="number"
                  step="1"
                  value={block.size?.height ?? 25}
                  onChange={(e) => {
                    const newHeight = parseFloat(e.target.value) || 25;
                    if (block.type === "Image" && block.config?.lockAspectRatio && block.config?.aspectRatio) {
                      const newWidth = Math.round(newHeight * block.config.aspectRatio * 10) / 10;
                      onUpdateProperty(sectionId, block.id, 'size', { width: newWidth, height: newHeight });
                    } else {
                      onUpdateProperty(sectionId, block.id, 'size', { ...block.size, height: newHeight });
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        
          {/* Alignment */}
          <div>
            <div className="text-xs font-bold mb-2">Uitlijning</div>
            <div className="space-y-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateConfig('alignH', 'left')}
                  className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignH === 'left' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  title="Links"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-3 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig('alignH', 'center')}
                  className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignH === 'center' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  title="Midden"
                >
                  <div className="flex flex-col gap-0.5 items-center">
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-3 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig('alignH', 'right')}
                  className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignH === 'right' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  title="Rechts"
                >
                  <div className="flex flex-col gap-0.5 items-end">
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-3 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                  </div>
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => updateConfig('alignV', 'top')}
                  className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignV === 'top' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  title="Boven"
                >
                  <div className="flex gap-0.5 items-start h-4">
                    <div className="w-0.5 h-4 bg-current"></div>
                    <div className="w-0.5 h-3 bg-current"></div>
                    <div className="w-0.5 h-4 bg-current"></div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig('alignV', 'middle')}
                  className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignV === 'middle' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  title="Midden"
                >
                  <div className="flex gap-0.5 items-center h-4">
                    <div className="w-0.5 h-4 bg-current"></div>
                    <div className="w-0.5 h-3 bg-current"></div>
                    <div className="w-0.5 h-4 bg-current"></div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig('alignV', 'bottom')}
                  className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignV === 'bottom' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                  title="Onder"
                >
                  <div className="flex gap-0.5 items-end h-4">
                    <div className="w-0.5 h-4 bg-current"></div>
                    <div className="w-0.5 h-3 bg-current"></div>
                    <div className="w-0.5 h-4 bg-current"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Layout Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="text-xs font-bold text-orange-600">Dynamisch gedrag</div>
            
            {/* Height behavior */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Hoogte</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="block-height-can-grow"
                    checked={block.config?.heightCanGrow || false}
                    onChange={(e) => updateConfig('heightCanGrow', e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="block-height-can-grow" className="text-xs font-normal">Kan groeien</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="block-height-can-shrink"
                    checked={block.config?.heightCanShrink || false}
                    onChange={(e) => updateConfig('heightCanShrink', e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="block-height-can-shrink" className="text-xs font-normal">Kan krimpen</Label>
                </div>
              </div>
            </div>
            
            {/* Width behavior */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Breedte</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="block-width-can-grow"
                    checked={block.config?.widthCanGrow || false}
                    onChange={(e) => updateConfig('widthCanGrow', e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="block-width-can-grow" className="text-xs font-normal">Kan groeien</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    id="block-width-can-shrink"
                    checked={block.config?.widthCanShrink || false}
                    onChange={(e) => updateConfig('widthCanShrink', e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="block-width-can-shrink" className="text-xs font-normal">Kan krimpen</Label>
                </div>
              </div>
            </div>

            {/* Lock Aspect Ratio - only for Image blocks */}
            {block.type === "Image" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="lock-aspect-ratio"
                  checked={block.config?.lockAspectRatio || false}
                  onChange={(e) => {
                    const isLocked = e.target.checked;
                    const currentWidth = block.size?.width ?? 50;
                    const currentHeight = block.size?.height ?? 25;
                    const aspectRatio = currentWidth / currentHeight;
                    onUpdateProperty(sectionId, block.id, 'config', { 
                      ...block.config, 
                      lockAspectRatio: isLocked,
                      aspectRatio: isLocked ? aspectRatio : block.config?.aspectRatio
                    });
                  }}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="lock-aspect-ratio" className="text-xs font-normal">Vergrendel verhouding</Label>
              </div>
            )}

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Section Properties Component
function SectionProperties({ 
  section, 
  sections,
  onUpdateProperty,
  onReorderSection 
}: { 
  section: any; 
  sections: any[];
  onUpdateProperty: (id: string, path: string, value: any) => void;
  onReorderSection: (sectionId: string, newPosition: number) => void;
}) {
  const sortedSections = [...sections].sort((a, b) => a.position - b.position);
  const currentIndex = sortedSections.findIndex(s => s.id === section.id);
  
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="section-name" className="text-xs">Naam</Label>
        <Input
          id="section-name"
          value={section.name}
          onChange={(e) => onUpdateProperty(section.id, 'name', e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* Height */}
      <div>
        <Label htmlFor="section-height" className="text-xs">Hoogte (mm)</Label>
        <Input
          id="section-height"
          type="number"
          step="1"
          value={section.config.dimensions?.heightMm || Math.round(pxToMm(section.config.dimensions?.height || 200))}
          onChange={(e) => {
            const mmValue = parseInt(e.target.value) || 50;
            onUpdateProperty(section.id, 'config.dimensions.heightMm', mmValue);
            onUpdateProperty(section.id, 'config.dimensions.height', mmToPx(mmValue));
          }}
          className="h-8 text-xs"
        />
      </div>

      {/* Bottom Margin */}
      <div>
        <Label htmlFor="section-bottom-margin" className="text-xs">Ondermarge (mm)</Label>
        <Input
          id="section-bottom-margin"
          type="number"
          step="1"
          min="0"
          value={section.config.bottomMarginMm || 0}
          onChange={(e) => {
            const mmValue = parseInt(e.target.value) || 0;
            onUpdateProperty(section.id, 'config.bottomMarginMm', mmValue);
          }}
          className="h-8 text-xs"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Minimale ruimte onder deze sectie
        </p>
      </div>

      {/* Dynamic Section */}
      <div className="space-y-3 pt-2 border-t">
        <div className="text-xs font-bold text-orange-600">Dynamisch</div>
        
        {/* Height behavior */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Hoogte</Label>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                id="section-height-can-grow"
                checked={section.config.heightCanGrow || false}
                onChange={(e) => onUpdateProperty(section.id, 'config.heightCanGrow', e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="section-height-can-grow" className="text-xs font-normal">Kan groeien</Label>
            </div>
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                id="section-height-can-shrink"
                checked={section.config.heightCanShrink || false}
                onChange={(e) => onUpdateProperty(section.id, 'config.heightCanShrink', e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="section-height-can-shrink" className="text-xs font-normal">Kan krimpen</Label>
            </div>
          </div>
        </div>
        
        {/* Width behavior */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Breedte</Label>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                id="section-width-can-grow"
                checked={section.config.widthCanGrow || false}
                onChange={(e) => onUpdateProperty(section.id, 'config.widthCanGrow', e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="section-width-can-grow" className="text-xs font-normal">Kan groeien</Label>
            </div>
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                id="section-width-can-shrink"
                checked={section.config.widthCanShrink || false}
                onChange={(e) => onUpdateProperty(section.id, 'config.widthCanShrink', e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="section-width-can-shrink" className="text-xs font-normal">Kan krimpen</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div>
        <Label htmlFor="section-bg" className="text-xs">Achtergrondkleur</Label>
        <Input
          id="section-bg"
          type="color"
          value={section.config.style?.backgroundColor || '#ffffff'}
          onChange={(e) => onUpdateProperty(section.id, 'config.style.backgroundColor', e.target.value)}
          className="h-8"
        />
      </div>

      {/* Print Rules */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Afdrukregels</Label>
        {(() => {
          const handlePrintRuleChange = (rule: string, checked: boolean) => {
            const currentRules = { ...section.config.printRules };
            
            if (rule === 'everyPage') {
              if (checked) {
                // "Elke pagina" is exclusief - reset alles
                onUpdateProperty(section.id, 'config.printRules', { everyPage: true });
              } else {
                onUpdateProperty(section.id, 'config.printRules', { everyPage: false });
              }
              return;
            }
            
            // Voor alle andere regels: zet everyPage uit
            const newRules = {
              everyPage: false,
              firstPage: currentRules.firstPage || false,
              lastPage: currentRules.lastPage || false,
              oddPages: currentRules.oddPages || false,
              evenPages: currentRules.evenPages || false,
            };
            
            // Pas de specifieke regel aan
            if (rule === 'firstPage') newRules.firstPage = checked;
            if (rule === 'lastPage') newRules.lastPage = checked;
            if (rule === 'oddPages') {
              newRules.oddPages = checked;
              if (checked) newRules.evenPages = false; // Wederzijds exclusief
            }
            if (rule === 'evenPages') {
              newRules.evenPages = checked;
              if (checked) newRules.oddPages = false; // Wederzijds exclusief
            }
            
            // Als geen enkele specifieke regel meer aan staat, zet everyPage terug
            if (!newRules.firstPage && !newRules.lastPage && !newRules.oddPages && !newRules.evenPages) {
              newRules.everyPage = true;
            }
            
            onUpdateProperty(section.id, 'config.printRules', newRules);
          };
          
          return (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="print-every"
                  checked={section.config.printRules?.everyPage || false}
                  onChange={(e) => handlePrintRuleChange('everyPage', e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="print-every" className="text-xs font-normal">Elke pagina</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="print-first"
                  checked={section.config.printRules?.firstPage || false}
                  onChange={(e) => handlePrintRuleChange('firstPage', e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="print-first" className="text-xs font-normal">Alleen eerste pagina</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="print-last"
                  checked={section.config.printRules?.lastPage || false}
                  onChange={(e) => handlePrintRuleChange('lastPage', e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="print-last" className="text-xs font-normal">Alleen laatste pagina</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="print-odd"
                  checked={section.config.printRules?.oddPages || false}
                  onChange={(e) => handlePrintRuleChange('oddPages', e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="print-odd" className="text-xs font-normal">Alleen oneven pagina's</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="print-even"
                  checked={section.config.printRules?.evenPages || false}
                  onChange={(e) => handlePrintRuleChange('evenPages', e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="print-even" className="text-xs font-normal">Alleen even pagina's</Label>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Layout Grid */}
      <div className="space-y-2 border-t pt-4">
        <Label className="text-xs font-semibold">Hoogteverdeling</Label>
        <div className="space-y-3">
          {/* Enable Grid Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="grid-enabled"
              checked={!!section.config.layoutGrid}
              onChange={(e) => {
                if (e.target.checked) {
                  onUpdateProperty(section.id, 'config.layoutGrid', { rows: 3, gutter: 10, snap: true });
                } else {
                  onUpdateProperty(section.id, 'config.layoutGrid', undefined);
                }
              }}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor="grid-enabled" className="text-xs font-normal">Raster inschakelen</Label>
          </div>

          {/* Grid Settings (only show when enabled) */}
          {section.config.layoutGrid && (
            <>
              <div>
                <Label htmlFor="grid-rows" className="text-xs">Aantal rijen</Label>
                <Input
                  id="grid-rows"
                  type="number"
                  min="2"
                  max="20"
                  value={section.config.layoutGrid.rows || 3}
                  onChange={(e) => onUpdateProperty(section.id, 'config.layoutGrid.rows', parseInt(e.target.value) || 3)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="grid-gutter" className="text-xs">Tussenruimte (mm)</Label>
                <Input
                  id="grid-gutter"
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={pxToMm(section.config.layoutGrid.gutter || 10)}
                  onChange={(e) => onUpdateProperty(section.id, 'config.layoutGrid.gutter', mmToPx(parseFloat(e.target.value) || 2.5))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="grid-snap"
                  checked={section.config.layoutGrid.snap || false}
                  onChange={(e) => onUpdateProperty(section.id, 'config.layoutGrid.snap', e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="grid-snap" className="text-xs font-normal">Snap-to-grid</Label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Canvas Block Component
function CanvasBlock({ block, isSelected, onClick, onRemove }: any) {
  const getBlockIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      "Company Header": "🏢",
      "Date Block": "📅",
      "Line Items Table": "📊",
      "Totals Summary": "💰",
      "Footer Block": "📄",
      "Text Block": "📝",
      "Page Number": "🔢",
      "Document Title": "📌",
    };
    return icons[type] || "📦";
  };

  // Map config.alignH to CSS textAlign
  const getTextAlign = (alignH?: string): 'left' | 'center' | 'right' => {
    switch (alignH) {
      case 'center': return 'center';
      case 'right': return 'right';
      default: return 'left';
    }
  };

  // Build style object with all properties
  const blockStyle: React.CSSProperties = {
    left: `${block.position.x}px`, 
    top: `${block.position.y}px`,
    width: `${block.size?.width || 200}px`,
    minHeight: `${block.size?.height || 100}px`,
    zIndex: block.zIndex || 0,
    fontSize: `${block.style?.fontSize || 9}px`,
    fontFamily: block.style?.fontFamily || 'helvetica',
    fontWeight: block.style?.fontStyle === 'bold' ? 'bold' : 'normal',
    fontStyle: block.style?.fontStyle === 'italic' ? 'italic' : 'normal',
    textAlign: getTextAlign(block.config?.alignH),
    color: block.style?.color || '#000000',
    backgroundColor: block.style?.backgroundColor || '#ffffff',
    opacity: block.style?.opacity !== undefined ? block.style.opacity : 1,
    borderColor: block.style?.borderColor || undefined,
    borderWidth: block.style?.borderWidth ? `${block.style.borderWidth}px` : undefined,
    borderStyle: block.style?.borderStyle || undefined,
    borderRadius: block.style?.borderRadius ? `${block.style.borderRadius}px` : undefined,
    lineHeight: block.style?.lineHeight || undefined,
    letterSpacing: block.style?.letterSpacing ? `${block.style.letterSpacing}px` : undefined,
    textDecoration: block.style?.textDecoration || undefined,
    padding: `${block.style?.paddingTop || 0}px ${block.style?.paddingRight || 0}px ${block.style?.paddingBottom || 0}px ${block.style?.paddingLeft || 0}px`,
    transform: block.style?.rotation ? `rotate(${block.style.rotation}deg)` : undefined,
    display: block.config?.visible === false ? 'none' : undefined,
  };

  // Fallback for missing block type
  const blockType = block.type || block.name || block.sectionType || 'block';

  return (
    <div
      className={`absolute border-2 rounded shadow-sm cursor-pointer transition-all ${
        isSelected ? 'border-orange-500 shadow-md' : 'border-gray-300 hover:border-orange-300'
      }`}
      style={blockStyle}
      onClick={(e) => onClick(e)}
      data-testid={`canvas-${blockType.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBlockIcon(blockType)}</span>
          <span className="text-sm font-medium">{blockType}</span>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {block.type === "Company Header" && (
          <div>{block.config.company?.name || 'Company Name'}</div>
        )}
        {block.type === "Document Title" && (
          <div className="font-bold">{block.config.text}</div>
        )}
        {block.type === "Date Block" && (
          <div>{block.config?.label || 'Date:'} ({block.config?.dateSource === 'quotation' ? 'Offertedatum' : block.config?.dateSource === 'validUntil' ? 'Geldig tot' : block.config?.dateSource === 'custom' ? 'Handmatig' : 'Vandaag'})</div>
        )}
        {block.type === "Text Block" && (
          <div className="truncate">{block.config.text}</div>
        )}
      </div>
    </div>
  );
}

