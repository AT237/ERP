import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useCustomerContext } from "@/contexts/CustomerContext";
import { Plus, User, Search, Filter, Settings } from "lucide-react";

const pageLabels: Record<string, { title: string; description: string }> = {
  "dashboard": { title: "Dashboard", description: "Overview of your business operations" },
  "inventory": { title: "Inventory Management", description: "Manage your stock and inventory items" },
  "customers": { title: "Customers Management", description: "Manage your customer relationships" },
  "suppliers": { title: "Supplier Management", description: "Manage your supplier relationships" },
  "quotations": { title: "Quotations", description: "Create and manage price quotations" },
  "invoices": { title: "Invoices", description: "Generate and track invoices" },
  "projects": { title: "Project Management", description: "Track and manage your projects" },
  "work-orders": { title: "Work Orders", description: "Manage daily work activities" },
  "purchase-orders": { title: "Purchase Orders", description: "Manage purchase orders and procurement" },
  "packing-lists": { title: "Packing Lists", description: "Manage shipping and packaging" },
  "reports": { title: "Reports & Analytics", description: "View business insights and reports" },
  "analytics": { title: "Analytics", description: "Business insights and performance metrics" },
  "sales": { title: "Sales", description: "Sales management and tracking" },
  "finance": { title: "Finance", description: "Financial management and accounting" },
  "operations": { title: "Operations", description: "Operational management and coordination" }
};

interface HeaderProps {
  activeTab?: { id: string; name: string; type: string; };
}

export default function Header({ activeTab }: HeaderProps) {
  let pageInfo;
  
  if (activeTab) {
    if (activeTab.type === 'section') {
      // For section tabs, use the section name and a generic description
      pageInfo = { title: activeTab.name, description: `${activeTab.name} overview and management` };
    } else if (activeTab.type === 'menu') {
      // For menu tabs, look up in pageLabels
      pageInfo = pageLabels[activeTab.id] || { title: activeTab.name, description: `Manage your ${activeTab.name.toLowerCase()}` };
    } else {
      // Dashboard or other page types
      pageInfo = pageLabels[activeTab.id] || { title: activeTab.name, description: "Overview of your business operations" };
    }
  } else {
    // No active tab - default to dashboard
    pageInfo = pageLabels["dashboard"];
  }

  // Clean up title - remove "Management" and make compact
  const cleanTitle = pageInfo.title.replace(' Management', '');

  // Use customer context if on customer page
  let customerContext;
  try {
    customerContext = activeTab?.id === 'customers' ? useCustomerContext() : null;
  } catch {
    customerContext = null;
  }

  return (
    <header className="bg-card border-b border-border px-6 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-foreground">{cleanTitle}</h1>
        
        {/* Show controls for customer page */}
        {activeTab?.id === 'customers' && customerContext && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Search customers..."
                value={customerContext.searchTerm}
                onChange={(e) => customerContext.setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm w-64"
                data-testid="header-search-customers"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
            </div>
            
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter size={14} className="mr-1" />
                  Filter {customerContext.filters.length > 0 && `(${customerContext.filters.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {customerContext.columns.filter(col => col.filterable).map((column) => (
                  <DropdownMenuItem
                    key={column.key}
                    onClick={() => customerContext.addFilter(column.key)}
                    className="text-xs"
                  >
                    {column.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Column Visibility Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Settings size={14} className="mr-1" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <div className="text-xs font-medium p-2 border-b">Column Visibility</div>
                {customerContext.columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={column.visible}
                    onCheckedChange={() => customerContext.toggleColumnVisibility(column.key)}
                    className="text-xs"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              size="sm" 
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => customerContext.setShowAddCustomerDialog(true)}
            >
              <Plus size={14} className="mr-1" />
              Toevoegen
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
