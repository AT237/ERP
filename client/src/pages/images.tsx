import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Image categories
const IMAGE_CATEGORIES = [
  { value: "logo", label: "Logo" },
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "product", label: "Product" },
  { value: "general", label: "General" },
];

export default function Images() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    imageData: "",
  });

  // Fetch images
  const { data: images = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/masterdata/images"],
  });

  // Column configuration
  const defaultColumns: ColumnConfig[] = [
    createIdColumn('id', 'ID'),
    {
      key: 'imageData',
      label: 'Preview',
      visible: true,
      width: 80,
      filterable: false,
      sortable: false,
      renderCell: (value: string) => (
        <div className="flex items-center justify-center">
          {value && (
            <img 
              src={value} 
              alt="Preview" 
              className="h-10 w-10 object-contain rounded border"
            />
          )}
        </div>
      )
    },
    {
      key: 'name',
      label: 'Name',
      visible: true,
      width: 200,
      filterable: true,
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      visible: true,
      width: 130,
      filterable: true,
      sortable: true,
      renderCell: (value: string | null) => (
        <Badge variant="outline">
          {IMAGE_CATEGORIES.find(cat => cat.value === value)?.label || value || 'General'}
        </Badge>
      )
    },
    {
      key: 'description',
      label: 'Description',
      visible: true,
      width: 250,
      filterable: true,
      sortable: false,
      renderCell: (value: string) => (
        <div className="max-w-xs truncate text-sm text-muted-foreground" title={value}>
          {value && value.length > 60 ? `${value.substring(0, 60)}...` : value}
        </div>
      )
    },
    {
      key: 'isActive',
      label: 'Status',
      visible: true,
      width: 80,
      filterable: true,
      sortable: true,
      renderCell: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      )
    },
  ];

  // Data table state
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'images'
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingImage) {
        return apiRequest("PATCH", `/api/masterdata/images/${editingImage.id}`, data);
      }
      return apiRequest("POST", "/api/masterdata/images", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/images"] });
      toast({
        title: editingImage ? "Image updated" : "Image created",
        description: `Image has been ${editingImage ? "updated" : "created"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save image",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/masterdata/images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/masterdata/images"] });
      toast({
        title: "Image deleted",
        description: "Image has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (image?: any) => {
    if (image) {
      setEditingImage(image);
      setFormData({
        name: image.name || "",
        description: image.description || "",
        category: image.category || "general",
        imageData: image.imageData || "",
      });
    } else {
      setEditingImage(null);
      setFormData({
        name: "",
        description: "",
        category: "general",
        imageData: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingImage(null);
    setFormData({
      name: "",
      description: "",
      category: "general",
      imageData: "",
    });
  };

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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (image: any) => {
    handleOpenDialog(image);
  };

  const handleRowDoubleClick = (image: any) => {
    handleOpenDialog(image);
  };

  // Row actions
  const rowActions = (row: any) => [
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => handleEdit(row),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => handleDelete(row.id),
      variant: 'destructive' as const,
    },
  ];

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Image"
        entityNamePlural="Images"
        data={images}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        isLoading={isLoading}
        searchTerm={tableState.searchTerm}
        setSearchTerm={tableState.setSearchTerm}
        filters={tableState.filters}
        setFilters={tableState.setFilters}
        onAddFilter={tableState.addFilter}
        onUpdateFilter={tableState.updateFilter}
        onRemoveFilter={tableState.removeFilter}
        sortConfig={tableState.sortConfig}
        onSort={tableState.handleSort}
        selectedRows={tableState.selectedRows}
        setSelectedRows={tableState.setSelectedRows}
        onToggleRowSelection={tableState.toggleRowSelection}
        onToggleAllRows={() => {
          const allIds = images.map(img => img.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: any) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-image',
            label: 'Add Image',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => handleOpenDialog(),
            variant: 'default' as const
          }
        ]}
        rowActions={rowActions}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingImage ? "Edit Image" : "Add New Image"}</DialogTitle>
            <DialogDescription>
              {editingImage ? "Update the image details below." : "Upload a new image to the library."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" data-testid="select-image-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  required={!editingImage}
                  data-testid="input-image-file"
                />
                {formData.imageData && (
                  <div className="mt-2 border rounded p-2 bg-gray-50">
                    <img 
                      src={formData.imageData} 
                      alt="Preview" 
                      className="max-h-40 mx-auto object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save-image"
              >
                {saveMutation.isPending ? "Saving..." : editingImage ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
