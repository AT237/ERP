import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RateCard, RateCardLine, CustomerRateAgreement, Customer } from "@shared/schema";
import { DataTableLayout, ColumnConfig, createIdColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';

const rateCardDefaultColumns: ColumnConfig[] = [
  createIdColumn('code', 'Code'),
  { key: 'name', label: 'Name', visible: true, width: 200, filterable: true, sortable: true, renderCell: (value: string) => <span className="font-medium">{value}</span> },
  { key: 'description', label: 'Description', visible: true, width: 250, filterable: true, sortable: true },
  { key: 'region', label: 'Region', visible: true, width: 80, filterable: true, sortable: true },
  { key: 'validFrom', label: 'Valid From', visible: true, width: 110, filterable: true, sortable: true },
  { key: 'validTo', label: 'Valid To', visible: true, width: 110, filterable: true, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true, renderCell: (value: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{value}</span>
  )},
];

const rateCardLineDefaultColumns: ColumnConfig[] = [
  { key: 'rateCardName', label: 'Rate Card', visible: true, width: 180, filterable: true, sortable: true },
  { key: 'position', label: 'Pos.', visible: true, width: 70, filterable: false, sortable: true, renderCell: (value: string) => <span className="font-mono text-xs">{value}</span> },
  { key: 'rateType', label: 'Rate Type', visible: true, width: 120, filterable: true, sortable: true, renderCell: (value: string) => <span className="font-medium">{value}</span> },
  { key: 'description', label: 'Description', visible: true, width: 250, filterable: true, sortable: true },
  createCurrencyColumn('amount', 'Amount'),
  { key: 'currency', label: 'Currency', visible: true, width: 80, filterable: true, sortable: true },
  { key: 'unit', label: 'Unit', visible: true, width: 80, filterable: true, sortable: true },
  { key: 'traineePercentage', label: 'Trainee %', visible: true, width: 100, filterable: false, sortable: true, renderCell: (value: string) => value ? `${value}%` : '' },
];

const agreementDefaultColumns: ColumnConfig[] = [
  createIdColumn('agreementNumber', 'Agreement No.'),
  { key: 'customerName', label: 'Customer', visible: true, width: 200, filterable: true, sortable: true, renderCell: (value: string) => <span className="font-medium">{value || '-'}</span> },
  { key: 'rateCardName', label: 'Rate Card', visible: true, width: 180, filterable: true, sortable: true },
  { key: 'region', label: 'Region', visible: true, width: 80, filterable: true, sortable: true },
  { key: 'validFrom', label: 'Valid From', visible: true, width: 110, filterable: true, sortable: true },
  { key: 'validTo', label: 'Valid To', visible: true, width: 110, filterable: true, sortable: true },
  { key: 'status', label: 'Status', visible: true, width: 100, filterable: true, sortable: true, renderCell: (value: string) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      value === 'active' ? 'bg-green-100 text-green-800' : 
      value === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
    }`}>{value}</span>
  )},
  { key: 'travelDaysPercentage', label: 'Travel Days %', visible: true, width: 110, filterable: false, sortable: true, renderCell: (value: string) => value ? `${value}%` : '' },
  { key: 'serviceContractDiscount', label: 'Service Discount %', visible: true, width: 130, filterable: false, sortable: true, renderCell: (value: string) => value ? `${value}%` : '' },
];

function RateCardsTable() {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tableState = useDataTable({
    defaultColumns: rateCardDefaultColumns,
    tableKey: 'rate-cards',
  });

  const { data: rateCards = [], isLoading } = useQuery<RateCard[]>({
    queryKey: ['/api/rate-cards'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/rate-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rate-card-lines'] });
      toast({ title: "Deleted", description: "Rate card deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete rate card", variant: "destructive" });
    }
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/rate-cards/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rate-card-lines'] });
      tableState.setSelectedRows([]);
      toast({ title: "Deleted", description: "Rate cards deleted" });
    },
  });

  const handleDuplicate = async (row: any) => {
    try {
      const { id: _, createdAt, ...data } = row;
      data.code = `${data.code}-COPY`;
      data.name = `${data.name} (Copy)`;
      await apiRequest('POST', '/api/rate-cards', data);
      queryClient.invalidateQueries({ queryKey: ['/api/rate-cards'] });
      toast({ title: "Success", description: "Rate card duplicated" });
    } catch {
      toast({ title: "Error", description: "Failed to duplicate", variant: "destructive" });
    }
  };

  return (
    <DataTableLayout
      entityName="Rate Card"
      entityNamePlural="Rate Cards"
      data={rateCards}
      columns={tableState.columns}
      setColumns={tableState.setColumns}
      tableKey="rate-cards"
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
      onToggleAllRows={() => tableState.toggleAllRows(rateCards.map(r => r.id))}
      onRowDoubleClick={(row: any) => {
        window.dispatchEvent(new CustomEvent('open-form-tab', {
          detail: { type: 'rate-card', mode: 'edit', id: row.id }
        }));
      }}
      getRowId={(row: any) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      deleteConfirmDialog={{
        isOpen: showDeleteConfirm,
        onOpenChange: setShowDeleteConfirm,
        onConfirm: () => deleteSelectedMutation.mutate(tableState.selectedRows),
        itemCount: tableState.selectedRows.length,
      }}
      headerActions={[
        {
          key: 'add-rate-card',
          label: 'Add Rate Card',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: { type: 'rate-card', mode: 'create' }
            }));
          },
          variant: 'default' as const,
        }
      ]}
      onDuplicate={handleDuplicate}
      rowActions={(row: any) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: { type: 'rate-card', mode: 'edit', id: row.id }
            }));
          },
          variant: 'outline' as const,
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => deleteMutation.mutate(row.id),
          variant: 'destructive' as const,
        }
      ]}
    />
  );
}

function RateCardLinesTable() {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tableState = useDataTable({
    defaultColumns: rateCardLineDefaultColumns,
    tableKey: 'rate-card-lines',
  });

  const { data: lines = [], isLoading } = useQuery<RateCardLine[]>({
    queryKey: ['/api/rate-card-lines'],
  });

  const { data: rateCards = [] } = useQuery<RateCard[]>({
    queryKey: ['/api/rate-cards'],
  });

  const enrichedLines = lines.map(line => ({
    ...line,
    rateCardName: rateCards.find(rc => rc.id === line.rateCardId)?.name || '-',
  }));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/rate-card-lines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rate-card-lines'] });
      toast({ title: "Deleted", description: "Rate card line deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete line", variant: "destructive" });
    }
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/rate-card-lines/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rate-card-lines'] });
      tableState.setSelectedRows([]);
      toast({ title: "Deleted", description: "Lines deleted" });
    },
  });

  const handleDuplicate = async (row: any) => {
    try {
      const { id: _, createdAt, rateCardName, ...data } = row;
      await apiRequest('POST', '/api/rate-card-lines', data);
      queryClient.invalidateQueries({ queryKey: ['/api/rate-card-lines'] });
      toast({ title: "Success", description: "Line duplicated" });
    } catch {
      toast({ title: "Error", description: "Failed to duplicate", variant: "destructive" });
    }
  };

  return (
    <DataTableLayout
      entityName="Rate Card Line"
      entityNamePlural="Rate Card Lines"
      data={enrichedLines}
      columns={tableState.columns}
      setColumns={tableState.setColumns}
      tableKey="rate-card-lines"
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
      onToggleAllRows={() => tableState.toggleAllRows(enrichedLines.map(r => r.id))}
      onRowDoubleClick={(row: any) => {
        window.dispatchEvent(new CustomEvent('open-form-tab', {
          detail: { type: 'rate-card-line', mode: 'edit', id: row.id }
        }));
      }}
      getRowId={(row: any) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      deleteConfirmDialog={{
        isOpen: showDeleteConfirm,
        onOpenChange: setShowDeleteConfirm,
        onConfirm: () => deleteSelectedMutation.mutate(tableState.selectedRows),
        itemCount: tableState.selectedRows.length,
      }}
      headerActions={[
        {
          key: 'add-line',
          label: 'Add Line',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: { type: 'rate-card-line', mode: 'create' }
            }));
          },
          variant: 'default' as const,
        }
      ]}
      onDuplicate={handleDuplicate}
      rowActions={(row: any) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: { type: 'rate-card-line', mode: 'edit', id: row.id }
            }));
          },
          variant: 'outline' as const,
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => deleteMutation.mutate(row.id),
          variant: 'destructive' as const,
        }
      ]}
    />
  );
}

function CustomerRateAgreementsTable() {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tableState = useDataTable({
    defaultColumns: agreementDefaultColumns,
    tableKey: 'customer-rate-agreements',
  });

  const { data: agreements = [], isLoading } = useQuery<CustomerRateAgreement[]>({
    queryKey: ['/api/customer-rate-agreements'],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: rateCards = [] } = useQuery<RateCard[]>({
    queryKey: ['/api/rate-cards'],
  });

  const enrichedAgreements = agreements.map(agreement => ({
    ...agreement,
    customerName: customers.find(c => c.id === agreement.customerId)?.name || '-',
    rateCardName: rateCards.find(rc => rc.id === agreement.rateCardId)?.name || '-',
  }));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/customer-rate-agreements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-rate-agreements'] });
      toast({ title: "Deleted", description: "Agreement deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete agreement", variant: "destructive" });
    }
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/customer-rate-agreements/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-rate-agreements'] });
      tableState.setSelectedRows([]);
      toast({ title: "Deleted", description: "Agreements deleted" });
    },
  });

  const handleDuplicate = async (row: any) => {
    try {
      const { id: _, createdAt, agreementNumber, customerName, rateCardName, ...data } = row;
      await apiRequest('POST', '/api/customer-rate-agreements', data);
      queryClient.invalidateQueries({ queryKey: ['/api/customer-rate-agreements'] });
      toast({ title: "Success", description: "Agreement duplicated" });
    } catch {
      toast({ title: "Error", description: "Failed to duplicate", variant: "destructive" });
    }
  };

  return (
    <DataTableLayout
      entityName="Customer Rate Agreement"
      entityNamePlural="Customer Rate Agreements"
      data={enrichedAgreements}
      columns={tableState.columns}
      setColumns={tableState.setColumns}
      tableKey="customer-rate-agreements"
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
      onToggleAllRows={() => tableState.toggleAllRows(enrichedAgreements.map(r => r.id))}
      onRowDoubleClick={(row: any) => {
        window.dispatchEvent(new CustomEvent('open-form-tab', {
          detail: { type: 'customer-rate-agreement', mode: 'edit', id: row.id }
        }));
      }}
      getRowId={(row: any) => row.id}
      applyFiltersAndSearch={tableState.applyFiltersAndSearch}
      applySorting={tableState.applySorting}
      deleteConfirmDialog={{
        isOpen: showDeleteConfirm,
        onOpenChange: setShowDeleteConfirm,
        onConfirm: () => deleteSelectedMutation.mutate(tableState.selectedRows),
        itemCount: tableState.selectedRows.length,
      }}
      headerActions={[
        {
          key: 'add-agreement',
          label: 'Add Agreement',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: { type: 'customer-rate-agreement', mode: 'create' }
            }));
          },
          variant: 'default' as const,
        }
      ]}
      onDuplicate={handleDuplicate}
      rowActions={(row: any) => [
        {
          key: 'edit',
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          onClick: () => {
            window.dispatchEvent(new CustomEvent('open-form-tab', {
              detail: { type: 'customer-rate-agreement', mode: 'edit', id: row.id }
            }));
          },
          variant: 'outline' as const,
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => deleteMutation.mutate(row.id),
          variant: 'destructive' as const,
        }
      ]}
    />
  );
}

export default function RatesAndChargesPage() {
  return (
    <div className="p-6 space-y-6">
      <RateCardsTable />
      <RateCardLinesTable />
      <CustomerRateAgreementsTable />
    </div>
  );
}
