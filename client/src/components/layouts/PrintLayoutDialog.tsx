import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Check, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  const { toast } = useToast();

  const { data: layouts = [], isLoading } = useQuery<DocumentLayout[]>({
    queryKey: ["/api/layouts", { documentType }],
    queryFn: async () => {
      const response = await fetch(`/api/layouts?documentType=${documentType}`);
      if (!response.ok) throw new Error("Failed to fetch layouts");
      return response.json();
    },
    enabled: open,
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pdf-archive", {
        documentType,
        documentId: entityId,
        layoutId: selectedLayoutId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Opgeslagen in PDF database",
        description: "Het document is opgeslagen in de PDF database.",
      });
    },
    onError: () => {
      toast({
        title: "Opslaan mislukt",
        description: "Het document kon niet worden opgeslagen in de PDF database.",
        variant: "destructive",
      });
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedLayoutId(null);
    }
    onOpenChange(isOpen);
  };

  const openPdf = () => {
    window.open(
      `/print/${documentType}/${entityId}?layoutId=${selectedLayoutId}`,
      "_blank"
    );
  };

  const handlePrintOnly = () => {
    if (!selectedLayoutId) return;
    openPdf();
    onOpenChange(false);
  };

  const handleAgreePrint = async () => {
    if (!selectedLayoutId) return;
    await archiveMutation.mutateAsync();
    openPdf();
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
            Print - {documentTypeLabel}
          </DialogTitle>
          <DialogDescription>
            Selecteer een lay-out en kies hoe u wilt afdrukken.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Selecteer een lay-out voor dit document:
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
              <p className="text-sm">Geen lay-outs beschikbaar voor {documentTypeLabel}.</p>
              <p className="text-xs mt-1">Maak eerst een lay-out aan in de lay-outontwerper.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
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
                          <span className="ml-2 text-orange-600 font-medium">(Standaard)</span>
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

          {selectedLayoutId && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <Archive className="inline h-3.5 w-3.5 mr-1" />
                Met <strong>Akkoord en printen</strong> geeft u toestemming om dit document
                op te slaan in de PDF database.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            variant="outline"
            onClick={handleAgreePrint}
            disabled={!selectedLayoutId || layouts.length === 0 || archiveMutation.isPending}
          >
            <Archive className="h-4 w-4 mr-1" />
            Akkoord en printen
          </Button>
          <Button
            onClick={handlePrintOnly}
            disabled={!selectedLayoutId || layouts.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Printer className="h-4 w-4 mr-1" />
            Alleen printen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
