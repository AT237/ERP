import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisualDesignerView, PreviewView } from './layout-designer';

interface LayoutDesignerFormProps {
  layoutId: string;
}

export default function LayoutDesignerForm({ layoutId }: LayoutDesignerFormProps) {
  const [showPreview, setShowPreview] = useState(false);

  const { data: layout, isLoading } = useQuery<any>({
    queryKey: ['/api/layouts', layoutId],
    queryFn: async () => {
      const res = await fetch(`/api/layouts/${layoutId}`);
      if (!res.ok) throw new Error('Failed to load layout');
      return res.json();
    },
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
      <div className="border-b border-border bg-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-orange-600">
            {layout.layoutNumber || 'LY-????'}
          </span>
          <span className="text-muted-foreground">—</span>
          <span className="font-medium text-foreground">{layout.name}</span>
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
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
