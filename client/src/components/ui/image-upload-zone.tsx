import { useState, useCallback } from "react";
import { Plus, Trash2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadZoneProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  maxSizeMB?: number;
  hint?: string;
  size?: "sm" | "md";
}

export function ImageUploadZone({
  value,
  onChange,
  label = "Afbeelding",
  maxSizeMB = 5,
  hint,
  size = "md",
}: ImageUploadZoneProps) {
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);

  const sizeClass = size === "sm" ? "w-20 h-20" : "w-24 h-24";
  const iconSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const plusSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const applyFile = useCallback((file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "Afbeelding te groot",
        description: `Maximaal ${maxSizeMB}MB toegestaan`,
        variant: "destructive",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Ongeldig bestandstype",
        description: "Alleen afbeeldingen (JPG, PNG) zijn toegestaan",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB, onChange, toast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = "";
  }, [applyFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        applyFile(file);
        return;
      }
    }

    const uriList = e.dataTransfer.getData("text/uri-list");
    if (uriList) {
      const url = uriList.split("\n").find(u => u.trim() && !u.startsWith("#"));
      if (url) {
        onChange(url.trim());
        return;
      }
    }

    const html = e.dataTransfer.getData("text/html");
    if (html) {
      const match = html.match(/src=["']([^"']+)["']/);
      if (match?.[1]) {
        onChange(match[1]);
        return;
      }
    }

    toast({
      title: "Niet ondersteund",
      description: "Sleep een afbeeldingsbestand of een afbeelding van een website.",
      variant: "destructive",
    });
  }, [applyFile, onChange, toast]);

  return (
    <div className="flex flex-col items-start gap-1.5">
      {value ? (
        <div className="flex flex-col items-center gap-1.5">
          <img
            src={value}
            alt={label}
            className={`${sizeClass} object-cover rounded-lg border border-gray-200 shadow-sm cursor-zoom-in`}
            onDoubleClick={() => {
              window.open(value, "_blank");
            }}
            title="Dubbelklik om te vergroten"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Verwijderen
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${sizeClass} border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-colors cursor-default ${
            dragOver
              ? "border-orange-500 bg-orange-50"
              : "border-gray-300 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/40"
          }`}
        >
          {dragOver ? (
            <>
              <Image className={`${iconSize} text-orange-500`} />
              <span className="text-xs text-orange-600 font-medium">Loslaten!</span>
            </>
          ) : (
            <label className="flex flex-col items-center gap-1 cursor-pointer w-full h-full justify-center">
              <Plus className={`${plusSize} text-gray-400`} />
              <span className="text-[10px] text-gray-400 text-center px-1">{label}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}
      {hint && (
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  );
}
