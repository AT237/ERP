import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Package, Edit, Trash2, Plus, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { z } from "zod";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import imageCompression from 'browser-image-compression';

const inventoryFormSchema = insertInventoryItemSchema.extend({
  unitPrice: z.string().min(1, "Prijs is verplicht"),
  costPrice: z.string().min(1, "Kostprijs is verplicht"),
  margin: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

const defaultColumns: ColumnConfig[] = [
  createIdColumn('sku', 'SKU'),
  { key: 'name', label: 'Name', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'category', label: 'Category', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'unitPrice', label: 'Selling Price', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'costPrice', label: 'Cost Price', visible: true, width: 120, filterable: false, sortable: true },
  { key: 'margin', label: 'Margin %', visible: true, width: 100, filterable: false, sortable: true },
  { key: 'currentStock', label: 'Stock', visible: true, width: 80, filterable: false, sortable: true },
  { key: 'minimumStock', label: 'Min Stock', visible: true, width: 80, filterable: false, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true },
  { key: 'isComposite', label: 'Composite', visible: true, width: 100, filterable: false, sortable: true },
];

export default function Inventory() {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns
  });

  // Data fetching
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Form setup
  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category: "General",
      unit: "pcs",
      unitPrice: "0.00",
      costPrice: "0.00",
      margin: "0.00",
      currentStock: 0,
      minimumStock: 0,
      status: "active",
      image: "",
      isComposite: false,
    },
  });

  // Watch for price changes to auto-calculate margin
  const watchedCostPrice = form.watch("costPrice");
  const watchedUnitPrice = form.watch("unitPrice");

  // Calculate margin
  const calculateMargin = (costPrice: string, unitPrice: string) => {
    const cost = parseFloat(costPrice) || 0;
    const selling = parseFloat(unitPrice) || 0;
    if (cost === 0) return "0.00";
    const margin = ((selling - cost) / cost) * 100;
    return margin.toFixed(2);
  };

  // Auto-calculate margin when prices change
  useEffect(() => {
    if (watchedCostPrice && watchedUnitPrice) {
      const margin = calculateMargin(watchedCostPrice, watchedUnitPrice);
      form.setValue("margin", margin);
    }
  }, [watchedCostPrice, watchedUnitPrice, form]);

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setPreviewImage(base64String);
        form.setValue('image', base64String);
      };
      reader.readAsDataURL(compressedFile);
      
      toast({
        title: "Succes",
        description: `Afbeelding gecomprimeerd van ${(file.size / 1024 / 1024).toFixed(2)}MB naar ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      toast({
        title: "Fout",
        description: "Kan afbeelding niet verwerken",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: InventoryFormData) => {
      const response = await apiRequest("POST", "/api/inventory", {
        ...data,
        // Convert strings to numbers for decimal fields
        unitPrice: parseFloat(data.unitPrice || '0').toString(),
        costPrice: parseFloat(data.costPrice || '0').toString(),
        margin: parseFloat(data.margin || '0').toString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setShowDialog(false);
      setPreviewImage("");
      form.reset();
      setEditingItem(null);
      toast({
        title: "Succes",
        description: "Artikel toegevoegd",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan artikel niet toevoegen",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryFormData> }) => {
      const response = await apiRequest("PUT", `/api/inventory/${id}`, {
        ...data,
        unitPrice: parseFloat(data.unitPrice || '0').toString(),
        costPrice: parseFloat(data.costPrice || '0').toString(),
        margin: parseFloat(data.margin || '0').toString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setShowDialog(false);
      setPreviewImage("");
      form.reset();
      setEditingItem(null);
      toast({
        title: "Succes",
        description: "Artikel bijgewerkt",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan artikel niet bijwerken",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Succes",
        description: "Artikel verwijderd",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kan artikel niet verwijderen",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onSubmit = (data: InventoryFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      sku: item.sku,
      description: item.description || "",
      category: item.category || "General",
      unit: item.unit || "pcs",
      unitPrice: item.unitPrice || "0.00",
      costPrice: item.costPrice || "0.00",
      margin: item.margin || "0.00",
      currentStock: item.currentStock || 0,
      minimumStock: item.minimumStock || 0,
      status: item.status || "active",
      image: item.image || "",
      isComposite: item.isComposite || false,
    });
    if (item.image) {
      setPreviewImage(item.image);
    }
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je dit artikel wilt verwijderen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setPreviewImage("");
    form.reset();
    setShowDialog(true);
  };

  // Keep raw data for sorting, formatting handled in display
  const renderTableData = (items: InventoryItem[]) => {
    return items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice || '0.00',
      costPrice: item.costPrice || '0.00', 
      margin: item.margin || '0.00',
      currentStock: item.currentStock || 0,
      minimumStock: item.minimumStock || 0,
      status: item.status || 'active',
      isComposite: item.isComposite || false,
    }));
  };

  // Form content
  const renderFormContent = () => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Basisinformatie</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Artikelnaam"
              data-testid="input-inventory-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              {...form.register("sku")}
              placeholder="SKU/Artikelcode"
              data-testid="input-inventory-sku"
            />
            {form.formState.errors.sku && (
              <p className="text-sm text-red-600">{form.formState.errors.sku.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Beschrijving</Label>
          <Textarea
            id="description"
            {...form.register("description")}
            placeholder="Beschrijving van het artikel"
            data-testid="input-inventory-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categorie</Label>
            <Select 
              onValueChange={(value) => form.setValue("category", value)}
              value={form.watch("category") || "General"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">Algemeen</SelectItem>
                <SelectItem value="Electronics">Elektronica</SelectItem>
                <SelectItem value="Hardware">Hardware</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Services">Diensten</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Eenheid</Label>
            <Select 
              onValueChange={(value) => form.setValue("unit", value)}
              value={form.watch("unit") || "pcs"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Stuks</SelectItem>
                <SelectItem value="kg">Kilogram</SelectItem>
                <SelectItem value="m">Meter</SelectItem>
                <SelectItem value="l">Liter</SelectItem>
                <SelectItem value="box">Doos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Afbeelding</h3>
        
        <div className="space-y-2">
          <Label htmlFor="image">Productafbeelding</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {previewImage ? (
              <div className="space-y-2">
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="mx-auto h-32 w-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewImage("");
                    form.setValue("image", "");
                  }}
                >
                  Verwijderen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-gray-500">
                  Sleep een afbeelding hierheen of klik om te selecteren
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploadingImage}
                  className="cursor-pointer"
                  data-testid="input-inventory-image"
                />
                {uploadingImage && <div className="text-sm text-orange-600">Comprimeren...</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Prijzen</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="costPrice">Kostprijs (€) *</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              {...form.register("costPrice")}
              placeholder="0.00"
              data-testid="input-inventory-costPrice"
            />
            {form.formState.errors.costPrice && (
              <p className="text-sm text-red-600">{form.formState.errors.costPrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitPrice">Verkoopprijs (€) *</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              {...form.register("unitPrice")}
              placeholder="0.00"
              data-testid="input-inventory-unitPrice"
            />
            {form.formState.errors.unitPrice && (
              <p className="text-sm text-red-600">{form.formState.errors.unitPrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin">Marge (%)</Label>
            <Input
              id="margin"
              {...form.register("margin")}
              placeholder="0.00"
              readOnly
              className="bg-gray-50"
              data-testid="input-inventory-margin"
            />
          </div>
        </div>
      </div>

      {/* Stock Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Voorraad</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentStock">Huidige voorraad</Label>
            <Input
              id="currentStock"
              type="number"
              min="0"
              {...form.register("currentStock", { valueAsNumber: true })}
              placeholder="0"
              data-testid="input-inventory-currentStock"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumStock">Minimum voorraad</Label>
            <Input
              id="minimumStock"
              type="number"
              min="0"
              {...form.register("minimumStock", { valueAsNumber: true })}
              placeholder="0"
              data-testid="input-inventory-minimumStock"
            />
          </div>
        </div>
      </div>

      {/* Composite Article Option */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-600">Samengesteld artikel</h3>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isComposite"
            checked={form.watch("isComposite") || false}
            onCheckedChange={(checked) => form.setValue("isComposite", !!checked)}
            data-testid="checkbox-inventory-isComposite"
          />
          <Label htmlFor="isComposite">
            Dit artikel bestaat uit andere artikelen
          </Label>
        </div>
        
        {form.watch("isComposite") && (
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700">
              Componenten kunnen worden toegevoegd na het aanmaken van dit artikel.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowDialog(false);
            setPreviewImage("");
            form.reset();
          }}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          Annuleren
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {(createMutation.isPending || updateMutation.isPending) ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-6">
      <div className="ml-[38px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 p-4">
        <DataTableLayout
      entityName="Product"
      entityNamePlural="Products"
      data={renderTableData(items)}
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
        const allIds = items.map(item => item.id);
        tableState.toggleAllRows(allIds);
      }}
      onRowDoubleClick={handleEdit}
      getRowId={(row: InventoryItem) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      headerActions={[
        {
          key: 'add-inventory',
          label: 'Add Item',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleNewItem,
          variant: 'default' as const
        }
      ]}
      rowActions={(row: InventoryItem) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => handleEdit(row),
          variant: 'outline' as const
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => handleDelete(row.id),
          variant: 'destructive' as const
        }
      ]}
      addEditDialog={{
        isOpen: showDialog,
        onOpenChange: setShowDialog,
        title: editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item',
        content: renderFormContent()
      }}
    />
      </div>
    </div>
  );
}