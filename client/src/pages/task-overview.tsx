import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Plus, CheckCircle2, Circle, Clock, AlertCircle, ChevronRight,
  Trash2, Pencil, User, Calendar, Tag, Link2, X, Filter,
  LayoutGrid, List, CheckCheck, Loader2, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task, Employee } from "@shared/schema";
import { insertTaskSchema } from "@shared/schema";
import { cn } from "@/lib/utils";

// ── types & constants ──────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "todo" | "in_progress" | "review" | "done";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; icon: string }> = {
  urgent: { label: "Urgent",   color: "text-red-600",    bg: "bg-red-50",     border: "border-red-300",   icon: "🔴" },
  high:   { label: "Hoog",     color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-300", icon: "🟠" },
  medium: { label: "Midden",   color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-300", icon: "🟡" },
  low:    { label: "Laag",     color: "text-slate-500",  bg: "bg-slate-50",   border: "border-slate-200",  icon: "⚪" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; dotColor: string }> = {
  todo:        { label: "Te doen",     color: "text-slate-600",  bg: "bg-slate-100",  dotColor: "bg-slate-400"  },
  in_progress: { label: "Bezig",       color: "text-blue-700",   bg: "bg-blue-100",   dotColor: "bg-blue-500"   },
  review:      { label: "Review",      color: "text-purple-700", bg: "bg-purple-100", dotColor: "bg-purple-500" },
  done:        { label: "Afgerond",    color: "text-green-700",  bg: "bg-green-100",  dotColor: "bg-green-500"  },
};

const STATUS_ORDER: Status[] = ["todo", "in_progress", "review", "done"];

// ── form schema ────────────────────────────────────────────────────────────

const taskFormSchema = insertTaskSchema.extend({
  title: z.string().min(1, "Titel is verplicht"),
  dueDate: z.date().nullable().optional(),
});
type TaskFormData = z.infer<typeof taskFormSchema>;

// ── helpers ────────────────────────────────────────────────────────────────

function dueDateLabel(date: Date | string | null | undefined): { label: string; cls: string } | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d))     return { label: "Vandaag",   cls: "text-orange-600 font-semibold" };
  if (isTomorrow(d))  return { label: "Morgen",    cls: "text-yellow-600" };
  if (isPast(d))      return { label: `${Math.abs(differenceInDays(d, new Date()))}d te laat`, cls: "text-red-600 font-semibold" };
  const diff = differenceInDays(d, new Date());
  if (diff <= 7)      return { label: `over ${diff}d`, cls: "text-slate-500" };
  return { label: format(d, "d MMM", { locale: nl }), cls: "text-slate-400" };
}

function employeeName(e: Employee) {
  return [e.firstName, e.lastName].filter(Boolean).join(" ");
}

// ── stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={cn("text-3xl font-bold", color)}>{value}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

// ── task card ──────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  employee: Employee | undefined;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onStatusChange: (id: string, status: Status) => void;
}

function TaskCard({ task, employee, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const p = PRIORITY_CONFIG[task.priority as Priority] ?? PRIORITY_CONFIG.medium;
  const due = dueDateLabel(task.dueDate);
  const isDone = task.status === "done";

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200",
      "flex flex-col gap-0 overflow-hidden",
      isDone ? "opacity-60" : "",
      `border-l-4 ${p.border}`
    )}>
      {/* priority stripe top */}
      <div className={cn("h-0.5 w-full", p.bg)} />

      <div className="p-4 flex flex-col gap-3">
        {/* header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              onClick={() => onStatusChange(task.id, isDone ? "todo" : "done")}
              className="mt-0.5 shrink-0 text-slate-300 hover:text-green-500 transition-colors"
              title={isDone ? "Markeer als openstaand" : "Markeer als afgerond"}
            >
              {isDone
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : <Circle className="h-5 w-5" />
              }
            </button>
            <span className={cn("font-semibold text-sm leading-snug", isDone && "line-through text-slate-400")}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(task)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* description */}
        {task.description && (
          <p className="text-xs text-slate-500 leading-relaxed pl-7 line-clamp-2">{task.description}</p>
        )}

        {/* meta row */}
        <div className="flex flex-wrap items-center gap-2 pl-7">
          {/* priority badge */}
          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", p.bg, p.color)}>
            <Flag className="h-2.5 w-2.5" />
            {p.label}
          </span>

          {/* due date */}
          {due && (
            <span className={cn("inline-flex items-center gap-1 text-xs", due.cls)}>
              <Calendar className="h-3 w-3" />
              {due.label}
            </span>
          )}

          {/* employee */}
          {employee && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <User className="h-3 w-3" />
              {employeeName(employee)}
            </span>
          )}

          {/* linked entity */}
          {task.relatedEntityRef && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-400">
              <Link2 className="h-3 w-3" />
              {task.relatedEntityRef}
            </span>
          )}
        </div>

        {/* task number */}
        <div className="pl-7 flex items-center justify-between">
          <span className="text-[10px] text-slate-300 font-mono">{task.taskNumber}</span>
          {/* quick status changer */}
          <div className="flex gap-1">
            {STATUS_ORDER.filter(s => s !== task.status).map(s => {
              const sc = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => onStatusChange(task.id, s)}
                  title={`Zet op ${sc.label}`}
                  className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors opacity-0 group-hover:opacity-100", sc.bg, sc.color, "hover:opacity-80")}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── task form sheet ────────────────────────────────────────────────────────

interface TaskFormSheetProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  employees: Employee[];
}

function TaskFormSheet({ open, onClose, task, employees }: TaskFormSheetProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!task;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      dueDate: null,
      assignedEmployeeId: undefined,
      relatedEntityType: undefined,
      relatedEntityRef: undefined,
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          title: task.title,
          description: task.description ?? "",
          priority: task.priority as Priority,
          status: task.status as Status,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          assignedEmployeeId: task.assignedEmployeeId ?? undefined,
          relatedEntityType: task.relatedEntityType ?? undefined,
          relatedEntityRef: task.relatedEntityRef ?? undefined,
          tags: (task.tags as string[]) ?? [],
        });
      } else {
        form.reset({
          title: "",
          description: "",
          priority: "medium",
          status: "todo",
          dueDate: null,
          assignedEmployeeId: undefined,
          relatedEntityType: undefined,
          relatedEntityRef: undefined,
          tags: [],
        });
      }
    }
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: (data: TaskFormData) => {
      const payload = { ...data, dueDate: data.dueDate ? data.dueDate.toISOString() : null };
      if (isEdit) return apiRequest("PATCH", `/api/tasks/${task!.id}`, payload);
      return apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: isEdit ? "Taak bijgewerkt" : "Taak aangemaakt" });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    },
  });

  const [calOpen, setCalOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b bg-slate-50">
          <SheetTitle className="text-lg font-semibold text-slate-800">
            {isEdit ? "Taak bewerken" : "Nieuwe taak"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Wat moet er gedaan worden?" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Omschrijving</FormLabel>
                  <FormControl><Textarea placeholder="Extra details…" rows={3} {...field} value={field.value ?? ""} /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioriteit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline</FormLabel>
                  <Popover open={calOpen} onOpenChange={setCalOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-slate-400")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "d MMMM yyyy", { locale: nl }) : "Kies datum"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={d => { field.onChange(d ?? null); setCalOpen(false); }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )} />

              <FormField control={form.control} name="assignedEmployeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Toegewezen aan</FormLabel>
                  <Select value={field.value ?? "__none__"} onValueChange={v => field.onChange(v === "__none__" ? undefined : v)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="— Niemand —" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">— Niemand —</SelectItem>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{employeeName(e)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="relatedEntityType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gekoppeld aan</FormLabel>
                    <Select value={field.value ?? "__none__"} onValueChange={v => field.onChange(v === "__none__" ? undefined : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="— Type —" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— Geen —</SelectItem>
                        <SelectItem value="quotation">Offerte</SelectItem>
                        <SelectItem value="invoice">Factuur</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="work-order">Werkorder</SelectItem>
                        <SelectItem value="purchase-order">Inkooporder</SelectItem>
                        <SelectItem value="customer">Klant</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="relatedEntityRef" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referentie</FormLabel>
                    <FormControl><Input placeholder="bijv. Q-2025-001" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </div>

            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Opslaan" : "Aanmaken"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function TaskOverview() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ["/api/employees"] });

  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"columns" | "list">("columns");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);

  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    employees.forEach(e => m.set(e.id, e));
    return m;
  }, [employees]);

  const filtered = useMemo(() => {
    return allTasks.filter(t => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterEmployee !== "all" && t.assignedEmployeeId !== filterEmployee) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allTasks, filterStatus, filterPriority, filterEmployee, search]);

  // stats
  const stats = useMemo(() => {
    const now = new Date();
    const total = allTasks.length;
    const open = allTasks.filter(t => t.status !== "done").length;
    const overdue = allTasks.filter(t => t.status !== "done" && t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
    const doneToday = allTasks.filter(t => t.status === "done" && t.completedAt && isToday(new Date(t.completedAt))).length;
    return { total, open, overdue, doneToday };
  }, [allTasks]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tasks"] }),
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDeleteConfirm(null);
      toast({ title: "Taak verwijderd" });
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const grouped = useMemo(() => {
    const g: Record<Status, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    filtered.forEach(t => {
      const s = (t.status as Status) in g ? (t.status as Status) : "todo";
      g[s].push(t);
    });
    STATUS_ORDER.forEach(s => {
      g[s].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
    });
    return g;
  }, [filtered]);

  function openNew() { setEditTask(null); setSheetOpen(true); }
  function openEdit(t: Task) { setEditTask(t); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); setEditTask(null); }

  const activeFilters = [filterStatus !== "all", filterPriority !== "all", filterEmployee !== "all", !!search].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── page header ── */}
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Taak Overzicht</h1>
            <p className="text-sm text-slate-400 mt-0.5">Beheer en volg alle bedrijfstaken</p>
          </div>
          <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe taak
          </Button>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Totaal" value={stats.total} color="text-slate-700" />
          <StatCard label="Openstaand" value={stats.open} sub="niet afgerond" color="text-blue-600" />
          <StatCard label="Te laat" value={stats.overdue} sub="deadline verstreken" color={stats.overdue > 0 ? "text-red-600" : "text-slate-400"} />
          <StatCard label="Vandaag afgerond" value={stats.doneToday} color="text-green-600" />
        </div>
      </div>

      {/* ── filter bar ── */}
      <div className="px-8 py-4 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Zoeken…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3 h-9 text-sm bg-slate-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="h-9 w-36 text-sm bg-slate-50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={v => setFilterPriority(v as any)}>
          <SelectTrigger className="h-9 w-36 text-sm bg-slate-50">
            <SelectValue placeholder="Prioriteit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle prioriteiten</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="h-9 w-44 text-sm bg-slate-50">
            <SelectValue placeholder="Medewerker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle medewerkers</SelectItem>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>{employeeName(e)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-slate-500 hover:text-slate-700"
            onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterEmployee("all"); setSearch(""); }}>
            <X className="h-3.5 w-3.5 mr-1" />
            Wis filters ({activeFilters})
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1 border rounded-lg p-1 bg-slate-50">
          <button
            onClick={() => setViewMode("columns")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "columns" ? "bg-white shadow-sm text-orange-500" : "text-slate-400 hover:text-slate-600")}
            title="Kolom weergave"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-white shadow-sm text-orange-500" : "text-slate-400 hover:text-slate-600")}
            title="Lijst weergave"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── content ── */}
      <div className="px-8 py-6">
        {tasksLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span>Taken laden…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <CheckCheck className="h-14 w-14 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">Geen taken gevonden</p>
            <p className="text-sm">Maak een nieuwe taak aan of pas de filters aan.</p>
            <Button onClick={openNew} variant="outline" className="mt-2 border-orange-300 text-orange-600 hover:bg-orange-50">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe taak
            </Button>
          </div>
        ) : viewMode === "columns" ? (
          /* ── kanban columns ── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {STATUS_ORDER.map(status => {
              const sc = STATUS_CONFIG[status];
              const col = grouped[status];
              return (
                <div key={status} className="flex flex-col gap-3 min-h-[200px]">
                  {/* column header */}
                  <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl", sc.bg)}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", sc.dotColor)} />
                      <span className={cn("text-sm font-semibold", sc.color)}>{sc.label}</span>
                    </div>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full bg-white/70", sc.color)}>
                      {col.length}
                    </span>
                  </div>

                  {/* cards */}
                  {col.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      employee={task.assignedEmployeeId ? employeeMap.get(task.assignedEmployeeId) : undefined}
                      onEdit={openEdit}
                      onDelete={setDeleteConfirm}
                      onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
                    />
                  ))}

                  {/* add button in column */}
                  <button
                    onClick={openNew}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-orange-500 px-3 py-2 rounded-xl border border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Taak toevoegen
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── list view ── */
          <div className="space-y-6">
            {STATUS_ORDER.map(status => {
              const sc = STATUS_CONFIG[status];
              const col = grouped[status];
              if (col.length === 0) return null;
              return (
                <div key={status}>
                  <div className={cn("flex items-center gap-2 mb-3 px-3 py-2 rounded-xl w-fit", sc.bg)}>
                    <div className={cn("w-2 h-2 rounded-full", sc.dotColor)} />
                    <span className={cn("text-sm font-semibold", sc.color)}>{sc.label}</span>
                    <span className={cn("text-xs font-bold", sc.color)}>({col.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {col.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        employee={task.assignedEmployeeId ? employeeMap.get(task.assignedEmployeeId) : undefined}
                        onEdit={openEdit}
                        onDelete={setDeleteConfirm}
                        onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── form sheet ── */}
      <TaskFormSheet
        open={sheetOpen}
        onClose={closeSheet}
        task={editTask}
        employees={employees}
      />

      {/* ── delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Taak verwijderen?</p>
                <p className="text-sm text-slate-500 mt-0.5">"{deleteConfirm.title}"</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">Deze actie kan niet ongedaan worden gemaakt.</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuleren</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
