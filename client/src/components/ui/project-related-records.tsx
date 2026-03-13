import { useQuery } from "@tanstack/react-query";
import { FileText, Receipt, Package, ClipboardList, ExternalLink, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RelatedRecord {
  id: string;
  number: string;
  status: string;
  date: string | null;
  amount: string | null;
  customer_name?: string;
  description?: string;
}

interface RelatedRecordsData {
  quotations: RelatedRecord[];
  quotationRequests: RelatedRecord[];
  invoices: RelatedRecord[];
  proformaInvoices: RelatedRecord[];
  workOrders: RelatedRecord[];
  packingLists: RelatedRecord[];
}

interface ProjectRelatedRecordsProps {
  projectId: string | undefined;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatAmount(amount: string | null): string {
  if (!amount) return "—";
  const num = parseFloat(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(num);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  "in-progress": "bg-blue-100 text-blue-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  accepted: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
};

function openFormTab(formType: string, entityId: string, displayName: string) {
  window.dispatchEvent(
    new CustomEvent("open-form-tab", {
      detail: {
        id: `${formType}-${entityId}`,
        name: displayName,
        formType,
        entityId,
      },
    })
  );
}

function openNewFormTab(formType: string, projectId: string) {
  window.dispatchEvent(
    new CustomEvent("open-form-tab", {
      detail: {
        id: `new-${formType}`,
        name: `Nieuw`,
        formType,
        entityId: undefined,
        initialProjectId: projectId,
      },
    })
  );
}

interface RecordGroupProps {
  title: string;
  icon: React.ReactNode;
  records: RelatedRecord[];
  formType: string;
  showAmount?: boolean;
  descriptionField?: "customer_name" | "description";
  projectId: string;
  newButtonLabel?: string;
}

function RecordGroup({
  title,
  icon,
  records,
  formType,
  showAmount = false,
  descriptionField = "customer_name",
  projectId,
  newButtonLabel,
}: RecordGroupProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-orange-600">{icon}</span>
          <span className="font-medium text-sm text-gray-900">{title}</span>
          {records.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
              {records.length}
            </span>
          )}
        </div>
        {newButtonLabel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            onClick={() => openNewFormTab(formType, projectId)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {newButtonLabel}
          </Button>
        )}
      </div>
      {records.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-400 italic">Geen records gekoppeld aan dit project</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[140px]">Nummer</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Omschrijving</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[90px]">Status</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[105px]">Datum</th>
              {showAmount && (
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 w-[110px]">Bedrag</th>
              )}
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr
                key={record.id}
                className={cn(
                  "border-b border-gray-50 hover:bg-orange-50 cursor-pointer transition-colors",
                  idx === records.length - 1 && "border-b-0"
                )}
                onClick={() => openFormTab(formType, record.id, record.number)}
              >
                <td className="px-4 py-2.5 font-medium text-gray-900">{record.number}</td>
                <td className="px-4 py-2.5 text-gray-600 truncate max-w-[200px]">
                  {record[descriptionField] || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                      STATUS_COLORS[record.status] || "bg-gray-100 text-gray-600"
                    )}
                  >
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{formatDate(record.date)}</td>
                {showAmount && (
                  <td className="px-4 py-2.5 text-right text-gray-700 font-medium">
                    {formatAmount(record.amount)}
                  </td>
                )}
                <td className="px-2 py-2.5 text-gray-400">
                  <ExternalLink className="h-3.5 w-3.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ProjectRelatedRecords({ projectId }: ProjectRelatedRecordsProps) {
  const { data, isLoading } = useQuery<RelatedRecordsData>({
    queryKey: ["/api/projects", projectId, "related-records"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/related-records`);
      if (!res.ok) throw new Error("Failed to fetch related records");
      return res.json();
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="p-6 text-sm text-gray-400 italic">Sla het project eerst op om gerelateerde records te bekijken.</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Gerelateerde records laden...
      </div>
    );
  }

  if (!data) return null;

  const totalCount =
    data.quotations.length +
    data.quotationRequests.length +
    data.invoices.length +
    data.proformaInvoices.length +
    data.workOrders.length +
    data.packingLists.length;

  return (
    <div className="p-4 space-y-4">
      {totalCount === 0 && (
        <div className="text-sm text-gray-400 italic px-1 pb-1">
          Er zijn nog geen documenten gekoppeld aan dit project.
        </div>
      )}

      <RecordGroup
        title="Offertes"
        icon={<FileText className="h-4 w-4" />}
        records={data.quotations}
        formType="quotation"
        showAmount
        descriptionField="customer_name"
        projectId={projectId}
        newButtonLabel="Nieuwe offerte"
      />

      <RecordGroup
        title="Offerteverzoeken"
        icon={<ClipboardList className="h-4 w-4" />}
        records={data.quotationRequests}
        formType="quotation-request"
        descriptionField="customer_name"
        projectId={projectId}
        newButtonLabel="Nieuw verzoek"
      />

      <RecordGroup
        title="Facturen"
        icon={<Receipt className="h-4 w-4" />}
        records={data.invoices}
        formType="invoice"
        showAmount
        descriptionField="customer_name"
        projectId={projectId}
        newButtonLabel="Nieuwe factuur"
      />

      <RecordGroup
        title="Proforma facturen"
        icon={<Receipt className="h-4 w-4" />}
        records={data.proformaInvoices}
        formType="proforma-invoice"
        showAmount
        descriptionField="customer_name"
        projectId={projectId}
      />

      <RecordGroup
        title="Werkbonnen"
        icon={<ClipboardList className="h-4 w-4" />}
        records={data.workOrders}
        formType="work-order"
        descriptionField="description"
        projectId={projectId}
        newButtonLabel="Nieuwe werkbon"
      />

      <RecordGroup
        title="Pakbonnen"
        icon={<Package className="h-4 w-4" />}
        records={data.packingLists}
        formType="packing-list"
        descriptionField="customer_name"
        projectId={projectId}
        newButtonLabel="Nieuwe pakbon"
      />
    </div>
  );
}
