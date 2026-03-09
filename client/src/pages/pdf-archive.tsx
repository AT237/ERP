import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Archive, Printer, Trash2, Search, ExternalLink, FileText,
  Calendar, Users, FolderOpen, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import type { PdfArchiveEntry } from "@shared/schema";

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Factuur",
  quotation: "Offerte",
  packing_list: "Paklijst",
  "packing-list": "Paklijst",
  work_order: "Werkbon",
  "work-order": "Werkbon",
  purchase_order: "Inkooporder",
  "purchase-order": "Inkooporder",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  quotation: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  packing_list: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "packing-list": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  work_order: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "work-order": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

export default function PdfArchivePage() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<PdfArchiveEntry[]>({
    queryKey: ["/api/pdf-archive"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/pdf-archive/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-archive"] });
      toast({ title: "Verwijderd", description: "PDF archief entry verwijderd." });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Fout", description: "Verwijderen mislukt.", variant: "destructive" });
    },
  });

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.documentNumber?.toLowerCase().includes(q) ||
      e.customerName?.toLowerCase().includes(q) ||
      e.projectName?.toLowerCase().includes(q) ||
      e.workOrderNumbers?.toLowerCase().includes(q) ||
      e.layoutName?.toLowerCase().includes(q) ||
      e.documentType?.toLowerCase().includes(q)
    );
  });

  const handleReprint = (entry: PdfArchiveEntry) => {
    if (entry.printUrl) {
      window.open(entry.printUrl, "_blank");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">PDF Database</h1>
                <p className="text-orange-100 text-sm mt-0.5">
                  Overzicht van alle afgedrukte documenten waarvoor toestemming is gegeven voor opslag
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Totaal", value: entries.length, icon: Archive, color: "text-orange-500" },
          { label: "Facturen", value: entries.filter(e => e.documentType === 'invoice').length, icon: FileText, color: "text-blue-500" },
          { label: "Offertes", value: entries.filter(e => e.documentType === 'quotation').length, icon: FileText, color: "text-green-500" },
          { label: "Overig", value: entries.filter(e => !['invoice','quotation'].includes(e.documentType)).length, icon: FileText, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-500" />
              Opgeslagen PDF's
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Archive className="h-10 w-10 mx-auto mb-2 opacity-30 animate-pulse" />
              <p className="text-sm">Laden...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium">
                {search ? "Geen resultaten gevonden" : "Geen PDF's opgeslagen"}
              </p>
              <p className="text-sm mt-1">
                {search
                  ? "Probeer een andere zoekterm"
                  : "Gebruik 'Akkoord en printen' om documenten op te slaan"}
              </p>
            </div>
          ) : (
            <div className="rounded-b-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                    <TableHead className="w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Datum
                      </div>
                    </TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[130px]">Nummer</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Klant
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Project
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Werkbon nr.
                      </div>
                    </TableHead>
                    <TableHead>Lay-out</TableHead>
                    <TableHead className="w-[100px] text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {entry.printedAt
                          ? format(new Date(entry.printedAt), "dd-MM-yyyy HH:mm", { locale: nl })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[entry.documentType] ?? "bg-gray-100 text-gray-700"}`}>
                          {DOC_TYPE_LABELS[entry.documentType] ?? entry.documentType}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {entry.documentNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.customerName ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.projectName ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {entry.workOrderNumbers ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.layoutName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                            onClick={() => handleReprint(entry)}
                            title="Opnieuw printen"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteId(entry.id)}
                            title="Verwijderen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {deleteId && (
        <SafeDeleteDialog
          open={!!deleteId}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          onConfirm={() => deleteMutation.mutate(deleteId)}
          entityName="PDF archief entry"
          entityId={deleteId}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
