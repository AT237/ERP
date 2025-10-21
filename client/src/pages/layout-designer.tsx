import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Download, Eye, Save, FileText, Receipt, Package, ZoomIn, ZoomOut } from 'lucide-react';
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
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function LayoutDesigner() {
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<'quotation' | 'invoice' | 'packing_list'>('quotation');
  const [showNewLayoutDialog, setShowNewLayoutDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutOrientation, setNewLayoutOrientation] = useState<'portrait' | 'landscape'>('portrait');
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
      {/* Header */}
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="layouts" className="h-full flex flex-col">
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

          <div className="flex-1 overflow-auto p-6">
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

// Visual Designer Component
function VisualDesignerView({ layout }: { layout: any }) {
  const [canvasBlocks, setCanvasBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [draggedBlockType, setDraggedBlockType] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const { toast } = useToast();

  // Load existing sections for this layout
  const { data: existingSections } = useQuery<any[]>({
    queryKey: ['/api/layout-sections', { layoutId: layout?.id }],
    enabled: !!layout?.id,
  });

  // Load sections into canvas when they're fetched
  useEffect(() => {
    if (existingSections && existingSections.length > 0 && canvasBlocks.length === 0) {
      const blocks = existingSections.map((section: any, index: number) => ({
        id: section.id || `block-${index}`,
        type: section.name,
        position: section.config?.position || { x: 20, y: 20 + (index * 50) },
        size: section.config?.size || { width: 200, height: 100 },
        style: section.config?.style || { fontSize: 9, fontFamily: 'helvetica', fontStyle: 'normal' },
        zIndex: section.config?.zIndex || index,
        config: section.config || {},
      }));
      setCanvasBlocks(blocks);
    }
  }, [existingSections]);

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Select a layout to start designing</div>
      </div>
    );
  }

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      // Save each block as a layout section
      const sections = canvasBlocks.map((block, index) => ({
        layoutId: layout.id,
        name: block.type,
        sectionType: block.type.toLowerCase().replace(/\s+/g, '_'),
        position: index,
        config: {
          ...block.config,
          position: block.position,
          size: block.size,
          style: block.style,
          zIndex: block.zIndex,
        }
      }));

      // Save all sections
      for (const section of sections) {
        await apiRequest('POST', '/api/layout-sections', section);
      }

      return sections;
    },
    onSuccess: () => {
      toast({
        title: 'Opgeslagen!',
        description: `Layout "${layout.name}" is succesvol opgeslagen`,
      });
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedBlockType) return;

    const newBlock = {
      id: `block-${Date.now()}`,
      type: draggedBlockType,
      position: { x: 20, y: 20 + (canvasBlocks.length * 50) },
      size: { width: 200, height: 100 },
      style: {
        fontSize: 9,
        fontFamily: 'helvetica',
        fontStyle: 'normal',
      },
      zIndex: canvasBlocks.length,
      config: getDefaultConfig(draggedBlockType),
    };

    setCanvasBlocks([...canvasBlocks, newBlock]);
    setSelectedBlock(newBlock);
    setDraggedBlockType(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveBlock = (blockId: string) => {
    setCanvasBlocks(canvasBlocks.filter(b => b.id !== blockId));
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  const updateBlockProperty = (blockId: string, property: string, value: any) => {
    setCanvasBlocks(blocks => 
      blocks.map(block => 
        block.id === blockId 
          ? { ...block, [property]: value }
          : block
      )
    );
    
    if (selectedBlock?.id === blockId) {
      setSelectedBlock({ ...selectedBlock, [property]: value });
    }
  };

  const bringToFront = (blockId: string) => {
    const maxZ = Math.max(...canvasBlocks.map(b => b.zIndex || 0));
    updateBlockProperty(blockId, 'zIndex', maxZ + 1);
  };

  const sendToBack = (blockId: string) => {
    const minZ = Math.min(...canvasBlocks.map(b => b.zIndex || 0));
    updateBlockProperty(blockId, 'zIndex', minZ - 1);
  };

  return (
    <div className="grid grid-cols-[250px_1fr_300px] gap-4 h-full">
      {/* Left Sidebar - Block Library */}
      <Card className="overflow-auto">
        <CardHeader>
          <CardTitle className="text-base">Block Library</CardTitle>
          <CardDescription>Drag blocks onto canvas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <BlockLibraryItem name="Company Header" icon="🏢" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Date Block" icon="📅" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Line Items Table" icon="📊" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Totals Summary" icon="💰" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Footer Block" icon="📄" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Text Block" icon="📝" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Page Number" icon="🔢" onDragStart={handleDragStart} />
          <BlockLibraryItem name="Document Title" icon="📌" onDragStart={handleDragStart} />
        </CardContent>
      </Card>

      {/* Canvas - A4 Preview */}
      <Card className="flex flex-col bg-gray-50 relative">
        {/* Toolbar */}
        <div className="p-3 border-b border-border bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {canvasBlocks.length} {canvasBlocks.length === 1 ? 'blok' : 'blokken'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCanvasBlocks([])}
              disabled={canvasBlocks.length === 0}
              data-testid="button-clear-canvas"
            >
              Wis alles
            </Button>
            <Button
              size="sm"
              onClick={() => saveLayoutMutation.mutate()}
              disabled={saveLayoutMutation.isPending || canvasBlocks.length === 0}
              data-testid="button-save-layout"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveLayoutMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>

        {/* Canvas Area with Rulers */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4" style={{ minHeight: '600px' }}>
          <div className="relative">
            {/* Horizontal Ruler - Fixed size, doesn't scale */}
            <div className="absolute top-0 left-[30px] h-[30px] bg-gray-100 border-b border-gray-300 flex" style={{ width: `${794 * zoom}px` }}>
              {Array.from({ length: Math.ceil(794 / 50) + 1 }).map((_, i) => {
                const px = i * 50;
                const scaledWidth = 50 * zoom;
                return (
                  <div key={`h-${i}`} className="relative" style={{ width: `${scaledWidth}px` }}>
                    <div className="absolute bottom-0 left-0 w-px h-3 bg-gray-400"></div>
                    <span className="absolute bottom-0 left-1 text-[8px] text-gray-600">{px}</span>
                    {/* Minor ticks every 10px */}
                    {[10, 20, 30, 40].map(offset => (
                      <div key={`h-${i}-${offset}`} className="absolute bottom-0 w-px h-1.5 bg-gray-300" style={{ left: `${offset * zoom}px` }}></div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Vertical Ruler - Fixed size, doesn't scale */}
            <div className="absolute top-[30px] left-0 w-[30px] bg-gray-100 border-r border-gray-300 flex flex-col" style={{ height: `${1123 * zoom}px` }}>
              {Array.from({ length: Math.ceil(1123 / 50) + 1 }).map((_, i) => {
                const px = i * 50;
                const scaledHeight = 50 * zoom;
                return (
                  <div key={`v-${i}`} className="relative" style={{ height: `${scaledHeight}px` }}>
                    <div className="absolute right-0 top-0 h-px w-3 bg-gray-400"></div>
                    <span className="absolute right-0.5 top-1 text-[8px] text-gray-600 transform -rotate-90 origin-top-right whitespace-nowrap">{px}</span>
                    {/* Minor ticks every 10px */}
                    {[10, 20, 30, 40].map(offset => (
                      <div key={`v-${i}-${offset}`} className="absolute right-0 h-px w-1.5 bg-gray-300" style={{ top: `${offset * zoom}px` }}></div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Corner square */}
            <div className="absolute top-0 left-0 w-[30px] h-[30px] bg-gray-200 border-r border-b border-gray-300"></div>

            {/* Canvas with offset for rulers - Now scaled */}
            <div 
              className="bg-white shadow-lg relative border-2 border-dashed border-gray-300" 
              style={{ 
                width: '794px', // A4 width: 210mm = 794px @ 96 DPI
                height: '1123px', // A4 height: 297mm = 1123px @ 96 DPI
                marginLeft: '30px',
                marginTop: '30px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {canvasBlocks.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-4">📋</div>
                    <div className="text-lg font-medium">Canvas Area</div>
                    <div className="text-sm mt-2">Drag & drop blocks here</div>
                    <div className="text-xs mt-4 text-orange-600">
                      A4 {layout.orientation} · {layout.pageFormat}
                    </div>
                  </div>
                </div>
              ) : null}
              
              {canvasBlocks.map((block) => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlock?.id === block.id}
                  onClick={() => setSelectedBlock(block)}
                  onRemove={() => handleRemoveBlock(block.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Floating Zoom Controls - Bottom Right */}
        <div className="absolute bottom-4 right-4 bg-white border border-border rounded-lg shadow-lg p-3 flex flex-col gap-2 min-w-[180px]">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              disabled={zoom <= 0.1}
              className="h-8 w-8 p-0"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold text-orange-600 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
              disabled={zoom >= 1.5}
              className="h-8 w-8 p-0"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full"
            data-testid="slider-zoom"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(0.5)}
            className="h-8 text-xs w-full"
            data-testid="button-zoom-reset"
          >
            Reset (50%)
          </Button>
        </div>
      </Card>

      {/* Right Sidebar - Properties */}
      <Card className="overflow-auto">
        <CardHeader>
          <CardTitle className="text-base">Properties</CardTitle>
          <CardDescription>Configure selected block</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedBlock ? (
            <BlockProperties 
              block={selectedBlock} 
              onUpdateProperty={updateBlockProperty}
              onBringToFront={() => bringToFront(selectedBlock.id)}
              onSendToBack={() => sendToBack(selectedBlock.id)}
            />
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              No block selected
            </div>
          )}
        </CardContent>
      </Card>
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
  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Select a layout to preview</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex gap-2">
        <Button size="sm" variant="outline" data-testid="button-download-pdf">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button size="sm" variant="outline" data-testid="button-generate-sample">
          <Eye className="h-4 w-4 mr-2" />
          Generate Sample
        </Button>
      </div>
      
      <Card className="w-full max-w-4xl">
        <CardContent className="p-8">
          <div className="bg-white shadow-xl mx-auto" style={{ width: '210mm', aspectRatio: '1/1.414' }}>
            <div className="border border-gray-200 h-full p-8 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">👁️</div>
                <div className="text-lg font-medium">PDF Preview</div>
                <div className="text-sm mt-2">Generated document will appear here</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Block Library Item Component
function BlockLibraryItem({ name, icon, onDragStart }: { name: string; icon: string; onDragStart: (name: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 p-2 border border-border rounded cursor-move hover:bg-accent hover:border-orange-500 transition-all"
      draggable
      onDragStart={() => onDragStart(name)}
      data-testid={`block-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium">{name}</span>
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

  return (
    <div
      className={`absolute border-2 rounded p-3 bg-white shadow-sm cursor-pointer transition-all ${
        isSelected ? 'border-orange-500 shadow-md' : 'border-gray-300 hover:border-orange-300'
      }`}
      style={{ 
        left: `${block.position.x}px`, 
        top: `${block.position.y}px`,
        width: `${block.size?.width || 200}px`,
        minHeight: `${block.size?.height || 100}px`,
        zIndex: block.zIndex || 0,
        fontSize: `${block.style?.fontSize || 9}px`,
        fontFamily: block.style?.fontFamily || 'helvetica',
      }}
      onClick={onClick}
      data-testid={`canvas-${block.type.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getBlockIcon(block.type)}</span>
          <span className="text-sm font-medium">{block.type}</span>
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

// Block Properties Component
function BlockProperties({ 
  block, 
  onUpdateProperty, 
  onBringToFront, 
  onSendToBack 
}: { 
  block: any; 
  onUpdateProperty: (id: string, property: string, value: any) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const updatePosition = (axis: 'x' | 'y', value: number) => {
    onUpdateProperty(block.id, 'position', { ...block.position, [axis]: value });
  };

  const updateSize = (dimension: 'width' | 'height', value: number) => {
    onUpdateProperty(block.id, 'size', { ...block.size, [dimension]: value });
  };

  const updateStyle = (property: string, value: any) => {
    onUpdateProperty(block.id, 'style', { ...block.style, [property]: value });
  };

  return (
    <div className="space-y-6">
      {/* Position Controls */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-orange-600">Positie</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pos-x" className="text-xs">X</Label>
              <Input
                id="pos-x"
                type="number"
                value={block.position?.x || 0}
                onChange={(e) => updatePosition('x', parseInt(e.target.value) || 0)}
                className="h-8 text-xs"
                data-testid="input-position-x"
              />
            </div>
            <div>
              <Label htmlFor="pos-y" className="text-xs">Y</Label>
              <Input
                id="pos-y"
                type="number"
                value={block.position?.y || 0}
                onChange={(e) => updatePosition('y', parseInt(e.target.value) || 0)}
                className="h-8 text-xs"
                data-testid="input-position-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Size Controls */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-orange-600">Grootte</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="size-width" className="text-xs">Breedte</Label>
              <Input
                id="size-width"
                type="number"
                value={block.size?.width || 200}
                onChange={(e) => updateSize('width', parseInt(e.target.value) || 200)}
                className="h-8 text-xs"
                data-testid="input-size-width"
              />
            </div>
            <div>
              <Label htmlFor="size-height" className="text-xs">Hoogte</Label>
              <Input
                id="size-height"
                type="number"
                value={block.size?.height || 100}
                onChange={(e) => updateSize('height', parseInt(e.target.value) || 100)}
                className="h-8 text-xs"
                data-testid="input-size-height"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Font Controls */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-orange-600">Lettertype</h4>
        <div className="space-y-3">
          <div>
            <Label htmlFor="font-family" className="text-xs">Font</Label>
            <Select 
              value={block.style?.fontFamily || 'helvetica'}
              onValueChange={(value) => updateStyle('fontFamily', value)}
            >
              <SelectTrigger id="font-family" className="h-8 text-xs" data-testid="select-font-family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helvetica">Helvetica</SelectItem>
                <SelectItem value="times">Times</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="font-size" className="text-xs">Grootte</Label>
            <Input
              id="font-size"
              type="number"
              value={block.style?.fontSize || 9}
              onChange={(e) => updateStyle('fontSize', parseInt(e.target.value) || 9)}
              className="h-8 text-xs"
              data-testid="input-font-size"
            />
          </div>

          <div>
            <Label htmlFor="font-style" className="text-xs">Stijl</Label>
            <Select 
              value={block.style?.fontStyle || 'normal'}
              onValueChange={(value) => updateStyle('fontStyle', value)}
            >
              <SelectTrigger id="font-style" className="h-8 text-xs" data-testid="select-font-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normaal</SelectItem>
                <SelectItem value="bold">Vet</SelectItem>
                <SelectItem value="italic">Cursief</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Z-Index Controls */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-orange-600">Laag</h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onBringToFront}
            className="flex-1 h-8 text-xs"
            data-testid="button-bring-to-front"
          >
            Naar voren
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSendToBack}
            className="flex-1 h-8 text-xs"
            data-testid="button-send-to-back"
          >
            Naar achteren
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Z-index: {block.zIndex || 0}
        </div>
      </div>

      {/* Block-specific content (read-only preview) */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-semibold mb-3 text-orange-600">Inhoud</h4>
        {block.type === "Company Header" && (
          <div className="space-y-1 text-xs">
            <div className="font-medium">{block.config.company?.name}</div>
            <div className="text-muted-foreground">{block.config.company?.address}</div>
            <div className="text-muted-foreground">{block.config.company?.postalCode} {block.config.company?.city}</div>
          </div>
        )}
        {block.type === "Document Title" && (
          <div className="text-xs font-bold">{block.config.text}</div>
        )}
        {block.type === "Date Block" && (
          <div className="text-xs text-muted-foreground">{block.config.date}</div>
        )}
        {block.type === "Text Block" && (
          <div className="text-xs text-muted-foreground">{block.config.text}</div>
        )}
      </div>
    </div>
  );
}
