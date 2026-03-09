import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { VisualDesignerView, PreviewView } from './layout-designer';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  packing_list: 'Packing List',
  order_confirmation: 'Order Confirmation',
  purchase_order: 'Purchase Order',
  work_order: 'Work Order',
};

const PAGE_FORMATS = ['A4', 'A3', 'A5', 'Letter', 'Legal'];

interface LayoutDesignerFormProps {
  layoutId: string;
}

export default function LayoutDesignerForm({ layoutId }: LayoutDesignerFormProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showPreview, setShowPreview] = useState(false);
  const [showProperties, setShowProperties] = useState(false);

  // Properties form state
  const [propName, setPropName] = useState('');
  const [propDocType, setPropDocType] = useState('');
  const [propPageFormat, setPropPageFormat] = useState('A4');
  const [propOrientation, setPropOrientation] = useState('portrait');
  const [propIsDefault, setPropIsDefault] = useState(false);

  const { data: layout, isLoading } = useQuery<any>({
    queryKey: ['/api/layouts', layoutId],
    queryFn: async () => {
      const res = await fetch(`/api/layouts/${layoutId}`);
      if (!res.ok) throw new Error('Failed to load layout');
      return res.json();
    },
  });

  // Sync form state when layout loads or dialog opens
  useEffect(() => {
    if (layout && showProperties) {
      setPropName(layout.name ?? '');
      setPropDocType(layout.documentType ?? '');
      setPropPageFormat(layout.pageFormat ?? 'A4');
      setPropOrientation(layout.orientation ?? 'portrait');
      setPropIsDefault(layout.isDefault ?? false);
    }
  }, [layout, showProperties]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/layouts/${layoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: propName.trim(),
          documentType: propDocType,
          pageFormat: propPageFormat,
          orientation: propOrientation,
          isDefault: propIsDefault,
        }),
      }).then(r => { if (!r.ok) throw new Error('Failed to save'); return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/layouts', layoutId] });
      qc.invalidateQueries({ queryKey: ['/api/layouts'] });
      toast({ title: 'Properties opgeslagen' });
      setShowProperties(false);
    },
    onError: () => toast({ title: 'Fout', description: 'Opslaan mislukt', variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Laden...
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Layout niet gevonden
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── Header bar ── */}
      <div className="border-b border-border bg-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Clickable LY number + name → opens properties */}
          <button
            type="button"
            onClick={() => setShowProperties(true)}
            className="flex items-center gap-2 group rounded px-1 -mx-1 hover:bg-orange-50 transition-colors"
            title="Open properties"
          >
            <span className="font-mono text-sm font-semibold text-orange-600 group-hover:underline">
              {layout.layoutNumber || 'LY-????'}
            </span>
            <span className="text-muted-foreground">—</span>
            <span className="font-medium text-foreground group-hover:underline">
              {layout.name}
            </span>
            <Settings2 className="h-3.5 w-3.5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
          </button>

          {/* Document type badge */}
          {layout.documentType && (
            <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
              {DOCUMENT_TYPE_LABELS[layout.documentType] || layout.documentType}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <VisualDesignerView layout={layout} />
      </div>

      {/* ── Properties dialog ── */}
      <Dialog open={showProperties} onOpenChange={setShowProperties}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-orange-500" />
              Layout properties — {layout.layoutNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Naam</Label>
              <Input
                value={propName}
                onChange={e => setPropName(e.target.value)}
                placeholder="Layout naam"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select value={propDocType} onValueChange={setPropDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies document type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pagina formaat</Label>
                <Select value={propPageFormat} onValueChange={setPropPageFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_FORMATS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Oriëntatie</Label>
                <Select value={propOrientation} onValueChange={setPropOrientation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="is-default"
                checked={propIsDefault}
                onCheckedChange={setPropIsDefault}
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                Standaard layout voor dit document type
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProperties(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !propName.trim() || !propDocType}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saveMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview dialog ── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview — {layout.layoutNumber} {layout.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 pb-6">
            <PreviewView layout={layout} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
