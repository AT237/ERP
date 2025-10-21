import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Download, Eye, Save, FileText, Receipt, Package } from 'lucide-react';
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

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Select a layout to start designing</div>
      </div>
    );
  }

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
      <Card className="flex items-center justify-center bg-gray-50">
        <div 
          className="bg-white shadow-lg relative" 
          style={{ width: '210mm', height: '297mm', transform: 'scale(0.5)', transformOrigin: 'center' }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="border-2 border-dashed border-gray-300 h-full p-8">
            {canvasBlocks.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-4xl mb-4">📋</div>
                  <div className="text-lg font-medium">Canvas Area</div>
                  <div className="text-sm mt-2">Drag & drop blocks here</div>
                  <div className="text-xs mt-4 text-orange-600">
                    A4 {layout.orientation} · {layout.pageFormat}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-full">
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
            )}
          </div>
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
            <BlockProperties block={selectedBlock} />
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
        minWidth: '200px',
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
function BlockProperties({ block }: { block: any }) {
  if (block.type === "Company Header") {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Company Information</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <div className="font-medium">{block.config.company.name}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Address:</span>
              <div className="font-medium">{block.config.company.address}</div>
            </div>
            <div>
              <span className="text-muted-foreground">City:</span>
              <div className="font-medium">{block.config.company.postalCode} {block.config.company.city}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>
              <div className="font-medium">{block.config.company.phone}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>
              <div className="font-medium">{block.config.company.email}</div>
            </div>
            <div>
              <span className="text-muted-foreground">VAT:</span>
              <div className="font-medium">{block.config.company.vatNumber}</div>
            </div>
            <div>
              <span className="text-muted-foreground">CoC:</span>
              <div className="font-medium">{block.config.company.cocNumber}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "Document Title") {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Title Text</h4>
          <div className="text-xs font-medium">{block.config.text}</div>
        </div>
      </div>
    );
  }

  if (block.type === "Date Block") {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Date</h4>
          <div className="text-xs">
            <div><span className="text-muted-foreground">Label:</span> {block.config.label}</div>
            <div><span className="text-muted-foreground">Date:</span> {block.config.date}</div>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "Text Block") {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Text Content</h4>
          <div className="text-xs">{block.config.text}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Block Type</h4>
        <div className="text-xs text-muted-foreground">{block.type}</div>
      </div>
      <div className="text-xs text-muted-foreground">
        Configuration options coming soon...
      </div>
    </div>
  );
}
