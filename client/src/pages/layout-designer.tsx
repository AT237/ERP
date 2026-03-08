import { useState, useEffect, useRef, Fragment } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Download, Eye, Save, FileText, Receipt, Package, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Grid3x3, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Maximize2, Database, ArrowUp, ArrowDown, Type, Image, Table2, Printer, Bold, Italic, Underline, Copy, Trash2, Group, Ungroup, Minus, Square, Repeat } from 'lucide-react';
import { BlockRenderers, UnknownBlockRenderer, TEXT_VARIABLES } from '@/components/print/BlockRenderers';
import { PrintData, blockHasContent, replacePlaceholders, resolveAndFormat } from '@/utils/field-resolver';
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
import { DataTableLayout, ColumnConfig } from '@/components/layouts/DataTableLayout';
import { SafeDeleteDialog } from '@/components/ui/safe-delete-dialog';
import { useDataTable } from '@/hooks/useDataTable';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  packing_list: 'Packing List',
  order_confirmation: 'Order Confirmation',
  purchase_order: 'Purchase Order',
  work_order: 'Work Order',
};

export default function LayoutDesigner() {
  const [deleteLayoutTarget, setDeleteLayoutTarget] = useState<{id: string; name: string} | null>(null);
  const [showNewLayoutDialog, setShowNewLayoutDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutDocumentType, setNewLayoutDocumentType] = useState('quotation');
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
      documentType: newLayoutDocumentType,
      pageFormat: 'A4',
      orientation: newLayoutOrientation,
      isDefault: false,
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
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `layout-designer-${newLayout.id}`,
          name: newLayout.layoutNumber ? `${newLayout.layoutNumber} - ${newLayout.name}` : newLayout.name,
          formType: 'layout-designer',
          entityId: newLayout.id,
        }
      }));
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

  const deleteLayoutMutation = useMutation({
    mutationFn: async (layoutId: string) => {
      const response = await apiRequest('DELETE', `/api/layouts/${layoutId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      toast({
        title: 'Layout verwijderd',
        description: 'De layout is succesvol verwijderd',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Fout',
        description: error.message || 'Kon layout niet verwijderen',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteLayout = (layoutId: string, layoutName: string) => {
    setDeleteLayoutTarget({ id: layoutId, name: layoutName });
  };

  const handleOpenLayout = (layout: any) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `layout-designer-${layout.id}`,
        name: layout.layoutNumber ? `${layout.layoutNumber} - ${layout.name}` : layout.name,
        formType: 'layout-designer',
        entityId: layout.id,
      }
    }));
  };

  const {
    columns, setColumns, searchTerm, setSearchTerm, filters, setFilters,
    addFilter, updateFilter, removeFilter, sortConfig, handleSort,
    selectedRows, setSelectedRows, toggleRowSelection, toggleAllRows,
    applyFiltersAndSearch, applySorting,
  } = useDataTable({
    tableKey: 'layouts',
    defaultColumns: [
      { key: 'layoutNumber', label: 'ID', visible: true, sortable: true, filterable: true, width: 110 },
      { key: 'name', label: 'Omschrijving', visible: true, sortable: true, filterable: true },
      { key: 'documentType', label: 'Document Type', visible: true, sortable: true, renderCell: (v: any) => DOCUMENT_TYPE_LABELS[v] || v },
      { key: 'pageFormat', label: 'Page Size', visible: true, sortable: true, width: 110, renderCell: (v: any) => v?.toUpperCase() || '—' },
      { key: 'orientation', label: 'Oriëntatie', visible: true, sortable: true, width: 120, renderCell: (v: any) => <span className="capitalize">{v}</span> },
      { key: 'isDefault', label: 'Status', visible: true, sortable: true, width: 120, renderCell: (v: any) => (
        <Badge variant={v ? 'default' : 'outline'} className={`text-xs ${v ? 'bg-green-100 text-green-800 border-green-200' : ''}`}>
          {v ? 'Default' : 'Active'}
        </Badge>
      )},
    ] as ColumnConfig[],
  });

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-6">
      <DataTableLayout
        entityName="Layout"
        entityNamePlural="Layouts"
        data={layouts as any[]}
        columns={columns}
        setColumns={setColumns}
        tableKey="layouts"
        isLoading={isLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        setFilters={setFilters}
        onAddFilter={addFilter}
        onUpdateFilter={updateFilter}
        onRemoveFilter={removeFilter}
        sortConfig={sortConfig}
        onSort={handleSort}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onToggleRowSelection={toggleRowSelection}
        onToggleAllRows={() => toggleAllRows((layouts as any[]).map((l: any) => l.id))}
        onRowDoubleClick={handleOpenLayout}
        onDuplicate={(row: any) => handleDuplicateLayout(row.id)}
        getRowId={(row: any) => row.id}
        applyFiltersAndSearch={applyFiltersAndSearch}
        applySorting={applySorting}
        deleteConfirmDialog={{ isOpen: false, onOpenChange: () => {}, onConfirm: () => {}, itemCount: 0 }}
        headerActions={[
          {
            key: 'new-layout',
            label: 'New Layout',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setShowNewLayoutDialog(true),
            variant: 'default' as const,
          }
        ]}
        rowActions={(row: any) => [
          {
            key: 'edit',
            label: 'Openen',
            onClick: () => handleOpenLayout(row),
          },
          {
            key: 'duplicate',
            label: 'Dupliceren',
            onClick: () => handleDuplicateLayout(row.id),
          },
          {
            key: 'delete',
            label: 'Verwijderen',
            onClick: () => handleDeleteLayout(row.id, row.name),
          },
        ]}
      />
      </div>

      {/* New Layout Dialog */}
      <Dialog open={showNewLayoutDialog} onOpenChange={setShowNewLayoutDialog}>
        <DialogContent data-testid="dialog-new-layout">
          <DialogHeader>
            <DialogTitle>Nieuwe Layout Aanmaken</DialogTitle>
            <DialogDescription>
              Maak een nieuw document template aan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="layout-name">Naam</Label>
              <Input
                id="layout-name"
                placeholder="bijv. Standaard Offerte Layout"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                data-testid="input-layout-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={newLayoutDocumentType} onValueChange={setNewLayoutDocumentType}>
                <SelectTrigger id="doc-type" data-testid="select-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orientation">Oriëntatie</Label>
              <Select value={newLayoutOrientation} onValueChange={(value: any) => setNewLayoutOrientation(value)}>
                <SelectTrigger id="orientation" data-testid="select-orientation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Staand (Portrait)</SelectItem>
                  <SelectItem value="landscape">Liggend (Landscape)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewLayoutDialog(false)}
              data-testid="button-cancel"
            >
              Annuleren
            </Button>
            <Button 
              onClick={handleCreateLayout}
              disabled={createLayoutMutation.isPending}
              data-testid="button-create"
            >
              {createLayoutMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SafeDeleteDialog
        open={!!deleteLayoutTarget}
        onOpenChange={(open) => { if (!open) setDeleteLayoutTarget(null); }}
        onConfirm={() => {
          if (deleteLayoutTarget) {
            deleteLayoutMutation.mutate(deleteLayoutTarget.id);
            setDeleteLayoutTarget(null);
          }
        }}
        entityName={deleteLayoutTarget?.name || ''}
        entityId={deleteLayoutTarget?.id || ''}
        isPending={deleteLayoutMutation.isPending}
      />
    </div>
  );
}


// Conversion constants: 1mm = 3.78px at 96 DPI
const MM_TO_PX = 3.78;
const PX_TO_MM = 1 / MM_TO_PX;

// Helper functions for mm/px conversion
const pxToMm = (px: number): number => Math.round(px * PX_TO_MM * 10) / 10;
const mmToPx = (mm: number): number => Math.round(mm * MM_TO_PX);

// Dutch labels for field names used in layout designer field browser and properties panel
const FIELD_LABELS: Record<string, string> = {
  positionNo: 'Pos. Nr.', lineType: 'Regeltype', description: 'Omschrijving',
  descriptionInternal: 'Interne omschrijving', quantity: 'Aantal', unit: 'Eenheid',
  unitPrice: 'Prijs per eenheid', lineTotal: 'Regel totaal', discountPercent: 'Korting %',
  workDate: 'Werkdatum', technicianNames: 'Techniciennamen', technicianIds: 'Techniciën IDs',
  customerRateId: 'Tarief ID', itemId: 'Artikel ID', sourceSnippetId: 'Snippet ID',
  sourceSnippetVersion: 'Snippet versie', deliveryDate: 'Leverdatum', hsCode: 'HS Code',
  countryOfOrigin: 'Land van oorsprong', lineNumber: 'Regelnummer',
  quotationNumber: 'Offerte nr.', quotationDate: 'Offerte datum', validUntil: 'Geldig tot',
  validityDays: 'Geldig (dagen)', revisionNumber: 'Revisie nr.', status: 'Status',
  isBudgetQuotation: 'Budgetofferte', subtotal: 'Subtotaal', taxAmount: 'BTW bedrag',
  totalAmount: 'Totaal bedrag', totalAmountInWords: 'Totaal bedrag in woorden', incoTerms: 'Incoterms', paymentConditions: 'Betalingsconditie',
  deliveryConditions: 'Leveringsconditie', notes: 'Notities', invoiceNumber: 'Factuur nr.',
  invoiceDate: 'Factuurdatum', dueDate: 'Vervaldatum', paidAmount: 'Betaald bedrag',
  orderNumber: 'Order nr.', orderDate: 'Orderdatum', expectedDate: 'Verwachte datum',
  expectedDeliveryDate: 'Verwachte levering', priority: 'Prioriteit', assignedTo: 'Toegewezen aan',
  packingListNumber: 'Paklijst nr.', packingDate: 'Pakdatum', shippingMethod: 'Verzendmethode',
  trackingNumber: 'Track & Trace', totalWeight: 'Totaal gewicht', totalPackages: 'Totaal colli',
  packageNumber: 'Collinummer', weight: 'Gewicht', workOrderNumber: 'Werkorder nr.',
  requestNumber: 'Aanvraag nr.', requestDate: 'Aanvraagdatum', name: 'Naam',
  customerNumber: 'Klantnummer', kvkNummer: 'KvK nummer', generalEmail: 'Algemeen e-mail',
  email: 'E-mail', phone: 'Telefoon', mobile: 'Mobiel', contactPersonEmail: 'Contactpersoon e-mail',
  taxId: 'BTW nummer', bankAccount: 'Bankrekening', invoiceEmail: 'Factuur e-mail',
  invoiceNotes: 'Factuurnotities', memo: 'Memo', paymentTerms: 'Betaaltermijn',
  supplierNumber: 'Leveranciersnummer', contactPerson: 'Contactpersoon',
  prospectNumber: 'Prospectnummer', companyName: 'Bedrijfsnaam', contactName: 'Contactnaam',
  source: 'Bron', projectNumber: 'Projectnummer', startDate: 'Startdatum', endDate: 'Einddatum',
  totalValue: 'Totale waarde', progress: 'Voortgang', legalName: 'Juridische naam',
  website: 'Website', btwNummer: 'BTW nr.', iban: 'IBAN', bankName: 'Banknaam',
  'address.street': 'Adres - Straat', 'address.houseNumber': 'Adres - Huisnummer',
  'address.postalCode': 'Adres - Postcode', 'address.city': 'Adres - Stad', 'address.country': 'Adres - Land',
  street: 'Straat', houseNumber: 'Huisnummer', postalCode: 'Postcode', city: 'Stad',
  country: 'Land', province: 'Provincie', type: 'Type', code: 'Code', region: 'Regio',
  phoneCode: 'Telefooncode', category: 'Categorie', language: 'Taal', sku: 'Artikelcode',
  costPrice: 'Inkoopprijs', margin: 'Marge', currentStock: 'Huidige voorraad',
  minimumStock: 'Minimumvoorraad', symbol: 'Symbool', percentage: 'Percentage',
  isDefault: 'Standaard', order: 'Volgorde', color: 'Kleur', title: 'Titel',
  content: 'Inhoud', version: 'Versie', url: 'URL', width: 'Breedte', height: 'Hoogte',
  function: 'Functie', logoUrl: 'Logo URL',
};

const getFieldLabel = (fieldName: string) => FIELD_LABELS[fieldName] || fieldName;

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
  const [search, setSearch] = useState('');

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

  const lowerSearch = search.toLowerCase();

  const filteredTables = availableTables
    .map(table => ({
      ...table,
      filteredFields: table.fields.filter(
        f => !lowerSearch || getFieldLabel(f).toLowerCase().includes(lowerSearch) || f.toLowerCase().includes(lowerSearch)
      ),
    }))
    .filter(table => !lowerSearch || table.name.toLowerCase().includes(lowerSearch) || table.filteredFields.length > 0);

  const isSearching = lowerSearch.length > 0;

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="p-2 border-b bg-muted/20">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek veld..."
          className="h-7 text-xs"
        />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">Geen velden gevonden</div>
        ) : (
          filteredTables.map((table) => {
            const isExpanded = isSearching || expandedTables.includes(table.name);
            return (
              <div key={table.name} className="border-b last:border-b-0">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-muted"
                  onClick={() => toggleTable(table.name)}
                >
                  <span>{table.name}</span>
                  <span className="text-muted-foreground">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="bg-muted/30 px-2 py-1">
                    {table.filteredFields.map((field) => (
                      <button
                        key={field}
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-orange-100 rounded flex items-center gap-2"
                        onClick={() => insertField(table.name, field)}
                      >
                        <span className="text-orange-600">+</span>
                        <span>{getFieldLabel(field)}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{`{{${table.name}.${field}}}`}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Hide When Field Empty Picker — mirrors DataFieldInsertMenu but for field selection
function HideWhenFieldPicker({
  value,
  onChange,
  availableTables,
}: {
  value: string;
  onChange: (fieldKey: string | undefined) => void;
  availableTables: { name: string; label: string; fields: string[] }[];
}) {
  const [expandedTables, setExpandedTables] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev =>
      prev.includes(tableName) ? prev.filter(t => t !== tableName) : [...prev, tableName]
    );
  };

  const lowerSearch = search.toLowerCase();
  const filteredTables = availableTables
    .map(table => ({
      ...table,
      filteredFields: table.fields.filter(
        f => !lowerSearch || getFieldLabel(f).toLowerCase().includes(lowerSearch) || f.toLowerCase().includes(lowerSearch)
      ),
    }))
    .filter(table => !lowerSearch || table.label.toLowerCase().includes(lowerSearch) || table.name.toLowerCase().includes(lowerSearch) || table.filteredFields.length > 0);

  const isSearching = lowerSearch.length > 0;

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="p-2 border-b bg-muted/20 flex items-center gap-1">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek veld..."
          className="h-7 text-xs flex-1"
        />
        {value && (
          <button
            type="button"
            className="text-[10px] text-red-500 hover:text-red-700 px-1 whitespace-nowrap"
            onClick={() => onChange(undefined)}
          >✕ wis</button>
        )}
      </div>
      {value && (
        <div className="px-3 py-1.5 bg-orange-50 border-b text-xs text-orange-700 font-medium">
          ✓ {value}
        </div>
      )}
      <div className="max-h-60 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">Geen velden gevonden</div>
        ) : (
          filteredTables.map((table) => {
            const isExpanded = isSearching || expandedTables.includes(table.name);
            return (
              <div key={table.name} className="border-b last:border-b-0">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-muted"
                  onClick={() => toggleTable(table.name)}
                >
                  <span>{table.label}</span>
                  <span className="text-muted-foreground">{isExpanded ? '−' : '+'}</span>
                </button>
                {isExpanded && (
                  <div className="bg-muted/30 px-2 py-1">
                    {table.filteredFields.map((field) => {
                      const fieldKey = `${table.name}.${field}`;
                      const isSelected = value === fieldKey;
                      return (
                        <button
                          key={field}
                          type="button"
                          className={`w-full px-3 py-1.5 text-left text-xs rounded flex items-center gap-2 ${isSelected ? 'bg-orange-100 text-orange-700 font-medium' : 'hover:bg-orange-50'}`}
                          onClick={() => onChange(isSelected ? undefined : fieldKey)}
                        >
                          <span className={isSelected ? 'text-orange-600' : 'text-muted-foreground'}>
                            {isSelected ? '✓' : '○'}
                          </span>
                          <span>{getFieldLabel(field)}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto font-mono">{field}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Visual Designer Component
export function VisualDesignerView({ layout }: { layout: any }) {
  // Section-based state
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [activeLineTypeTabMap, setActiveLineTypeTabMap] = useState<Record<string, string>>({});
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTableSelectorDialog, setShowTableSelectorDialog] = useState(false);
  const [allowedTables, setAllowedTables] = useState<string[]>(layout?.allowedTables || []);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'block' | 'section' | 'childBlock'; id: string; sectionId?: string; parentGroupId?: string } | null>(null);
  const [localLayoutName, setLocalLayoutName] = useState<string>(layout?.name || '');
  const [localLayoutNumber, setLocalLayoutNumber] = useState<string>(layout?.layoutNumber || '');
  const { toast } = useToast();
  
  // Drag state for block positioning with alignment guides
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [hoverSectionId, setHoverSectionId] = useState<string | null>(null);
  const [sectionChangedFlash, setSectionChangedFlash] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'h' | 'v'; position: number }[]>([]);

  // History for undo/redo (refs to avoid re-renders)
  const historyRef = useRef<any[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  // Clipboard for cut/copy/paste
  const clipboardRef = useRef<any | null>(null);
  // Track drag start to push history once per drag (not on every mousemove)
  const dragStartSectionsRef = useRef<any[] | null>(null);

  const pushHistory = (currentSections: any[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(currentSections)));
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  };

  // Available database tables for selection - all tables related to quotations and documents
  const availableTables = [
    // Document Types
    { name: 'quotation', label: 'Offerte', fields: ['quotationNumber', 'quotationDate', 'validUntil', 'validityDays', 'description', 'revisionNumber', 'status', 'isBudgetQuotation', 'subtotal', 'taxAmount', 'totalAmount', 'totalAmountInWords', 'incoTerms', 'paymentConditions', 'deliveryConditions', 'notes'] },
    { name: 'quotationItems', label: 'Offerte Regels', fields: ['positionNo', 'lineType', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal', 'itemId', 'sourceSnippetId', 'deliveryDate', 'hsCode', 'countryOfOrigin'] },
    { name: 'invoice', label: 'Factuur', fields: ['invoiceNumber', 'invoiceDate', 'dueDate', 'description', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'totalAmountInWords', 'paidAmount', 'notes', 'paymentTerms', 'workOrderNumbers'] },
    { name: 'invoiceItems', label: 'Factuur Regels', fields: ['positionNo', 'lineType', 'description', 'descriptionInternal', 'quantity', 'unit', 'unitPrice', 'lineTotal', 'discountPercent', 'workDate', 'technicianNames', 'technicianIds', 'customerRateId', 'itemId', 'sourceSnippetId', 'sourceSnippetVersion'] },
    { name: 'proformaInvoice', label: 'Proforma Factuur', fields: ['invoiceNumber', 'status', 'dueDate', 'subtotal', 'taxAmount', 'totalAmount'] },
    { name: 'purchaseOrder', label: 'Inkooporder', fields: ['orderNumber', 'orderDate', 'expectedDate', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
    { name: 'purchaseOrderItems', label: 'Inkooporder Regels', fields: ['positionNo', 'lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'] },
    { name: 'salesOrder', label: 'Verkooporder', fields: ['orderNumber', 'orderDate', 'expectedDeliveryDate', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
    { name: 'salesOrderItems', label: 'Verkooporder Regels', fields: ['positionNo', 'lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'] },
    { name: 'workOrders', label: 'Werkorders (gekoppeld)', fields: ['orderNumber', 'title', 'description', 'status', 'priority', 'assignedTo', 'startDate', 'dueDate', 'completedDate', 'estimatedHours', 'actualHours'] },
    { name: 'packingList', label: 'Paklijst', fields: ['packingListNumber', 'packingDate', 'status', 'shippingMethod', 'trackingNumber', 'totalWeight', 'totalPackages', 'notes'] },
    { name: 'packingListItems', label: 'Paklijst Regels', fields: ['positionNo', 'lineNumber', 'description', 'quantity', 'weight', 'packageNumber'] },
    { name: 'quotationRequest', label: 'Offerte Aanvraag', fields: ['requestNumber', 'requestDate', 'status', 'description', 'notes'] },
    
    // Relations
    { name: 'customer', label: 'Klant', fields: ['customerNumber', 'name', 'kvkNummer', 'generalEmail', 'email', 'phone', 'mobile', 'contactPersonEmail', 'taxId', 'bankAccount', 'invoiceEmail', 'invoiceNotes', 'memo', 'paymentTerms', 'status', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },
    { name: 'customerContact', label: 'Klant Contact', fields: ['name', 'email', 'phone', 'function'] },
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

  const { data: sectionTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/section-templates'],
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

  // Sync allowedTables with layout data when layout changes
  useEffect(() => {
    if (layout?.allowedTables) {
      setAllowedTables(layout.allowedTables);
    }
  }, [layout?.allowedTables]);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+C/X/V (copy/cut/paste)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (!e.ctrlKey && !e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            // Ctrl+Shift+Z = redo
            if (historyIndexRef.current < historyRef.current.length - 1) {
              historyIndexRef.current++;
              setSections(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
              setSelectedBlock(null);
              setSelectedSection(null);
            }
          } else {
            // Ctrl+Z = undo
            if (historyIndexRef.current > 0) {
              historyIndexRef.current--;
              setSections(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
              setSelectedBlock(null);
              setSelectedSection(null);
            }
          }
          break;
        case 'y':
          e.preventDefault();
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            setSections(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
            setSelectedBlock(null);
            setSelectedSection(null);
          }
          break;
        case 'c':
          e.preventDefault();
          if (selectedBlock) {
            clipboardRef.current = JSON.parse(JSON.stringify(selectedBlock));
          }
          break;
        case 'x':
          e.preventDefault();
          if (selectedBlock) {
            clipboardRef.current = JSON.parse(JSON.stringify(selectedBlock));
            const cutSection = sections.find((s: any) => getSectionBlocks(s).find((b: any) => b.id === selectedBlock.id));
            if (cutSection) {
              pushHistory(sections);
              setSections(sections.map((s: any) =>
                s.id === cutSection.id
                  ? applyBlocksToSection(s, getSectionBlocks(s).filter((b: any) => b.id !== selectedBlock.id))
                  : s
              ));
              setSelectedBlock(null);
            }
          }
          break;
        case 'v':
          e.preventDefault();
          if (clipboardRef.current) {
            const targetSection = selectedSection || sections[0];
            if (!targetSection) break;
            const newBlock = {
              ...clipboardRef.current,
              id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: {
                x: (clipboardRef.current.position?.x || 0) + 5,
                y: (clipboardRef.current.position?.y || 0) + 5,
              },
            };
            pushHistory(sections);
            setSections(sections.map((s: any) =>
              s.id === targetSection.id
                ? applyBlocksToSection(s, [...getSectionBlocks(s), newBlock])
                : s
            ));
            setSelectedBlock(newBlock);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sections, selectedBlock, selectedSection]);

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

    // Check if a template is selected
    const selectedTemplate = sectionTemplates.find((t: any) => t.id === selectedTemplateId);
    const templateConfig = selectedTemplate?.config;

    const newSection = {
      id: `section-${Date.now()}`,
      name: newSectionName,
      sectionType: newSectionType,
      position: sections.length,
      config: templateConfig ? {
        ...templateConfig.sectionConfig,
        blocks: (templateConfig.blocks || []).map((b: any) => ({
          ...b,
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })),
      } : {
        printRules: { everyPage: true },
        dimensions: { height: 200, unit: 'px' as const },
        style: { backgroundColor: '#ffffff' },
        blocks: [],
        metadata: {},
      },
    };

    pushHistory(sections);
    setSections([...sections, newSection]);
    setSelectedSection(newSection);
    setShowNewSectionDialog(false);
    setNewSectionName('');
    setNewSectionType('custom');
    setSelectedTemplateId('');
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

      // Delete existing sections in parallel
      if (existingSections && existingSections.length > 0) {
        await Promise.all(
          existingSections.map((section: any) =>
            apiRequest('DELETE', `/api/layout-sections/${section.id}`)
          )
        );
      }

      // Save all sections in parallel
      await Promise.all(
        sections.map((section) =>
          apiRequest('POST', '/api/layout-sections', {
            layoutId: layout.id,
            name: section.name,
            sectionType: section.sectionType,
            position: section.position,
            config: section.config,
          })
        )
      );

      return sections;
    },
    onSuccess: async () => {
      toast({
        title: 'Opgeslagen!',
        description: `Layout "${layout.name}" is succesvol opgeslagen`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      // Fetch fresh sections directly and set state — avoids useEffect race condition
      const freshSections = await queryClient.fetchQuery<any[]>({
        queryKey: [`/api/layout-sections?layoutId=${layout.id}`],
        staleTime: 0,
      });
      const loadedSections = (freshSections || []).map((section: any) => ({
        id: section.id,
        name: section.name,
        sectionType: section.sectionType,
        position: section.position,
        config: {
          ...section.config,
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
      setSections(loadedSections.sort((a: any, b: any) => a.position - b.position));
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

  const updateLayoutInfoMutation = useMutation({
    mutationFn: async ({ name, layoutNumber }: { name: string; layoutNumber: string }) => {
      await apiRequest('PUT', `/api/layouts/${layout.id}`, { name, layoutNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
    },
    onError: () => {
      toast({ title: 'Fout bij opslaan', description: 'Kon naam/ID niet opslaan', variant: 'destructive' });
    },
  });

  const handleLayoutInfoBlur = () => {
    const name = localLayoutName.trim();
    const layoutNumber = localLayoutNumber.trim();
    if (!name) return;
    if (name !== layout.name || layoutNumber !== layout.layoutNumber) {
      updateLayoutInfoMutation.mutate({ name, layoutNumber });
    }
  };

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

    // Determine default size based on block type
    const getDefaultSize = (type: string) => {
      switch (type) {
        case "Line Items Table":
          return { width: 180, height: 60 };
        case "Item Repeater":
          return { width: 180, height: 25 };
        case "Line":
          return { width: 100, height: 2 };
        case "Rectangle":
          return { width: 60, height: 40 };
        default:
          return { width: 50, height: 25 };
      }
    };

    const newBlock = {
      id: `block-${Date.now()}`,
      type: draggedBlockType,
      position: { x: pxToMm(x), y: pxToMm(y) },
      size: getDefaultSize(draggedBlockType),
      style: {
        fontSize: 9,
        fontFamily: 'helvetica',
        fontStyle: 'normal',
      },
      zIndex: (section.config.blocks?.length || 0),
      config: getDefaultConfig(draggedBlockType),
    };

    // Add block to section (template-aware)
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      return applyBlocksToSection(s, [...getSectionBlocks(s), newBlock]);
    });

    pushHistory(sections);
    setSections(updatedSections);
    setSelectedBlock(newBlock);
    setDraggedBlockType(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveBlock = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      return applyBlocksToSection(s, getSectionBlocks(s).filter((b: any) => b.id !== blockId));
    });
    pushHistory(sections);
    setSections(updatedSections);
    
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  const handleRemoveChildBlock = (sectionId: string, parentGroupId: string, childBlockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      return applyBlocksToSection(s, getSectionBlocks(s).map((b: any) => {
        if (b.id !== parentGroupId) return b;
        return {
          ...b,
          config: {
            ...b.config,
            childBlocks: (b.config?.childBlocks || []).filter((child: any) => child.id !== childBlockId),
          },
        };
      }));
    });
    pushHistory(sections);
    setSections(updatedSections);
    setSelectedChildBlock(null);
  };

  // Move block forward (on top of others) - higher index = rendered later = on top
  const handleMoveBlockUp = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      const blocks = [...getSectionBlocks(s)];
      const index = blocks.findIndex((b: any) => b.id === blockId);
      if (index >= 0 && index < blocks.length - 1) {
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
      }
      return applyBlocksToSection(s, blocks);
    });
    pushHistory(sections);
    setSections(updatedSections);
  };

  // Move block backward (behind others) - lower index = rendered first = behind
  const handleMoveBlockDown = (sectionId: string, blockId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      const blocks = [...getSectionBlocks(s)];
      const index = blocks.findIndex((b: any) => b.id === blockId);
      if (index > 0) {
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
      }
      return applyBlocksToSection(s, blocks);
    });
    pushHistory(sections);
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
      const remainingBlocks = getSectionBlocks(s).filter((b: any) => !selectedBlockIds.includes(b.id));
      return applyBlocksToSection(s, [...remainingBlocks, groupBlock]);
    });
    
    setSections(updatedSections);
    setSelectedBlockIds([]);
    setSelectedBlock(groupBlock);
    toast({ title: 'Gegroepeerd', description: `${blocksToGroup.length} blokken zijn gegroepeerd` });
  };

  // Ungroup a Group block back into individual blocks
  const handleUngroupBlock = () => {
    if (!selectedBlock || selectedBlock.type !== 'Group') return;
    
    // Find the section containing the group (template-aware)
    let targetSection: any = null;
    for (const section of sections) {
      if (getSectionBlocks(section).some((b: any) => b.id === selectedBlock.id)) {
        targetSection = section;
        break;
      }
    }
    
    if (!targetSection) return;
    
    const childBlocks = (selectedBlock.config?.childBlocks || []).map((block: any) => ({
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: (selectedBlock.position?.x || 0) + (block.position?.x || 0),
        y: (selectedBlock.position?.y || 0) + (block.position?.y || 0),
      }
    }));
    
    const updatedSections = sections.map(s => {
      if (s.id !== targetSection.id) return s;
      const otherBlocks = getSectionBlocks(s).filter((b: any) => b.id !== selectedBlock.id);
      return applyBlocksToSection(s, [...otherBlocks, ...childBlocks]);
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
    pushHistory(sections); // push before drag starts (not on every move)
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
    
    // Get current block being dragged (template-aware)
    const currentBlock = getSectionBlocks(section).find((b: any) => b.id === dragBlockId);
    if (!currentBlock) return;
    
    const blockWidth = currentBlock.size?.width || 50;
    const blockHeight = currentBlock.size?.height || 25;
    
    // Calculate alignment guides
    const guides: { type: 'h' | 'v'; position: number }[] = [];
    const otherBlocks = getSectionBlocks(section).filter((b: any) => b.id !== dragBlockId);
    
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
    // Check if block should be moved to a different section
    if (isDraggingBlock && dragBlockId && dragSectionId && hoverSectionId && hoverSectionId !== dragSectionId) {
      const sourceSection = sections.find(s => s.id === dragSectionId);
      const blockToMove = getSectionBlocks(sourceSection).find((b: any) => b.id === dragBlockId);
      
      if (blockToMove) {
        const updatedSections = sections.map(s => {
          if (s.id === dragSectionId) {
            return applyBlocksToSection(s, getSectionBlocks(s).filter((b: any) => b.id !== dragBlockId));
          }
          if (s.id === hoverSectionId) {
            return applyBlocksToSection(s, [...getSectionBlocks(s), blockToMove]);
          }
          return s;
        });
        
        setSections(updatedSections);
        
        // Flash effect on target section
        setSectionChangedFlash(hoverSectionId);
        setTimeout(() => setSectionChangedFlash(null), 500);
        
        toast({ title: 'Blok verplaatst', description: 'Blok is naar een andere sectie verplaatst' });
      }
    }
    
    setIsDraggingBlock(false);
    setDragBlockId(null);
    setDragSectionId(null);
    setHoverSectionId(null);
    setAlignmentGuides([]);
  };

  // --- lineTypeTemplates helpers ---
  const LINE_TYPE_TABS = [
    { value: 'standard', label: 'Item', badge: 'ITM', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'unique',   label: 'Uniek Item', badge: 'UNI', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { value: 'charges',  label: 'Meerwerk', badge: 'MWK', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { value: 'text',     label: 'Tekst', badge: 'TXT', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  ];

  const getActiveLineTypeTab = (sectionId: string) => activeLineTypeTabMap[sectionId] || 'standard';

  const getSectionBlocks = (section: any): any[] => {
    if (section.config?.lineTypeTemplates) {
      const tab = getActiveLineTypeTab(section.id);
      return section.config.lineTypeTemplates[tab] || [];
    }
    return section.config?.blocks || [];
  };

  const applyBlocksToSection = (section: any, newBlocks: any[]): any => {
    if (section.config?.lineTypeTemplates) {
      const tab = getActiveLineTypeTab(section.id);
      return {
        ...section,
        config: {
          ...section.config,
          lineTypeTemplates: { ...section.config.lineTypeTemplates, [tab]: newBlocks },
        },
      };
    }
    return { ...section, config: { ...section.config, blocks: newBlocks } };
  };

  const switchLineTypeTab = (sectionId: string, newTab: string) => {
    setActiveLineTypeTabMap(prev => ({ ...prev, [sectionId]: newTab }));
    if (selectedSection?.id === sectionId) {
      const updated = sections.find(s => s.id === sectionId);
      if (updated) setSelectedSection(updated);
    }
    setSelectedBlock(null);
  };

  const enableLineTypeTemplates = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const currentBlocks = section.config?.blocks || [];
    const updated = sections.map(s => s.id !== sectionId ? s : {
      ...s,
      config: {
        ...s.config,
        lineTypeTemplates: { standard: currentBlocks, unique: [], charges: [], text: [] },
        lineTypeFilter: undefined,
      },
    });
    setSections(updated);
    setActiveLineTypeTabMap(prev => ({ ...prev, [sectionId]: 'standard' }));
    const updatedSection = updated.find(s => s.id === sectionId);
    if (updatedSection && selectedSection?.id === sectionId) setSelectedSection(updatedSection);
  };

  const disableLineTypeTemplates = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const currentTab = getActiveLineTypeTab(sectionId);
    const currentBlocks = section.config?.lineTypeTemplates?.[currentTab] || [];
    const updated = sections.map(s => s.id !== sectionId ? s : {
      ...s,
      config: { ...s.config, lineTypeTemplates: undefined, blocks: currentBlocks },
    });
    setSections(updated);
    const updatedSection = updated.find(s => s.id === sectionId);
    if (updatedSection && selectedSection?.id === sectionId) setSelectedSection(updatedSection);
  };
  // --- end lineTypeTemplates helpers ---

  const updateSectionProperty = (sectionId: string, path: string, value: any) => {
    pushHistory(sections);
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
    if (!isDraggingBlock) pushHistory(sections);
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      const newBlocks = getSectionBlocks(s).map((b: any) => b.id === blockId ? { ...b, [property]: value } : b);
      return applyBlocksToSection(s, newBlocks);
    });
    setSections(updatedSections);
    if (selectedBlock?.id === blockId) {
      const updatedSection = updatedSections.find(s => s.id === sectionId);
      const updatedBlock = getSectionBlocks(updatedSection).find((b: any) => b.id === blockId);
      if (updatedBlock) setSelectedBlock(updatedBlock);
    }
  };

  // Move block from one section to another
  const moveBlockToSection = (fromSectionId: string, toSectionId: string, blockId: string) => {
    if (fromSectionId === toSectionId) return;
    const fromSection = sections.find(s => s.id === fromSectionId);
    const blockToMove = getSectionBlocks(fromSection).find((b: any) => b.id === blockId);
    if (!blockToMove) return;
    const updatedSections = sections.map(s => {
      if (s.id === fromSectionId) return applyBlocksToSection(s, getSectionBlocks(s).filter((b: any) => b.id !== blockId));
      if (s.id === toSectionId) return applyBlocksToSection(s, [...getSectionBlocks(s), blockToMove]);
      return s;
    });
    setSections(updatedSections);
    const newSection = updatedSections.find(s => s.id === toSectionId);
    if (newSection) setSelectedSection(newSection);
  };

  // Update property of a child block within a group
  const updateChildBlockProperty = (sectionId: string, parentGroupId: string, childBlockId: string, property: string, value: any) => {
    const updatedSections = sections.map(s => {
      if (s.id !== sectionId) return s;
      const newBlocks = getSectionBlocks(s).map((b: any) => {
        if (b.id !== parentGroupId || b.type !== 'Group') return b;
        const updatedChildBlocks = (b.config?.childBlocks || []).map((child: any) =>
          child.id === childBlockId ? { ...child, [property]: value } : child
        );
        return { ...b, config: { ...b.config, childBlocks: updatedChildBlocks } };
      });
      return applyBlocksToSection(s, newBlocks);
    });
    setSections(updatedSections);
    if (selectedChildBlock?.block.id === childBlockId) {
      const updatedSection = updatedSections.find(s => s.id === sectionId);
      const updatedGroup = getSectionBlocks(updatedSection).find((b: any) => b.id === parentGroupId);
      const updatedChild = updatedGroup?.config?.childBlocks?.find((c: any) => c.id === childBlockId);
      if (updatedChild) setSelectedChildBlock({ block: updatedChild, parentGroupId });
    }
  };

  const handleRemoveSection = (sectionId: string) => {
    pushHistory(sections);
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

  // Global mouseup handler for cross-section block dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingBlock) {
        handleBlockDragEnd();
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingBlock, dragBlockId, dragSectionId, hoverSectionId]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - sticky so it stays visible when scrolling */}
      <div className="sticky top-0 z-20 border-b border-border bg-white px-4 py-2">
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
                    const sectionId = sections.find(s => getSectionBlocks(s).some((b: any) => b.id === selectedBlock.id))?.id;
                    if (!sectionId) return;
                    const section = sections.find(s => s.id === sectionId);
                    if (!section) return;
                    const copiedBlock = {
                      ...selectedBlock,
                      id: `block-${Date.now()}`,
                      position: { x: (selectedBlock.position?.x || 0) + 5, y: (selectedBlock.position?.y || 0) + 5 },
                    };
                    setSections(sections.map(s => s.id === sectionId ? applyBlocksToSection(s, [...getSectionBlocks(s), copiedBlock]) : s));
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
                  className={`h-8 w-8 p-0 ${(selectedBlock || selectedSection || selectedChildBlock) ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-400 opacity-40'}`}
                  disabled={!selectedBlock && !selectedSection && !selectedChildBlock}
                  onClick={() => {
                    if (selectedChildBlock) {
                      const sectionId = sections.find(s =>
                        s.config.blocks?.some((b: any) => b.id === selectedChildBlock.parentGroupId)
                      )?.id;
                      if (sectionId) {
                        setDeleteTarget({ type: 'childBlock', id: selectedChildBlock.block.id, sectionId, parentGroupId: selectedChildBlock.parentGroupId });
                        setShowDeleteConfirmDialog(true);
                      }
                    } else if (selectedBlock) {
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
                  {selectedChildBlock ? 'Verwijder blok uit groep' : selectedBlock ? 'Verwijder geselecteerd blok' : selectedSection ? 'Verwijder geselecteerde sectie' : 'Selecteer een blok of sectie'}
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={() => handleDragStart("Line Items Table")}
                    className="h-8 w-8 flex items-center justify-center rounded cursor-grab hover:bg-muted transition-colors"
                  >
                    <Table2 className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Offerteregels Tabel</p>
                  <p className="text-xs text-muted-foreground">Standaard tabel met offerte items</p>
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

          {/* Design Applied To - Table Selection */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowTableSelectorDialog(true)}
          >
            <Database className="h-4 w-4 mr-2" />
            Design toepasbaar op ({allowedTables.length})
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

            {sectionTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="section-template">Opgeslagen Template</Label>
                <Select value={selectedTemplateId || 'none'} onValueChange={(val) => setSelectedTemplateId(val === 'none' ? '' : val)}>
                  <SelectTrigger id="section-template">
                    <SelectValue placeholder="Geen template (lege sectie)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen template (lege sectie)</SelectItem>
                    {sectionTemplates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecteer een opgeslagen template om de sectie mee te vullen
                </p>
              </div>
            )}
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

      {/* Design Applied To - Table Selector Dialog */}
      <Dialog open={showTableSelectorDialog} onOpenChange={setShowTableSelectorDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Design toepasbaar op</DialogTitle>
            <DialogDescription>
              Selecteer op welke documenten dit design van toepassing is. Bij afdrukken worden de bijbehorende regels automatisch herhaald.
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
                  <th className="text-left py-2 px-3 font-medium">Document</th>
                  <th className="text-left py-2 px-3 font-medium">Tabelnaam</th>
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
                title: 'Design toepasbaarheid bijgewerkt',
                description: `${allowedTables.length} ${allowedTables.length === 1 ? 'document' : 'documenten'} geselecteerd`,
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
              {deleteTarget?.type === 'childBlock'
                ? 'Weet je zeker dat je dit blok wilt verwijderen uit de groep?'
                : deleteTarget?.type === 'block' 
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
                if (deleteTarget?.type === 'childBlock' && deleteTarget.sectionId && deleteTarget.parentGroupId) {
                  handleRemoveChildBlock(deleteTarget.sectionId, deleteTarget.parentGroupId, deleteTarget.id);
                  toast({ title: 'Blok verwijderd', description: 'Het blok is verwijderd uit de groep' });
                } else if (deleteTarget?.type === 'block' && deleteTarget.sectionId) {
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
                      const displayVal = i - printMargins.left;
                      const isMajor = displayVal % 10 === 0;
                      const isMid = displayVal % 5 === 0 && !isMajor;
                      return (
                        <div key={`h-tick-${i}`} className="absolute bottom-0" style={{ left: `${xPos}px` }}>
                          <div 
                            className={displayVal === 0 ? 'bg-orange-500' : 'bg-gray-500'}
                            style={{ 
                              width: '1px', 
                              height: isMajor ? '10px' : isMid ? '6px' : '3px' 
                            }}
                          />
                          {isMajor && (
                            <span 
                              className={`absolute ${displayVal === 0 ? 'text-orange-600 font-bold' : 'text-gray-600'}`}
                              style={{ 
                                fontSize: '8px', 
                                left: displayVal === 0 ? '2px' : displayVal < 0 ? '-8px' : '-6px',
                                top: '-10px' 
                              }}
                            >
                              {displayVal}
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
                        {/* Spacer matching the document's top margin + A4 border so labels align with sections */}
                        <div style={{ height: `${mmToPx(printMargins.top) + 2}px`, flexShrink: 0 }} />
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
                          minHeight: '1123px',
                          border: '2px solid #666',
                          overflow: 'visible',
                        }}
                      >
                          {/* Grid overlay — only within the print area (inside all margins) */}
                          {showGrid && (
                            <div
                              className="pointer-events-none"
                              style={{
                                position: 'absolute',
                                top: `${mmToPx(printMargins.top)}px`,
                                left: `${mmToPx(printMargins.left)}px`,
                                right: `${mmToPx(printMargins.right)}px`,
                                bottom: `${mmToPx(printMargins.bottom)}px`,
                                backgroundImage: `
                                  linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                                  linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                                `,
                                backgroundSize: `${gridSize}px ${gridSize}px`,
                                zIndex: 0,
                              }}
                            />
                          )}
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
                          <div className="bg-white" style={{ boxSizing: 'border-box', paddingTop: `${mmToPx(printMargins.top)}px`, paddingLeft: `${mmToPx(printMargins.left)}px` }}>
                          {sections.map((section, index) => {
                            const sectionHeight = section.config.dimensions?.height || 200;
                            return (
                              <div 
                                key={section.id}
                                className={`transition-all ${
                                  selectedSection?.id === section.id 
                                    ? 'ring-4 ring-orange-500 ring-inset' 
                                    : ''
                                } ${index > 0 ? 'border-t-2 border-dashed border-gray-300' : ''} ${
                                  isDraggingBlock && hoverSectionId === section.id && dragSectionId !== section.id
                                    ? 'ring-4 ring-green-500 ring-inset'
                                    : ''
                                } ${
                                  sectionChangedFlash === section.id
                                    ? 'animate-pulse bg-green-100'
                                    : ''
                                }`}
                                style={{
                                  backgroundColor: sectionChangedFlash === section.id ? undefined : (section.config.style?.backgroundColor || '#ffffff'),
                                  height: `${sectionHeight}px`,
                                  minHeight: `${sectionHeight}px`,
                                  boxSizing: 'border-box',
                                }}
                                onClick={() => handleSectionClick(section)}
                                onMouseEnter={() => {
                                  if (isDraggingBlock) {
                                    setHoverSectionId(section.id);
                                  }
                                }}
                                onMouseLeave={() => {
                                  if (isDraggingBlock && hoverSectionId === section.id) {
                                    // Don't clear hover if we're still in the drag section
                                    if (section.id !== dragSectionId) {
                                      setHoverSectionId(null);
                                    }
                                  }
                                }}
                              >
                            <div
                              className="relative p-4 h-full section-container"
                              data-section-id={section.id}
                              style={{
                                boxSizing: 'border-box',
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

                            {/* lineTypeTemplates tab bar */}
                            {section.config?.lineTypeTemplates && (
                              <div className="absolute top-0 left-0 right-0 z-30 flex gap-0.5 p-1 bg-white/90 border-b border-orange-200 pointer-events-auto" onClick={e => e.stopPropagation()}>
                                {LINE_TYPE_TABS.map(lt => {
                                  const isActive = getActiveLineTypeTab(section.id) === lt.value;
                                  const count = (section.config.lineTypeTemplates?.[lt.value] || []).length;
                                  return (
                                    <button
                                      key={lt.value}
                                      className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${isActive ? 'bg-orange-500 text-white border-orange-600' : `${lt.color} hover:opacity-80 border`}`}
                                      onClick={(e) => { e.stopPropagation(); switchLineTypeTab(section.id, lt.value); handleSectionClick(section); }}
                                    >
                                      {lt.badge} <span className="opacity-75">({count})</span>
                                    </button>
                                  );
                                })}
                                <span className="ml-auto text-[10px] text-orange-600 font-medium self-center pr-1">Actief: {LINE_TYPE_TABS.find(t => t.value === getActiveLineTypeTab(section.id))?.label}</span>
                              </div>
                            )}

                            {(() => {
                              const displayBlocks = getSectionBlocks(section);
                              const topOffset = section.config?.lineTypeTemplates ? 24 : 0;
                              return displayBlocks.length === 0 ? (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: `${topOffset}px` }}>
                                <div className="text-center text-muted-foreground">
                                  <div className="text-2xl mb-2">📦</div>
                                  <div className="text-sm">Sleep blokken hierheen{section.config?.lineTypeTemplates ? ` (${LINE_TYPE_TABS.find(t => t.value === getActiveLineTypeTab(section.id))?.label})` : ''}</div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {displayBlocks.map((block: any, blockIndex: number) => (
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
                            );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* Right Ruler - Vertical (dynamic height) */}
                  {(() => {
                    const totalSectionsPx = sections.reduce((sum: number, sec: any) => sum + (sec.config?.dimensions?.height || 200), 0);
                    const rulerHeightPx = Math.max(1123, totalSectionsPx + 80);
                    const rulerMm = Math.ceil(rulerHeightPx / MM_TO_PX) + 5;
                    return (
                  <div 
                    className="bg-gray-100 border-l border-gray-300 relative flex-shrink-0 pointer-events-none"
                    style={{ width: '20px', minHeight: `${rulerHeightPx}px` }}
                  >
                    {Array.from({ length: rulerMm }).map((_, i) => {
                      const yPos = i * MM_TO_PX;
                      const displayVal = i - printMargins.top;
                      const isMajor = displayVal % 10 === 0;
                      const isMid = displayVal % 5 === 0 && !isMajor;
                      return (
                        <div key={`v-tick-${i}`} className="absolute left-0" style={{ top: `${yPos}px` }}>
                          <div 
                            className={displayVal === 0 ? 'bg-orange-500' : 'bg-gray-500'}
                            style={{ 
                              height: '1px', 
                              width: isMajor ? '10px' : isMid ? '6px' : '3px' 
                            }}
                          />
                          {isMajor && (
                            <span 
                              className={`absolute ${displayVal === 0 ? 'text-orange-600 font-bold' : 'text-gray-600'}`}
                              style={{ 
                                fontSize: '8px', 
                                left: '12px', 
                                top: displayVal === 0 ? '2px' : '-4px'
                              }}
                            >
                              {displayVal}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
              
              {/* Page Info */}
              <div className="text-center mt-4 text-xs text-gray-500">
                A4 Format: 210mm × 297mm per pagina
              </div>
            </div>
          </div>
        </Card>

        {/* Right Sidebar - Properties */}
        <Card className="overflow-auto">
          <CardHeader>
            <CardTitle className="text-base text-orange-600">Properties</CardTitle>
          </CardHeader>
          <CardContent className="pb-20">
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
                onLoadTemplate={(sectionId, templateConfig) => {
                  setSections(prev => prev.map(s => {
                    if (s.id !== sectionId) return s;
                    const newBlocks = (templateConfig.blocks || []).map((b: any) => ({
                      ...b,
                      id: crypto.randomUUID()
                    }));
                    return {
                      ...s,
                      name: templateConfig.sectionName || s.name,
                      config: {
                        ...s.config,
                        ...(templateConfig.sectionConfig || {}),
                        blocks: newBlocks.length > 0 ? newBlocks : s.config.blocks
                      }
                    };
                  }));
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
                  printMargins={printMargins}
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
                printMargins={printMargins}
              />
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide pb-1 border-b">Layout</div>
                <div>
                  <Label htmlFor="layout-info-number" className="text-xs">ID (lay-outnummer)</Label>
                  <Input
                    id="layout-info-number"
                    value={localLayoutNumber}
                    onChange={(e) => setLocalLayoutNumber(e.target.value)}
                    onBlur={handleLayoutInfoBlur}
                    className="h-8 text-xs mt-1"
                    placeholder="bijv. LY-0012"
                  />
                </div>
                <div>
                  <Label htmlFor="layout-info-name" className="text-xs">Naam</Label>
                  <Input
                    id="layout-info-name"
                    value={localLayoutName}
                    onChange={(e) => setLocalLayoutName(e.target.value)}
                    onBlur={handleLayoutInfoBlur}
                    className="h-8 text-xs mt-1"
                    placeholder="bijv. Commercial invoice"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Wijzigingen worden opgeslagen zodra u het veld verlaat.</p>
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
    case "Line Items Table":
      return {
        showHeader: true,
        headerLabels: {
          position: "Pos",
          description: "Omschrijving",
          quantity: "Aantal",
          unit: "Eenh.",
          unitPrice: "Prijs",
          total: "Totaal",
        },
        zebraStriping: false,
        showBorders: true,
        showUnit: false,
      };
    case "Item Repeater":
      return {
        dataSource: "quotationItems",
        itemSpacing: 5,
        childBlocks: [],
      };
    default:
      return {};
  }
}

// Preview Component
export function PreviewView({ layout }: { layout: any }) {
  const isInvoiceLayout = layout?.documentType === 'invoice';

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handlePrint = () => {
    if (!selectedDocumentId || !layout?.id) {
      toast({
        title: 'Geen document geselecteerd',
        description: 'Selecteer eerst een document om af te drukken',
        variant: 'destructive',
      });
      return;
    }
    const documentType = isInvoiceLayout ? 'invoice' : 'quotation';
    const printWindow = window.open(`/print/${documentType}/${selectedDocumentId}?layoutId=${layout.id}`, '_blank');
    if (!printWindow) {
      toast({
        title: 'Print geblokkeerd',
        description: 'Sta pop-ups toe om te kunnen printen',
        variant: 'destructive',
      });
    }
  };

  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ['/api/quotations'],
    enabled: !isInvoiceLayout,
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ['/api/invoices'],
    enabled: isInvoiceLayout,
  });

  const documents = isInvoiceLayout ? invoices : quotations;

  const { data: quotationPrintData, isLoading: isQuotationLoading } = useQuery({
    queryKey: ['/api/quotations', selectedDocumentId, 'print-data'],
    queryFn: async () => {
      if (!selectedDocumentId) return null;
      const response = await fetch(`/api/quotations/${selectedDocumentId}/print-data`);
      if (!response.ok) throw new Error('Failed to fetch quotation print data');
      return response.json();
    },
    enabled: !!selectedDocumentId && !isInvoiceLayout,
  });

  const { data: invoicePrintData, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ['/api/invoices', selectedDocumentId, 'print-data'],
    queryFn: async () => {
      if (!selectedDocumentId) return null;
      const response = await fetch(`/api/invoices/${selectedDocumentId}/print-data`);
      if (!response.ok) throw new Error('Failed to fetch invoice print data');
      return response.json();
    },
    enabled: !!selectedDocumentId && isInvoiceLayout,
  });

  const printData = isInvoiceLayout ? invoicePrintData : quotationPrintData;
  const isPrintDataLoading = isInvoiceLayout ? isInvoiceLoading : isQuotationLoading;

  const { data: sections = [] } = useQuery<any[]>({
    queryKey: [`/api/layout-sections?layoutId=${layout?.id}`],
    enabled: !!layout?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Select a layout to preview</div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left sidebar: document list */}
      <div className="w-64 flex-shrink-0 flex flex-col">
        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          {isInvoiceLayout ? 'Facturen' : 'Offertes'}
        </div>
        {documents.length === 0 ? (
          <div className="text-sm text-muted-foreground p-3 border rounded bg-muted/30">
            {isInvoiceLayout
              ? 'Geen facturen gevonden. Maak eerst een factuur aan.'
              : 'Geen offertes gevonden. Maak eerst een offerte aan.'}
          </div>
        ) : (
          <div className="overflow-y-auto space-y-1 flex-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedDocumentId === doc.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-border hover:border-orange-300 hover:bg-orange-50/50'
                }`}
                onClick={() => setSelectedDocumentId(doc.id)}
                data-testid={`document-item-${doc.id}`}
              >
                <div className="font-medium text-sm">
                  {isInvoiceLayout ? doc.invoiceNumber : doc.quotationNumber}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {doc.customerName || 'Geen klant'}
                </div>
                <Badge
                  variant={doc.status === 'sent' || doc.status === 'paid' ? 'default' : 'secondary'}
                  className="mt-1 text-xs"
                >
                  {doc.status || 'draft'}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {selectedDocumentId && (
          <div className="mt-3 flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              Afdrukken
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedDocumentId(null)}
              className="w-full"
            >
              Wis Selectie
            </Button>
          </div>
        )}
      </div>

      {/* Right: preview area - gray background so A4 page stands out */}
      <div className="flex-1 flex flex-col items-center overflow-auto bg-gray-300 p-8">
        {!selectedDocumentId ? (
          <div className="bg-white mx-auto shadow-2xl" style={{ width: '794px', height: '1123px' }}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">📄</div>
                <div className="text-lg font-medium">
                  {isInvoiceLayout ? 'Kies een factuur links' : 'Kies een offerte links'}
                </div>
              </div>
            </div>
          </div>
        ) : isPrintDataLoading ? (
          <div className="bg-white mx-auto shadow-2xl" style={{ width: '794px', height: '1123px' }}>
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">⏳</div>
                <div className="text-lg font-medium">Laden...</div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={printRef} className="mx-auto" style={{ width: '794px' }}>
            <LayoutPreview
              layout={layout}
              sections={sections}
              printData={printData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
// Helper function to calculate dynamic block positions
// When a block is hidden (hideWhenEmpty), blocks below it shift up automatically
// ── Canvas-based text height measurement ─────────────────────────────────────
// Measures how many lines a text string occupies at a given block width and
// returns the total rendered height in pixels (including line-height factor).
const _measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const _measureCtx = _measureCanvas?.getContext('2d') ?? null;

function measureTextHeightPx(
  text: string,
  fontSizePt: number,
  blockWidthPx: number,
  fontFamily: string = 'Arial',
  lineHeightFactor: number = 1.2
): number {
  if (!text || !_measureCtx || blockWidthPx <= 0) return 0;
  const fontSizePx = fontSizePt * 1.333; // 1 pt ≈ 1.333 px at 96 dpi
  _measureCtx.font = `${fontSizePt}pt ${fontFamily}`;

  let lines = 0;
  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') { lines++; continue; }
    const words = paragraph.split(' ');
    let lineW = 0;
    let firstWord = true;
    for (const word of words) {
      const wordW = _measureCtx.measureText((firstWord ? '' : ' ') + word).width;
      if (!firstWord && lineW + wordW > blockWidthPx) {
        lines++;
        lineW = _measureCtx.measureText(word).width;
      } else {
        lineW += wordW;
      }
      firstWord = false;
    }
    lines++;
  }
  return Math.max(lines, 1) * fontSizePx * lineHeightFactor;
}

function resolveBlockText(
  block: any,
  printData: PrintData,
  itemContext?: { item: any; index: number }
): string {
  if (block.type === 'Text') {
    const raw = block.config?.text || block.text || '';
    return replacePlaceholders(raw, printData, itemContext);
  }
  if (block.type === 'DataField') {
    const fieldKey = block.config?.dataField || block.dataField || '';
    return resolveAndFormat(fieldKey, printData, 'text') || '';
  }
  return '';
}

// Returns the actual rendered height (mm) of a block, accounting for text wrap.
// For Text / DataField blocks: uses canvas measurement so the estimate matches
// real browser rendering. For all other block types: returns the configured height.
//
// allowShrink: when true AND the block itself has heightCanShrink, returns the
// canvas-measured height instead of max(configured, measured).  Used by sections
// that have heightCanShrink enabled so they can compact to the real text height.
function estimateActualBlockHeightMm(
  block: any,
  printData: PrintData,
  itemContext?: { item: any; index: number },
  allowShrink: boolean = false
): number {
  const configuredHeightMm: number = block.size?.height || 25;

  // Group blocks: when shrinking is allowed, measure actual content height from children.
  if (block.type === 'Group' && allowShrink) {
    const childBlocks: any[] = block.config?.childBlocks || [];
    const collapseEmpty = block.config?.collapseEmpty || false;
    let visibleChildren = childBlocks;
    if (collapseEmpty) {
      visibleChildren = childBlocks.filter((ch: any) => blockHasContent(ch, printData, itemContext));
      if (visibleChildren.length === 0) return 0;
    }
    const sorted = [...visibleChildren].sort(
      (a: any, b: any) => (a.position?.y || 0) - (b.position?.y || 0)
    );
    let calcHeight = 0;
    let cumOff = 0;
    for (const child of sorted) {
      const childMarginMm = parseFloat(child.style?.marginBottom || '0') || 0;
      const childH = estimateActualBlockHeightMm(child, printData, itemContext, true);
      if (childH <= 0) continue;
      const adjustedY = (child.position?.y || 0) + cumOff;
      calcHeight = Math.max(calcHeight, adjustedY + childH + childMarginMm);
      cumOff += childMarginMm;
    }
    return calcHeight;
  }

  if (block.type !== 'Text' && block.type !== 'DataField') return configuredHeightMm;

  const text = resolveBlockText(block, printData, itemContext);
  if (!text) {
    // No content: when shrinking is allowed the block takes no space;
    // otherwise keep the configured height (block is visible but empty).
    return allowShrink ? 0 : configuredHeightMm;
  }

  const fontSizePt = parseFloat(String(block.style?.fontSize || '10')) || 10;
  const blockWidthPx = mmToPx(block.size?.width || 50);
  const fontFamily: string = block.style?.fontFamily || 'Arial';
  const lineHeightFactor = parseFloat(String(block.style?.lineHeight || '1.2')) || 1.2;
  const paddingTopMm = parseFloat(String(block.style?.paddingTop || '0')) || 0;
  const paddingBottomMm = parseFloat(String(block.style?.paddingBottom || '0')) || 0;

  const measuredPx = measureTextHeightPx(text, fontSizePt, blockWidthPx, fontFamily, lineHeightFactor);
  const measuredMm = measuredPx / MM_TO_PX;
  const totalMm = measuredMm + paddingTopMm + paddingBottomMm;

  // When the block can shrink (and the caller allows it), use the actual measured height —
  // not the configured height — so the section can compact to real content size.
  if (allowShrink && (block.config?.heightCanShrink || false)) {
    return Math.min(configuredHeightMm, totalMm);
  }

  return Math.max(configuredHeightMm, totalMm);
}

// Returns the actual section height in pixels for a given item context.
// Used in pagination heightPx to prevent text that wraps being cut at page boundaries.
// IMPORTANT: must mirror the Y-normalization logic in renderSectionInstance exactly,
// otherwise the pagination estimate and the rendered height diverge → white gaps.
function estimateActualSectionHeightPx(
  section: any,
  printData: PrintData,
  itemContext?: { item: any; index: number }
): number {
  const blocks: any[] = section.config?.blocks || [];
  // height is stored in PIXELS (not mm) in config.dimensions.height
  const configuredPx = section.config?.dimensions?.height || 200;
  const bottomMarginPx = mmToPx(section.config?.bottomMarginMm || 0);
  const heightCanShrink = section.config?.heightCanShrink || false;

  if (blocks.length === 0) return configuredPx;

  // Mirror renderSectionInstance: detect conditional groups and find the matching one.
  const hasConditionalGroups = itemContext && blocks.some(
    (b: any) => b.type === 'Group' && (b.config?.conditionField || b.config?.lineTypeCondition)
  );

  let matchingGroupId: string | null = null;
  if (hasConditionalGroups) {
    for (const b of blocks) {
      if (b.type !== 'Group') continue;
      const cf = b.config?.conditionField;
      const cv = b.config?.conditionValue;
      const ltc = b.config?.lineTypeCondition;
      if (cf && cv) {
        if (String(itemContext!.item?.[cf] ?? '') === String(cv)) { matchingGroupId = b.id; break; }
      } else if (ltc) {
        if (itemContext!.item?.lineType === ltc) { matchingGroupId = b.id; break; }
      }
    }
  }

  // Fallback Y-offset: when no group matches, non-group blocks are shifted to Y=0.
  let fallbackYOffset = 0;
  if (hasConditionalGroups && matchingGroupId === null) {
    const fallbackBlocks = blocks.filter((b: any) => b.type !== 'Group');
    if (fallbackBlocks.length > 0) {
      fallbackYOffset = Math.min(...fallbackBlocks.map((b: any) => b.position?.y || 0));
    }
  }

  let maxBottomPx = 0;
  for (const block of blocks) {
    // Skip non-matching conditional groups (they don't render for this item).
    if (hasConditionalGroups && block.type === 'Group') {
      const isConditional = block.config?.conditionField || block.config?.lineTypeCondition;
      if (isConditional && block.id !== matchingGroupId) continue;
    }
    // When a group matches: skip non-group blocks (they belong to other conditional paths).
    if (hasConditionalGroups && block.type !== 'Group' && matchingGroupId !== null) continue;

    // Mirror renderSectionInstance Y normalization:
    // matching group → y=0; fallback non-group blocks → shift by fallbackYOffset.
    let blockY: number;
    if (hasConditionalGroups && block.id === matchingGroupId) {
      blockY = 0;
    } else if (hasConditionalGroups && matchingGroupId === null) {
      blockY = (block.position?.y || 0) - fallbackYOffset;
    } else {
      blockY = block.position?.y || 0;
    }

    const blockH = estimateActualBlockHeightMm(block, printData, itemContext, heightCanShrink);
    // Skip zero-height blocks (empty shrinkable blocks) — their Y must not count.
    if (blockH <= 0) continue;
    const blockBottomPx = mmToPx(blockY + blockH);
    maxBottomPx = Math.max(maxBottomPx, blockBottomPx);
  }

  // Mirror auto-shrink for conditional groups (renderSectionInstance lines 3552-3557).
  const autoShrink = hasConditionalGroups && maxBottomPx > 0 && maxBottomPx < configuredPx;

  // Always grow when content is taller than configured.
  if (maxBottomPx > configuredPx) return maxBottomPx;

  // When shrinking (explicit or auto): preserve the bottom margin — content + margin, capped at configuredHeight.
  if ((heightCanShrink || autoShrink) && maxBottomPx > 0 && maxBottomPx < configuredPx) {
    return Math.min(configuredPx, maxBottomPx + bottomMarginPx);
  }

  return configuredPx;
}

function calculateDynamicPositions(
  blocks: any[], 
  printData: PrintData,
  itemContext?: { item: any; index: number }
): Map<string, { y: number; visible: boolean }> {
  const positions = new Map<string, { y: number; visible: boolean }>();
  
  // First pass: determine which blocks are visible
  const blockVisibility = new Map<string, boolean>();
  for (const block of blocks) {
    const hasContent = blockHasContent(block, printData, itemContext);
    blockVisibility.set(block.id, hasContent);
  }
  
  // Second pass: measure actual heights (canvas-based for Text/DataField blocks)
  // This detects blocks whose text content wraps beyond the configured height.
  const actualHeights = new Map<string, number>();
  for (const block of blocks) {
    const actualH = estimateActualBlockHeightMm(block, printData, itemContext, false);
    actualHeights.set(block.id, actualH);
  }

  // Sort ALL blocks by Y position
  const sortedBlocks = [...blocks].sort((a, b) => 
    (a.position?.y || 0) - (b.position?.y || 0)
  );
  
  // For each visible block calculate two offsets from blocks that START above it:
  //   shiftUp:   sum of heights of HIDDEN blocks above → block moves up
  //   shiftDown: sum of overflow of VISIBLE blocks above → block moves down when content wraps
  for (const block of sortedBlocks) {
    const isVisible = blockVisibility.get(block.id) ?? true;
    const originalY = block.position?.y || 0;
    
    if (!isVisible) {
      positions.set(block.id, { y: originalY, visible: false });
    } else {
      let shiftUp = 0;
      let shiftDown = 0;
      for (const otherBlock of sortedBlocks) {
        if (otherBlock.id === block.id) continue;
        const otherY = otherBlock.position?.y || 0;
        if (otherY < originalY) {
          const otherVisible = blockVisibility.get(otherBlock.id) ?? true;
          if (!otherVisible) {
            // Hidden block: shift this block up by its full configured height
            shiftUp += otherBlock.size?.height || 0;
          } else {
            // Visible block that grew: shift this block down by the overflow
            const configuredH = otherBlock.size?.height || 0;
            const actualH = actualHeights.get(otherBlock.id) ?? configuredH;
            const overflow = actualH - configuredH;
            if (overflow > 0) shiftDown += overflow;
          }
        }
      }
      
      positions.set(block.id, { y: originalY - shiftUp + shiftDown, visible: true });
    }
  }
  
  return positions;
}

// Helper function to detect if a section contains item-level placeholders
// Supports both {{item.*}}, {{quotationItems.*}}, and {{invoiceItems.*}} formats
function sectionContainsItemPlaceholders(section: any): boolean {
  const blocks = section.config?.blocks || [];
  
  // Helper to check any string for item placeholders (all formats)
  const hasItemPattern = (str: any): boolean => {
    if (typeof str !== 'string') return false;
    // Match {{item.*}} or {{quotationItems.*}} or {{quotationItem.*}} or {{invoiceItems.*}} or {{invoiceItem.*}}
    return /\{\{(item|quotationItems?|invoiceItems?)\.[^}]+\}\}/.test(str);
  };
  
  // Helper to check if a data field starts with item. or quotationItems. or invoiceItems.
  const isItemField = (str: any): boolean => {
    if (typeof str !== 'string') return false;
    return str.startsWith('item.') || str.startsWith('quotationItems.') || str.startsWith('quotationItem.')
      || str.startsWith('invoiceItems.') || str.startsWith('invoiceItem.');
  };
  
  for (const block of blocks) {
    // Check various content locations
    if (hasItemPattern(block.config?.content)) return true;
    if (hasItemPattern(block.content)) return true;
    if (hasItemPattern(block.config?.text)) return true;
    if (hasItemPattern(block.text)) return true;
    
    // Check data field bindings
    if (isItemField(block.config?.dataField)) return true;
    if (isItemField(block.dataField)) return true;
    
    // Check child blocks in groups
    const childBlocks = block.config?.childBlocks || [];
    for (const child of childBlocks) {
      if (hasItemPattern(child.config?.content)) return true;
      if (hasItemPattern(child.content)) return true;
      if (hasItemPattern(child.config?.text)) return true;
      if (hasItemPattern(child.text)) return true;
      if (isItemField(child.config?.dataField)) return true;
      if (isItemField(child.dataField)) return true;
    }
  }
  
  return false;
}

// Layout Preview Renderer Component
export function LayoutPreview({ layout, sections, printData, showMarginOverlays = true }: { layout: any; sections: any[]; printData: any; showMarginOverlays?: boolean }) {
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
    invoice: printData.invoice || {},
    customer: printData.customer || null,
    project: printData.project || null,
    company: printData.company || null,
    items: printData.items || [],
  };

  // Helper function to render a single section instance
  const renderSectionInstance = (
    section: any, 
    keyPrefix: string, 
    itemContext?: { item: any; index: number },
    pageCtx?: { currentPage: number; totalPages: number }
  ) => {
    const configuredHeight = section.config?.dimensions?.height || 200;
    const blocks = section.config?.blocks || [];
    
    // Calculate dynamic positions for blocks in this section (pass itemContext for repeating sections)
    const dynamicPositions = calculateDynamicPositions(blocks, typedPrintData, itemContext);

    // When repeating with itemContext, find if section uses conditional groups (conditionField/conditionValue)
    // If so, normalize the matching group to y=0 so it renders at the top of each section instance
    // (Groups are placed at different y-positions in the designer canvas for visibility, but in print
    //  only ONE group shows per item and it should always appear at the top)
    const hasConditionalGroups = itemContext && blocks.some(
      (b: any) => b.type === 'Group' && (b.config?.conditionField || b.config?.lineTypeCondition)
    );
    const matchingGroupId = hasConditionalGroups ? (() => {
      for (const b of blocks) {
        if (b.type !== 'Group') continue;
        const cf = b.config?.conditionField;
        const cv = b.config?.conditionValue;
        const ltc = b.config?.lineTypeCondition;
        if (cf && cv) {
          if (String(itemContext!.item?.[cf] ?? '') === String(cv)) return b.id;
        } else if (ltc) {
          if (itemContext!.item?.lineType === ltc) return b.id;
        }
      }
      return null;
    })() : null;

    // When no group matches (fallback: top-level non-group blocks), calculate their min-Y
    // so we can normalize them to y=0 (just like we do for matching groups)
    // Note: dynamicPositions is computed above and reused here for efficiency
    const fallbackYOffset = (hasConditionalGroups && matchingGroupId === null && itemContext)
      ? (() => {
          const fallbackBlocks = blocks.filter((b: any) => b.type !== 'Group');
          if (fallbackBlocks.length === 0) return 0;
          const minY = Math.min(...fallbackBlocks.map((b: any) => {
            const dp = dynamicPositions.get(b.id);
            return dp?.y ?? (b.position?.y || 0);
          }));
          return minY;
        })()
      : 0;
    
    // Whether this section is allowed to compact to actual content height.
    // Defined before the block-height helpers so closures can reference it.
    const sectionCanShrink = section.config?.heightCanShrink || false;

    // Helper: compute the effective rendered height (mm) of a block.
    // For Text/DataField: uses canvas measurement to account for text wrapping.
    // For Group blocks: accounts for cumulative child marginBottom and collapseEmpty.
    const getEffectiveBlockHeightMm = (block: any): number => {
      // When the section can shrink, also allow individual Text/DataField blocks to shrink
      // to their canvas-measured height (instead of the larger configured height).
      const baseHeight = estimateActualBlockHeightMm(block, typedPrintData, itemContext, sectionCanShrink);
      if (block.type !== 'Group') return baseHeight;

      const childBlocks: any[] = block.config?.childBlocks || [];
      const collapseEmpty = block.config?.collapseEmpty || false;

      let visibleChildren = childBlocks;
      if (collapseEmpty) {
        // forceCheck=true: collapse empty children regardless of their individual hideWhenEmpty setting
        visibleChildren = childBlocks.filter((child: any) =>
          blockHasContent(child, typedPrintData, itemContext, true)
        );
        if (visibleChildren.length === 0) return 0;
      }

      const sorted = [...visibleChildren].sort(
        (a: any, b: any) => (a.position?.y || 0) - (b.position?.y || 0)
      );

      let calcHeight = 0;
      let cumOff = 0;
      for (const child of sorted) {
        const childMargin = parseFloat(child.style?.marginBottom || '0') || 0;
        const adjustedChildY = (child.position?.y || 0) + cumOff;
        // When section can shrink: use canvas-measured child height instead of configured height.
        const childH = sectionCanShrink
          ? estimateActualBlockHeightMm(child, typedPrintData, itemContext, true)
          : (child.size?.height || 25);
        // Skip empty children (height=0) when shrinking — they contribute no space.
        if (sectionCanShrink && childH <= 0) continue;
        const childBottom = adjustedChildY + childH + childMargin;
        calcHeight = Math.max(calcHeight, childBottom);
        cumOff += childMargin;
      }

      const cumulativeMargin = sorted.reduce(
        (sum: number, child: any) => sum + (parseFloat(child.style?.marginBottom || '0') || 0), 0
      );
      // When section can shrink: always use the measured calcHeight (not configured baseHeight).
      if (sectionCanShrink && calcHeight > 0) return calcHeight;
      return (collapseEmpty || cumulativeMargin > 0) ? calcHeight : baseHeight;
    };

    // Calculate actual content height (bottom of lowest visible block)
    let contentHeight = 0;
    for (const block of blocks) {
      const dynamicPos = dynamicPositions.get(block.id);
      if (dynamicPos?.visible !== false) {
        // Skip groups filtered out by conditionField/conditionValue (or legacy lineTypeCondition)
        if (block.type === 'Group' && itemContext) {
          const cf = block.config?.conditionField;
          const cv = block.config?.conditionValue;
          const ltc = block.config?.lineTypeCondition;
          if (cf && cv) {
            if (String(itemContext.item?.[cf] ?? '') !== String(cv)) continue;
          } else if (ltc) {
            if (itemContext.item?.lineType !== ltc) continue;
          }
        }
        // When item matches a group: skip top-level non-group blocks from height calculation
        if (hasConditionalGroups && block.type !== 'Group' && matchingGroupId !== null && itemContext) {
          continue;
        }
        // Normalize matching conditional group to y=0 for content height calculation
        const rawY = dynamicPos?.y ?? (block.position?.y || 0);
        let adjustedY: number;
        if (hasConditionalGroups && block.id === matchingGroupId) {
          adjustedY = 0; // matching group → top of section
        } else if (hasConditionalGroups && block.type !== 'Group' && matchingGroupId === null && itemContext) {
          adjustedY = rawY - fallbackYOffset; // fallback blocks → shift to y=0
        } else {
          adjustedY = rawY;
        }
        const blockHeight = getEffectiveBlockHeightMm(block);
        // Skip blocks with zero effective height (empty shrinkable blocks) —
        // their Y position must not count toward the section's content height.
        if (blockHeight <= 0) continue;
        const blockBottom = mmToPx(adjustedY + blockHeight);
        contentHeight = Math.max(contentHeight, blockBottom);
      }
    }
    
    // Get bottom margin from config (in mm, convert to px)
    const bottomMarginMm = section.config?.bottomMarginMm || 0;
    const bottomMarginPx = mmToPx(bottomMarginMm);
    
    // Get spacing for repeating sections
    const repeatSpacingMm = section.config?.repeat?.spacingMm || 0;
    const repeatSpacingPx = mmToPx(repeatSpacingMm);
    
    // Determine final section height.
    // Sections always grow to fit actual content (prevents mid-line text cuts at page boundaries).
    // Canvas-based measurement (getEffectiveBlockHeightMm → estimateActualBlockHeightMm) provides
    // accurate estimates even when text wraps to more lines than the designer's configured block height.
    let sectionHeight = configuredHeight;
    const heightCanGrow = section.config?.heightCanGrow || false;
    
    // Always grow when content is taller than configured — never clip printed content mid-line.
    if (contentHeight > configuredHeight) {
      sectionHeight = contentHeight;
    }
    // Only shrink when explicitly enabled.
    // IMPORTANT: always add bottomMarginPx so the configured blank space below the section
    // is preserved even after shrinking (e.g. ondermarge = 20mm stays 20mm of empty space).
    if (sectionCanShrink && contentHeight > 0 && contentHeight < configuredHeight) {
      sectionHeight = Math.min(configuredHeight, contentHeight + bottomMarginPx);
    }

    // Auto-shrink: when repeating with conditional groups, shrink to the visible group's content height
    // (groups are placed at different y-positions for design clarity but print should be compact)
    // Also preserve bottom margin here.
    if (hasConditionalGroups && contentHeight > 0 && contentHeight < configuredHeight) {
      sectionHeight = Math.min(configuredHeight, contentHeight + bottomMarginPx);
    }
    
    return (
      <div
        key={keyPrefix}
        className="relative overflow-hidden"
        style={{
          backgroundColor: section.config?.style?.backgroundColor || '#ffffff',
          height: `${sectionHeight}px`,
          minHeight: sectionCanShrink ? 'auto' : `${sectionHeight}px`,
          maxHeight: 'none',
          borderColor: section.config?.style?.borderColor || 'transparent',
          borderStyle: section.config?.style?.borderStyle || 'none',
          borderWidth: section.config?.style?.borderWidth || 0,
          position: 'relative',
          boxSizing: 'border-box',
          marginBottom: itemContext ? `${repeatSpacingPx}px` : undefined,
        }}
      >
        {blocks.length > 0 ? (
          <>
            {blocks.map((block: any, blockIndex: number) => {
              const dynamicPos = dynamicPositions.get(block.id);
              
              if (dynamicPos && !dynamicPos.visible) {
                return null;
              }

              // Conditie: als groep een conditionField/conditionValue heeft, filter op item veld waarde
              if (block.type === 'Group' && itemContext) {
                const cf = block.config?.conditionField;
                const cv = block.config?.conditionValue;
                const ltc = block.config?.lineTypeCondition;
                if (cf && cv) {
                  if (String(itemContext.item?.[cf] ?? '') !== String(cv)) return null;
                } else if (ltc) {
                  if (itemContext.item?.lineType !== ltc) return null;
                }
              }
              
              // When conditional groups exist and item matches a group: suppress top-level non-group blocks
              // (they serve as "fallback" row for items that don't match any group)
              // When no group matches (matchingGroupId === null): show top-level blocks as fallback
              if (hasConditionalGroups && block.type !== 'Group' && matchingGroupId !== null && itemContext) {
                return null;
              }
              
              const BlockRenderer = BlockRenderers[block.type];
              const rawY = dynamicPos?.y ?? (block.position?.y || 0);
              // Normalize matching conditional group to y=0 so it renders at the top of the section instance
              // For fallback blocks (no matching group), shift up by their min-Y offset so they start at y=0
              let adjustedY: number;
              if (hasConditionalGroups && block.id === matchingGroupId) {
                adjustedY = 0;
              } else if (hasConditionalGroups && block.type !== 'Group' && matchingGroupId === null && itemContext) {
                adjustedY = rawY - fallbackYOffset;
              } else {
                adjustedY = rawY;
              }
              
              // Use canvas-measured actual height for Text/DataField blocks so wrapped text
              // is never clipped within the block. When the section can shrink, allow the block
              // to also shrink to its measured height (so no empty space appears below short text).
              const actualBlockHeightMm = estimateActualBlockHeightMm(block, typedPrintData, itemContext, sectionCanShrink);
              const blockStyle: React.CSSProperties = {
                position: 'absolute',
                left: `${mmToPx(block.position?.x || 0)}px`,
                top: `${mmToPx(adjustedY)}px`,
                width: `${mmToPx(block.size?.width || 50)}px`,
                height: `${mmToPx(actualBlockHeightMm + (parseFloat(block.style?.marginBottom || '0') || 0))}px`,
              };
              
              if (BlockRenderer) {
                return (
                  <div key={`${keyPrefix}-block-${block.id || blockIndex}`} style={blockStyle}>
                    <BlockRenderer block={block} printData={typedPrintData} itemContext={itemContext} currentPage={pageCtx?.currentPage || 1} totalPages={pageCtx?.totalPages || 1} />
                  </div>
                );
              } else {
                return (
                  <div key={`${keyPrefix}-block-${block.id || blockIndex}`} style={blockStyle}>
                    <UnknownBlockRenderer block={block} printData={typedPrintData} />
                  </div>
                );
              }
            })}
          </>
        ) : (
          <div className="text-sm text-gray-400 italic text-center py-8">
            Geen blokken in deze sectie
          </div>
        )}
      </div>
    );
  };

  const PAGE_HEIGHT_PX = 1123;
  const previewMargins = layout?.metadata?.printMargins || { top: 0, bottom: 0, left: 0, right: 0 };
  const topMarginPx = mmToPx(previewMargins.top || 0);
  const bottomMarginPx = mmToPx(previewMargins.bottom || 0);
  const leftMarginPx = mmToPx(previewMargins.left || 0);
  const rightMarginPx = mmToPx(previewMargins.right || 0);

  return (
    <>
      {(() => {
        // Pre-process: track which sections are absorbed into a lineType group
        const groupAbsorbed = new Set<string>();
        
        const isLineTypeFilteredRepeat = (s: any) => {
          const repeats = sectionContainsItemPlaceholders(s) || s.config?.repeat?.enabled === true;
          const filter = s.config?.lineTypeFilter;
          return repeats && filter && filter !== 'all';
        };

        type PageCtx = { currentPage: number; totalPages: number };
        // Collect all rendered items with heights — element is a render function called with page context
        const renderedItems: { renderFn: (ctx: PageCtx) => React.ReactNode; heightPx: number; isEveryPage: boolean; isFirstPage: boolean; isLastPage: boolean; isFixed: boolean; fixedY: number; fixedPrintRules: any }[] = [];

        sections.forEach((section: any, sectionIndex: number) => {
        if (groupAbsorbed.has(section.id)) return;

        const printRules = section.config?.printRules || { everyPage: true };
        const isEveryPage = printRules.everyPage === true;
        const isFirstPage = !isEveryPage && printRules.firstPage === true;
        const isLastPage = !isEveryPage && !isFirstPage && printRules.lastPage === true;
        const isFixed = section.config?.fixedPosition?.enabled === true;
        const fixedY = section.config?.fixedPosition?.y ?? 250;
        const baseSectionHeight = section.config?.dimensions?.height || 200;

        // Auto-detect if this section should repeat for line items
        const hasItemPlaceholders = sectionContainsItemPlaceholders(section);
        const manuallyEnabled = section.config?.repeat?.enabled === true;
        const shouldRepeat = hasItemPlaceholders || manuallyEnabled;
        const lineTypeFilter = section.config?.lineTypeFilter;

        // If the section contains conditional groups (conditionField/conditionValue per group),
        // those groups handle per-lineType routing themselves → skip section-level lineTypeFilter routing
        const sectionHasConditionalGroups = (section.config?.blocks || []).some(
          (b: any) => b.type === 'Group' && (b.config?.conditionField || b.config?.lineTypeCondition)
        );

        // --- ITEM-FIRST GROUP RENDERING ---
        // When consecutive repeating sections each have a lineTypeFilter (and no conditional groups),
        // render them together in item sort order (e.g. 010 std, 020 charges, 030 std)
        if (shouldRepeat && lineTypeFilter && lineTypeFilter !== 'all' && !sectionHasConditionalGroups) {
          // Collect this section + all following consecutive lineType-filtered repeating sections
          const group: any[] = [section];
          for (let j = sectionIndex + 1; j < sections.length; j++) {
            if (isLineTypeFilteredRepeat(sections[j])) {
              group.push(sections[j]);
              groupAbsorbed.add(sections[j].id);
            } else {
              break;
            }
          }

          const allItems = typedPrintData.items || [];
          if (allItems.length === 0) return;

          // For each item (already in print sort order), find matching section template
          // Repeating sections always paginate as regular content — never as everyPage (which would
          // put ALL instances at the top of every page, breaking canvas order).
          allItems.forEach((item: any, itemIndex: number) => {
            const matchingSection = group.find((gs: any) => gs.config?.lineTypeFilter === item.lineType);
            if (!matchingSection) return;
            const capturedSection = matchingSection;
            const capturedKey = `${matchingSection.id}-item-${itemIndex}`;
            const capturedItem = { item, index: itemIndex };
            const sectionRepeatSpacingPx = mmToPx(matchingSection.config?.repeat?.spacingMm || 0);
            renderedItems.push({
              renderFn: (ctx: PageCtx) => renderSectionInstance(capturedSection, capturedKey, capturedItem, ctx),
              heightPx: estimateActualSectionHeightPx(capturedSection, typedPrintData, capturedItem) + sectionRepeatSpacingPx,
              isEveryPage: false,
              isFirstPage: false,
              isLastPage: false,
              isFixed: false,
              fixedY: 0,
              fixedPrintRules: printRules,
            });
          });
          return;
        }

        if (shouldRepeat) {
          const allItems = typedPrintData.items || [];
          const items = allItems; // no filter — unfiltered repeating section shows all items
          
          if (items.length === 0) return;
          
          // Render one copy of this section for each item.
          // Repeating sections always paginate as regular content — never as everyPage.
          const repeatSpacingPxEst = mmToPx(section.config?.repeat?.spacingMm || 0);
          items.forEach((item: any, itemIndex: number) => {
            const capturedItemCtx = { item, index: itemIndex };
            const capturedKey2 = `${section.id}-item-${itemIndex}`;
            const capturedSec2 = section;
            renderedItems.push({
              renderFn: (ctx: PageCtx) => renderSectionInstance(capturedSec2, capturedKey2, capturedItemCtx, ctx),
              heightPx: estimateActualSectionHeightPx(capturedSec2, typedPrintData, capturedItemCtx) + repeatSpacingPxEst,
              isEveryPage: false,
              isFirstPage: false,
              isLastPage: false,
              isFixed: false,
              fixedY: 0,
              fixedPrintRules: printRules,
            });
          });
          return;
        }
        
        // Regular non-repeating section - use original logic
        const configuredHeight = section.config?.dimensions?.height || 200;
        const blocks = section.config?.blocks || [];
        
        // Calculate dynamic positions for blocks in this section
        const dynamicPositions = calculateDynamicPositions(blocks, typedPrintData);
        
        // Pre-compute shrink flag so the helper closure can reference it.
        const staticSectionCanShrink = section.config?.heightCanShrink || false;

        // Helper: effective rendered height (mm) for a block.
        // For Text/DataField: uses canvas measurement to account for text wrapping.
        // For Group blocks: accounts for cumulative child marginBottom and collapseEmpty.
        const getEffectiveBlockHeightMmStatic = (block: any): number => {
          // Use canvas measurement for Text/DataField blocks (no itemContext for non-repeating sections).
          // Pass staticSectionCanShrink so empty blocks return 0 in shrinking sections.
          const baseHeight = estimateActualBlockHeightMm(block, typedPrintData, undefined, staticSectionCanShrink);
          if (block.type !== 'Group') return baseHeight;
          const childBlocks: any[] = block.config?.childBlocks || [];
          const collapseEmpty = block.config?.collapseEmpty || false;
          let visibleChildren = childBlocks;
          if (collapseEmpty) {
            // forceCheck=true: collapse empty children regardless of their individual hideWhenEmpty setting
            visibleChildren = childBlocks.filter((child: any) =>
              blockHasContent(child, typedPrintData, undefined, true)
            );
            if (visibleChildren.length === 0) return 0;
          }
          const sorted = [...visibleChildren].sort(
            (a: any, b: any) => (a.position?.y || 0) - (b.position?.y || 0)
          );
          let calcHeight = 0;
          let cumOff = 0;
          for (const child of sorted) {
            const childMargin = parseFloat(child.style?.marginBottom || '0') || 0;
            // Pass staticSectionCanShrink so measured heights are used when the section can shrink.
            const childH = estimateActualBlockHeightMm(child, typedPrintData, undefined, staticSectionCanShrink);
            // Skip empty children when shrinking — they contribute no space.
            if (staticSectionCanShrink && childH <= 0) continue;
            const adjustedChildY = (child.position?.y || 0) + cumOff;
            const childBottom = adjustedChildY + childH + childMargin;
            calcHeight = Math.max(calcHeight, childBottom);
            cumOff += childMargin;
          }
          const cumulativeMargin = sorted.reduce(
            (sum: number, child: any) => sum + (parseFloat(child.style?.marginBottom || '0') || 0), 0
          );
          const configuredGroupH = block.size?.height || 25;
          // When section can shrink: use measured calcHeight instead of configured group height.
          if (staticSectionCanShrink && calcHeight > 0) return calcHeight;
          return (collapseEmpty || cumulativeMargin > 0) ? calcHeight : Math.max(configuredGroupH, calcHeight);
        };

        // Calculate actual content height (bottom of lowest visible block)
        let contentHeight = 0;
        for (const block of blocks) {
          const dynamicPos = dynamicPositions.get(block.id);
          if (dynamicPos?.visible !== false) {
            const adjustedY = dynamicPos?.y ?? (block.position?.y || 0);
            const blockHeight = getEffectiveBlockHeightMmStatic(block);
            // Skip zero-height blocks (empty shrinkable blocks) — Y must not count
            if (blockHeight <= 0) continue;
            const blockBottom = mmToPx(adjustedY + blockHeight);
            contentHeight = Math.max(contentHeight, blockBottom);
          }
        }
        
        // Get bottom margin from config (in mm, convert to px)
        const bottomMarginMm = section.config?.bottomMarginMm || 0;
        const bottomMarginPx = mmToPx(bottomMarginMm);
        
        // Determine final section height.
        // Sections always grow to fit actual content — never clip printed text mid-line.
        let sectionHeight = configuredHeight;
        const heightCanGrow = section.config?.heightCanGrow || false;
        
        // Always grow when actual content is taller than configured.
        if (contentHeight > configuredHeight) {
          sectionHeight = contentHeight;
        }
        // Only shrink when explicitly enabled.
        // Preserve bottom margin so configured blank space below the section is maintained.
        if (staticSectionCanShrink && contentHeight > 0 && contentHeight < configuredHeight) {
          sectionHeight = Math.min(configuredHeight, contentHeight + bottomMarginPx);
        }
        
        const capturedSectionHeight = sectionHeight;
        const capturedBlocks = blocks;
        const capturedDynamicPositions = dynamicPositions;
        renderedItems.push({
          heightPx: capturedSectionHeight,
          isEveryPage,
          isFirstPage,
          isLastPage,
          isFixed,
          fixedY,
          fixedPrintRules: printRules,
          renderFn: (ctx: PageCtx) => (
          <div
            key={section.id}
            className="relative overflow-hidden"
            style={{
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: section.config?.style?.backgroundColor || '#ffffff',
              height: `${capturedSectionHeight}px`,
              minHeight: staticSectionCanShrink ? 'auto' : `${capturedSectionHeight}px`,
              maxHeight: heightCanGrow ? 'none' : `${capturedSectionHeight}px`,
              borderColor: section.config?.style?.borderColor || 'transparent',
              borderStyle: section.config?.style?.borderStyle || 'none',
              borderWidth: section.config?.style?.borderWidth || 0,
              boxSizing: 'border-box',
            }}
          >
            {capturedBlocks.length > 0 ? (
              <>
                {capturedBlocks.flatMap((block: any, blockIndex: number) => {
                  const dynamicPos = capturedDynamicPositions.get(block.id);
                  
                  if (dynamicPos && !dynamicPos.visible) return [];
                  
                  const shouldRepeatBlock = block.config?.repeat?.enabled === true;
                  const repeatPath = block.config?.repeat?.path || 'items';
                  
                  if (shouldRepeatBlock) {
                    const collection = repeatPath === 'items' ? typedPrintData.items || [] : [];
                    if (collection.length === 0) return [];
                    const adjustedY = dynamicPos?.y ?? (block.position?.y || 0);
                    const blockHeight = block.size?.height || 25;
                    const spacing = block.config?.repeat?.spacing || 0;
                    return collection.map((item: any, itemIndex: number) => {
                      const itemCtx = { item, index: itemIndex };
                      const BlockRenderer = BlockRenderers[block.type];
                      const blockStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: `${mmToPx(block.position?.x || 0)}px`,
                        top: `${mmToPx(adjustedY + (itemIndex * (blockHeight + spacing)))}px`,
                        width: `${mmToPx(block.size?.width || 50)}px`,
                        height: `${mmToPx(blockHeight + (parseFloat(block.style?.marginBottom || '0') || 0))}px`,
                      };
                      return BlockRenderer ? (
                        <div key={`${block.id}-item-${itemIndex}`} style={blockStyle}>
                          <BlockRenderer block={block} printData={typedPrintData} itemContext={itemCtx} currentPage={ctx.currentPage} totalPages={ctx.totalPages} />
                        </div>
                      ) : (
                        <div key={`${block.id}-item-${itemIndex}`} style={blockStyle}>
                          <UnknownBlockRenderer block={block} printData={typedPrintData} />
                        </div>
                      );
                    });
                  }
                  
                  const BlockRenderer = BlockRenderers[block.type];
                  const adjustedY = dynamicPos?.y ?? (block.position?.y || 0);
                  const blockStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${mmToPx(block.position?.x || 0)}px`,
                    top: `${mmToPx(adjustedY)}px`,
                    width: `${mmToPx(block.size?.width || 50)}px`,
                    height: `${mmToPx((block.size?.height || 25) + (parseFloat(block.style?.marginBottom || '0') || 0))}px`,
                  };
                  return BlockRenderer ? [(
                    <div key={block.id || blockIndex} style={blockStyle}>
                      <BlockRenderer block={block} printData={typedPrintData} currentPage={ctx.currentPage} totalPages={ctx.totalPages} />
                    </div>
                  )] : [(
                    <div key={block.id || blockIndex} style={blockStyle}>
                      <UnknownBlockRenderer block={block} printData={typedPrintData} />
                    </div>
                  )];
                })}
              </>
            ) : (
              <div className="text-sm text-gray-400 italic text-center py-8">
                Geen blokken in deze sectie - sleep blokken hierheen in de Designer tab
              </div>
            )}
          </div>
          ),
        });
        }); // end sections.forEach

        // --- Paginate ---
        // fixedPosition sections are rendered as absolute overlays, not in the content flow
        const fixedItems = renderedItems.filter(i => i.isFixed);
        const flowItems = renderedItems.filter(i => !i.isFixed);

        // Separate everyPage, firstPage, lastPage and regular content sections
        const everyPageItems = flowItems.filter(i => i.isEveryPage);
        const firstPageOnlyItems = flowItems.filter(i => i.isFirstPage);
        const lastPageOnlyItems = flowItems.filter(i => i.isLastPage);
        const contentItems = flowItems.filter(i => !i.isEveryPage && !i.isFirstPage && !i.isLastPage);

        const everyPageTotalHeight = everyPageItems.reduce((sum, i) => sum + i.heightPx, 0);
        const firstPageOnlyHeight = firstPageOnlyItems.reduce((sum, i) => sum + i.heightPx, 0);
        // Fixed sections reserve space at their Y position — content must not enter those zones.
        // fixedY is in mm from the page top (page coordinates, same as block positions in the canvas).
        // Helper: find content ceiling for a given set of fixed sections (lowest fixedY wins).
        const everyPageFixed = fixedItems.filter(fi => fi.fixedPrintRules?.everyPage);
        const firstPageFixed = fixedItems.filter(fi => fi.fixedPrintRules?.firstPage);
        const lastPageFixed  = fixedItems.filter(fi => fi.fixedPrintRules?.lastPage);

        // Usable vertical height within the content div (between top and bottom margins).
        // The content div starts at topMarginPx from the page top, so block Y=0 = top of print area.
        const usablePageHeight = PAGE_HEIGHT_PX - topMarginPx - bottomMarginPx;

        const getContentCeiling = (extraFixed: typeof fixedItems): number => {
          const allFixed = [...everyPageFixed, ...extraFixed];
          if (allFixed.length === 0) return usablePageHeight;
          // fixedY is in page coordinates (mm from page top).
          // Content div starts at topMarginPx, so convert to content-div coordinates:
          return Math.min(...allFixed.map(fi => mmToPx(fi.fixedY) - topMarginPx));
        };

        // Available flow height per page (ceiling minus already-occupied everyPage sections)
        const ceilingAll       = getContentCeiling([]);
        const ceilingFirstPage = getContentCeiling(firstPageFixed);
        const ceilingLastPage  = getContentCeiling(lastPageFixed);

        const availablePerPage   = ceilingAll       - everyPageTotalHeight;
        const availableFirstPage = ceilingFirstPage - everyPageTotalHeight - firstPageOnlyHeight;
        const availableLastPage  = ceilingLastPage  - everyPageTotalHeight;

        // --- Two-pass pagination ---
        // Pass 1: paginate using everyPage/firstPage ceilings (don't know last page yet)
        const paginateItems = (items: typeof contentItems, getAvail: (idx: number) => number) => {
          const pages: typeof contentItems[] = [];
          let cur: typeof contentItems = [];
          let curH = 0;
          for (const item of items) {
            const avail = getAvail(pages.length);
            if (curH + item.heightPx > avail && cur.length > 0) {
              pages.push(cur);
              cur = [item];
              curH = item.heightPx;
            } else {
              cur.push(item);
              curH += item.heightPx;
            }
          }
          if (cur.length > 0) pages.push(cur);
          if (pages.length === 0) pages.push([]);
          return pages;
        };

        let pages = paginateItems(contentItems, (idx) => idx === 0 ? availableFirstPage : availablePerPage);

        // Pass 2: check if last page exceeds the last-page ceiling (due to lastPage-only fixed sections)
        if (lastPageFixed.length > 0 && availableLastPage < availablePerPage) {
          const lastIdx = pages.length - 1;
          const lastPageContent = pages[lastIdx];
          const lastPageH = lastPageContent.reduce((s, i) => s + i.heightPx, 0);
          if (lastPageH > availableLastPage) {
            // Split the last page: move overflowing items to a new page
            const kept: typeof contentItems = [];
            const overflow: typeof contentItems = [];
            let h = 0;
            for (const item of lastPageContent) {
              if (h + item.heightPx <= availableLastPage) {
                kept.push(item);
                h += item.heightPx;
              } else {
                overflow.push(item);
              }
            }
            pages[lastIdx] = kept;
            if (overflow.length > 0) pages.push(overflow);
          }
        }

        // Empty state
        if (sections.length === 0) {
          return [
            <div key="empty" className="bg-white shadow-2xl" style={{ height: `${PAGE_HEIGHT_PX}px`, overflow: 'hidden' }}>
              <div className="text-center text-gray-400 italic py-8">
                Geen secties geconfigureerd - maak secties aan in de Designer tab
              </div>
            </div>
          ];
        }

        const totalPages = pages.length;
        const lastPageIndex = totalPages - 1;

        // Render each page with everyPage sections at the top
        return pages.map((pageContent, pageIndex) => {
          const pageCtx: PageCtx = { currentPage: pageIndex + 1, totalPages };
          // Fixed items visible on this page based on their printRules
          const pageFixedItems = fixedItems.filter(fi => {
            const pr = fi.fixedPrintRules || { everyPage: true };
            if (pr.everyPage) return true;
            if (pr.firstPage && pageIndex === 0) return true;
            if (pr.lastPage && pageIndex === lastPageIndex) return true;
            return false;
          });
          return (
          <Fragment key={`page-${pageIndex}`}>
            {pageIndex > 0 && <div style={{ height: '20px' }} />}
            <div data-pdf-page="true" className="bg-white shadow-2xl relative" style={{ position: 'relative', height: `${PAGE_HEIGHT_PX}px`, overflow: 'hidden', pageBreakAfter: 'always', breakAfter: 'page', backgroundColor: '#ffffff' }}>
              {/* Print margin overlays — only shown in designer, not in actual print */}
              {showMarginOverlays && topMarginPx > 0 && <div className="absolute top-0 left-0 right-0 pointer-events-none z-20" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${topMarginPx}px`, backgroundColor: 'rgba(0,0,0,0.05)', pointerEvents: 'none', zIndex: 20 }} />}
              {showMarginOverlays && bottomMarginPx > 0 && <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-20" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${bottomMarginPx}px`, backgroundColor: 'rgba(0,0,0,0.05)', pointerEvents: 'none', zIndex: 20 }} />}
              {showMarginOverlays && leftMarginPx > 0 && <div className="absolute top-0 bottom-0 left-0 pointer-events-none z-20" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${leftMarginPx}px`, backgroundColor: 'rgba(0,0,0,0.05)', pointerEvents: 'none', zIndex: 20 }} />}
              {showMarginOverlays && rightMarginPx > 0 && <div className="absolute top-0 bottom-0 right-0 pointer-events-none z-20" style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${rightMarginPx}px`, backgroundColor: 'rgba(0,0,0,0.05)', pointerEvents: 'none', zIndex: 20 }} />}
              {/* Content starts at the print area (after margins). Block X/Y=0 = top-left of print area.
                  The gray overlays show the margin zones visually; content is clipped to the print area. */}
              <div style={{ position: 'absolute', top: `${topMarginPx}px`, bottom: `${bottomMarginPx}px`, left: `${leftMarginPx}px`, right: `${rightMarginPx}px`, overflow: 'hidden' }}>
                {/* Render ALL flow sections in canvas order, filtered by page rules.
                    This preserves the visual ordering from the designer: a firstPage section
                    that sits between two everyPage sections in the canvas will still appear
                    between them in the print preview — not forced to the bottom of the zone. */}
                {(() => {
                  const pageContentSet = new Set(pageContent);

                  if (pageIndex === 0) {
                    // Page 1: walk all sections in canvas order.
                    // Include: everyPage, firstPage, page-1 content items, and lastPage (if only 1 page).
                    return flowItems
                      .filter(item => {
                        if (item.isEveryPage) return true;
                        if (item.isFirstPage) return true;
                        if (item.isLastPage) return pageIndex === lastPageIndex;
                        return pageContentSet.has(item);
                      })
                      .map((item, i) => <Fragment key={`flow-${i}`}>{item.renderFn(pageCtx)}</Fragment>);
                  } else {
                    // Page 2+: "elke pagina"-secties EERST (in canvas-volgorde),
                    // dan de content-items voor deze pagina (in canvas-volgorde),
                    // dan "laatste pagina"-secties (indien dit de laatste pagina is).
                    const everyPageSections = flowItems.filter(item => item.isEveryPage);
                    const pageContentItems  = flowItems.filter(item =>
                      !item.isEveryPage && !item.isFirstPage && !item.isLastPage && pageContentSet.has(item)
                    );
                    const lastPageSections  = pageIndex === lastPageIndex
                      ? flowItems.filter(item => item.isLastPage)
                      : [];
                    return [...everyPageSections, ...pageContentItems, ...lastPageSections]
                      .map((item, i) => <Fragment key={`flow-${i}`}>{item.renderFn(pageCtx)}</Fragment>);
                  }
                })()}
              </div>
              {/* Fixed position sections — page-coordinate Y (from page top), X aligned to print area */}
              {pageFixedItems.map((item, i) => (
                <div key={`fixed-${i}`} style={{ position: 'absolute', top: `${mmToPx(item.fixedY)}px`, left: `${leftMarginPx}px`, right: `${rightMarginPx}px`, zIndex: 5 }}>
                  {item.renderFn(pageCtx)}
                </div>
              ))}
            </div>
          </Fragment>
          );
        });
      })()}
    </>
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
        {(() => {
          const cf = block.config?.conditionField;
          const cv = block.config?.conditionValue || block.config?.lineTypeCondition;
          const conditionColors: Record<string, string> = {
            standard: 'bg-blue-500',
            unique: 'bg-purple-500',
            text: 'bg-gray-500',
            charges: 'bg-amber-500',
          };
          const conditionLabels: Record<string, string> = {
            standard: 'STD',
            unique: 'UNI',
            text: 'TXT',
            charges: 'MWK',
          };
          const hasCondition = !!(cf && cv) || !!block.config?.lineTypeCondition;
          const badgeText = cv ? (conditionLabels[cv] || cv.substring(0, 4).toUpperCase()) : null;
          const badgeColor = cv ? (conditionColors[cv] || 'bg-indigo-500') : 'bg-indigo-400';

          return (
            <div 
              data-group-label="true"
              className="absolute -top-4 left-1 flex items-center gap-0.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClick(e);
              }}
            >
              <div className="px-1.5 bg-orange-500 text-white text-[8px] font-medium rounded-t whitespace-nowrap hover:bg-orange-600 transition-colors">
                {groupName} ({childBlocks.length})
              </div>
              {hasCondition && badgeText && (
                <div className={`px-1 ${badgeColor} text-white text-[8px] font-bold rounded-t whitespace-nowrap`} title={`${cf || 'lineType'} = ${cv}`}>
                  {badgeText}
                </div>
              )}
            </div>
          );
        })()}
        
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
        block.config?.orientation === 'vertical' ? (
          <div className="w-full h-full flex justify-center items-center pointer-events-none">
            <div style={{
              width: 0,
              height: '100%',
              borderLeft: `${block.config?.strokeWidth || 1}px ${block.config?.strokeStyle === 'dashed' ? 'dashed' : block.config?.strokeStyle === 'dotted' ? 'dotted' : 'solid'} ${block.config?.strokeColor || '#000000'}`,
            }} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center pointer-events-none">
            <div style={{
              width: '100%',
              height: 0,
              borderTop: `${block.config?.strokeWidth || 1}px ${block.config?.strokeStyle === 'dashed' ? 'dashed' : block.config?.strokeStyle === 'dotted' ? 'dotted' : 'solid'} ${block.config?.strokeColor || '#000000'}`,
            }} />
          </div>
        )
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
  onMoveBlock,
  printMargins
}: { 
  block: any; 
  sectionId: string;
  sections: any[];
  allowedTables: string[];
  availableTables: any[];
  onUpdateProperty: (sectionId: string, blockId: string, property: string, value: any) => void;
  onMoveBlock?: (fromSectionId: string, toSectionId: string, blockId: string) => void;
  printMargins?: { top: number; bottom: number; left: number; right: number };
}) {
  const updateConfig = (property: string, value: any) => {
    onUpdateProperty(sectionId, block.id, 'config', { ...block.config, [property]: value });
  };

  const updateStyle = (property: string, value: any) => {
    onUpdateProperty(sectionId, block.id, 'style', { ...block.style, [property]: value });
  };

  const [fieldSearch, setFieldSearch] = useState('');

  const styleSource = block.type === 'Group'
    ? (block.config?.groupStyle || {})
    : (block.style || {});

  const handleTextStyleChange = (property: string, value: any) => {
    if (block.type === 'Group') {
      const newGroupStyle = { ...block.config?.groupStyle, [property]: value };
      const updatedChildBlocks = (block.config?.childBlocks || []).map((child: any) => ({
        ...child,
        style: { ...child.style, [property]: value },
      }));
      onUpdateProperty(sectionId, block.id, 'config', {
        ...block.config,
        groupStyle: newGroupStyle,
        childBlocks: updatedChildBlocks,
      });
    } else {
      updateStyle(property, value);
    }
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
                  Lege velden verbergen en opschuiven
                </Label>
              </div>
              {block.config?.collapseEmpty && (
                <p className="text-[10px] text-muted-foreground">
                  Velden zonder database-waarde worden niet getoond en reserveren geen ruimte. Overige velden schuiven omhoog.
                </p>
              )}

              {/* Conditie koppeling aan item-veld */}
              {(() => {
                const conditionEnabled = !!(block.config?.conditionField || block.config?.lineTypeCondition);
                const conditionField = block.config?.conditionField || (block.config?.lineTypeCondition ? 'lineType' : '');
                const conditionValue = block.config?.conditionValue || block.config?.lineTypeCondition || '';

                const ITEM_FIELDS: { value: string; label: string; options: { value: string; label: string }[] }[] = [
                  {
                    value: 'lineType',
                    label: 'Regeltype (lineType)',
                    options: [
                      { value: 'standard', label: 'Standaard (standard)' },
                      { value: 'unique', label: 'Uniek (unique)' },
                      { value: 'text', label: 'Tekst (text)' },
                      { value: 'charges', label: 'Meerwerk (charges)' },
                    ],
                  },
                ];

                const selectedField = ITEM_FIELDS.find(f => f.value === conditionField);

                const applyCondition = (field: string, value: string) => {
                  onUpdateProperty(sectionId, block.id, 'config', {
                    ...block.config,
                    conditionField: field || null,
                    conditionValue: value || null,
                    lineTypeCondition: field === 'lineType' && value ? value : null,
                  });
                };

                const clearCondition = () => {
                  onUpdateProperty(sectionId, block.id, 'config', {
                    ...block.config,
                    conditionField: null,
                    conditionValue: null,
                    lineTypeCondition: null,
                  });
                };

                return (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="condition-enabled"
                        checked={conditionEnabled}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            clearCondition();
                          } else {
                            applyCondition('lineType', '');
                          }
                        }}
                        className="h-4 w-4 accent-orange-500"
                      />
                      <Label htmlFor="condition-enabled" className="text-xs font-semibold text-orange-700 cursor-pointer">
                        Conditioneel tonen
                      </Label>
                    </div>

                    {conditionEnabled && (
                      <div className="ml-6 space-y-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Item veld</Label>
                          <select
                            value={conditionField}
                            onChange={(e) => applyCondition(e.target.value, '')}
                            className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background"
                          >
                            <option value="">— Kies een veld —</option>
                            {ITEM_FIELDS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        {conditionField && selectedField && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Is gelijk aan</Label>
                            <select
                              value={conditionValue}
                              onChange={(e) => applyCondition(conditionField, e.target.value)}
                              className="w-full h-8 text-xs border border-input rounded-md px-2 bg-background"
                            >
                              <option value="">— Kies een waarde —</option>
                              {selectedField.options.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {conditionField && conditionValue && (
                          <div className="text-[10px] text-orange-800 font-medium mt-1">
                            ✓ Toon alleen wanneer <code className="bg-orange-100 px-1 rounded">{conditionField}</code> = <code className="bg-orange-100 px-1 rounded">{conditionValue}</code>
                          </div>
                        )}
                        {conditionField && !conditionValue && (
                          <div className="text-[10px] text-amber-700">
                            ⚠ Kies een waarde om de conditie te activeren
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                  Geen documenten geselecteerd. Klik op "Design toepasbaar op" in de werkbalk.
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
                      <Label htmlFor="data-field-search" className="text-xs">Veld</Label>
                      <div className="border rounded-md overflow-hidden">
                        <Input
                          id="data-field-search"
                          value={fieldSearch}
                          onChange={e => setFieldSearch(e.target.value)}
                          placeholder="Zoek veld..."
                          className="h-7 text-xs border-0 border-b rounded-none focus-visible:ring-0"
                        />
                        <div className="max-h-40 overflow-y-auto">
                          {selectedTable.fields
                            .filter((f: string) =>
                              !fieldSearch ||
                              getFieldLabel(f).toLowerCase().includes(fieldSearch.toLowerCase()) ||
                              f.toLowerCase().includes(fieldSearch.toLowerCase())
                            )
                            .map((field: string) => (
                              <button
                                key={field}
                                type="button"
                                className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-orange-50 ${block.config?.fieldName === field ? 'bg-orange-100 text-orange-700 font-medium' : ''}`}
                                onClick={() => { updateConfig('fieldName', field); setFieldSearch(''); }}
                              >
                                <span>{getFieldLabel(field)}</span>
                                <span className="text-[10px] text-muted-foreground">{field}</span>
                              </button>
                            ))}
                          {selectedTable.fields.filter((f: string) =>
                            !fieldSearch ||
                            getFieldLabel(f).toLowerCase().includes(fieldSearch.toLowerCase()) ||
                            f.toLowerCase().includes(fieldSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground text-center">Geen velden gevonden</div>
                          )}
                        </div>
                        {block.config?.fieldName && (
                          <div className="px-3 py-1.5 border-t bg-orange-50 text-xs text-orange-700 font-medium">
                            ✓ {getFieldLabel(block.config.fieldName)}
                          </div>
                        )}
                      </div>
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
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={block.config?.strokeWidth || 1}
                    onChange={(e) => updateConfig('strokeWidth', parseFloat(e.target.value) || 0.1)}
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
                    step="0.1"
                    value={block.config?.strokeWidth || 1}
                    onChange={(e) => updateConfig('strokeWidth', parseFloat(e.target.value) || 0)}
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

          {/* Line Items Table Block Properties */}
          {block.type === "Line Items Table" && (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-xs font-bold">Tabelopties</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-header"
                  checked={block.config?.showHeader !== false}
                  onChange={(e) => updateConfig('showHeader', e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                <Label htmlFor="show-header" className="text-xs font-normal">Toon kolomkoppen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-borders"
                  checked={block.config?.showBorders !== false}
                  onChange={(e) => updateConfig('showBorders', e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                <Label htmlFor="show-borders" className="text-xs font-normal">Toon randen</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="zebra-striping"
                  checked={block.config?.zebraStriping === true}
                  onChange={(e) => updateConfig('zebraStriping', e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                <Label htmlFor="zebra-striping" className="text-xs font-normal">Wisselende rijkleuren</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-unit"
                  checked={block.config?.showUnit === true}
                  onChange={(e) => updateConfig('showUnit', e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                <Label htmlFor="show-unit" className="text-xs font-normal">Toon eenheid kolom</Label>
              </div>
            </div>
          )}

          {/* Tekststijl - universal for all block types */}
          <div className="pt-2 border-t space-y-2">
            <Label className="text-xs font-semibold block">
              Tekststijl
              {block.type === 'Group' && (
                <span className="ml-1 text-[10px] font-normal text-orange-600">(overschrijft alle blokken in groep)</span>
              )}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Lettertype</Label>
                <Select
                  value={String(styleSource.fontFamily || '')}
                  onValueChange={(value) => handleTextStyleChange('fontFamily', value)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Standaard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arial">Arial</SelectItem>
                    <SelectItem value="helvetica">Helvetica</SelectItem>
                    <SelectItem value="calibri">Calibri</SelectItem>
                    <SelectItem value="times">Times New Roman</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                    <SelectItem value="georgia">Georgia</SelectItem>
                    <SelectItem value="verdana">Verdana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Grootte</Label>
                <Select
                  value={styleSource.fontSize ? String(styleSource.fontSize) : ''}
                  onValueChange={(value) => handleTextStyleChange('fontSize', parseInt(value))}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Standaard" />
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
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={styleSource.fontWeight === 'bold' ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleTextStyleChange('fontWeight', styleSource.fontWeight === 'bold' ? 'normal' : 'bold')}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={styleSource.fontStyle === 'italic' ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleTextStyleChange('fontStyle', styleSource.fontStyle === 'italic' ? 'normal' : 'italic')}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={styleSource.textDecoration === 'underline' ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleTextStyleChange('textDecoration', styleSource.textDecoration === 'underline' ? 'none' : 'underline')}
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-1 ml-2">
                <Label className="text-[10px] text-muted-foreground">Kleur:</Label>
                <input
                  type="color"
                  value={styleSource.color || '#000000'}
                  onChange={(e) => handleTextStyleChange('color', e.target.value)}
                  className="h-7 w-7 p-0.5 border rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Ondermarge - standalone section for all block types */}
          <div className="pt-2 border-t">
            <Label className="text-xs font-semibold block mb-1">
              Ondermarge
              {block.type === 'Group' && (
                <span className="ml-1 text-[10px] font-normal text-orange-600">(overschrijft alle blokken in groep)</span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={styleSource.marginBottom ? parseFloat(String(styleSource.marginBottom)) : ''}
                placeholder="0"
                onChange={(e) => handleTextStyleChange('marginBottom', e.target.value === '' ? undefined : `${e.target.value}mm`)}
                className="h-8 w-20 px-2 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              <span className="text-[10px] text-muted-foreground">mm</span>
            </div>
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

            {/* Hide When Empty */}
            <div className="pt-1 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hide-when-empty"
                  checked={block.config?.hideWhenEmpty || false}
                  onChange={(e) => updateConfig('hideWhenEmpty', e.target.checked)}
                  className="h-3.5 w-3.5 accent-orange-500"
                  data-testid="checkbox-hide-when-empty"
                />
                <Label htmlFor="hide-when-empty" className="text-xs font-normal">Verberg als leeg</Label>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Blok wordt niet getoond wanneer de data leeg is.
              </p>
            </div>

            {/* Hide When Field Empty — same UI as DATA INVOEGEN */}
            <div className="pt-1 border-t">
              <Label className="text-xs font-medium">Verberg wanneer veld leeg is</Label>
              <p className="text-[10px] text-muted-foreground mb-1">
                Blok én ruimte verdwijnen als het gekozen veld geen waarde heeft.
              </p>
              <HideWhenFieldPicker
                value={block.config?.hideWhenFieldEmpty || ''}
                onChange={(v) => updateConfig('hideWhenFieldEmpty', v)}
                availableTables={availableTables}
              />
            </div>

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
  onReorderSection,
  onLoadTemplate
}: { 
  section: any; 
  sections: any[];
  onUpdateProperty: (id: string, path: string, value: any) => void;
  onReorderSection: (sectionId: string, newPosition: number) => void;
  onLoadTemplate?: (sectionId: string, templateConfig: any) => void;
}) {
  const sortedSections = [...sections].sort((a, b) => a.position - b.position);
  const currentIndex = sortedSections.findIndex(s => s.id === section.id);
  const [templateName, setTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/section-templates']
  });
  
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; config: any }) => {
      const response = await apiRequest('POST', '/api/section-templates', data);
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 413 || errorText.includes('too large')) {
          throw new Error('Template is te groot om op te slaan. Verwijder grote afbeeldingen of verminder het aantal blokken.');
        }
        throw new Error(errorText || 'Kon template niet opslaan.');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Template opgeslagen', description: 'De sectie is opgeslagen als template.' });
      setShowSaveDialog(false);
      setTemplateName('');
      refetchTemplates();
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij opslaan', description: error.message, variant: 'destructive' });
    }
  });

  const overwriteTemplateMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: any }) => {
      await apiRequest('DELETE', `/api/section-templates/${id}`);
      const response = await apiRequest('POST', '/api/section-templates', config);
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 413 || errorText.includes('too large')) {
          throw new Error('Template is te groot om op te slaan. Verwijder grote afbeeldingen of verminder het aantal blokken.');
        }
        throw new Error(errorText || 'Kon template niet overschrijven.');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Template overschreven', description: 'De template is bijgewerkt met de huidige sectie.' });
      setShowOverwriteConfirm(null);
      refetchTemplates();
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij overschrijven', description: error.message, variant: 'destructive' });
    }
  });

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast({ title: 'Voer een naam in', variant: 'destructive' });
      return;
    }
    const templateConfig = {
      sectionName: section.name,
      sectionConfig: section.config,
      blocks: section.config.blocks || []
    };
    saveTemplateMutation.mutate({ name: templateName.trim(), config: templateConfig });
  };

  const handleOverwriteTemplate = (template: any) => {
    const templateConfig = {
      sectionName: section.name,
      sectionConfig: section.config,
      blocks: section.config.blocks || []
    };
    overwriteTemplateMutation.mutate({ 
      id: template.id, 
      config: { name: template.name, config: templateConfig }
    });
  };
  
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
          value={section.config.dimensions?.heightMm ?? Math.round(pxToMm(section.config.dimensions?.height || 200))}
          onChange={(e) => {
            const mmValue = parseInt(e.target.value) || 50;
            onUpdateProperty(section.id, 'config.dimensions', {
              ...(section.config.dimensions || { unit: 'px' }),
              heightMm: mmValue,
              height: mmToPx(mmValue),
            });
          }}
          onFocus={(e) => e.target.select()}
          className="h-8 text-xs"
        />
      </div>

      {/* Fixed Position */}
      <div className="space-y-2 border-t pt-2">
        <div className="text-xs font-bold text-orange-600">Vaste positie</div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="section-fixed-pos-enabled"
            checked={section.config.fixedPosition?.enabled || false}
            onChange={(e) => onUpdateProperty(section.id, 'config.fixedPosition', {
              ...(section.config.fixedPosition || { y: 250 }),
              enabled: e.target.checked,
            })}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="section-fixed-pos-enabled" className="text-xs font-normal cursor-pointer">
            Vaste positie gebruiken
          </Label>
        </div>
        {section.config.fixedPosition?.enabled && (
          <div>
            <Label htmlFor="section-fixed-pos-y" className="text-xs">Positie Y (mm vanaf bovenkant)</Label>
            <Input
              id="section-fixed-pos-y"
              type="number"
              step="1"
              min="0"
              max="297"
              value={section.config.fixedPosition?.y ?? 250}
              onChange={(e) => onUpdateProperty(section.id, 'config.fixedPosition', {
                ...(section.config.fixedPosition || {}),
                enabled: true,
                y: parseInt(e.target.value) || 0,
              })}
              onFocus={(e) => e.target.select()}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Sectie wordt absoluut geplaatst op deze Y-positie op elke pagina
            </p>
          </div>
        )}
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
      {(() => {
        const hasItemPlaceholders = sectionContainsItemPlaceholders(section);
        const manualRepeat = section.config?.repeat?.enabled === true;
        const isRepeating = hasItemPlaceholders || manualRepeat;
        return (
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

            {/* Herhalen per regelitem */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="section-repeat-enabled"
                checked={manualRepeat}
                onChange={(e) => onUpdateProperty(section.id, 'config.repeat', {
                  ...(section.config?.repeat || {}),
                  enabled: e.target.checked,
                })}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="section-repeat-enabled" className="text-xs font-normal cursor-pointer">
                Herhalen per regelitem
              </Label>
            </div>


            {isRepeating && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Tussenruimte (mm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={section.config?.repeat?.spacingMm || 0}
                  onChange={(e) => onUpdateProperty(section.id, 'config.repeat', {
                    ...(section.config?.repeat || {}),
                    spacingMm: parseFloat(e.target.value) || 0,
                  })}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Ruimte tussen herhalingen</p>
              </div>
            )}
          </div>
        );
      })()}


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

      {/* Section Templates */}
      <div className="space-y-2 border-t pt-4">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Save className="h-3 w-3" />
          Sectie Templates
        </Label>
        
        {/* Existing Templates - Only overwrite allowed */}
        {(templates as any[]).length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestaande templates</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(templates as any[]).map((template: any) => (
                <div key={template.id} className="flex items-center justify-between gap-1 p-1.5 rounded border">
                  {showOverwriteConfirm === template.id ? (
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-orange-600 font-medium">Overschrijven?</p>
                      <p className="text-[10px] text-muted-foreground">"{template.name}" wordt vervangen door de huidige sectie.</p>
                      <div className="flex gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-6 text-xs bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleOverwriteTemplate(template)}
                          disabled={overwriteTemplateMutation.isPending}
                        >
                          {overwriteTemplateMutation.isPending ? 'Bezig...' : 'Ja, overschrijven'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setShowOverwriteConfirm(null)}
                        >
                          Annuleren
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs flex-1">{template.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
                        onClick={() => setShowOverwriteConfirm(template.id)}
                      >
                        Overschrijven
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save as New Template */}
        {!showSaveDialog ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="h-3 w-3 mr-1" />
            Opslaan als nieuwe template
          </Button>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Template naam..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-7 text-xs"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-7 text-xs bg-orange-500 hover:bg-orange-600"
                onClick={handleSaveAsTemplate}
                disabled={saveTemplateMutation.isPending}
              >
                {saveTemplateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setShowSaveDialog(false); setTemplateName(''); }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        )}
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
      "Item Repeater": "🔄",
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

  const getFontFamily = (font?: string): string => {
    const fontMap: Record<string, string> = {
      'helvetica': 'Helvetica, Arial, sans-serif',
      'arial': 'Arial, sans-serif',
      'calibri': 'Calibri, "Segoe UI", sans-serif',
      'times': '"Times New Roman", Times, serif',
      'courier': '"Courier New", Courier, monospace',
      'georgia': 'Georgia, serif',
      'verdana': 'Verdana, sans-serif',
    };
    return fontMap[font || 'helvetica'] || font || 'Helvetica, Arial, sans-serif';
  };

  // Build style object with all properties
  const blockStyle: React.CSSProperties = {
    left: `${block.position.x}px`, 
    top: `${block.position.y}px`,
    width: `${block.size?.width || 200}px`,
    minHeight: `${block.size?.height || 100}px`,
    zIndex: block.zIndex || 0,
    fontSize: `${block.style?.fontSize || 9}px`,
    fontFamily: getFontFamily(block.style?.fontFamily),
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

