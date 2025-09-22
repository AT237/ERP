import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, MapPin, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

const defaultColumns: ColumnConfig[] = [
  createIdColumn('id', 'Address ID'),
  { key: 'street', label: 'Street', visible: true, width: 200, filterable: true, sortable: true },
  { key: 'houseNumber', label: 'House Number', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'postalCode', label: 'Postal Code', visible: true, width: 120, filterable: true, sortable: true },
  { key: 'city', label: 'City', visible: true, width: 150, filterable: true, sortable: true },
  { key: 'country', label: 'Country', visible: true, width: 120, filterable: true, sortable: true },
  { 
    key: 'fullAddress', 
    label: 'Full Address', 
    visible: true, 
    width: 300, 
    filterable: false, 
    sortable: false,
    renderCell: (value: any, row: Address) => (
      <div className="flex items-center space-x-2">
        <Building size={14} className="text-blue-500" />
        <span className="text-sm">
          {`${row.street} ${row.houseNumber}, ${row.postalCode} ${row.city}, ${row.country}`}
        </span>
      </div>
    )
  },
  { 
    key: 'createdAt', 
    label: 'Created', 
    visible: true, 
    width: 120, 
    filterable: false, 
    sortable: true,
    renderCell: (value: Date | string) => 
      new Date(value).toLocaleDateString('en-US')
  },
];

export default function Addresses() {
  const { toast } = useToast();

  // Data table state  
  const tableState = useDataTable({ 
    defaultColumns,
    tableKey: 'addresses'
  });

  // Data fetching
  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Address deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (address: Address) => {
    // Dispatch custom event to open address edit form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-address-${address.id}`,
        name: `${address.street} ${address.houseNumber}, ${address.city}`,
        formType: 'address',
        parentId: address.id
      }
    });
    window.dispatchEvent(event);
  };

  const handleRowDoubleClick = (address: Address) => {
    // Open edit form on double click
    handleEdit(address);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this address?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewAddress = () => {
    // Dispatch custom event to open address form in new tab
    const event = new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-address',
        name: 'New Address',
        formType: 'address'
      }
    });
    window.dispatchEvent(event);
  };

  // Render table data with proper formatting
  const renderTableData = (addresses: Address[]) => {
    return addresses.map((address) => ({
      ...address,
      street: address.street || '',
      houseNumber: address.houseNumber || '',
      postalCode: address.postalCode || '',
      city: address.city || '',
      country: address.country || '',
    }));
  };

  return (
    <div className="p-6">
      <DataTableLayout
        entityName="Address"
        entityNamePlural="Addresses"
        data={renderTableData(addresses)}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
        tableKey="addresses"
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
          const allIds = addresses.map(a => a.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleRowDoubleClick}
        getRowId={(row: Address) => row.id}
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[
          {
            key: 'add-address',
            label: 'Add Address',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewAddress,
            variant: 'default' as const
          }
        ]}
        rowActions={(row: Address) => [
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
      />
    </div>
  );
}