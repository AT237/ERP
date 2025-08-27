import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, FolderOpen, Package, ShoppingCart, Plus, 
  Check, AlertTriangle, Clock, File, Users, 
  Filter, ArrowUp, ExternalLink
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalRevenue: number;
  activeProjects: number;
  stockItems: number;
  pendingOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lowStockItems, isLoading: loadingLowStock } = useQuery({
    queryKey: ["/api/inventory/low-stock"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics Cards */}
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
                  <ArrowUp className="inline mr-1" size={12} />
                  +12.5% from last month
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
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-active-projects">
                  {stats?.activeProjects || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <ArrowUp className="inline mr-1" size={12} />
                  +3 new this week
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Items</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-stock-items">
                  {stats?.stockItems || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  <AlertTriangle className="inline mr-1" size={12} />
                  {stats?.lowStockCount || 0} low stock alerts
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
                <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-pending-orders">
                  {stats?.pendingOrders || 0}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  <Clock className="inline mr-1" size={12} />
                  8 overdue
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-red-600 dark:text-red-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <img 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300" 
              alt="Professional business office with team working" 
              className="rounded-lg w-full h-48 object-cover mb-4" 
            />
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="text-green-600 dark:text-green-400" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Invoice #INV-2024-0156 generated for TechCorp Inc.</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Plus className="text-blue-600 dark:text-blue-400" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">New customer "Global Industries" added to system</p>
                  <p className="text-xs text-muted-foreground">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="text-orange-600 dark:text-orange-400" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Low stock alert: Steel Bolts M12 (Qty: 5)</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <File className="text-purple-600 dark:text-purple-400" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Quotation #QUO-2024-0089 approved by client</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <img 
              src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=200" 
              alt="Modern corporate office workspace" 
              className="rounded-lg w-full h-32 object-cover mb-4" 
            />
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-create-invoice"
            >
              <Plus className="mr-3 text-blue-600" size={16} />
              Create New Invoice
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-generate-quotation"
            >
              <File className="mr-3 text-green-600" size={16} />
              Generate Quotation
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-add-stock"
            >
              <Package className="mr-3 text-orange-600" size={16} />
              Add Stock Item
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-new-customer"
            >
              <Users className="mr-3 text-purple-600" size={16} />
              New Customer
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              data-testid="button-view-reports"
            >
              <ExternalLink className="mr-3 text-indigo-600" size={16} />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts Section */}
      {!loadingLowStock && lowStockItems && lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 text-orange-600" size={20} />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                  <AlertTriangle className="text-orange-500 flex-shrink-0" size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.currentStock} units left (Min: {item.minimumStock})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
