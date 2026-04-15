import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Download, File, FileText, FileImage, FileVideo, FileAudio, FileArchive, FileSpreadsheet, Loader2, GripVertical } from "lucide-react";
import type { EntityAttachment } from "@shared/schema";

interface EntityFilesTabProps {
  entityType: string;
  entityId: string | undefined;
  emptyMessage?: string;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-8 w-8 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="h-8 w-8 text-purple-500" />;
  if (mimeType.startsWith("audio/")) return <FileAudio className="h-8 w-8 text-green-500" />;
  if (mimeType.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar") || mimeType.includes("gzip")) return <FileArchive className="h-8 w-8 text-yellow-600" />;
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.startsWith("text/")) return <FileText className="h-8 w-8 text-blue-600" />;
  return <File className="h-8 w-8 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function estimateBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

export function EntityFilesTab({ entityType, entityId, emptyMessage }: EntityFilesTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const queryKey = ["/api/attachments", entityType, entityId];

  const { data: files = [], isLoading } = useQuery<EntityAttachment[]>({
    queryKey,
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/attachments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Bestand verwijderd" });
    },
    onError: () => toast({ title: "Verwijderen mislukt", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await apiRequest("PATCH", `/api/attachments/reorder`, { ids: orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const uploadFiles = useCallback(async (fileList: File[]) => {
    if (!fileList.length || !entityId) return;
    setUploading(true);
    try {
      for (const file of fileList) {
        const dataUrl = await readFileAsDataURL(file);
        await apiRequest("POST", `/api/attachments/${entityType}/${entityId}`, {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileData: dataUrl,
          sortOrder: files.length,
        });
      }
      queryClient.invalidateQueries({ queryKey });
      toast({ title: `${fileList.length} bestand(en) geupload` });
    } catch (err) {
      toast({ title: "Upload mislukt", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [entityId, entityType, files.length, queryKey, toast]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    await uploadFiles(fileList);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) {
      setIsDragging(true);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (draggedIndex !== null) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    await uploadFiles(droppedFiles);
  }, [uploadFiles, draggedIndex]);

  const handleRowDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...files];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map(f => f.id);
    reorderMutation.mutate(orderedIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRowDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const downloadFile = (attachment: EntityAttachment) => {
    const link = document.createElement("a");
    link.href = attachment.fileData;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openFileInNewTab = (attachment: EntityAttachment) => {
    try {
      const parts = attachment.fileData.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : attachment.mimeType;
      const byteString = atob(parts[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      downloadFile(attachment);
    }
  };

  if (!entityId) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        {emptyMessage || "Sla het record eerst op om bestanden te kunnen uploaden."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-orange-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-orange-500" : "text-gray-400"}`} />
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {isDragging ? "Laat bestanden los om te uploaden" : "Sleep bestanden hierheen of klik om te uploaden"}
        </p>
        <p className="text-xs text-gray-400 mb-3">PDF, afbeeldingen en andere bestandstypen</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploaden...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Bestanden kiezen
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-400">
          Nog geen bestanden geupload
        </div>
      ) : (
        <div className="border rounded-lg divide-y dark:divide-gray-700">
          {files.map((file, index) => (
            <div
              key={file.id}
              draggable
              onDragStart={() => handleRowDragStart(index)}
              onDragOver={(e) => handleRowDragOver(e, index)}
              onDrop={(e) => handleRowDrop(e, index)}
              onDragEnd={handleRowDragEnd}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 group cursor-pointer transition-colors ${
                draggedIndex === index ? "opacity-50 bg-gray-100" : ""
              } ${dragOverIndex === index ? "border-t-2 border-orange-500" : ""}`}
              onDoubleClick={() => openFileInNewTab(file)}
              title="Dubbelklik om te openen · Versleep om te herschikken"
            >
              <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing shrink-0" />
              {getFileIcon(file.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-gray-400">
                  {file.mimeType} · {formatFileSize(estimateBase64Size(file.fileData))}
                  {file.createdAt && ` · ${new Date(file.createdAt).toLocaleDateString("nl-NL")}`}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => downloadFile(file)}
                  title="Downloaden"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(file.id)}
                  disabled={deleteMutation.isPending}
                  title="Verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
