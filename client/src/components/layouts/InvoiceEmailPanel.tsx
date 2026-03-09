import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import type { EmailTemplate, Invoice, Customer } from "@shared/schema";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { LayoutPreview } from "@/pages/layout-designer";

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  invoice: "Factuur",
  quotation: "Offerte",
  purchase_order: "Inkooporder",
  packing_list: "Paklijst",
  work_order: "Werkbon",
  general: "Algemeen",
};

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  try { return new Date(value).toLocaleDateString("nl-NL"); } catch { return String(value); }
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(num);
}

async function elementToPdfBase64(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    allowTaint: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totalPages = Math.ceil(imgHeight / pdfHeight);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();
    const sourceY = page * pdfHeight;
    const sourceHeight = Math.min(pdfHeight, imgHeight - sourceY);
    const pixelsPerMm = canvas.width / imgWidth;
    const sourceYPx = sourceY * pixelsPerMm;
    const sourceHeightPx = sourceHeight * pixelsPerMm;

    const pageCanvas = document.createElement("canvas");
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) continue;
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeightPx;
    ctx.drawImage(canvas, 0, sourceYPx, canvas.width, sourceHeightPx, 0, 0, canvas.width, sourceHeightPx);
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgWidth, sourceHeight);
  }

  return pdf.output("datauristring").split(",")[1];
}

function buildEml(to: string, subject: string, body: string, pdfBase64: string, pdfFilename: string): string {
  const boundary = `----=_Part_${Date.now()}`;
  const lines = [
    `MIME-Version: 1.0`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    ``,
    pdfBase64.match(/.{1,76}/g)?.join("\r\n") ?? pdfBase64,
    ``,
    `--${boundary}--`,
  ];
  return lines.join("\r\n");
}

function downloadEml(emlContent: string, filename: string) {
  const blob = new Blob([emlContent], { type: "message/rfc822" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

interface InvoiceEmailPanelProps {
  invoiceId: string;
}

export function InvoiceEmailPanel({ invoiceId }: InvoiceEmailPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const hiddenPreviewRef = useRef<HTMLDivElement>(null);

  const { data: invoice } = useQuery<Invoice>({
    queryKey: ["/api/invoices", invoiceId],
    enabled: !!invoiceId,
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customers", invoice?.customerId],
    enabled: !!invoice?.customerId,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const { data: layouts = [] } = useQuery<any[]>({
    queryKey: ["/api/layouts", { documentType: "invoice" }],
    queryFn: async () => {
      const res = await fetch("/api/layouts?documentType=invoice");
      if (!res.ok) throw new Error("Failed to fetch layouts");
      return res.json();
    },
  });

  const { data: layout } = useQuery<any>({
    queryKey: ["/api/layouts", selectedLayoutId],
    queryFn: async () => {
      const res = await fetch(`/api/layouts/${selectedLayoutId}`);
      if (!res.ok) throw new Error("Layout niet gevonden");
      return res.json();
    },
    enabled: !!selectedLayoutId,
  });

  const { data: layoutSections = [] } = useQuery<any[]>({
    queryKey: [`/api/layout-sections?layoutId=${selectedLayoutId}`],
    queryFn: async () => {
      const res = await fetch(`/api/layout-sections?layoutId=${selectedLayoutId}`);
      if (!res.ok) throw new Error("Secties niet gevonden");
      return res.json();
    },
    enabled: !!selectedLayoutId,
  });

  const { data: printData } = useQuery<any>({
    queryKey: [`/api/invoices/${invoiceId}/print-data`],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${invoiceId}/print-data`);
      if (!res.ok) throw new Error("Printdata niet gevonden");
      return res.json();
    },
    enabled: !!invoiceId,
  });

  const invoiceTemplates = templates.filter((t) => t.templateType === "invoice");
  const selected = invoiceTemplates.find((t) => t.id === selectedTemplateId) ?? invoiceTemplates[0] ?? null;

  useEffect(() => {
    if (invoiceTemplates.length > 0 && !invoiceTemplates.find((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(invoiceTemplates[0].id);
    }
  }, [invoiceTemplates.length]);

  useEffect(() => {
    if (layouts.length > 0 && !layouts.find((l: any) => l.id === selectedLayoutId)) {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [layouts.length]);

  const resolveTokens = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\{\{invoice\.invoiceNumber\}\}/g, invoice?.invoiceNumber ?? "")
      .replace(/\{\{invoice\.invoiceDate\}\}/g, formatDate(invoice?.invoiceDate))
      .replace(/\{\{invoice\.dueDate\}\}/g, formatDate(invoice?.dueDate))
      .replace(/\{\{invoice\.status\}\}/g, invoice?.status ?? "")
      .replace(/\{\{invoice\.subtotal\}\}/g, formatCurrency(invoice?.subtotal))
      .replace(/\{\{invoice\.taxAmount\}\}/g, formatCurrency(invoice?.taxAmount))
      .replace(/\{\{invoice\.totalAmount\}\}/g, formatCurrency(invoice?.totalAmount))
      .replace(/\{\{invoice\.paidAmount\}\}/g, formatCurrency(invoice?.paidAmount))
      .replace(/\{\{invoice\.notes\}\}/g, invoice?.notes ?? "")
      .replace(/\{\{customer\.customerNumber\}\}/g, (customer as any)?.customerNumber ?? "")
      .replace(/\{\{customer\.name\}\}/g, customer?.name ?? "")
      .replace(/\{\{customer\.email\}\}/g, customer?.email ?? "")
      .replace(/\{\{customer\.invoiceEmail\}\}/g, (customer as any)?.invoiceEmail ?? "")
      .replace(/\{\{customer\.phone\}\}/g, customer?.phone ?? "")
      .replace(/\{\{contact\.name\}\}/g, (customer as any)?.primaryContactName ?? customer?.name ?? "")
      .replace(/\{\{contact\.email\}\}/g, (customer as any)?.primaryContactEmail ?? customer?.email ?? "")
      .replace(/\{\{company\.name\}\}/g, "ATE Solutions")
      .replace(/\{\{company\.email\}\}/g, "")
      .replace(/\{\{company\.phone\}\}/g, "");
  };

  const handleCreateEmail = async () => {
    if (!selected || !hiddenPreviewRef.current) return;
    setGenerating(true);
    try {
      const to = (customer as any)?.invoiceEmail || customer?.email || "";
      const subject = resolveTokens(selected.subject ?? "");
      const body = resolveTokens(selected.body ?? "");
      const invoiceNumber = invoice?.invoiceNumber ?? "factuur";
      const pdfFilename = `${invoiceNumber}.pdf`;

      let pdfBase64 = "";
      if (layout && layoutSections.length > 0 && printData) {
        // Wait a tick to ensure LayoutPreview has rendered
        await new Promise((r) => setTimeout(r, 300));
        pdfBase64 = await elementToPdfBase64(hiddenPreviewRef.current);
      }

      if (!pdfBase64) {
        // Fallback: EML without attachment, just open mailto
        const subject64 = encodeURIComponent(subject);
        const body64 = encodeURIComponent(body);
        window.location.href = `mailto:${to}?subject=${subject64}&body=${body64}`;
        return;
      }

      const emlContent = buildEml(to, subject, body, pdfBase64, pdfFilename);
      downloadEml(emlContent, `${invoiceNumber}.eml`);
    } catch (err) {
      console.error("Email generation failed:", err);
      // Fallback to plain mailto
      if (selected) {
        const to = (customer as any)?.invoiceEmail || customer?.email || "";
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(resolveTokens(selected.subject ?? ""))}&body=${encodeURIComponent(resolveTokens(selected.body ?? ""))}`;
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenDesigner = () => {
    window.dispatchEvent(new CustomEvent("open-form-tab", {
      detail: { id: "email-designer", name: "E-mail Designer", type: "page", menuRoute: "/email-designer" },
    }));
  };

  const noTemplates = invoiceTemplates.length === 0;

  return (
    <div className="space-y-4 pt-2">
      {noTemplates ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg bg-gray-50">
          <Mail className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">Geen e-mailtemplates voor facturen</p>
          <p className="text-xs mt-1">Maak templates aan via Tools → E-mail Designer</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-orange-500 border-orange-200" onClick={handleOpenDesigner}>
            <ExternalLink className="h-3.5 w-3.5" />
            Naar E-mail Designer
          </Button>
        </div>
      ) : (
        <>
          {/* Selectors row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-right flex-shrink-0 w-[90px]">E-mailtemplate</Label>
              <Select value={selected?.id ?? ""} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-9 w-56">
                  <SelectValue placeholder="Selecteer template..." />
                </SelectTrigger>
                <SelectContent>
                  {invoiceTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-right flex-shrink-0 w-[90px]">PDF layout</Label>
              <Select value={selectedLayoutId ?? ""} onValueChange={setSelectedLayoutId}>
                <SelectTrigger className="h-9 w-56">
                  <SelectValue placeholder="Selecteer layout..." />
                </SelectTrigger>
                <SelectContent>
                  {layouts.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm" variant="ghost"
              className="h-8 gap-1.5 text-orange-500 hover:bg-orange-50 text-xs ml-auto"
              onClick={handleOpenDesigner}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              E-mail Designer
            </Button>
          </div>

          {selected && (
            <div className="grid grid-cols-[240px_1fr] gap-4">
              {/* Template list */}
              <div className="border rounded-lg overflow-hidden bg-white">
                {invoiceTemplates.map((t) => (
                  <button
                    key={t.id} type="button" onClick={() => setSelectedTemplateId(t.id)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 border-l-2 ${
                      selected?.id === t.id ? "border-l-orange-500 bg-orange-50/50" : "border-l-transparent"
                    }`}
                  >
                    <p className={`text-xs font-medium ${selected?.id === t.id ? "text-orange-700" : ""}`}>{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{TEMPLATE_TYPE_LABELS[t.templateType] ?? t.templateType}</p>
                  </button>
                ))}
              </div>

              {/* Preview + action */}
              <div className="border rounded-lg bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-700">{selected.name}</span>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs bg-orange-500 hover:bg-orange-600"
                    onClick={handleCreateEmail}
                    disabled={generating || !layout || !printData}
                  >
                    {generating ? (
                      <><Loader2 className="h-3 w-3 animate-spin" />Aanmaken...</>
                    ) : (
                      <><Mail className="h-3 w-3" />Aanmaken in Outlook</>
                    )}
                  </Button>
                </div>

                {/* Info note */}
                {layout && (
                  <div className="px-4 py-2 border-b bg-blue-50 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-blue-700">
                      Er wordt een <strong>.eml bestand</strong> gedownload met de factuur-PDF als bijlage.
                      Open het bestand om de e-mail in Outlook te zien en te versturen.
                    </p>
                  </div>
                )}

                {!layout && layouts.length === 0 && (
                  <div className="px-4 py-2 border-b bg-amber-50 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-700">
                      Geen PDF layout beschikbaar. Maak een factuur-layout aan in de Layout Designer.
                    </p>
                  </div>
                )}

                {/* Subject */}
                {selected.subject && (
                  <div className="px-4 pt-3 pb-1 border-b">
                    <span className="text-xs text-muted-foreground">Onderwerp: </span>
                    <span className="text-sm font-medium">{resolveTokens(selected.subject)}</span>
                  </div>
                )}

                {/* Body preview */}
                <div className="px-4 py-3 max-h-56 overflow-y-auto">
                  <pre className="text-sm font-sans whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {resolveTokens(selected.body ?? "")}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hidden render area for PDF generation — positioned off-screen */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "794px",
          minHeight: "1123px",
          background: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
          overflow: "visible",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <div ref={hiddenPreviewRef} style={{ width: "794px", minHeight: "1123px" }}>
          {layout && layoutSections.length > 0 && printData && (
            <LayoutPreview
              layout={layout}
              sections={layoutSections}
              printData={printData}
              showMarginOverlays={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
