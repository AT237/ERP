import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Phone, Mail } from "lucide-react";

import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';
import { useDataTable } from '@/hooks/useDataTable';
import { useEntityDelete } from '@/hooks/useEntityDelete';

const defaultColumns: ColumnConfig[] = [
  createIdColumn('employeeNumber', 'Employee ID'),
  { key: 'firstName', label: 'First Name', visible: true, width: 150, filterable: true, sortable: true },
  { key: 'lastName', label: 'Last Name', visible: true, width: 150, filterable: true, sortable: true },
  { key: 'title', label: 'Title', visible: true, width: 140, filterable: true, sortable: true },
  { 
    key: 'email', 
    label: 'Email', 
    visible: true, 
    width: 200, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Mail className="w-3 h-3" />
        {value}
      </a>
    ) : ''
  },
  { 
    key: 'phone', 
    label: 'Phone', 
    visible: true, 
    width: 140, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? (
      <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
        <Phone className="w-3 h-3" />
        {value}
      </a>
    ) : ''
  },
  { key: 'mobile', label: 'Mobile', visible: false, width: 140, filterable: true, sortable: true },
  { 
    key: 'dateOfBirth', 
    label: 'Date of Birth', 
    visible: false, 
    width: 120, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? new Date(value).toLocaleDateString('nl-NL') : ''
  },
  { 
    key: 'createdAt', 
    label: 'Created', 
    visible: false, 
    width: 100, 
    filterable: true, 
    sortable: true,
    renderCell: (value: string) => value ? new Date(value).toLocaleDateString('nl-NL') : ''
  },
];

export default function EmployeesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const dataTableState = useDataTable({
    defaultColumns,
    defaultSort: { column: 'lastName', direction: 'asc' },
    tableKey: 'employees'
  });

  const del = useEntityDelete<Employee>({
    endpoint: '/api/employees',
    queryKeys: ['/api/employees'],
    getName: (row) => `${row.firstName} ${row.lastName}`.trim() || 'Employee',
    entityLabel: 'Employee',
    checkUsages: false,
  });

  const handleNewEmployee = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `employee-new-${Date.now()}`,
        name: 'New Employee',
        formType: 'employee',
        parentId: 'employees'
      }
    }));
  };

  const handleEditEmployee = (employee: Employee) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `employee-edit-${employee.id}`,
        name: `Edit ${employee.firstName} ${employee.lastName}`,
        formType: 'employee',
        parentId: 'employees',
        data: employee
      }
    }));
  };

  const handleRowDoubleClick = (employee: Employee) => {
    handleEditEmployee(employee);
  };

  const { data: employeesList = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    refetchOnMount: 'always',
  });

  const handleToggleAllRows = () => {
    const allRowIds = employeesList.map(emp => emp.id);
    dataTableState.toggleAllRows(allRowIds);
  };

  const handleExport = () => {
    toast({
      title: "Export functionality",
      description: "Export feature will be implemented here.",
    });
  };

  const handleDuplicate = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`);
      if (!res.ok) throw new Error('Failed to fetch employee');
      const data = await res.json();
      const { id, createdAt, ...duplicateData } = data;
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...duplicateData,
          firstName: `${duplicateData.firstName || ''} (Copy)`,
        }),
      });
      if (!response.ok) throw new Error('Failed to create duplicate');
      const newEmployee = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Success", description: "Employee duplicated" });
      window.dispatchEvent(new CustomEvent('open-form-tab', {
        detail: {
          id: `employee-edit-${newEmployee.id}`,
          name: `Edit ${newEmployee.firstName} ${newEmployee.lastName}`,
          formType: 'employee',
          parentId: 'employees',
          data: newEmployee,
        }
      }));
    } catch (error) {
      toast({ title: "Error", description: "Failed to duplicate employee", variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <DataTableLayout
        data={employeesList}
        isLoading={isLoading}
        getRowId={(employee) => employee.id}
        
        columns={dataTableState.columns}
        setColumns={dataTableState.setColumns}
        
        searchTerm={dataTableState.searchTerm}
        setSearchTerm={dataTableState.setSearchTerm}
        filters={dataTableState.filters}
        setFilters={dataTableState.setFilters}
        onAddFilter={dataTableState.addFilter}
        onUpdateFilter={dataTableState.updateFilter}
        onRemoveFilter={dataTableState.removeFilter}
        
        sortConfig={dataTableState.sortConfig}
        onSort={dataTableState.handleSort}
        
        selectedRows={dataTableState.selectedRows}
        setSelectedRows={dataTableState.setSelectedRows}
        onToggleRowSelection={dataTableState.toggleRowSelection}
        onToggleAllRows={handleToggleAllRows}
        
        deleteConfirmDialog={{
          isOpen: del.isBulkDeleteOpen,
          onOpenChange: del.setIsBulkDeleteOpen,
          onConfirm: () => {
            del.handleBulkDelete(dataTableState.selectedRows, employeesList);
            dataTableState.clearSelection();
          },
          itemCount: dataTableState.selectedRows.length
        }}
        
        headerActions={[
          {
            key: 'add-employee',
            label: "New Employee",
            icon: <Plus className="h-4 w-4" />,
            onClick: handleNewEmployee,
            variant: "default" as const
          }
        ]}
        
        rowActions={(employee: Employee) => [
          {
            key: 'edit',
            label: "Edit",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => handleEditEmployee(employee)
          },
          {
            key: 'delete',
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => del.handleDeleteRow(employee),
            className: 'text-red-600 hover:text-red-700'
          }
        ]}
        
        onRowDoubleClick={handleRowDoubleClick}
        
        entityName="Employee"
        entityNamePlural="Employees"
        
        applyFiltersAndSearch={dataTableState.applyFiltersAndSearch}
        applySorting={dataTableState.applySorting}
        
        onExport={handleExport}
        onDuplicate={handleDuplicate}
      />
      {del.renderDeleteDialogs()}
    </div>
  );
}
