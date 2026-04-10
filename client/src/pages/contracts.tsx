import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';
import { useMemo, useCallback } from "react";
import type { Contract, Customer } from "@shared/schema";
import { format } from "date-fns";

export default function Contracts() {
  const { toast } = useToast();

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    refetchOnMount: 'always',
    staleTime: 30000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
  });

  const isLoading = contractsLoading || customersLoading;

  const getCustomerName = useCallback((customerId: string) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || '';
  }, [customers]);

  const enrichedContracts = useMemo(() => {
    return contracts.map(contract => ({
      ...contract,
      customerName: getCustomerName(contract.customerId || ''),
    }));
  }, [contracts, getCustomerName]);

  const baseColumns: ColumnConfig[] = useMemo(() => [
    createIdColumn('contractNumber', 'Contractnummer'),
    {
      key: 'customerName',
      label: 'Klant',
      visible: true,
      width: 200,
      filterable: true,
      sortable: true,
    },
    {
      key: 'description',
      label: 'Omschrijving',
      visible: true,
      width: 250,
      filterable: true,
      sortable: true,
      renderCell: (value: string) => value || ''
    },
    {
      key: 'contractDate',
      label: 'Datum',
      visible: true,
      width: 120,
      filterable: true,
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    {
      key: 'validUntil',
      label: 'Geldig tot',
      visible: true,
      width: 120,
      filterable: true,
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    {
      key: 'status',
      label: 'Status',
      visible: true,
      width: 100,
      filterable: true,
      sortable: true,
      renderCell: (value: string) => {
        const getStatusStyle = (status: string) => {
          switch (status) {
            case "concept": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
            case "actief": return { bg: "bg-green-100", text: "text-green-600", border: "border-green-300" };
            case "verlopen": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
            case "geannuleerd": return { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-300" };
            default: return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" };
          }
        };
        const style = getStatusStyle(value || "concept");
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
            {value || 'concept'}
          </span>
        );
      }
    },
  ], []);

  const tableState = useDataTable({
    defaultColumns: baseColumns,
    tableKey: 'contracts',
    data: enrichedContracts,
  });

  const del = useEntityDelete<Contract>({
    endpoint: '/api/contracts',
    queryKeys: ['/api/contracts'],
    entityLabel: 'Contract',
    checkUsages: false,
    getName: (row) => row.contractNumber || row.description || ''
  });

  const handleAddContract = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-contract',
        name: 'Nieuw Contract',
        formType: 'contract',
        parentId: 'contracts'
      }
    }));
  }, []);

  const handleEditContract = useCallback((contract: Contract) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-contract-${contract.id}`,
        name: `Bewerken ${contract.contractNumber}`,
        formType: 'contract',
        parentId: contract.id
      }
    }));
  }, []);

  const handleViewContract = useCallback((contract: Contract) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `view-contract-${contract.id}`,
        name: `Contract ${contract.contractNumber}`,
        formType: 'contract',
        parentId: contract.id
      }
    }));
  }, []);

  return (
    <div className="p-6">
      <DataTableLayout
        data={enrichedContracts}
        isLoading={isLoading}
        columns={tableState.columns}
        setColumns={tableState.setColumns}
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
        onToggleAllRows={useCallback(() => {
          const allIds = enrichedContracts.map(c => c.id);
          tableState.toggleAllRows(allIds);
        }, [enrichedContracts, tableState.toggleAllRows])}
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => del.handleBulkDelete(tableState.selectedRows, enrichedContracts),
          itemCount: tableState.selectedRows.length
        }}
        onRowDoubleClick={handleViewContract}
        title="Contracten"
        addButtonLabel="Nieuw Contract"
        onAdd={handleAddContract}
        rowActions={[
          { label: "Bekijken", icon: Eye, onClick: handleViewContract },
          { label: "Bewerken", icon: Edit, onClick: handleEditContract },
          { label: "Verwijderen", icon: Trash2, onClick: del.handleDelete, variant: "destructive" as const },
        ]}
      />
      {del.confirmDialog}
    </div>
  );
}
