import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import type { Quotation, Customer } from "@shared/schema";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Eye } from "lucide-react";

interface QuotationsProps {
  onCreateNew?: (formInfo: {id: string, name: string, formType: string, parentId?: string}) => void;
}

export default function Quotations({ onCreateNew }: QuotationsProps) {
  // Simple data fetching
  const { data: quotations = [], isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
    staleTime: 60000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 60000,
  });

  // Combined loading
  const isLoading = quotationsLoading || customersLoading;

  // Simple column config - no dynamic functions
  const columns: ColumnConfig[] = React.useMemo(() => [
    createIdColumn('quotationNumber', 'Quotation #'),
    { 
      key: 'customerId', 
      label: 'Customer', 
      visible: true, 
      width: 200, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => {
        const customer = customers.find(c => c.id === value);
        return customer?.name || 'Unknown';
      }
    },
    { 
      key: 'quotationDate', 
      label: 'Quote Date', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => value ? format(new Date(value), 'dd-MM-yyyy') : ''
    },
    { 
      key: 'totalAmount', 
      label: 'Total', 
      visible: true, 
      width: 120, 
      filterable: true, 
      sortable: true,
      renderCell: (value: string) => `€${value || "0.00"}`
    },
    { 
      key: 'status', 
      label: 'Status', 
      visible: true, 
      width: 100, 
      filterable: true, 
      sortable: true
    },
  ], [customers]);

  // Simple table state
  const tableState = useDataTable({ 
    defaultColumns: columns,
    tableKey: 'quotations-simple'
  });

  // Simple handlers
  const handleAdd = () => {
    if (onCreateNew) {
      onCreateNew({
        id: 'new-quotation',
        name: 'New Quotation',
        formType: 'quotation',
        parentId: 'quotations'
      });
    }
  };

  const handleView = (quotation: Quotation) => {
    console.log('View:', quotation.quotationNumber);
  };

  const handleEdit = (quotation: Quotation) => {
    console.log('Edit:', quotation.quotationNumber);
  };

  const handleDelete = (quotation: Quotation) => {
    console.log('Delete:', quotation.quotationNumber);
  };

  return (
    <div className="p-6">
      <DataTableLayout
        data={quotations}
        isLoading={isLoading}
        columns={columns}
        setColumns={() => {}}
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
          const allIds = quotations.map(q => q.id);
          tableState.toggleAllRows(allIds);
        }}
        onRowDoubleClick={handleView}
        getRowId={(quotation: Quotation) => quotation.id}
        entityName="Quotation"
        entityNamePlural="Quotations"
        applyFiltersAndSearch={tableState.applyFiltersAndSearch}
        applySorting={tableState.applySorting}
        headerActions={[{
          key: 'add',
          label: 'Add Quotation',
          icon: <Plus className="h-4 w-4" />,
          onClick: handleAdd,
          variant: 'default'
        }]}
        rowActions={(quotation: Quotation) => [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => handleView(quotation),
            variant: 'outline'
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEdit(quotation),
            variant: 'outline'
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => handleDelete(quotation),
            variant: 'destructive'
          }
        ]}
      />
    </div>
  );
}