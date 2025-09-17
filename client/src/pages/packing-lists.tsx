import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Box, Search, Truck, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PackingList, Customer, Invoice, Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function PackingLists() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: packingLists, isLoading } = useQuery<PackingList[]>({
    queryKey: ["/api/packing-lists"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/packing-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      toast({
        title: "Success",
        description: "Packing list deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete packing list",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (packingList: PackingList) => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: `edit-packing-list-${packingList.id}`,
        name: `${packingList.packingNumber}`,
        formType: 'packing-list',
        parentId: packingList.id
      }
    }));
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this packing list?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewPackingList = () => {
    window.dispatchEvent(new CustomEvent('open-form-tab', {
      detail: {
        id: 'new-packing-list',
        name: 'New Packing List',
        formType: 'packing-list'
      }
    }));
  };

  const filteredPackingLists = packingLists?.filter(list =>
    list.packingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "shipped": return "default";
      case "packed": return "secondary";
      case "pending": return "outline";
      case "delivered": return "default";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Image */}
      <Card>
        <CardContent className="p-0">
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Warehouse inventory management system" 
            className="rounded-lg w-full h-48 object-cover" 
          />
        </CardContent>
      </Card>

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search packing lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-packing-lists"
            />
          </div>
        </div>
        
        <Button onClick={handleNewPackingList} data-testid="button-add-packing-list">
          <Plus className="mr-2" size={16} />
          Add Packing List
        </Button>
      </div>

      {/* Packing Lists Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Box className="mr-2" size={20} />
            Packing Lists ({filteredPackingLists.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Packing #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Shipping Method</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackingLists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No packing lists found. Create your first packing list to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPackingLists.map((list) => {
                    const customer = customers?.find(c => c.id === list.customerId);
                    const invoice = invoices?.find(i => i.id === list.invoiceId);
                    return (
                      <TableRow key={list.id} data-testid={`row-packing-list-${list.id}`}>
                        <TableCell className="font-medium">{list.packingNumber}</TableCell>
                        <TableCell>{customer?.name || "—"}</TableCell>
                        <TableCell>{invoice?.invoiceNumber || "—"}</TableCell>
                        <TableCell>
                          {list.shippingMethod ? (
                            <div className="flex items-center space-x-2">
                              <Truck size={14} />
                              <span className="capitalize">{list.shippingMethod}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {list.trackingNumber ? (
                            <div className="flex items-center space-x-2">
                              <Package size={14} />
                              <span>{list.trackingNumber}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{list.weight ? `${list.weight} kg` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(list.status || "pending")}>
                            {list.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(list)}
                              data-testid={`button-edit-${list.id}`}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(list.id)}
                              data-testid={`button-delete-${list.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}