import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, Eye } from "lucide-react";
import { QuotationPrintPreview } from "./QuotationPrintPreview";
import { generateQuotationPdf, previewPdfInNewTab } from "@/utils/pdf-generator";
import { useToast } from "@/hooks/use-toast";

interface QuotationPrintDialogProps {
  quotationId: string;
  quotationNumber: string;
  triggerButton?: React.ReactNode;
}

export function QuotationPrintDialog({
  quotationId,
  quotationNumber,
  triggerButton,
}: QuotationPrintDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const { toast } = useToast();

  // Callback from preview component to track loading state
  const handleLoadingChange = (loading: boolean) => {
    setIsPreviewLoading(loading);
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      await generateQuotationPdf(quotationNumber);
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPdf = async () => {
    setIsGenerating(true);
    try {
      await previewPdfInNewTab("print-preview");
      toast({
        title: "Success",
        description: "PDF opened in new tab",
      });
    } catch (error) {
      console.error("Error previewing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to preview PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" data-testid="button-print-quotation">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-[1000px] max-h-[90vh] overflow-y-auto"
        data-testid="dialog-quotation-print"
      >
        <DialogHeader>
          <DialogTitle>Print Preview - Offerte {quotationNumber}</DialogTitle>
          <DialogDescription>
            Preview en download de offerte als PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end border-b pb-4">
            <Button
              onClick={handlePreviewPdf}
              disabled={isGenerating || isPreviewLoading}
              variant="outline"
              size="sm"
              data-testid="button-preview-pdf"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isPreviewLoading ? "Loading..." : "Preview in New Tab"}
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={isGenerating || isPreviewLoading}
              size="sm"
              data-testid="button-download-pdf"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : isPreviewLoading ? "Loading..." : "Download PDF"}
            </Button>
          </div>

          {/* Print Preview */}
          <div className="bg-gray-100 p-4 rounded-lg overflow-auto">
            <QuotationPrintPreview 
              quotationId={quotationId}
              onLoadingChange={handleLoadingChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
