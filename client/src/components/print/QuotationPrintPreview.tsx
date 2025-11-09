import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface QuotationPrintData {
  quotation: {
    number: string;
    date: Date | null;
    validUntil: Date | null;
    description: string | null;
    revisionNumber: string | null;
    status: string | null;
    subtotal: string;
    taxAmount: string | null;
    totalAmount: string;
    incoTerms: string | null;
    paymentConditions: string | null;
    deliveryConditions: string | null;
    notes: string | null;
  };
  customer: {
    name: string;
    customerNumber: string;
    email: string | null;
    phone: string | null;
    address: {
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
      country: string;
    } | null;
  } | null;
  project: {
    name: string;
    projectNumber: string;
    description: string | null;
  } | null;
  company: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: {
      street: string | null;
      houseNumber: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    };
    kvkNummer: string | null;
    btwNummer: string | null;
    bankAccount: string | null;
    bankName: string | null;
  } | null;
}

interface QuotationPrintPreviewProps {
  quotationId: string;
  onLoadingChange?: (isLoading: boolean) => void;
}

export function QuotationPrintPreview({ quotationId, onLoadingChange }: QuotationPrintPreviewProps) {
  const { data: printData, isLoading } = useQuery<QuotationPrintData>({
    queryKey: ["/api/quotations", quotationId, "print-data"],
    queryFn: async () => {
      const response = await fetch(`/api/quotations/${quotationId}/print-data`);
      if (!response.ok) {
        throw new Error('Failed to fetch quotation print data');
      }
      return response.json();
    },
  });

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!printData) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No quotation data found</p>
      </Card>
    );
  }

  const { quotation, customer, project, company } = printData;

  // Format currency helper
  const formatCurrency = (value: string | null) => {
    if (!value) return "€ 0,00";
    const num = parseFloat(value);
    if (isNaN(num)) return "€ 0,00";
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(num);
  };

  // Format date helper
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMMM yyyy", { locale: nl });
  };

  return (
    <div
      id="print-preview"
      className="bg-white text-black p-8 mx-auto"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "10pt",
      }}
    >
      {/* Header Section */}
      <div className="flex justify-between mb-8 pb-4 border-b border-gray-300">
        {/* Company Info */}
        <div className="w-1/2">
          {company?.logoUrl && (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-16 mb-4 object-contain"
              style={{ maxWidth: "200px" }}
            />
          )}
          <div className="text-sm">
            <p className="font-bold text-base">{company?.name}</p>
            {company?.address && (
              <>
                <p>
                  {company.address.street} {company.address.houseNumber}
                </p>
                <p>
                  {company.address.postalCode} {company.address.city}
                </p>
                {company.address.country && <p>{company.address.country}</p>}
              </>
            )}
            {company?.phone && <p>Tel: {company.phone}</p>}
            {company?.email && <p>Email: {company.email}</p>}
            {company?.website && <p>Web: {company.website}</p>}
            {company?.kvkNummer && <p>KVK: {company.kvkNummer}</p>}
            {company?.btwNummer && <p>BTW: {company.btwNummer}</p>}
          </div>
        </div>

        {/* Document Info */}
        <div className="w-1/2 text-right">
          <h1 className="text-2xl font-bold text-orange-600 mb-2">OFFERTE</h1>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-semibold">Nummer:</span> {quotation.number}
            </p>
            <p>
              <span className="font-semibold">Datum:</span>{" "}
              {formatDate(quotation.date)}
            </p>
            {quotation.validUntil && (
              <p>
                <span className="font-semibold">Geldig tot:</span>{" "}
                {formatDate(quotation.validUntil)}
              </p>
            )}
            {quotation.revisionNumber && (
              <p>
                <span className="font-semibold">Revisie:</span>{" "}
                {quotation.revisionNumber}
              </p>
            )}
            {project && (
              <p>
                <span className="font-semibold">Project:</span> {project.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      {customer && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Klant</h2>
          <div className="text-sm">
            <p className="font-semibold">{customer.name}</p>
            {customer.address && (
              <>
                <p>
                  {customer.address.street} {customer.address.houseNumber}
                </p>
                <p>
                  {customer.address.postalCode} {customer.address.city}
                </p>
                {customer.address.country && <p>{customer.address.country}</p>}
              </>
            )}
            {customer.email && <p>Email: {customer.email}</p>}
            {customer.phone && <p>Tel: {customer.phone}</p>}
          </div>
        </div>
      )}

      {/* Description */}
      {quotation.description && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Omschrijving</h2>
          <p className="text-sm whitespace-pre-wrap">{quotation.description}</p>
        </div>
      )}

      {/* Line Items - Placeholder for now */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-2">Artikelen</h2>
        <p className="text-sm text-gray-500 italic">
          Line items table will be rendered here
        </p>
      </div>

      {/* Totals Section */}
      <div className="mt-8 flex justify-end">
        <div className="w-1/2">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-gray-300">
                <td className="py-2 font-semibold">Subtotaal:</td>
                <td className="py-2 text-right">
                  {formatCurrency(quotation.subtotal)}
                </td>
              </tr>
              {quotation.taxAmount && parseFloat(quotation.taxAmount) > 0 && (
                <tr>
                  <td className="py-2 font-semibold">BTW:</td>
                  <td className="py-2 text-right">
                    {formatCurrency(quotation.taxAmount)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-400">
                <td className="py-2 font-bold">Totaal:</td>
                <td className="py-2 text-right font-bold">
                  {formatCurrency(quotation.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Conditions */}
      {(quotation.paymentConditions ||
        quotation.deliveryConditions ||
        quotation.incoTerms) && (
        <div className="mt-8 text-sm">
          <h2 className="font-semibold mb-2">Voorwaarden</h2>
          {quotation.paymentConditions && (
            <p className="mb-1">
              <span className="font-semibold">Betaling:</span>{" "}
              {quotation.paymentConditions}
            </p>
          )}
          {quotation.deliveryConditions && (
            <p className="mb-1">
              <span className="font-semibold">Levering:</span>{" "}
              {quotation.deliveryConditions}
            </p>
          )}
          {quotation.incoTerms && (
            <p className="mb-1">
              <span className="font-semibold">Incoterms:</span>{" "}
              {quotation.incoTerms}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {quotation.notes && (
        <div className="mt-6 text-sm">
          <h2 className="font-semibold mb-2">Opmerkingen</h2>
          <p className="whitespace-pre-wrap">{quotation.notes}</p>
        </div>
      )}

      {/* Footer */}
      {company?.bankAccount && (
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
          <p>
            <span className="font-semibold">Bankrekening:</span>{" "}
            {company.bankAccount}
            {company.bankName && ` - ${company.bankName}`}
          </p>
        </div>
      )}
    </div>
  );
}
