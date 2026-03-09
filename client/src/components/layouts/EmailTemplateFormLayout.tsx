import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LayoutForm2, FormSection2, FormField2, createFieldRow } from "./LayoutForm2";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmailTemplateSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmailTemplate } from "@shared/schema";
import { z } from "zod";

// ─── Schema ───────────────────────────────────────────────────────────────────
const emailTemplateFormSchema = insertEmailTemplateSchema.extend({
  name: z.string().min(1, "Naam is verplicht"),
  templateType: z.string().min(1, "Type is verplicht"),
});
type EmailTemplateFormData = z.infer<typeof emailTemplateFormSchema>;

// ─── Template types ──────────────────────────────────────────────────────────
const TEMPLATE_TYPES = [
  { value: "invoice", label: "Factuur" },
  { value: "quotation", label: "Offerte" },
  { value: "purchase_order", label: "Inkooporder" },
  { value: "packing_list", label: "Paklijst" },
  { value: "work_order", label: "Werkbon" },
  { value: "general", label: "Algemeen" },
];

// ─── Data field tables (same data as email-designer.tsx) ────────────────────
const EMAIL_TABLES: { name: string; label: string; fields: { key: string; label: string }[] }[] = [
  {
    name: "invoice", label: "Factuur",
    fields: [
      { key: "invoiceNumber", label: "Factuurnummer" },
      { key: "invoiceDate", label: "Factuurdatum" },
      { key: "dueDate", label: "Vervaldatum" },
      { key: "status", label: "Status" },
      { key: "subtotal", label: "Subtotaal" },
      { key: "taxAmount", label: "BTW bedrag" },
      { key: "totalAmount", label: "Totaalbedrag" },
      { key: "paidAmount", label: "Betaald bedrag" },
      { key: "notes", label: "Notities" },
    ],
  },
  {
    name: "quotation", label: "Offerte",
    fields: [
      { key: "quotationNumber", label: "Offertenummer" },
      { key: "quotationDate", label: "Offertedatum" },
      { key: "validUntil", label: "Geldig tot" },
      { key: "validityDays", label: "Geldig (dagen)" },
      { key: "revisionNumber", label: "Revisie nr." },
      { key: "status", label: "Status" },
      { key: "subtotal", label: "Subtotaal" },
      { key: "taxAmount", label: "BTW bedrag" },
      { key: "totalAmount", label: "Totaalbedrag" },
      { key: "notes", label: "Notities" },
    ],
  },
  {
    name: "workOrder", label: "Werkbon",
    fields: [
      { key: "orderNumber", label: "Werkorder nr." },
      { key: "title", label: "Titel" },
      { key: "description", label: "Omschrijving" },
      { key: "assignedTo", label: "Toegewezen aan" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Prioriteit" },
      { key: "startDate", label: "Startdatum" },
      { key: "dueDate", label: "Vervaldatum" },
      { key: "completedDate", label: "Afgerond op" },
      { key: "estimatedHours", label: "Geschatte uren" },
      { key: "actualHours", label: "Werkelijke uren" },
    ],
  },
  {
    name: "purchaseOrder", label: "Inkooporder",
    fields: [
      { key: "orderNumber", label: "Order nr." },
      { key: "orderDate", label: "Orderdatum" },
      { key: "expectedDate", label: "Verwachte datum" },
      { key: "status", label: "Status" },
      { key: "subtotal", label: "Subtotaal" },
      { key: "taxAmount", label: "BTW bedrag" },
      { key: "totalAmount", label: "Totaalbedrag" },
      { key: "notes", label: "Notities" },
    ],
  },
  {
    name: "salesOrder", label: "Verkooporder",
    fields: [
      { key: "orderNumber", label: "Order nr." },
      { key: "orderDate", label: "Orderdatum" },
      { key: "expectedDeliveryDate", label: "Verwachte levering" },
      { key: "status", label: "Status" },
      { key: "subtotal", label: "Subtotaal" },
      { key: "taxAmount", label: "BTW bedrag" },
      { key: "totalAmount", label: "Totaalbedrag" },
      { key: "notes", label: "Notities" },
    ],
  },
  {
    name: "packingList", label: "Paklijst",
    fields: [
      { key: "packingNumber", label: "Paklijst nr." },
      { key: "status", label: "Status" },
      { key: "shippingAddress", label: "Verzendadres" },
      { key: "shippingMethod", label: "Verzendmethode" },
      { key: "trackingNumber", label: "Track & Trace" },
      { key: "weight", label: "Gewicht" },
      { key: "notes", label: "Notities" },
    ],
  },
  {
    name: "customer", label: "Klant",
    fields: [
      { key: "customerNumber", label: "Klantnummer" },
      { key: "name", label: "Bedrijfsnaam" },
      { key: "email", label: "E-mail" },
      { key: "generalEmail", label: "Algemeen e-mail" },
      { key: "invoiceEmail", label: "Factuur e-mail" },
      { key: "contactPersonEmail", label: "Contactpersoon e-mail" },
      { key: "phone", label: "Telefoon" },
      { key: "mobile", label: "Mobiel" },
      { key: "taxId", label: "BTW nummer" },
      { key: "bankAccount", label: "Bankrekening" },
      { key: "memo", label: "Memo" },
    ],
  },
  {
    name: "supplier", label: "Leverancier",
    fields: [
      { key: "supplierNumber", label: "Leveranciersnummer" },
      { key: "name", label: "Bedrijfsnaam" },
      { key: "email", label: "E-mail" },
      { key: "phone", label: "Telefoon" },
      { key: "contactPerson", label: "Contactpersoon" },
      { key: "taxId", label: "BTW nummer" },
    ],
  },
  {
    name: "project", label: "Project",
    fields: [
      { key: "projectNumber", label: "Projectnummer" },
      { key: "name", label: "Projectnaam" },
      { key: "description", label: "Omschrijving" },
      { key: "status", label: "Status" },
      { key: "startDate", label: "Startdatum" },
      { key: "endDate", label: "Einddatum" },
      { key: "totalValue", label: "Totale waarde" },
      { key: "progress", label: "Voortgang (%)" },
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
    name: "company", label: "Bedrijf (eigen)",
    fields: [
      { key: "name", label: "Bedrijfsnaam" },
      { key: "email", label: "E-mail" },
      { key: "phone", label: "Telefoon" },
      { key: "address", label: "Adres" },
      { key: "website", label: "Website" },
      { key: "taxId", label: "BTW nummer" },
      { key: "iban", label: "IBAN" },
    ],
  },
];

// ─── Insert helper ────────────────────────────────────────────────────────────
function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string
) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const newValue = el.value.slice(0, start) + text + el.value.slice(end);
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  );
  const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  );
  const setter =
    el instanceof HTMLTextAreaElement
      ? nativeTextareaSetter?.set
      : nativeInputValueSetter?.set;
  if (setter) {
    setter.call(el, newValue);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.value = newValue;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const newPos = start + text.length;
  el.setSelectionRange(newPos, newPos);
  el.focus();
}

// ─── Data Field Insert Panel ─────────────────────────────────────────────────
function DataFieldInsertPanel({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
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
    <div className="flex flex-col h-full border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/20 flex-shrink-0">
        <p className="text-xs font-semibold mb-1.5">Data invoegen</p>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek veld..."
          className="h-7 text-xs"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredTables.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            Geen velden gevonden
          </div>
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
                  <span className="text-muted-foreground">
                    {isExpanded ? "−" : "+"}
                  </span>
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
                          <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                            {token}
                          </span>
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface EmailTemplateFormLayoutProps {
  onSave: () => void;
  emailTemplateId?: string;
  parentId?: string;
}

// ─── Main form component ──────────────────────────────────────────────────────
export function EmailTemplateFormLayout({
  onSave,
  emailTemplateId,
  parentId,
}: EmailTemplateFormLayoutProps) {
  const { toast } = useToast();
  const [currentId, setCurrentId] = useState<string | undefined>(emailTemplateId);
  const isEditing = !!currentId;

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const focusedFieldRef = useRef<"subject" | "body">("body");

  const form = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      templateType: "invoice",
      subject: "",
      body: "",
    },
  });

  const { data: template } = useQuery<EmailTemplate>({
    queryKey: ["/api/email-templates", currentId],
    enabled: !!currentId,
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name ?? "",
        templateType: template.templateType ?? "invoice",
        subject: template.subject ?? "",
        body: template.body ?? "",
      });
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: (data: EmailTemplateFormData) =>
      apiRequest("POST", "/api/email-templates", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setCurrentId(created.id);
      toast({ title: "Aangemaakt", description: `"${created.name}" aangemaakt.` });
      window.dispatchEvent(
        new CustomEvent("update-tab-name", {
          detail: {
            tabId: "new-email-template",
            name: created.name,
          },
        })
      );
    },
    onError: () => toast({ title: "Fout", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: EmailTemplateFormData) =>
      apiRequest("PUT", `/api/email-templates/${currentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({ title: "Opgeslagen" });
    },
    onError: () => toast({ title: "Fout", variant: "destructive" }),
  });

  const onSubmit = (data: EmailTemplateFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const toolbar = useFormToolbar({
    entityType: "email_template",
    entityId: currentId,
    onSave: form.handleSubmit(onSubmit),
    onClose: onSave,
    saveDisabled: createMutation.isPending || updateMutation.isPending,
    saveLoading: createMutation.isPending || updateMutation.isPending,
  });

  const handleInsertToken = useCallback(
    (token: string) => {
      if (focusedFieldRef.current === "subject" && subjectRef.current) {
        insertAtCursor(subjectRef.current, token);
        form.setValue("subject", subjectRef.current.value, { shouldDirty: true });
      } else if (bodyRef.current) {
        insertAtCursor(bodyRef.current, token);
        form.setValue("body", bodyRef.current.value, { shouldDirty: true });
      }
    },
    [form]
  );

  // ── Form sections ──────────────────────────────────────────────────────────
  const nameField: FormField2<EmailTemplateFormData> = {
    key: "name",
    label: "Naam",
    type: "text",
    required: true,
    value: form.watch("name"),
    onChange: (v: string) => form.setValue("name", v, { shouldDirty: true }),
    validation: form.formState.errors.name
      ? { error: form.formState.errors.name.message }
      : undefined,
  };

  const typeField: FormField2<EmailTemplateFormData> = {
    key: "templateType",
    label: "Type",
    type: "custom",
    required: true,
    value: form.watch("templateType"),
    customComponent: (
      <Select
        value={form.watch("templateType")}
        onValueChange={(v) => form.setValue("templateType", v, { shouldDirty: true })}
      >
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
  };

  const subjectField: FormField2<EmailTemplateFormData> = {
    key: "subject",
    label: "Onderwerp",
    type: "custom",
    value: form.watch("subject"),
    customComponent: (
      <Input
        ref={subjectRef}
        value={form.watch("subject") ?? ""}
        onChange={(e) => form.setValue("subject", e.target.value, { shouldDirty: true })}
        onFocus={() => { focusedFieldRef.current = "subject"; }}
        placeholder="Bijv: Factuur {{invoice.invoiceNumber}} — {{customer.name}}"
        className="h-10 font-mono text-sm"
      />
    ),
  };

  // Body section: custom row renders textarea + insert panel side by side
  const bodyAndPanelRow = {
    type: "custom" as const,
    content: (
      <div className="flex gap-4" style={{ minHeight: 400 }}>
        <div className="flex-1 flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">
            Klik een veld rechts aan → token wordt ingevoegd op cursorpositie
          </p>
          <Textarea
            ref={bodyRef}
            value={form.watch("body") ?? ""}
            onChange={(e) =>
              form.setValue("body", e.target.value, { shouldDirty: true })
            }
            onFocus={() => { focusedFieldRef.current = "body"; }}
            placeholder={"Beste {{contact.name}},\n\nHierbij sturen wij u factuur {{invoice.invoiceNumber}}.\n\nMet vriendelijke groet,\n{{company.name}}"}
            className="flex-1 font-mono text-sm resize-none"
            style={{ minHeight: 360 }}
          />
        </div>
        <div className="w-64 flex-shrink-0" style={{ minHeight: 400 }}>
          <DataFieldInsertPanel onInsert={handleInsertToken} />
        </div>
      </div>
    ),
  };

  const formSections: FormSection2<EmailTemplateFormData>[] = [
    {
      id: "general",
      label: "Algemeen",
      rows: [
        createFieldRow(nameField),
        createFieldRow(typeField),
        createFieldRow(subjectField),
      ],
    },
    {
      id: "body",
      label: "Tekst (body)",
      rows: [bodyAndPanelRow],
    },
  ];

  const infoFields = [
    { label: "Template", value: form.watch("name") || "Nieuw template" },
    {
      label: "Type",
      value:
        TEMPLATE_TYPES.find((t) => t.value === form.watch("templateType"))?.label ??
        form.watch("templateType") ??
        "",
    },
  ];

  return (
    <LayoutForm2
      title={isEditing ? "E-mailtemplate bewerken" : "Nieuw e-mailtemplate"}
      icon="mail"
      toolbar={toolbar}
      formSections={formSections}
      infoFields={infoFields}
      isLoading={false}
      hasUnsavedChanges={form.formState.isDirty}
      modifiedFields={new Set(Object.keys(form.formState.dirtyFields))}
    />
  );
}
