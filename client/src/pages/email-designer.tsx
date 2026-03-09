import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Save, Trash2, Mail, Copy, AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import type { EmailTemplate } from "@shared/schema";

// ─── Template types ──────────────────────────────────────────────────────────
const TEMPLATE_TYPES = [
  { value: "invoice", label: "Factuur" },
  { value: "quotation", label: "Offerte" },
  { value: "purchase_order", label: "Inkooporder" },
  { value: "packing_list", label: "Paklijst" },
  { value: "work_order", label: "Werkbon" },
  { value: "general", label: "Algemeen" },
];

// ─── Data tables for field insertion (mirrors Layout Designer) ──────────────
const EMAIL_TABLES: { name: string; label: string; fields: { key: string; label: string }[] }[] = [
  {
    name: "invoice", label: "Factuur",
    fields: [
      { key: "number", label: "Factuurnummer" },
      { key: "date", label: "Factuurdatum" },
      { key: "dueDate", label: "Vervaldatum" },
      { key: "totalAmount", label: "Totaalbedrag" },
      { key: "currency", label: "Valuta" },
    ],
  },
  {
    name: "quotation", label: "Offerte",
    fields: [
      { key: "number", label: "Offertenummer" },
      { key: "date", label: "Offertedatum" },
      { key: "validUntil", label: "Geldig tot" },
      { key: "totalAmount", label: "Totaalbedrag" },
    ],
  },
  {
    name: "customer", label: "Klant",
    fields: [
      { key: "name", label: "Bedrijfsnaam" },
      { key: "email", label: "E-mail" },
      { key: "invoiceEmail", label: "Factuur e-mail" },
      { key: "generalEmail", label: "Algemeen e-mail" },
      { key: "phone", label: "Telefoon" },
      { key: "customerNumber", label: "Klantnummer" },
    ],
  },
  {
    name: "contact", label: "Contact",
    fields: [
      { key: "name", label: "Contactnaam" },
      { key: "email", label: "E-mail" },
      { key: "phone", label: "Telefoon" },
    ],
  },
  {
    name: "project", label: "Project",
    fields: [
      { key: "name", label: "Projectnaam" },
      { key: "number", label: "Projectnummer" },
    ],
  },
  {
    name: "company", label: "Bedrijf",
    fields: [
      { key: "name", label: "Bedrijfsnaam" },
      { key: "email", label: "E-mail" },
      { key: "phone", label: "Telefoon" },
      { key: "address", label: "Adres" },
    ],
  },
];

// ─── Field insert panel (exact clone of Layout Designer's DataFieldInsertMenu) ─
function DataFieldInsertPanel({ onInsert }: { onInsert: (token: string) => void }) {
  const [expandedTables, setExpandedTables] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const toggleTable = (name: string) => {
    setExpandedTables((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const lowerSearch = search.toLowerCase();
  const isSearching = lowerSearch.length > 0;

  const filteredTables = EMAIL_TABLES.map((table) => ({
    ...table,
    filteredFields: table.fields.filter(
      (f) =>
        !lowerSearch ||
        f.label.toLowerCase().includes(lowerSearch) ||
        f.key.toLowerCase().includes(lowerSearch)
    ),
  })).filter(
    (table) =>
      !lowerSearch ||
      table.label.toLowerCase().includes(lowerSearch) ||
      table.filteredFields.length > 0
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold">Data invoegen</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Klik om in te voegen</p>
      </div>
      <div className="p-2 border-b bg-muted/20">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek veld..."
          className="h-7 text-xs"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">Geen velden gevonden</div>
        ) : (
          filteredTables.map((table) => {
            const isExpanded = isSearching || expandedTables.includes(table.name);
            return (
              <div key={table.name} className="border-b last:border-b-0">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-muted"
                  onClick={() => toggleTable(table.name)}
                >
                  <span>{table.label}</span>
                  <span className="text-muted-foreground">{isExpanded ? "−" : "+"}</span>
                </button>
                {isExpanded && (
                  <div className="bg-muted/30 px-2 py-1">
                    {table.filteredFields.map((field) => {
                      const token = `{{${table.name}.${field.key}}}`;
                      return (
                        <button
                          key={field.key}
                          type="button"
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-orange-100 rounded flex items-center gap-2"
                          onClick={() => onInsert(token)}
                        >
                          <span className="text-orange-600">+</span>
                          <span>{field.label}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto font-mono">{token}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Cursor insert helper ─────────────────────────────────────────────────────
function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const newPos = start + text.length;
  el.setSelectionRange(newPos, newPos);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmailDesignerPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EmailTemplate>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const focusedFieldRef = useRef<"subject" | "body">("body");

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<EmailTemplate>) => apiRequest("POST", "/api/email-templates", data),
    onSuccess: async (res) => {
      const created = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setSelectedId(created.id);
      setDraft(created);
      setIsDirty(false);
      toast({ title: "Aangemaakt", description: `"${created.name}" aangemaakt.` });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailTemplate> }) =>
      apiRequest("PUT", `/api/email-templates/${id}`, data),
    onSuccess: async (res) => {
      const updated = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setDraft(updated);
      setIsDirty(false);
      toast({ title: "Opgeslagen" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/email-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setSelectedId(null);
      setDraft({});
      setIsDirty(false);
      setDeleteId(null);
      toast({ title: "Verwijderd" });
    },
  });

  const handleSelect = (t: EmailTemplate) => {
    if (isDirty && !window.confirm("Niet-opgeslagen wijzigingen. Doorgaan?")) return;
    setSelectedId(t.id);
    setDraft(t);
    setIsDirty(false);
  };

  const handleNew = () => {
    if (isDirty && !window.confirm("Niet-opgeslagen wijzigingen. Doorgaan?")) return;
    setSelectedId(null);
    setDraft({ name: "Nieuw template", templateType: "invoice", subject: "", body: "" });
    setIsDirty(true);
  };

  const handleChange = (field: keyof EmailTemplate, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!draft.name?.trim()) {
      toast({ title: "Naam verplicht", variant: "destructive" });
      return;
    }
    if (selectedId) {
      saveMutation.mutate({ id: selectedId, data: draft });
    } else {
      createMutation.mutate(draft);
    }
  };

  const handleInsertToken = useCallback((token: string) => {
    if (focusedFieldRef.current === "subject" && subjectRef.current) {
      insertAtCursor(subjectRef.current, token);
      handleChange("subject", subjectRef.current.value);
    } else if (bodyRef.current) {
      insertAtCursor(bodyRef.current, token);
      handleChange("body", bodyRef.current.value);
    }
  }, []);

  const typeLabel = (type: string) =>
    TEMPLATE_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="flex h-[calc(100vh-56px)] bg-gray-50 overflow-hidden">

      {/* ── Left: template list ── */}
      <div className="w-64 flex-shrink-0 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-orange-500" />
            <span className="font-semibold text-sm">Templates</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-50" onClick={handleNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">Laden...</div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-25" />
              <p>Nog geen templates</p>
              <p className="mt-1">Klik + om te beginnen</p>
            </div>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2 transition-colors border-l-2 ${
                  selectedId === t.id
                    ? "border-l-orange-500 bg-orange-50/60"
                    : "border-l-transparent"
                }`}
              >
                <Mail className={`h-3.5 w-3.5 flex-shrink-0 ${selectedId === t.id ? "text-orange-500" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${selectedId === t.id ? "text-orange-700" : ""}`}>{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{typeLabel(t.templateType)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Center: editor ── */}
      {!draft.name && !selectedId ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Selecteer een template</p>
            <p className="text-sm mt-1">of klik + om een nieuw template te maken</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-orange-500" />
              {draft.name || "Nieuw template"}
              {isDirty && <span className="text-xs text-orange-500 font-normal">(niet opgeslagen)</span>}
            </div>
            <div className="flex items-center gap-2">
              {selectedId && (
                <>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      const t = templates.find((x) => x.id === selectedId);
                      if (t) createMutation.mutate({ name: `${t.name} (kopie)`, templateType: t.templateType, subject: t.subject ?? "", body: t.body ?? "" });
                    }}>
                    <Copy className="h-3.5 w-3.5" />
                    Dupliceren
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(selectedId)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Verwijderen
                  </Button>
                </>
              )}
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-orange-500 hover:bg-orange-600"
                onClick={handleSave}
                disabled={saveMutation.isPending || createMutation.isPending}
              >
                <Save className="h-3.5 w-3.5" />
                Opslaan
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Naam</Label>
                <Input
                  value={draft.name ?? ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Naam van het template"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Type</Label>
                <Select value={draft.templateType ?? "invoice"} onValueChange={(v) => handleChange("templateType", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Onderwerp</Label>
              <Input
                ref={subjectRef}
                value={draft.subject ?? ""}
                onChange={(e) => handleChange("subject", e.target.value)}
                onFocus={() => { focusedFieldRef.current = "subject"; }}
                placeholder="Bijv: Factuur {{invoice.number}} — {{customer.name}}"
                className="h-9 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Tekst (body)</Label>
                <span className="text-[10px] text-muted-foreground">Klik op een veld rechts → wordt ingevoegd op cursorpositie</span>
              </div>
              <Textarea
                ref={bodyRef}
                value={draft.body ?? ""}
                onChange={(e) => handleChange("body", e.target.value)}
                onFocus={() => { focusedFieldRef.current = "body"; }}
                placeholder={"Beste {{contact.name}},\n\nHierbij ontvangt u factuur {{invoice.number}} voor de werkzaamheden m.b.t. project {{project.name}}.\n\nMet vriendelijke groet,\n{{company.name}}"}
                className="font-mono text-sm min-h-[320px] resize-y"
              />
            </div>

            {/* Preview */}
            {(draft.subject || draft.body) && (
              <div className="border rounded-lg bg-white overflow-hidden">
                <div className="px-4 py-2 border-b flex items-center gap-2 bg-gray-50">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Voorbeeld (tokens worden ingevuld bij gebruik)</span>
                </div>
                {draft.subject && (
                  <div className="px-4 pt-3 pb-1 border-b">
                    <span className="text-xs text-muted-foreground">Onderwerp: </span>
                    <span className="text-sm font-medium">{draft.subject}</span>
                  </div>
                )}
                {draft.body && (
                  <div className="px-4 py-3">
                    <pre className="text-sm font-sans whitespace-pre-wrap text-gray-700">{draft.body}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Right: data field insert panel (identical to Layout Designer) ── */}
      <div className="w-60 flex-shrink-0 bg-white border-l flex flex-col">
        <DataFieldInsertPanel onInsert={handleInsertToken} />
      </div>

      {deleteId && (
        <SafeDeleteDialog
          open={!!deleteId}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          onConfirm={() => deleteMutation.mutate(deleteId)}
          entityName="email template"
          entityId={deleteId}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
