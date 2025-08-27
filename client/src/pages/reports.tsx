import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, 
  Users, ShoppingCart, AlertTriangle, FileText, Download
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { 
  Customer, Supplier, InventoryItem, Project, Quotation, Invoice, 
  PurchaseOrder, WorkOrder 
} from "@shared/schema";

interface DashboardStats {
  totalRevenue: number;
  activeProjects: number;
  stockItems: number;
  pendingOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function Reports() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: quotations, isLoading: quotationsLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: workOrders, isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: lowStockItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateInventoryValue = () => {
    if (!inventory) return 0;
    return inventory.reduce((total, item) => {
      const price = parseFloat(item.unitPrice);
      const stock = item.currentStock || 0;
      return total + (price * stock);
    }, 0);
  };

  const getProjectStatusCounts = () => {
    if (!projects) return { planning: 0, inProgress: 0, completed: 0, onHold: 0 };
    return projects.reduce((acc, project) => {
      const status = project.status || 'planning';
      if (status === 'in-progress') acc.inProgress++;
      else if (status === 'completed') acc.completed++;
      else if (status === 'on-hold') acc.onHold++;
      else acc.planning++;
      return acc;
    }, { planning: 0, inProgress: 0, completed: 0, onHold: 0 });
  };

  const getTopCustomersByRevenue = () => {
    if (!invoices || !customers) return [];
    
    const customerRevenue = invoices.reduce((acc, invoice) => {
      if (invoice.status === 'paid') {
        const amount = parseFloat(invoice.totalAmount);
        if (!acc[invoice.customerId]) {
          acc[invoice.customerId] = 0;
        }
        acc[invoice.customerId] += amount;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(customerRevenue)
      .map(([customerId, revenue]) => ({
        customer: customers.find(c => c.id === customerId),
        revenue
      }))
      .filter(item => item.customer)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const isLoading = statsLoading || customersLoading || suppliersLoading || 
                   inventoryLoading || projectsLoading || quotationsLoading || 
                   invoicesLoading || purchaseOrdersLoading || workOrdersLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const projectStatusCounts = getProjectStatusCounts();
  const topCustomers = getTopCustomersByRevenue();
  const inventoryValue = calculateInventoryValue();

  return (
    <div className="p-6 space-y-6">
      {/* Header Image */}
      <Card>
        <CardContent className="p-0">
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=300" 
            alt="Business analytics dashboard with charts and graphs" 
            className="rounded-lg w-full h-48 object-cover" 
          />
        </CardContent>
      </Card>

      {/* Export Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" data-testid="button-export-pdf">
          <Download className="mr-2" size={16} />
          Export PDF
        </Button>
        <Button variant="outline" data-testid="button-export-excel">
          <Download className="mr-2" size={16} />
          Export Excel
        </Button>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                  {stats ? formatCurrency(stats.totalRevenue) : "$0.00"}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="inline mr-1" size={12} />
                  +12.5% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-customers">
                  {customers?.length || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <TrendingUp className="inline mr-1" size={12} />
                  +5 new this month
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-inventory-value">
                  {formatCurrency(inventoryValue)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  <AlertTriangle className="inline mr-1" size={12} />
                  {stats?.lowStockCount || 0} low stock items
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Package className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-projects">
                  {projectStatusCounts.inProgress + projectStatusCounts.planning}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  <BarChart3 className="inline mr-1" size={12} />
                  {projectStatusCounts.completed} completed
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <FileText className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Planning</span>
                <div className="flex items-center space-x-2">
                  <Progress value={(projectStatusCounts.planning / (projects?.length || 1)) * 100} className="w-20" />
                  <span className="text-sm text-muted-foreground">{projectStatusCounts.planning}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">In Progress</span>
                <div className="flex items-center space-x-2">
                  <Progress value={(projectStatusCounts.inProgress / (projects?.length || 1)) * 100} className="w-20" />
                  <span className="text-sm text-muted-foreground">{projectStatusCounts.inProgress}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completed</span>
                <div className="flex items-center space-x-2">
                  <Progress value={(projectStatusCounts.completed / (projects?.length || 1)) * 100} className="w-20" />
                  <span className="text-sm text-muted-foreground">{projectStatusCounts.completed}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">On Hold</span>
                <div className="flex items-center space-x-2">
                  <Progress value={(projectStatusCounts.onHold / (projects?.length || 1)) * 100} className="w-20" />
                  <span className="text-sm text-muted-foreground">{projectStatusCounts.onHold}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No revenue data available
              </p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((item, index) => (
                  <div key={item.customer?.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{item.customer?.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{suppliers?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Suppliers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{quotations?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Quotations</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{invoices?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{workOrders?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Work Orders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.slice(0, 5).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(invoice.totalAmount))}</TableCell>
                      <TableCell>
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 text-orange-500" size={20} />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!lowStockItems || lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No low stock alerts
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">
                        {item.currentStock} left
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min: {item.minimumStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
