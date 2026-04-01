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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadZone } from "@/components/ui/image-upload-zone";

interface PictogramFormProps {
  pictogramId?: string;
  onSave?: () => void;
}

const CATEGORIES = [
  { value: "danger", label: "Danger" },
  { value: "warning", label: "Warning" },
  { value: "mandatory", label: "Mandatory" },
  { value: "prohibition", label: "Prohibition" },
  { value: "information", label: "Information" },
  { value: "general", label: "General" },
];

export default function PictogramForm({ pictogramId, onSave }: PictogramFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "general",
    imageData: "",
  });

  const { data: existingPictogram } = useQuery<any>({
    queryKey: ["/api/masterdata/pictograms", pictogramId],
    enabled: !!pictogramId,
    queryFn: async () => {
      const res = await fetch(`/api/masterdata/pictograms/${pictogramId}`);
      return res.json();
    }
  });

  useEffect(() => {
    if (existingPictogram) {
      setFormData({
        code: existingPictogram.code || "",
        name: existingPictogram.name || "",
        description: existingPictogram.description || "",
        category: existingPictogram.category || "general",
        imageData: existingPictogram.imageData || "",
      });
    }
  }, [existingPictogram]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (pictogramId) {
        return apiRequest("PUT", `/api/masterdata/pictograms/${pictogramId}`, data);
      }
      return apiRequest("POST", "/api/masterdata/pictograms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/pictograms"] });
      toast({
        title: pictogramId ? "Pictogram updated" : "Pictogram created",
        description: `Pictogram has been ${pictogramId ? "updated" : "created"} successfully.`,
      });
      if (onSave) {
        onSave();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save pictogram",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (value: string | null) => {
    setFormData({ ...formData, imageData: value || "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pictogramId && !formData.imageData) {
      toast({ title: "Afbeelding verplicht", description: "Upload een afbeelding voordat u opslaat.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{pictogramId ? "Edit Pictogram" : "Add New Pictogram"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., GHS01"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Explosive"
                  required
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
                />
              </div>

              <div className="grid gap-2">
                <Label>Image File *</Label>
                <ImageUploadZone
                  value={formData.imageData || null}
                  onChange={handleImageChange}
                  label="Pictogram"
                  maxSizeMB={5}
                  hint="Klik of sleep een afbeelding · JPG, PNG, max 5MB"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : pictogramId ? "Update Pictogram" : "Create Pictogram"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
