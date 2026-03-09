import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Save, Trash2, Mail, ChevronRight, FileText, ReceiptText,
  Package, User, Building2, FolderOpen, AlertCircle, Copy
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SafeDeleteDialog } from "@/components/ui/safe-delete-dialog";
import type { EmailTemplate } from "@shared/schema";

const TEMPLATE_TYPES = [
  { value: "invoice", label: "Factuur" },
  { value: "quotation", label: "Offerte" },
  { value: "purchase_order", label: "Inkooporder" },
  { value: "packing_list", label: "Paklijst" },
  { value: "work_order", label: "Werkbon" },
  { value: "general", label: "Algemeen" },
];

const DATA_FIELDS: { category: string; icon: any; fields: { token: string; label: string }[] }[] = [
  {
    category: "Factuur",
    icon: ReceiptText,
    fields: [
      { token: "{{invoice.number}}", label: "Factuurnummer" },
      { token: "{{invoice.date}}", label: "Factuurdatum" },
      { token: "{{invoice.dueDate}}", label: "Vervaldatum" },
      { token: "{{invoice.totalAmount}}", label: "Totaalbedrag" },
      { token: "{{invoice.currency}}", label: "Valuta" },
    ],
  },
  {
    category: "Offerte",
    icon: FileText,
    fields: [
      { token: "{{quotation.number}}", label: "Offertenummer" },
      { token: "{{quotation.date}}", label: "Offertedatum" },
      { token: "{{quotation.totalAmount}}", label: "Totaalbedrag" },
    ],
  },
  {
    category: "Klant",
    icon: Building2,
    fields: [
      { token: "{{customer.name}}", label: "Bedrijfsnaam" },
      { token: "{{customer.email}}", label: "E-mail" },
      { token: "{{customer.invoiceEmail}}", label: "Factuur e-mail" },
      { token: "{{customer.generalEmail}}", label: "Algemeen e-mail" },
      { token: "{{customer.phone}}", label: "Telefoon" },
    ],
  },
  {
    category: "Contact",
    icon: User,
    fields: [
      { token: "{{contact.name}}", label: "Contactnaam" },
      { token: "{{contact.email}}", label: "Contacte-mail" },
      { token: "{{contact.phone}}", label: "Contacttelefoon" },
    ],
  },
  {
    category: "Project",
    icon: FolderOpen,
    fields: [
      { token: "{{project.name}}", label: "Projectnaam" },
      { token: "{{project.number}}", label: "Projectnummer" },
    ],
  },
  {
    category: "Bedrijf",
    icon: Building2,
    fields: [
      { token: "{{company.name}}", label: "Bedrijfsnaam" },
      { token: "{{company.email}}", label: "E-mail" },
      { token: "{{company.phone}}", label: "Telefoon" },
      { token: "{{company.address}}", label: "Adres" },
    ],
  },
];

function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  el.value = before + text + after;
  const newPos = start + text.length;
  el.setSelectionRange(newPos, newPos);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
}

export default function EmailDesignerPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EmailTemplate>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Factuur");

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
      toast({ title: "Aangemaakt", description: `Template "${created.name}" aangemaakt.` });
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
      toast({ title: "Opgeslagen", description: "Template opgeslagen." });
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
      toast({ title: "Verwijderd", description: "Template verwijderd." });
    },
  });

  const handleSelect = (t: EmailTemplate) => {
    if (isDirty) {
      const ok = window.confirm("Je hebt niet-opgeslagen wijzigingen. Wil je doorgaan?");
      if (!ok) return;
    }
    setSelectedId(t.id);
    setDraft(t);
    setIsDirty(false);
  };

  const handleNew = () => {
    if (isDirty) {
      const ok = window.confirm("Je hebt niet-opgeslagen wijzigingen. Wil je doorgaan?");
      if (!ok) return;
    }
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

  const handleDuplicate = async (t: EmailTemplate) => {
    createMutation.mutate({
      name: `${t.name} (kopie)`,
      templateType: t.templateType,
      subject: t.subject ?? "",
      body: t.body ?? "",
    });
  };

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
                  <p className={`text-xs font-medium truncate ${selectedId === t.id ? "text-orange-700" : ""}`}>
                    {t.name}
                  </p>
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
                    onClick={() => { const t = templates.find(x => x.id === selectedId); if (t) handleDuplicate(t); }}>
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
              <Button size="sm" className="h-8 gap-1.5 bg-orange-500 hover:bg-orange-600"
                onClick={handleSave}
                disabled={saveMutation.isPending || createMutation.isPending}>
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
                <span className="text-[10px] text-muted-foreground">Klik op een veld rechts om het in te voegen op de cursorpositie</span>
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
              <div className="border rounded-lg bg-white">
                <div className="px-4 py-2 border-b flex items-center gap-2 bg-gray-50 rounded-t-lg">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Voorbeeld (tokens worden ingevuld bij gebruik)</span>
                </div>
                {draft.subject && (
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs text-muted-foreground">Onderwerp: </span>
                    <span className="text-sm font-medium">{draft.subject}</span>
                  </div>
                )}
                {draft.body && (
                  <div className="px-4 pb-3 pt-1">
                    <pre className="text-sm font-sans whitespace-pre-wrap text-gray-700">{draft.body}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Right: data fields panel ── */}
      <div className="w-56 flex-shrink-0 bg-white border-l flex flex-col">
        <div className="p-3 border-b">
          <p className="text-xs font-semibold text-gray-700">Data invoegen</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Klik om in te voegen</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {DATA_FIELDS.map(({ category, icon: Icon, fields }) => (
            <div key={category}>
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {category}
                </div>
                <ChevronRight className={`h-3 w-3 transition-transform ${expandedCategory === category ? "rotate-90" : ""}`} />
              </button>
              {expandedCategory === category && (
                <div className="bg-gray-50/60 pb-1">
                  {fields.map(({ token, label }) => (
                    <button
                      key={token}
                      onClick={() => handleInsertToken(token)}
                      className="w-full text-left px-4 py-1.5 hover:bg-orange-50 group transition-colors"
                    >
                      <p className="text-[10px] text-muted-foreground group-hover:text-orange-600">{label}</p>
                      <p className="text-[10px] font-mono text-gray-400 group-hover:text-orange-500">{token}</p>
                    </button>
                  ))}
                </div>
              )}
              <Separator />
            </div>
          ))}
        </div>
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
