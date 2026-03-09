import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrintLayoutDialog } from "./PrintLayoutDialog";
import { Mail, ExternalLink, FileDown, AlertCircle } from "lucide-react";
import type { EmailTemplate, Invoice, Customer } from "@shared/schema";

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
  try {
    return new Date(value).toLocaleDateString("nl-NL");
  } catch {
    return String(value);
  }
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(num);
}

interface InvoiceEmailPanelProps {
  invoiceId: string;
}

export function InvoiceEmailPanel({ invoiceId }: InvoiceEmailPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

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

  const invoiceTemplates = templates.filter((t) => t.templateType === "invoice");
  const selected = invoiceTemplates.find((t) => t.id === selectedTemplateId) ?? invoiceTemplates[0] ?? null;

  useEffect(() => {
    if (invoiceTemplates.length > 0 && (!selectedTemplateId || !invoiceTemplates.find((t) => t.id === selectedTemplateId))) {
      setSelectedTemplateId(invoiceTemplates[0].id);
    }
  }, [invoiceTemplates.length]);

  // Token resolution — all invoice + customer + contact tokens
  const resolveTokens = (text: string): string => {
    if (!text) return "";

    // Invoice tokens
    let result = text
      .replace(/\{\{invoice\.invoiceNumber\}\}/g, invoice?.invoiceNumber ?? "")
      .replace(/\{\{invoice\.invoiceDate\}\}/g, formatDate(invoice?.invoiceDate))
      .replace(/\{\{invoice\.dueDate\}\}/g, formatDate(invoice?.dueDate))
      .replace(/\{\{invoice\.status\}\}/g, invoice?.status ?? "")
      .replace(/\{\{invoice\.subtotal\}\}/g, formatCurrency(invoice?.subtotal))
      .replace(/\{\{invoice\.taxAmount\}\}/g, formatCurrency(invoice?.taxAmount))
      .replace(/\{\{invoice\.totalAmount\}\}/g, formatCurrency(invoice?.totalAmount))
      .replace(/\{\{invoice\.paidAmount\}\}/g, formatCurrency(invoice?.paidAmount))
      .replace(/\{\{invoice\.notes\}\}/g, invoice?.notes ?? "");

    // Customer tokens
    result = result
      .replace(/\{\{customer\.customerNumber\}\}/g, (customer as any)?.customerNumber ?? "")
      .replace(/\{\{customer\.name\}\}/g, customer?.name ?? "")
      .replace(/\{\{customer\.email\}\}/g, customer?.email ?? "")
      .replace(/\{\{customer\.generalEmail\}\}/g, (customer as any)?.generalEmail ?? "")
      .replace(/\{\{customer\.invoiceEmail\}\}/g, (customer as any)?.invoiceEmail ?? "")
      .replace(/\{\{customer\.contactPersonEmail\}\}/g, (customer as any)?.contactPersonEmail ?? "")
      .replace(/\{\{customer\.phone\}\}/g, customer?.phone ?? "")
      .replace(/\{\{customer\.mobile\}\}/g, (customer as any)?.mobile ?? "")
      .replace(/\{\{customer\.taxId\}\}/g, (customer as any)?.taxId ?? "")
      .replace(/\{\{customer\.bankAccount\}\}/g, (customer as any)?.bankAccount ?? "")
      .replace(/\{\{customer\.memo\}\}/g, (customer as any)?.memo ?? "");

    // Contact tokens (use customer contact person data)
    result = result
      .replace(/\{\{contact\.name\}\}/g, (customer as any)?.primaryContactName ?? customer?.name ?? "")
      .replace(/\{\{contact\.email\}\}/g, (customer as any)?.primaryContactEmail ?? customer?.email ?? "")
      .replace(/\{\{contact\.phone\}\}/g, (customer as any)?.primaryContactPhone ?? customer?.phone ?? "");

    // Company tokens (own company — placeholders, can be extended later)
    result = result
      .replace(/\{\{company\.name\}\}/g, "ATE Solutions")
      .replace(/\{\{company\.email\}\}/g, "")
      .replace(/\{\{company\.phone\}\}/g, "")
      .replace(/\{\{company\.address\}\}/g, "")
      .replace(/\{\{company\.website\}\}/g, "")
      .replace(/\{\{company\.taxId\}\}/g, "")
      .replace(/\{\{company\.iban\}\}/g, "");

    return result;
  };

  const handleOpenOutlook = () => {
    if (!selected) return;
    const to = (customer as any)?.invoiceEmail || customer?.email || "";
    const subject = encodeURIComponent(resolveTokens(selected.subject ?? ""));
    const body = encodeURIComponent(resolveTokens(selected.body ?? ""));
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const handleOpenDesigner = () => {
    window.dispatchEvent(
      new CustomEvent("open-form-tab", {
        detail: { id: "email-designer", name: "E-mail Designer", type: "page", menuRoute: "/email-designer" },
      })
    );
  };

  if (invoiceTemplates.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-lg bg-gray-50">
        <Mail className="h-10 w-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm font-medium">Geen e-mailtemplates voor facturen</p>
        <p className="text-xs mt-1">Maak templates aan via Tools → E-mail Designer</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 gap-1.5 text-orange-500 border-orange-200"
          onClick={handleOpenDesigner}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Naar E-mail Designer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Template selector row */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium w-[130px] text-right flex-shrink-0">Template</Label>
        <Select
          value={selected?.id ?? ""}
          onValueChange={setSelectedTemplateId}
        >
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder="Selecteer template..." />
          </SelectTrigger>
          <SelectContent>
            {invoiceTemplates.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
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
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplateId(t.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 border-l-2 ${
                  selected?.id === t.id
                    ? "border-l-orange-500 bg-orange-50/50"
                    : "border-l-transparent"
                }`}
              >
                <p className={`text-xs font-medium ${selected?.id === t.id ? "text-orange-700" : ""}`}>{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{TEMPLATE_TYPE_LABELS[t.templateType] ?? t.templateType}</p>
              </button>
            ))}
          </div>

          {/* Preview + actions */}
          <div className="border rounded-lg bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-700">{selected.name}</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={() => setPrintOpen(true)}
                  disabled={!invoiceId}
                >
                  <FileDown className="h-3 w-3" />
                  PDF downloaden
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs bg-orange-500 hover:bg-orange-600"
                  onClick={handleOpenOutlook}
                >
                  <Mail className="h-3 w-3" />
                  Versturen via Outlook
                </Button>
              </div>
            </div>

            {/* Attachment note */}
            <div className="px-4 py-2 border-b bg-amber-50 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">
                Download de PDF eerst, dan opent Outlook met de ingevulde tekst. Voeg de PDF daarna handmatig als bijlage toe.
              </p>
            </div>

            {/* Subject */}
            {selected.subject && (
              <div className="px-4 pt-3 pb-1 border-b">
                <span className="text-xs text-muted-foreground">Onderwerp: </span>
                <span className="text-sm font-medium">{resolveTokens(selected.subject)}</span>
              </div>
            )}

            {/* Body */}
            <div className="px-4 py-3 max-h-64 overflow-y-auto">
              <pre className="text-sm font-sans whitespace-pre-wrap text-gray-700 leading-relaxed">
                {resolveTokens(selected.body ?? "")}
              </pre>
            </div>
          </div>
        </div>
      )}

      <PrintLayoutDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        documentType="invoice"
        entityId={invoiceId}
      />
    </div>
  );
}
