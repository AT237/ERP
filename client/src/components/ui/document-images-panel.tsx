import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageIcon, Pencil, Check } from "lucide-react";

interface DocumentImagesPanelProps {
  documentType: "quotation" | "invoice";
  documentId: string;
}

export function DocumentImagesPanel({ documentType, documentId }: DocumentImagesPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");

  const { data: images = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/document-images', documentType, documentId],
    enabled: !!documentId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Bestand is te groot (max 5MB)");
      }
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Bestand kon niet worden gelezen"));
        reader.readAsDataURL(file);
      }).then(async (base64) => {
        return apiRequest("POST", "/api/document-images", {
          documentType,
          documentId,
          imageData: base64,
          fileName: file.name,
          description: "",
          position: images.length,
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-images', documentType, documentId] });
      toast({ title: "Afbeelding toegevoegd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij uploaden", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/document-images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-images', documentType, documentId] });
      toast({ title: "Afbeelding verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij verwijderen", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      return apiRequest("PUT", `/api/document-images/${id}`, { description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-images', documentType, documentId] });
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij opslaan", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type.startsWith("image/")) {
        uploadMutation.mutate(file);
      }
    });
    e.target.value = "";
  };

  const startEdit = (id: string, currentDesc: string) => {
    setEditingId(id);
    setEditDescription(currentDesc || "");
  };

  const saveEdit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, description: editDescription });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Projectafbeeldingen</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="h-8 text-xs"
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          {uploadMutation.isPending ? "Uploaden..." : "Afbeelding toevoegen"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
          <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nog geen afbeeldingen</p>
          <p className="text-xs text-muted-foreground mt-1">Klik op "Afbeelding toevoegen" om te starten</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img: any) => (
            <div key={img.id} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="aspect-square flex items-center justify-center bg-gray-50 p-2">
                <img
                  src={img.imageData}
                  alt={img.description || img.fileName || "Afbeelding"}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="p-2 border-t">
                {editingId === img.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Beschrijving..."
                      className="h-6 text-xs flex-1"
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={saveEdit}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {img.description || img.fileName || "Geen beschrijving"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => startEdit(img.id, img.description)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteMutation.mutate(img.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
