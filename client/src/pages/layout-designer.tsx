import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Download, Eye, Save, FileText, Receipt, Package, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Grid3x3, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Maximize2, Database, ArrowUp, ArrowDown, Type, Image, Table2, Printer } from 'lucide-react';
import { BlockRenderers, UnknownBlockRenderer } from '@/components/print/BlockRenderers';
import type { PrintData } from '@/utils/field-resolver';
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
}: {
  layouts: any[];
  documentType: string;
  isLoading: boolean;
  onSelectLayout: (id: number) => void;
  selectedLayoutId: number | null;
  onCreateNew: () => void;
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
              <Button size="sm" variant="outline" className="flex-1" data-testid={`button-edit-${layout.id}`}>
                Edit
              </Button>
              <Button size="sm" variant="outline" className="flex-1" data-testid={`button-duplicate-${layout.id}`}>
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

// Visual Designer Component
function VisualDesignerView({ layout }: { layout: any }) {
  // Section-based state
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
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
  const { toast } = useToast();
  
  // Available database tables for selection
  const availableTables = [
    { name: 'quotations', label: 'Offertes', fields: ['quotationNumber', 'customerId', 'projectId', 'totalAmount', 'validUntil', 'status'] },
    { name: 'customers', label: 'Klanten', fields: ['customerNumber', 'name', 'email', 'phone', 'address', 'city'] },
    { name: 'projects', label: 'Projecten', fields: ['projectNumber', 'name', 'customerId', 'status', 'startDate', 'endDate'] },
    { name: 'invoices', label: 'Facturen', fields: ['invoiceNumber', 'customerId', 'totalAmount', 'dueDate', 'status'] },
    { name: 'purchase_orders', label: 'Inkooporders', fields: ['poNumber', 'supplierId', 'totalAmount', 'status'] },
    { name: 'work_orders', label: 'Werkorders', fields: ['woNumber', 'projectId', 'description', 'status'] },
    { name: 'packing_lists', label: 'Paklijsten', fields: ['plNumber', 'customerId', 'projectId', 'shipDate'] },
    { name: 'suppliers', label: 'Leveranciers', fields: ['supplierNumber', 'name', 'email', 'phone', 'address'] },
    { name: 'inventory', label: 'Voorraad', fields: ['itemCode', 'name', 'quantity', 'unitPrice', 'supplier'] },
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
          printRules: section.config?.printRules || { everyPage: true },
          dimensions: section.config?.dimensions || { height: 200, unit: 'px' },
          style: section.config?.style || {},
          blocks: section.config?.blocks || [],
          layoutGrid: section.config?.layoutGrid, // Preserve layout grid settings
          metadata: section.config?.metadata || {},
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
      // Invalidate the query to refetch from database
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
    if (!window.confirm('Do you want to delete this block?')) {
      return;
    }
    
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

  const handleMoveBlockUp = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      const blocks = [...(s.config.blocks || [])];
      const index = blocks.findIndex((b: any) => b.id === blockId);
      
      if (index > 0) {
        // Swap with previous block
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
      }
      
      return { ...s, config: { ...s.config, blocks } };
    });
    
    setSections(updatedSections);
  };

  const handleMoveBlockDown = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      
      const blocks = [...(s.config.blocks || [])];
      const index = blocks.findIndex((b: any) => b.id === blockId);
      
      if (index >= 0 && index < blocks.length - 1) {
        // Swap with next block
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }
      
      return { ...s, config: { ...s.config, blocks } };
    });
    
    setSections(updatedSections);
  };

  const handleBlockClick = (block: any) => {
    setSelectedBlock(block);
    setSelectedSection(null); // Deselect section when block is selected
  };

  const handleSectionClick = (section: any) => {
    setSelectedSection(section);
    setSelectedBlock(null); // Deselect block when section is selected
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

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
    if (selectedSection?.id === sectionId) {
      setSelectedSection(null);
    }
  };

  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  
  // Print margins state (in mm)
  const [printMargins, setPrintMargins] = useState({ top: 10, right: 10, bottom: 10, left: 10 });
  const [showPrintMarginsDialog, setShowPrintMarginsDialog] = useState(false);
  const [showPrintMargins, setShowPrintMargins] = useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border bg-white px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Save */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => saveLayoutMutation.mutate()} disabled={saveLayoutMutation.isPending}>
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

          {/* Add Section & Draggable Block Icons */}
          <TooltipProvider delayDuration={2000}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
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
                    onDragStart={() => handleDragStart("Data Field")}
                    className="h-8 w-8 flex items-center justify-center rounded cursor-grab hover:bg-muted transition-colors"
                  >
                    <Table2 className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Data Field</p>
                  <p className="text-xs text-muted-foreground">Database field value</p>
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
          <Button 
            size="sm" 
            variant={showGrid ? "default" : "ghost"} 
            onClick={() => setShowGrid(!showGrid)}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>

          {/* Print Margins */}
          <TooltipProvider delayDuration={2000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant={showPrintMargins ? "default" : "ghost"} 
                  onClick={() => setShowPrintMarginsDialog(true)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Marges
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Print Margins</p>
                <p className="text-xs text-muted-foreground">Set print margin areas</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Databronnen Selecteren</DialogTitle>
            <DialogDescription>
              Selecteer welke tabellen beschikbaar zijn voor Data Fields in dit rapport
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {availableTables.map((table) => (
                <div
                  key={table.name}
                  className={`p-3 border rounded cursor-pointer transition-all ${
                    allowedTables.includes(table.name)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => {
                    if (allowedTables.includes(table.name)) {
                      setAllowedTables(allowedTables.filter(t => t !== table.name));
                    } else {
                      setAllowedTables([...allowedTables, table.name]);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{table.label}</span>
                    {allowedTables.includes(table.name) && (
                      <Badge variant="secondary" className="text-xs">✓</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {table.fields.length} velden beschikbaar
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
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
                <div className="flex">
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
                              className="relative p-4 h-full"
                              style={{
                                boxSizing: 'border-box',
                              backgroundImage: showGrid ? `
                                linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                                linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                              ` : 'none',
                              backgroundSize: showGrid ? `${gridSize}px ${gridSize}px` : 'auto',
                            }}
                            onDrop={(e) => handleDropOnSection(e, section.id)}
                            onDragOver={handleDragOver}
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
                              section.config.blocks.map((block: any) => (
                                <SectionBlock
                                  key={block.id}
                                  block={block}
                                  sectionId={section.id}
                                  isSelected={selectedBlock?.id === block.id}
                                  onClick={() => handleBlockClick(block)}
                                  onRemove={() => handleRemoveBlock(section.id, block.id)}
                                  onMoveUp={() => handleMoveBlockUp(section.id, block.id)}
                                  onMoveDown={() => handleMoveBlockDown(section.id, block.id)}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* Right Ruler - Vertical (297mm) */}
                  <div 
                    className="bg-gray-100 border-l border-gray-300 relative flex-shrink-0"
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
                onUpdateProperty={updateSectionProperty}
              />
            ) : selectedBlock ? (
              <BlockProperties 
                block={selectedBlock}
                sectionId={sections.find(s => s.config.blocks?.some((b: any) => b.id === selectedBlock.id))?.id}
                sections={sections}
                allowedTables={allowedTables}
                availableTables={availableTables}
                onUpdateProperty={updateBlockProperty}
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
        text: "Voer tekst in...",
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
    case "Data Field":
      return {
        tableName: null, // Selected from allowedTables
        fieldName: null, // Selected from table fields
        label: "Veld Label:",
        format: "text", // 'text', 'number', 'currency', 'date'
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
        date: new Date().toLocaleDateString('nl-NL'),
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
  const { toast } = useToast();

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
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSelectedQuotationId(null)}
            data-testid="button-clear-selection"
          >
            Wis Selectie
          </Button>
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
          <div className="bg-white mx-auto" style={{ width: '794px', minHeight: '1123px' }}>
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
  };

  return (
    <div className="font-['Arial',sans-serif]">
      {sections.map((section: any) => (
        <div
          key={section.id}
          className="relative"
          style={{
            backgroundColor: section.config?.style?.backgroundColor || '#ffffff',
            height: section.config?.dimensions?.height ? `${section.config.dimensions.height}px` : 'auto',
            minHeight: section.config?.dimensions?.height ? `${section.config.dimensions.height}px` : '100px',
            borderColor: section.config?.style?.borderColor || 'transparent',
            borderStyle: section.config?.style?.borderStyle || 'none',
            borderWidth: section.config?.style?.borderWidth || 0,
          }}
        >
          {/* Render blocks within section */}
          {section.config?.blocks?.length > 0 ? (
            <>
              {section.config.blocks.map((block: any, index: number) => {
                const BlockRenderer = BlockRenderers[block.type];
                const blockStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${mmToPx(block.position?.x || 0)}px`,
                  top: `${mmToPx(block.position?.y || 0)}px`,
                  width: `${mmToPx(block.size?.width || 50)}px`,
                  minHeight: `${mmToPx(block.size?.height || 25)}px`,
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
      ))}
      
      {sections.length === 0 && (
        <div className="text-center text-gray-400 italic py-8">
          Geen secties geconfigureerd - maak secties aan in de Designer tab
        </div>
      )}
    </div>
  );
}

// Section Block Component (blocks within sections)
function SectionBlock({ block, sectionId, isSelected, onClick, onRemove, onMoveUp, onMoveDown }: any) {
  const getBlockIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      "Text": "📝",
      "Image": "🖼️",
      "Data Field": "🔢",
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

  const blockStyle: React.CSSProperties = {
    left: `${mmToPx(block.position.x || 0)}px`, 
    top: `${mmToPx(block.position.y || 0)}px`,
    width: `${mmToPx(block.size?.width || 50)}px`,
    minHeight: `${mmToPx(block.size?.height || 25)}px`,
    zIndex: block.zIndex || 10,
  };

  return (
    <div
      className={`absolute border-2 rounded shadow-sm cursor-pointer transition-all p-2 bg-white ${
        isSelected ? 'border-orange-500 shadow-md' : 'border-gray-300 hover:border-orange-300'
      }`}
      style={blockStyle}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBlockIcon(block.type)}</span>
          <span className="text-sm font-medium truncate">
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
                        ? (block.config?.date || 'Date')
                        : block.type === "Text Block"
                          ? (block.config?.text || 'Text Block')
                          : block.type}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Verwijder"
        >
          ×
        </Button>
      </div>
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
  onUpdateProperty 
}: { 
  block: any; 
  sectionId: string;
  sections: any[];
  allowedTables: string[];
  availableTables: any[];
  onUpdateProperty: (sectionId: string, blockId: string, property: string, value: any) => void;
}) {
  const updateConfig = (property: string, value: any) => {
    onUpdateProperty(sectionId, block.id, 'config', { ...block.config, [property]: value });
  };

  const selectedTable = availableTables.find(t => t.name === block.config?.tableName);
  const currentSection = sections.find(s => s.id === sectionId);
  
  // Fetch images from master data
  const { data: images } = useQuery<any[]>({
    queryKey: ['/api/masterdata/images'],
  });

  return (
    <div className="space-y-4">
      {/* Section: Name on one line */}
      <div className="pb-2 border-b">
        <div className="text-sm font-bold">Section: {currentSection?.name || 'Unknown'}</div>
      </div>

      {/* Position - Always first for all blocks */}
      <div className="space-y-3">
        <div className="text-xs font-bold">Position</div>
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
        
        <div className="text-xs font-bold">Size</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="block-width" className="text-xs">Width (mm)</Label>
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
            <Label htmlFor="block-height" className="text-xs">Height (mm)</Label>
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
        
        {/* Alignment */}
        <div className="text-xs font-bold pt-2">Alignment</div>
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => updateConfig('alignH', 'left')}
              className={`flex-1 h-8 border rounded flex items-center justify-center ${block.config?.alignH === 'left' ? 'bg-orange-100 border-orange-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              title="Left"
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
              title="Center"
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
              title="Right"
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
              title="Top"
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
              title="Middle"
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
              title="Bottom"
            >
              <div className="flex gap-0.5 items-end h-4">
                <div className="w-0.5 h-4 bg-current"></div>
                <div className="w-0.5 h-3 bg-current"></div>
                <div className="w-0.5 h-4 bg-current"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Can Grow / Can Shrink for blocks */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="block-can-grow"
              checked={block.config?.canGrow || false}
              onChange={(e) => updateConfig('canGrow', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="block-can-grow" className="text-xs font-normal">Can grow</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="block-can-shrink"
              checked={block.config?.canShrink || false}
              onChange={(e) => updateConfig('canShrink', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="block-can-shrink" className="text-xs font-normal">Can shrink</Label>
          </div>
        </div>
      </div>

      {/* Text Block Properties */}
      {block.type === "Text" && (
        <div>
          <Label htmlFor="text-content" className="text-xs">Text</Label>
          <textarea
            id="text-content"
            value={block.config?.text || ''}
            onChange={(e) => updateConfig('text', e.target.value)}
            className="w-full min-h-[100px] p-2 text-xs border rounded"
            placeholder="Enter text..."
          />
        </div>
      )}

      {/* Image Block Properties */}
      {block.type === "Image" && (
        <div className="space-y-2">
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
            <SelectTrigger id="image-select" className="h-8 text-xs">
              <SelectValue placeholder="Select image..." />
            </SelectTrigger>
            <SelectContent>
              {images?.map((img: any) => (
                <SelectItem key={img.id} value={img.id}>
                  {img.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="lock-aspect-ratio"
              checked={block.config?.lockAspectRatio || false}
              onChange={(e) => {
                const currentWidth = block.size?.width ?? 50;
                const currentHeight = block.size?.height ?? 25;
                const aspectRatio = currentWidth / currentHeight;
                updateConfig('lockAspectRatio', e.target.checked);
                if (e.target.checked) {
                  updateConfig('aspectRatio', aspectRatio);
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="lock-aspect-ratio" className="text-xs font-normal">Vergrendel verhouding</Label>
          </div>
        </div>
      )}

      {/* Data Field Block Properties */}
      {block.type === "Data Field" && (
        <div className="space-y-3">
          {allowedTables.length === 0 ? (
            <div className="p-3 border border-orange-200 bg-orange-50 rounded text-xs text-orange-700">
              No data sources selected. Click "Data Source" in the toolbar to select tables.
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="data-table" className="text-xs">Table</Label>
                <Select 
                  value={block.config?.tableName || ''}
                  onValueChange={(value) => updateConfig('tableName', value)}
                >
                  <SelectTrigger id="data-table" className="h-8 text-xs">
                    <SelectValue placeholder="Select table..." />
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
                  <Label htmlFor="data-field" className="text-xs">Field</Label>
                  <Select 
                    value={block.config?.fieldName || ''}
                    onValueChange={(value) => updateConfig('fieldName', value)}
                  >
                    <SelectTrigger id="data-field" className="h-8 text-xs">
                      <SelectValue placeholder="Select field..." />
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
                  placeholder="Field Label:"
                />
              </div>

              <div>
                <Label htmlFor="data-format" className="text-xs">Format</Label>
                <Select 
                  value={block.config?.format || 'text'}
                  onValueChange={(value) => updateConfig('format', value)}
                >
                  <SelectTrigger id="data-format" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

// Section Properties Component
function SectionProperties({ section, onUpdateProperty }: { section: any; onUpdateProperty: (id: string, path: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="section-name" className="text-xs">Name</Label>
        <Input
          id="section-name"
          value={section.name}
          onChange={(e) => onUpdateProperty(section.id, 'name', e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* Height */}
      <div>
        <Label htmlFor="section-height" className="text-xs">Height (mm)</Label>
        <Input
          id="section-height"
          type="number"
          step="0.5"
          value={pxToMm(section.config.dimensions?.height || 200)}
          onChange={(e) => onUpdateProperty(section.id, 'config.dimensions.height', mmToPx(parseFloat(e.target.value) || 53))}
          className="h-8 text-xs"
        />
      </div>

      {/* Can Grow / Can Shrink */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Height Behavior</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="can-grow"
              checked={section.config.canGrow || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.canGrow', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="can-grow" className="text-xs font-normal">Can grow (height increases with more data)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="can-shrink"
              checked={section.config.canShrink || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.canShrink', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="can-shrink" className="text-xs font-normal">Can shrink (height decreases with whitespace)</Label>
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div>
        <Label htmlFor="section-bg" className="text-xs">Background Color</Label>
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
        <Label className="text-xs font-semibold">Print Rules</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="print-every"
              checked={section.config.printRules?.everyPage || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.printRules.everyPage', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="print-every" className="text-xs font-normal">Every page</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="print-first"
              checked={section.config.printRules?.firstPage || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.printRules.firstPage', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="print-first" className="text-xs font-normal">First page only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="print-last"
              checked={section.config.printRules?.lastPage || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.printRules.lastPage', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="print-last" className="text-xs font-normal">Last page only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="print-odd"
              checked={section.config.printRules?.oddPages || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.printRules.oddPages', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="print-odd" className="text-xs font-normal">Odd pages only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="print-even"
              checked={section.config.printRules?.evenPages || false}
              onChange={(e) => onUpdateProperty(section.id, 'config.printRules.evenPages', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="print-even" className="text-xs font-normal">Even pages only</Label>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="space-y-2 border-t pt-4">
        <Label className="text-xs font-semibold">Height Division</Label>
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
              className="h-4 w-4"
            />
            <Label htmlFor="grid-enabled" className="text-xs font-normal">Enable grid</Label>
          </div>

          {/* Grid Settings (only show when enabled) */}
          {section.config.layoutGrid && (
            <>
              <div>
                <Label htmlFor="grid-rows" className="text-xs">Number of rows</Label>
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
                <Label htmlFor="grid-gutter" className="text-xs">Gutter (mm)</Label>
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
    textAlign: (block.style?.textAlign || 'left') as any,
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
          <div>{block.config.date}</div>
        )}
        {block.type === "Text Block" && (
          <div className="truncate">{block.config.text}</div>
        )}
      </div>
    </div>
  );
}

