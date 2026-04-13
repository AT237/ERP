import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronRight, ChevronDown, Upload, Bold, Type, Heading, Table2, ImageIcon, Indent, Outdent } from "lucide-react";
import { type ContractItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFormToolbar } from "@/hooks/use-form-toolbar";
import { LayoutForm2, type FormSection2 } from './LayoutForm2';
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { getContractPlaceholderTables, getFieldLabel } from "@/utils/available-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const itemFormSchema = z.object({
  articleNumber: z.string().min(1, "Positie is verplicht"),
  itemType: z.string().default("text"),
  content: z.string().default(""),
  indentLevel: z.coerce.number().default(0),
  fontFamily: z.string().default("Arial"),
  fontSize: z.coerce.number().nullable().default(null),
  fontWeight: z.string().nullable().default(null),
  fontColor: z.string().nullable().default(null),
  position: z.coerce.number().default(0),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

const PLACEHOLDERS = (() => {
  const tables = getContractPlaceholderTables();
  return tables.map(table => ({
    category: table.label,
    items: table.fields.map(field => ({
      label: getFieldLabel(field),
      value: `{{${field}}}`,
    })),
  }));
})();

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];
const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Helvetica', 'Calibri', 'Georgia', 'Verdana', 'Courier New', 'Tahoma', 'Trebuchet MS'];

interface ContractItemFormLayoutProps {
  onSave: () => void;
  contractId: string;
  itemId?: string;
}

export function ContractItemFormLayout({ onSave, contractId, itemId }: ContractItemFormLayoutProps) {
  const { toast } = useToast();
  const isEditing = !!itemId && itemId !== 'new';
  const [activeTab, setActiveTab] = useState("general");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      articleNumber: "",
      itemType: "text",
      content: "",
      indentLevel: 0,
      fontFamily: "Arial",
      fontSize: null,
      fontWeight: null,
      fontColor: null,
      position: 0,
    },
  });

  const { data: existingItem, isLoading } = useQuery<ContractItem>({
    queryKey: ['/api/contract-items', itemId],
    queryFn: async () => {
      const items = await fetch(`/api/contracts/${contractId}/items`).then(r => r.json());
      return items.find((i: ContractItem) => i.id === itemId);
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingItem) {
      form.reset({
        articleNumber: existingItem.articleNumber || "",
        itemType: existingItem.itemType || "text",
        content: existingItem.content || "",
        indentLevel: existingItem.indentLevel ?? 0,
        fontFamily: existingItem.fontFamily || "Arial",
        fontSize: existingItem.fontSize ?? null,
        fontWeight: existingItem.fontWeight ?? null,
        fontColor: (existingItem as any).fontColor ?? null,
        position: existingItem.position ?? 0,
      });
    }
  }, [existingItem, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      if (isEditing) {
        return apiRequest('PATCH', `/api/contract-items/${itemId}`, data);
      } else {
        return apiRequest('POST', `/api/contracts/${contractId}/items`, data);
      }
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Regel bijgewerkt" : "Regel aangemaakt" });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}/items`] });
      onSave();
    },
    onError: (error: any) => {
      toast({ title: "Fout bij opslaan", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/contract-items/${itemId}`);
    },
    onSuccess: () => {
      toast({ title: "Regel verwijderd" });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}/items`] });
      onSave();
    },
    onError: (error: any) => {
      toast({ title: "Fout bij verwijderen", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = useCallback(() => {
    form.handleSubmit((data) => saveMutation.mutate(data))();
  }, [form, saveMutation]);

  const toolbar = useFormToolbar({
    entityType: "contract-item",
    entityId: itemId,
    onSave: handleSave,
    onClose: onSave,
    onDelete: isEditing ? () => deleteMutation.mutate() : undefined,
    saveDisabled: saveMutation.isPending,
    saveLoading: saveMutation.isPending,
  });

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const insertPlaceholder = useCallback((placeholder: string) => {
    if (activeTextareaRef.current) {
      const ta = activeTextareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = ta.value;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      form.setValue('content', newText);
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + placeholder.length;
      }, 0);
    } else {
      const current = form.getValues('content') || "";
      form.setValue('content', current + placeholder);
    }
  }, [form]);

  const handleImageUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        form.setValue('content', data.url || data.path || '');
        toast({ title: "Afbeelding geüpload" });
      }
    } catch {
      form.setValue('content', file.name);
    }
  }, [form, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageUpload(file);
  }, [handleImageUpload]);

  const currentType = form.watch('itemType') || 'text';
  const currentContent = form.watch('content') || '';
  const currentFontFamily = form.watch('fontFamily') || 'Arial';
  const currentFontSize = form.watch('fontSize');
  const currentFontWeight = form.watch('fontWeight');
  const currentFontColor = form.watch('fontColor');
  const currentIndentLevel = form.watch('indentLevel') ?? 0;

  const fontToolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-md">
        <Select
          value={currentFontFamily}
          onValueChange={(val) => form.setValue('fontFamily', val)}
        >
          <SelectTrigger className="h-7 w-[140px] text-xs border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map(f => (
              <SelectItem key={f} value={f}>
                <span style={{ fontFamily: f }} className="text-xs">{f}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentFontSize ? String(currentFontSize) : ""}
          onValueChange={(val) => form.setValue('fontSize', val ? parseInt(val) : null)}
        >
          <SelectTrigger className="h-7 w-[65px] text-xs border-gray-300">
            <SelectValue placeholder="pt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Auto</SelectItem>
            {FONT_SIZES.map(s => (
              <SelectItem key={s} value={String(s)}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={currentFontWeight === 'bold' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 w-7 p-0 font-bold text-sm ${currentFontWeight === 'bold' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => form.setValue('fontWeight', currentFontWeight === 'bold' ? null : 'bold')}
            >
              B
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Vetgedrukt</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-7 w-7 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: currentFontColor || '#000000' }}>A</span>
              <div className="absolute bottom-0.5 left-1 right-1 h-1 rounded-sm" style={{ backgroundColor: currentFontColor || '#000000' }} />
              <input
                type="color"
                value={currentFontColor || '#000000'}
                onChange={(e) => form.setValue('fontColor', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Tekstkleur"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Tekstkleur</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${currentIndentLevel <= 0 ? 'opacity-30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => form.setValue('indentLevel', Math.max(0, currentIndentLevel - 1))}
              disabled={currentIndentLevel <= 0}
            >
              <Outdent className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Minder inspringen</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${currentIndentLevel >= 3 ? 'opacity-30' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              onClick={() => form.setValue('indentLevel', Math.min(3, currentIndentLevel + 1))}
              disabled={currentIndentLevel >= 3}
            >
              <Indent className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Meer inspringen</TooltipContent>
        </Tooltip>
        {currentIndentLevel > 0 && (
          <span className="text-[10px] text-muted-foreground ml-1">Niv. {currentIndentLevel}</span>
        )}

      </div>
    </TooltipProvider>
  );

  const contentArea = (
    <div className="flex gap-3 flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        {currentType === 'heading' && (
          <Input
            value={currentContent}
            onChange={(e) => form.setValue('content', e.target.value)}
            className="text-lg"
            style={{
              fontFamily: currentFontFamily,
              fontWeight: currentFontWeight === 'bold' ? 'bold' : 'normal',
              fontSize: currentFontSize ? `${currentFontSize}px` : '18px',
              color: currentFontColor || undefined,
            }}
            placeholder="Koptekst invoeren..."
          />
        )}

        {currentType === 'text' && (
          <Textarea
            ref={(el) => { activeTextareaRef.current = el; }}
            value={currentContent}
            onChange={(e) => form.setValue('content', e.target.value)}
            placeholder="Tekst invoeren... Gebruik {{placeholders}} voor dynamische data."
            className="resize-none flex-1"
            style={{
              fontFamily: currentFontFamily,
              fontWeight: currentFontWeight === 'bold' ? 'bold' : 'normal',
              fontSize: currentFontSize ? `${currentFontSize}px` : '14px',
              color: currentFontColor || undefined,
              minHeight: '300px',
            }}
          />
        )}

        {currentType === 'table' && (
          <Textarea
            ref={(el) => { activeTextareaRef.current = el; }}
            value={currentContent}
            onChange={(e) => form.setValue('content', e.target.value)}
            placeholder="Tabelinhoud invoeren (bijv. kolom1 | kolom2 | kolom3)..."
            className="resize-none font-mono flex-1"
            style={{
              fontFamily: currentFontFamily,
              fontWeight: currentFontWeight === 'bold' ? 'bold' : 'normal',
              fontSize: currentFontSize ? `${currentFontSize}px` : '14px',
              color: currentFontColor || undefined,
              minHeight: '300px',
            }}
          />
        )}

        {currentType === 'image' && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors flex-1 flex items-center justify-center"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            {currentContent ? (
              <div>
                <img src={currentContent} alt="Preview" className="max-h-48 mx-auto mb-2 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <p className="text-xs text-muted-foreground">{currentContent}</p>
                <p className="text-xs text-orange-500 mt-2">Klik of sleep om te wijzigen</p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium">Sleep een afbeelding hierheen</p>
                <p className="text-xs text-muted-foreground mt-1">of klik om te bladeren</p>
              </div>
            )}
          </div>
        )}
      </div>

      {(currentType === 'heading' || currentType === 'text' || currentType === 'table') && (
        <div className="w-52 border rounded-md flex flex-col overflow-hidden bg-muted/20 shrink-0">
          <div className="p-2 border-b">
            <h3 className="font-semibold text-xs">Placeholders</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Klik om in te voegen</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1.5">
              {PLACEHOLDERS.map(group => (
                <div key={group.category} className="mb-0.5">
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded"
                    onClick={() => toggleCategory(group.category)}
                  >
                    {expandedCategories.has(group.category) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {group.category}
                  </button>
                  {expandedCategories.has(group.category) && (
                    <div className="ml-4 space-y-0.5">
                      {group.items.map(item => (
                        <button
                          key={item.value}
                          className="w-full text-left px-2 py-0.5 text-[11px] rounded hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => insertPlaceholder(item.value)}
                          title={item.value}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  const editorContent = (
    <div className="flex flex-col gap-3 px-4 pb-4" style={{ minHeight: '350px' }}>
      {fontToolbar}
      {contentArea}
    </div>
  );

  const formSections: FormSection2<ItemFormData>[] = [
    {
      id: "general",
      label: "Contractregel",
      rows: [
        {
          type: 'two-column' as const,
          leftColumn: [
            {
              key: "articleNumber",
              label: "Positie nr.",
              type: "text",
              placeholder: "1",
              register: form.register("articleNumber"),
              validation: {
                isRequired: true,
                error: form.formState.errors.articleNumber?.message,
              },
            },
            {
              key: "itemType",
              label: "Type",
              type: "custom",
              customComponent: (
                <Select
                  value={currentType}
                  onValueChange={(val) => form.setValue('itemType', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heading">
                      <span className="flex items-center gap-2"><Heading className="w-3.5 h-3.5 text-blue-600" /> Kop</span>
                    </SelectItem>
                    <SelectItem value="text">
                      <span className="flex items-center gap-2"><Type className="w-3.5 h-3.5 text-gray-600" /> Tekst</span>
                    </SelectItem>
                    <SelectItem value="image">
                      <span className="flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5 text-green-600" /> Afbeelding</span>
                    </SelectItem>
                    <SelectItem value="table">
                      <span className="flex items-center gap-2"><Table2 className="w-3.5 h-3.5 text-purple-600" /> Tabel</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ],
          rightColumn: [
            {
              key: "indentLevel",
              label: "Inspringniveau",
              type: "custom",
              customComponent: (
                <Select
                  value={String(currentIndentLevel)}
                  onValueChange={(val) => form.setValue('indentLevel', parseInt(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 — Hoofdniveau</SelectItem>
                    <SelectItem value="1">1 — Sub</SelectItem>
                    <SelectItem value="2">2 — Sub-sub</SelectItem>
                    <SelectItem value="3">3 — Sub-sub-sub</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: "position",
              label: "Positie (volgorde)",
              type: "number",
              placeholder: "0",
              register: form.register("position", { valueAsNumber: true }),
            },
          ],
        },
      ],
    },
  ];

  return (
    <LayoutForm2
      sections={formSections}
      activeSection={activeTab}
      onSectionChange={setActiveTab}
      form={form}
      onSubmit={(data) => saveMutation.mutate(data)}
      toolbar={toolbar}
      documentType="contract-item"
      entityId={itemId}
      isLoading={isLoading}
      afterContent={editorContent}
    />
  );
}
