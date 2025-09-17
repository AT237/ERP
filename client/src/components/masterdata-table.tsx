import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation } from "wouter";
import { getMasterDataConfig } from "@/config/masterdata-config";

interface MasterDataTableProps {
  title: string;
  endpoint: string;
  schema: z.ZodSchema;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any) => string;
  }>;
}

export default function MasterDataTable({ title, endpoint, schema, fields, columns }: MasterDataTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Get the config for proper singularization
  const config = getMasterDataConfig(endpoint);
  const singularTitle = config?.singularTitle || title.slice(0, -1);

  // Fetch data
  const { data: items = [], isLoading } = useQuery({
    queryKey: [`/api/masterdata/${endpoint}`],
    queryFn: async () => {
      const response = await fetch(`/api/masterdata/${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/masterdata/${endpoint}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/masterdata/${endpoint}`] });
      toast({
        title: "Success",
        description: `${singularTitle} deleted successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete ${singularTitle.toLowerCase()}`,
        variant: "destructive",
      });
    }
  });

  const handleNewItem = () => {
    setLocation(`/masterdata-form/${endpoint}`);
  };

  const handleEditItem = (id: string) => {
    setLocation(`/masterdata-form/${endpoint}/${id}`);
  };

  const handleDeleteItem = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button onClick={handleNewItem} data-testid={`button-add-${endpoint}`}>
          <Plus className="mr-2" size={16} />
          Add {singularTitle}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div>Loading...</div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{title} ({Array.isArray(items) ? items.length : 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {columns.map((column) => (
                      <th key={column.key} className="text-left p-3 font-medium">
                        {column.label}
                      </th>
                    ))}
                    <th className="text-left p-3 font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(items) || items.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="text-center p-8 text-muted-foreground">
                        No {title.toLowerCase()} found. Click "Add {singularTitle}" to create one.
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        {columns.map((column) => (
                          <td key={column.key} className="p-3">
                            {column.render ? column.render(item[column.key]) : item[column.key]}
                          </td>
                        ))}
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(item.id)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-delete-${item.id}`}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the {singularTitle.toLowerCase()}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}