import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Printer, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LayoutPreview } from "./layout-designer";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const DOC_WIDTH = 794;
const DOC_HEIGHT = 1123;

export default function PrintPreviewPage() {
  const [, params] = useRoute("/print/:documentType/:entityId");
  const search = useSearch();
  const printRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const documentType = params?.documentType ?? "";
  const entityId = params?.entityId ?? "";
  const searchParams = new URLSearchParams(search);
  const layoutId = searchParams.get("layoutId") ?? "";

  const [fitScale, setFitScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const updateFitScale = () => {
      const available = window.innerWidth - 32;
      setFitScale(Math.min(1, available / DOC_WIDTH));
    };
    updateFitScale();
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, []);

  useEffect(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const original = metaViewport?.getAttribute("content") ?? "";
    metaViewport?.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
    );
    return () => {
      metaViewport?.setAttribute("content", original);
    };
  }, []);

  const totalScale = fitScale * userZoom;

  const zoomIn = useCallback(() => setUserZoom(z => Math.min(z + 0.25, 3)), []);
  const zoomOut = useCallback(() => setUserZoom(z => Math.max(z - 0.25, 0.25)), []);
  const zoomReset = useCallback(() => setUserZoom(1), []);

  const { data: layout, isLoading: layoutLoading } = useQuery<any>({
    queryKey: ["/api/layouts", layoutId],
    queryFn: async () => {
      const res = await fetch(`/api/layouts/${layoutId}`);
      if (!res.ok) throw new Error("Layout niet gevonden");
      return res.json();
    },
    enabled: !!layoutId,
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<any[]>({
    queryKey: [`/api/layout-sections?layoutId=${layoutId}`],
    queryFn: async () => {
      const res = await fetch(`/api/layout-sections?layoutId=${layoutId}`);
      if (!res.ok) throw new Error("Secties niet gevonden");
      return res.json();
    },
    enabled: !!layoutId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isInvoice = documentType === "invoice";
  const printDataUrl = isInvoice
    ? `/api/invoices/${entityId}/print-data`
    : `/api/quotations/${entityId}/print-data`;

  const { data: printData, isLoading: printDataLoading } = useQuery<any>({
    queryKey: [printDataUrl],
    queryFn: async () => {
      const res = await fetch(printDataUrl);
      if (!res.ok) throw new Error("Printdata niet gevonden");
      return res.json();
    },
    enabled: !!entityId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isLoading = layoutLoading || sectionsLoading || printDataLoading;

  useEffect(() => {
    document.title =
      printData?.invoice?.invoiceNumber ||
      printData?.quotation?.quotationNumber ||
      "Print Preview";
  }, [printData]);

  const handlePrint = async () => {
    if (isPrinting || !layout || !sections || !printData) return;
    setIsPrinting(true);
    setIsCapturing(true);

    try {
      // Wait for React to render the off-screen capture container
      await new Promise(r => setTimeout(r, 300));

      const captureContainer = captureRef.current;
      if (!captureContainer) return;

      const pageDivs = Array.from(
        captureContainer.querySelectorAll<HTMLElement>("[data-pdf-page]")
      );
      if (pageDivs.length === 0) return;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      for (let i = 0; i < pageDivs.length; i++) {
        const pageDiv = pageDivs[i];

        const canvas = await html2canvas(pageDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone: (_clonedDoc, clonedEl) => {
            // Hide margin overlay divs
            clonedEl
              .querySelectorAll<HTMLElement>(".pointer-events-none.z-20")
              .forEach(overlay => { overlay.style.display = "none"; });
            clonedEl.style.boxShadow = "none";
          },
        });

        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      const filename =
        printData?.invoice?.invoiceNumber ||
        printData?.quotation?.quotationNumber ||
        "document";
      pdf.save(`${filename}.pdf`);
    } finally {
      setIsCapturing(false);
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-3">⏳</div>
          <div className="text-base font-medium">Laden…</div>
        </div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="text-base font-medium">Layout niet gevonden</div>
        </div>
      </div>
    );
  }

  const scaledHeight = DOC_HEIGHT * totalScale;

  return (
    <>
      <style>{`body { background: #f3f4f6; }`}</style>

      {/* Hidden off-screen container at 1:1 scale — used for PDF capture only */}
      {isCapturing && (
        <div
          ref={captureRef}
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: `${DOC_WIDTH}px`,
            fontFamily: "Arial, Helvetica, sans-serif",
            pointerEvents: "none",
          }}
        >
          <LayoutPreview
            layout={layout}
            sections={sections}
            printData={printData}
          />
        </div>
      )}

      <div className="print-toolbar flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm gap-2 flex-wrap">
        <div className="text-sm font-medium text-gray-700 truncate">
          {printData?.invoice?.invoiceNumber ||
            printData?.quotation?.quotationNumber ||
            "Print Preview"}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={zoomOut} className="h-8 w-8" title="Zoom uit">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <button
            onClick={zoomReset}
            className="text-xs px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 min-w-[48px] text-center"
            title="Reset zoom"
          >
            {Math.round(totalScale * 100)}%
          </button>
          <Button variant="outline" size="icon" onClick={zoomIn} className="h-8 w-8" title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            className="bg-orange-500 hover:bg-orange-600 text-white ml-1"
            size="sm"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-1" />
            )}
            {isPrinting ? "Bezig..." : "Afdrukken"}
          </Button>
        </div>
      </div>

      <div
        className="print-outer overflow-x-auto py-6"
        style={{ minHeight: `${scaledHeight + 48}px` }}
      >
        <div
          style={{
            width: `${DOC_WIDTH * totalScale}px`,
            height: `${scaledHeight}px`,
            margin: "0 auto",
            position: "relative",
          }}
        >
          <div
            ref={printRef}
            className="print-scale-wrapper bg-white shadow-lg"
            style={{
              width: `${DOC_WIDTH}px`,
              minHeight: `${DOC_HEIGHT}px`,
              transform: `scale(${totalScale})`,
              transformOrigin: "top left",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            <LayoutPreview
              layout={layout}
              sections={sections}
              printData={printData}
            />
          </div>
        </div>
      </div>
    </>
  );
}
