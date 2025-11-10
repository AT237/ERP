import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

export default function Images() {
  const { toast } = useToast();

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

  const handleNewImage = () => {
    // Dispatch custom event to open new image form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-image',
        name: 'Image',
        formType: 'image'
      }
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (image: any) => {
    // Dispatch custom event to open image edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-image-${image.id}`,
        name: 'Image',
        formType: 'image',
        parentId: image.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (image: any) => {
    handleEdit(image);
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
            onClick: handleNewImage,
            variant: 'default' as const
          }
        ]}
        rowActions={rowActions}
      />
    </div>
  );
}
