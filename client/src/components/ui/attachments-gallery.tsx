import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import type { EntityAttachment } from "@shared/schema";

interface AttachmentsGalleryProps {
  entityType: string;
  entityId: string | undefined;
}

function readFileAsDataURL(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AttachmentsGallery({ entityType, entityId }: AttachmentsGalleryProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryKey = ["/api/attachments", entityType, entityId];

  const { data: attachments = [], isLoading } = useQuery<EntityAttachment[]>({
    queryKey,
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/attachments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (lightboxIndex !== null && lightboxIndex >= attachments.length - 1) {
        setLightboxIndex(attachments.length > 1 ? attachments.length - 2 : null);
      }
    },
    onError: () => toast({ title: "Verwijderen mislukt", variant: "destructive" }),
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !entityId) return;
    setUploading(true);
    try {
      for (const file of files) {
        const { dataUrl, width, height } = await readFileAsDataURL(file);
        await apiRequest("POST", `/api/attachments/${entityType}/${entityId}`, {
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          fileData: dataUrl,
          width,
          height,
        });
      }
      queryClient.invalidateQueries({ queryKey });
      toast({ title: `${files.length} afbeelding${files.length > 1 ? "en" : ""} toegevoegd` });
    } catch {
      toast({ title: "Upload mislukt", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [entityId, entityType, queryKey, toast]);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const nextImage = () => setLightboxIndex((i) => (i !== null && i < attachments.length - 1 ? i + 1 : i));

  if (!entityId) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Sla het record eerst op om afbeeldingen toe te voegen.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {attachments.length} afbeelding{attachments.length !== 1 ? "en" : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Bezig..." : "Afbeelding toevoegen"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Klik om afbeeldingen toe te voegen</p>
          <p className="text-xs text-muted-foreground/70 mt-1">of sleep ze hierheen</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {attachments.map((att, index) => (
            <div key={att.id} className="group relative aspect-square">
              <img
                src={att.fileData}
                alt={att.fileName}
                className="w-full h-full object-cover rounded-lg cursor-pointer border border-border hover:border-orange-400 hover:shadow-md transition-all"
                onClick={() => openLightbox(index)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/40 rounded-full p-1">
                  <ZoomIn className="h-4 w-4 text-white" />
                </div>
              </div>
              <button
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(att.id); }}
                title="Verwijderen"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 rounded-b-lg px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[9px] truncate">{att.fileName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && attachments[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white bg-black/50 hover:bg-black/80 rounded-full p-3 transition-colors"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={attachments[lightboxIndex].fileData}
              alt={attachments[lightboxIndex].fileName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="flex items-center gap-4 text-white/80 text-sm">
              <span>{attachments[lightboxIndex].fileName}</span>
              {attachments[lightboxIndex].width && (
                <span className="text-white/50">{attachments[lightboxIndex].width} × {attachments[lightboxIndex].height}px</span>
              )}
              <span className="text-white/50">{lightboxIndex + 1} / {attachments.length}</span>
            </div>
            <button
              className="flex items-center gap-2 text-white/60 hover:text-red-400 text-xs transition-colors"
              onClick={() => { deleteMutation.mutate(attachments[lightboxIndex!].id); closeLightbox(); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Verwijderen
            </button>
          </div>

          {lightboxIndex < attachments.length - 1 && (
            <button
              className="absolute right-4 text-white bg-black/50 hover:bg-black/80 rounded-full p-3 transition-colors"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
