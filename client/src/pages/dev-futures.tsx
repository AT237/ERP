import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Save, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DevFuture } from "@shared/schema";

const categories = [
  "Integrations",
  "UI/UX",
  "Reporting",
  "Automation",
  "Performance",
  "Security",
  "Mobile",
  "Other",
];

const priorities = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-700" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
];

const statuses = [
  { value: "wish", label: "Wish", color: "bg-purple-100 text-purple-700" },
  { value: "planned", label: "Planned", color: "bg-blue-100 text-blue-700" },
  { value: "in-progress", label: "In Progress", color: "bg-orange-100 text-orange-700" },
  { value: "done", label: "Done", color: "bg-green-100 text-green-700" },
];

export default function DevFuturesPage() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Other");

  const { data: futures = [], isLoading } = useQuery<DevFuture[]>({
    queryKey: ["/api/dev-futures"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; category: string }) => {
      const response = await apiRequest("POST", "/api/dev-futures", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dev-futures"] });
      setNewTitle("");
      toast({ title: "Added", description: "Feature wish added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DevFuture> }) => {
      const response = await apiRequest("PATCH", `/api/dev-futures/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dev-futures"] });
      toast({ title: "Updated", description: "Feature wish updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dev-futures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dev-futures"] });
      toast({ title: "Deleted", description: "Feature wish removed" });
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), category: newCategory });
  };

  const getPriorityStyle = (priority: string | null) => {
    return priorities.find(p => p.value === priority)?.color || "bg-gray-100 text-gray-700";
  };

  const getStatusStyle = (status: string | null) => {
    return statuses.find(s => s.value === status)?.color || "bg-gray-100 text-gray-700";
  };

  const groupedFutures = futures.reduce((acc, future) => {
    const cat = future.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(future);
    return acc;
  }, {} as Record<string, DevFuture[]>);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="h-6 w-6 text-orange-500" />
        <h1 className="text-xl font-semibold text-orange-600 font-sans">Software Development Futures</h1>
      </div>

      <p className="text-sm text-gray-500 mb-6 font-sans">
        Feature wishes and planned improvements for the application.
      </p>

      <div className="flex gap-2 mb-6">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new feature wish..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAdd}
          disabled={!newTitle.trim() || createMutation.isPending}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFutures).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 font-sans">{category}</h2>
              <div className="space-y-1">
                {items.map((future) => (
                  <div key={future.id} className="border rounded-lg bg-white">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedId(expandedId === future.id ? null : future.id)}
                    >
                      {expandedId === future.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-medium font-sans">{future.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-sans ${getPriorityStyle(future.priority)}`}>
                        {future.priority || "medium"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-sans ${getStatusStyle(future.status)}`}>
                        {statuses.find(s => s.value === future.status)?.label || "Wish"}
                      </span>
                    </div>

                    {expandedId === future.id && (
                      <div className="px-4 pb-4 pt-1 border-t space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 font-sans">Title</label>
                          <Input
                            defaultValue={future.title}
                            onBlur={(e) => {
                              if (e.target.value !== future.title) {
                                updateMutation.mutate({ id: future.id, data: { title: e.target.value } });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-sans">Description</label>
                          <Textarea
                            defaultValue={future.description || ""}
                            placeholder="Describe the feature wish..."
                            onBlur={(e) => {
                              if (e.target.value !== (future.description || "")) {
                                updateMutation.mutate({ id: future.id, data: { description: e.target.value } });
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 font-sans">Category</label>
                            <Select
                              defaultValue={future.category || "Other"}
                              onValueChange={(val) => updateMutation.mutate({ id: future.id, data: { category: val } })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 font-sans">Priority</label>
                            <Select
                              defaultValue={future.priority || "medium"}
                              onValueChange={(val) => updateMutation.mutate({ id: future.id, data: { priority: val } })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {priorities.map(p => (
                                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 font-sans">Status</label>
                            <Select
                              defaultValue={future.status || "wish"}
                              onValueChange={(val) => updateMutation.mutate({ id: future.id, data: { status: val } })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statuses.map(s => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this feature wish?")) {
                                deleteMutation.mutate(future.id);
                                setExpandedId(null);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {futures.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-sans">No feature wishes yet. Add your first one above!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}