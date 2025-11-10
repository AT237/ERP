import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ImageFormProps {
  imageId?: string;
  onSave?: () => void;
}

export default function ImageForm({ imageId, onSave }: ImageFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageData: "",
  });

  // Fetch existing image if editing
  const { data: existingImage } = useQuery<any>({
    queryKey: ["/api/masterdata/images", imageId],
    enabled: !!imageId,
    queryFn: async () => {
      const images = await fetch("/api/masterdata/images").then(res => res.json());
      return images.find((img: any) => img.id === imageId);
    }
  });

  // Populate form with existing data
  useEffect(() => {
    if (existingImage) {
      setFormData({
        name: existingImage.name || "",
        description: existingImage.description || "",
        imageData: existingImage.imageData || "",
      });
    }
  }, [existingImage]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (imageId) {
        return apiRequest("PATCH", `/api/masterdata/images/${imageId}`, data);
      }
      return apiRequest("POST", "/api/masterdata/images", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/images"] });
      toast({
        title: imageId ? "Image updated" : "Image created",
        description: `Image has been ${imageId ? "updated" : "created"} successfully.`,
      });
      if (onSave) {
        onSave();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save image",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageData: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{imageId ? "Edit Image" : "Add New Image"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Company Logo"
                  required
                  data-testid="input-image-name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  data-testid="input-image-description"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="image-upload">Image File *</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  required={!imageId}
                  data-testid="input-image-file"
                />
                {formData.imageData && (
                  <div className="mt-2 border rounded p-4 bg-gray-50">
                    <img 
                      src={formData.imageData} 
                      alt="Preview" 
                      className="max-h-60 mx-auto object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save-image"
              >
                {saveMutation.isPending ? "Saving..." : imageId ? "Update Image" : "Create Image"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
