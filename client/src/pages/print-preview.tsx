import { useEffect, useRef } from "react";
import { useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LayoutPreview } from "./layout-designer";

export default function PrintPreviewPage() {
  const [, params] = useRoute("/print/:documentType/:entityId");
  const search = useSearch();
  const printRef = useRef<HTMLDivElement>(null);

  const documentType = params?.documentType ?? "";
  const entityId = params?.entityId ?? "";
  const searchParams = new URLSearchParams(search);
  const layoutId = searchParams.get("layoutId") ?? "";

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
    document.title = printData?.invoice?.invoiceNumber
      || printData?.quotation?.quotationNumber
      || "Print Preview";
  }, [printData]);

  const handlePrint = () => {
    window.print();
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

  return (
    <>
      <style>{`
        @media print {
          .print-toolbar { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          @page { size: A4; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        body { background: #f3f4f6; }
      `}</style>

      <div className="print-toolbar flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <div className="text-sm font-medium text-gray-700">
          {printData?.invoice?.invoiceNumber
            || printData?.quotation?.quotationNumber
            || "Print Preview"}
        </div>
        <Button
          onClick={handlePrint}
          className="bg-orange-500 hover:bg-orange-600 text-white"
          size="sm"
        >
          <Printer className="h-4 w-4 mr-2" />
          Afdrukken
        </Button>
      </div>

      <div className="flex justify-center py-8 px-4">
        <div ref={printRef} className="bg-white shadow-lg" style={{ width: "794px", minHeight: "1123px" }}>
          <LayoutPreview
            layout={layout}
            sections={sections}
            printData={printData}
          />
        </div>
      </div>
    </>
  );
}
