import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, type ColumnConfig, createIdColumn } from "@/components/layouts/DataTableLayout";
import { useDataTable } from "@/hooks/useDataTable";
import { useEntityDelete } from "@/hooks/useEntityDelete";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import type { SerialNumber, Customer, Project } from "@shared/schema";

// ── enriched type ──────────────────────────────────────────────────────────

interface EnrichedSerialNumber extends SerialNumber {
  customerName: string;
  projectRef: string;
  formattedDate: string;
}

// ── column config ──────────────────────────────────────────────────────────

const defaultColumns: ColumnConfig[] = [
  {
    key: "serialNo",
    label: "Serial no.",
    visible: true,
    width: 110,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-mono text-xs font-semibold text-slate-700">{value}</span>
    ),
  },
  {
    key: "model",
    label: "Model",
    visible: true,
    width: 130,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-mono text-xs">{value || "—"}</span>
    ),
  },
  {
    key: "customerName",
    label: "Customer",
    visible: true,
    width: 200,
    filterable: true,
    sortable: true,
  },
  {
    key: "projectRef",
    label: "Related project",
    visible: true,
    width: 140,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-mono text-xs text-slate-600">{value || "N.A."}</span>
    ),
  },
  {
    key: "comment",
    label: "Comment",
    visible: true,
    width: 200,
    filterable: true,
    sortable: false,
    renderCell: (value: string) => <span className="text-xs">{value || ""}</span>,
  },
  {
    key: "fileNo",
    label: "File no.",
    visible: true,
    width: 100,
    filterable: true,
    sortable: true,
    renderCell: (value: string) => (
      <span className="font-mono text-xs">{value || "—"}</span>
    ),
  },
  {
    key: "formattedDate",
    label: "Date",
    visible: true,
    width: 110,
    filterable: false,
    sortable: true,
    renderCell: (value: string) => (
      <span className="text-xs text-slate-600">{value || "—"}</span>
    ),
  },
  {
    key: "notes",
    label: "Notes",
    visible: true,
    width: 200,
    filterable: true,
    sortable: false,
    renderCell: (value: string) => <span className="text-xs text-slate-500">{value || ""}</span>,
  },
];

// ── form sheet ─────────────────────────────────────────────────────────────

interface FormSheetProps {
  open: boolean;
  onClose: () => void;
  record?: SerialNumber | null;
  customers: Customer[];
  projects: Project[];
}

function SerialNumberFormSheet({ open, onClose, record, customers, projects }: FormSheetProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!record;

  const [serialNo, setSerialNo] = useState("");
  const [model, setModel] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [comment, setComment] = useState("");
  const [fileNo, setFileNo] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [calOpen, setCalOpen] = useState(false);

  React.useEffect(() => {
    if (open) {
      setSerialNo(record?.serialNo ?? "");
      setModel(record?.model ?? "");
      setCustomerId(record?.customerId ?? "");
      setProjectId(record?.projectId ?? "");
      setComment(record?.comment ?? "");
      setFileNo(record?.fileNo ?? "");
      setDate(record?.date ? new Date(record.date) : undefined);
      setNotes(record?.notes ?? "");
    }
  }, [open, record]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        serialNo: serialNo.trim(),
        model: model.trim() || null,
        customerId: customerId || null,
        projectId: projectId || null,
        comment: comment.trim() || null,
        fileNo: fileNo.trim() || null,
        date: date ? date.toISOString() : null,
        notes: notes.trim() || null,
      };
      if (isEdit) return apiRequest("PATCH", `/api/serial-numbers/${record!.id}`, payload);
      return apiRequest("POST", "/api/serial-numbers", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/serial-numbers"] });
      toast({ title: isEdit ? "Serienummer bijgewerkt" : "Serienummer aangemaakt" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serialNo.trim()) {
      toast({ title: "Serial no. is verplicht", variant: "destructive" });
      return;
    }
    mutation.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b bg-slate-50">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Hash className="h-5 w-5 text-orange-500" />
            {isEdit ? "Serienummer bewerken" : "Nieuw serienummer"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Serial no. <span className="text-red-500">*</span></Label>
                <Input
                  value={serialNo}
                  onChange={e => setSerialNo(e.target.value)}
                  placeholder="bijv. 2025001"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="bijv. ATEMDB2"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Klant</Label>
              <Select value={customerId || "__none__"} onValueChange={v => setCustomerId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="— Geen klant —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Geen klant —</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Gerelateerd project</Label>
              <Select value={projectId || "__none__"} onValueChange={v => setProjectId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="— Geen project —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Geen project —</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-mono text-xs text-slate-500 mr-2">{p.projectNumber}</span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>File no.</Label>
                <Input
                  value={fileNo}
                  onChange={e => setFileNo(e.target.value)}
                  placeholder="Dossiernummer"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Datum</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !date && "text-slate-400")}>
                      {date ? format(date, "d MMM yyyy", { locale: nl }) : "Kies datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={d => { setDate(d); setCalOpen(false); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Comment</Label>
              <Input
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Opmerking"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Extra notities..."
                rows={3}
              />
            </div>

          </div>

          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isEdit ? "Opslaan" : "Aanmaken"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function SerialNumbers() {
  const { data: records = [], isLoading } = useQuery<SerialNumber[]>({
    queryKey: ["/api/serial-numbers"],
  });
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
  });
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 60000,
  });

  const customerMap = useMemo(() => {
    const m = new Map<string, string>();
    customers.forEach(c => m.set(c.id, c.name));
    return m;
  }, [customers]);

  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach(p => m.set(p.id, p.projectNumber));
    return m;
  }, [projects]);

  const enriched: EnrichedSerialNumber[] = useMemo(() => {
    return records.map(r => ({
      ...r,
      customerName: r.customerId ? (customerMap.get(r.customerId) ?? "—") : "—",
      projectRef: r.projectId ? (projectMap.get(r.projectId) ?? "N.A.") : "N.A.",
      formattedDate: r.date ? format(new Date(r.date), "d-MM-yy") : "",
    }));
  }, [records, customerMap, projectMap]);

  const tableState = useDataTable({
    defaultColumns,
    defaultSort: { column: "serialNo", direction: "asc" },
    tableKey: "serial-numbers",
  });

  const del = useEntityDelete<EnrichedSerialNumber>({
    endpoint: "/api/serial-numbers",
    queryKeys: ["/api/serial-numbers"],
    entityLabel: "Serienummer",
    checkUsages: false,
    getName: (r) => r.serialNo,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SerialNumber | null>(null);

  function openNew() { setEditRecord(null); setSheetOpen(true); }
  function openEdit(r: EnrichedSerialNumber) { setEditRecord(r); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); setEditRecord(null); }

  const handleToggleAllRows = () => {
    const allIds = enriched.map(r => r.id);
    tableState.toggleAllRows(allIds);
  };

  return (
    <div className="p-6">
      <DataTableLayout
        data={enriched}
        isLoading={isLoading}
        tableKey="serial-numbers"
        getRowId={(r: EnrichedSerialNumber) => r.id}

        columns={tableState.columns}
        setColumns={tableState.setColumns}

        searchTerm={tableState.searchTerm}
        setSearchTerm={tableState.setSearchTerm}
        filters={tableState.filters}
        setFilters={tableState.setFilters}
        onAddFilter={tableState.addFilter}
        onUpdateFilter={tableState.updateFilter}
        onRemoveFilter={tableState.removeFilter}

        sortConfig={tableState.sortConfig}
        onSort={tableState.handleSort}

        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={handleToggleAllRows}

        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enriched),
          itemCount: tableState.selectedRows.length,
        }}

        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}

        entityName="Serienummer"
        entityNamePlural="Serienummers"

        headerActions={[
          {
            key: "add",
            label: "Toevoegen",
            icon: <Plus className="h-4 w-4" />,
            onClick: openNew,
            variant: "default" as const,
          },
        ]}

        rowActions={(r: EnrichedSerialNumber) => [
          {
            key: "edit",
            label: "Bewerken",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => openEdit(r),
            variant: "outline" as const,
          },
          {
            key: "delete",
            label: "Verwijderen",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(r),
            variant: "destructive" as const,
          },
        ]}

        onRowDoubleClick={openEdit}
      />

      <SerialNumberFormSheet
        open={sheetOpen}
        onClose={closeSheet}
        record={editRecord}
        customers={customers}
        projects={projects}
      />

      {del.renderDeleteDialogs()}
    </div>
  );
}
