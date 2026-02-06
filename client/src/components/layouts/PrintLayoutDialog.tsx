import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Check } from "lucide-react";
import type { DocumentLayout } from "@shared/schema";

interface PrintLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  entityId?: string;
}

export function PrintLayoutDialog({
  open,
  onOpenChange,
  documentType,
  entityId,
}: PrintLayoutDialogProps) {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);

  const { data: layouts = [], isLoading } = useQuery<DocumentLayout[]>({
    queryKey: ["/api/layouts", { documentType }],
    queryFn: async () => {
      const response = await fetch(`/api/layouts?documentType=${documentType}`);
      if (!response.ok) throw new Error("Failed to fetch layouts");
      return response.json();
    },
    enabled: open,
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedLayoutId(null);
    }
    onOpenChange(isOpen);
  };

  const handlePrint = () => {
    if (!selectedLayoutId) return;
    window.open(
      `/api/print/${documentType}/${entityId}?layoutId=${selectedLayoutId}`,
      "_blank"
    );
    onOpenChange(false);
  };

  const documentTypeLabel = documentType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-orange-500" />
            Print Report - {documentTypeLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Select a layout for this report:
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : layouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No layouts available for {documentTypeLabel}.</p>
              <p className="text-xs mt-1">Create a layout in the Layout Designer first.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayoutId(layout.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedLayoutId === layout.id
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{layout.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {layout.pageFormat} - {layout.orientation}
                        {layout.isDefault && (
                          <span className="ml-2 text-orange-600 font-medium">(Default)</span>
                        )}
                      </p>
                    </div>
                    {selectedLayoutId === layout.id && (
                      <Check className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!selectedLayoutId || layouts.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
