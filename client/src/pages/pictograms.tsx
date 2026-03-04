import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus } from "lucide-react";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useIsMobile } from "@/hooks/use-mobile";
import { useEntityDelete } from '@/hooks/useEntityDelete';

export default function Pictograms() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  const { data: pictograms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/masterdata/pictograms"],
  });

  const del = useEntityDelete<any>({
    endpoint: '/api/masterdata/pictograms',
    queryKeys: ['/api/masterdata/pictograms'],
    entityLabel: 'Pictogram',
    checkUsages: false,
    getName: (row) => row.name || row.code || ''
  });

  const defaultColumns: ColumnConfig[] = [
    createIdColumn('code', 'Code'),
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
      width: 120,
      filterable: true,
      sortable: true,
      renderCell: (value: string) => (
        <Badge variant="outline">{value || 'general'}</Badge>
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

  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'pictograms'
  });

  const handleEdit = (pictogram: any) => {
    if (isMobile) {
      navigate(`/pictogram-form/${pictogram.id}`);
    } else {
      const event = new CustomEvent('open-form-tab', {
        detail: {
          id: `edit-pictogram-${pictogram.id}`,
          name: 'Pictogram',
          formType: 'pictogram',
          parentId: pictogram.id
        }
      });
      window.dispatchEvent(event);
    }
  };

  const handleRowDoubleClick = (pictogram: any) => {
    handleEdit(pictogram);
  };

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
      onClick: () => del.handleDeleteRow(row),
      variant: 'destructive' as const,
    },
  ];

  const handleNewPictogram = () => {
    if (isMobile) {
      navigate('/pictogram-form');
    } else {
      const event = new CustomEvent('open-form-tab', {
        detail: {
          id: 'new-pictogram',
          name: 'Pictogram',
          formType: 'pictogram'
        }
      });
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Pictogram"
        entityNamePlural="Pictograms"
        data={pictograms}
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
          const allIds = pictograms.map(p => p.id);
          tableState.toggleAllRows(allIds);
        }}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, pictograms),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: any) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-pictogram',
            label: 'Add Pictogram',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewPictogram,
            variant: 'default' as const
          }
        ]}
        rowActions={rowActions}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
