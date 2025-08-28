import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = field.type === 'number' ? 0 : '';
      return acc;
    }, {} as any)
  });

  // Fetch data
  const { data: items = [], isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(`/api/masterdata/${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/masterdata/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: `${title} created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create ${title.toLowerCase()}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const handleNewItem = () => {
    form.reset();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewItem} data-testid={`button-add-${endpoint}`}>
              <Plus className="mr-2" size={16} />
              Add {title.slice(0, -1)}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New {title.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {fields.map((field) => (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>{field.label}</FormLabel>
                        <FormControl>
                          {field.type === 'select' ? (
                            <Select
                              onValueChange={formField.onChange}
                              value={formField.value}
                              data-testid={`select-${field.name}`}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'textarea' ? (
                            <Textarea
                              {...formField}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              data-testid={`textarea-${field.name}`}
                            />
                          ) : (
                            <Input
                              {...formField}
                              type={field.type}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              data-testid={`input-${field.name}`}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                        No {title.toLowerCase()} found. Click "Add {title.slice(0, -1)}" to create one.
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
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
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