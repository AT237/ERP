import { Link, useLocation } from "wouter";
import { 
  BarChart3, Building, Users, Truck, Package, FileText, 
  Receipt, FolderOpen, ClipboardList, ShoppingCart, Box 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 }
    ]
  },
  {
    name: "Inventory",
    items: [
      { name: "Stock Management", href: "/inventory", icon: Package },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart }
    ]
  },
  {
    name: "Sales",
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Quotations", href: "/quotations", icon: FileText },
      { name: "Invoices", href: "/invoices", icon: Receipt }
    ]
  },
  {
    name: "Operations",
    items: [
      { name: "Projects", href: "/projects", icon: FolderOpen },
      { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
      { name: "Packing Lists", href: "/packing-lists", icon: Box }
    ]
  },
  {
    name: "Reports",
    items: [
      { name: "Analytics", href: "/reports", icon: BarChart3 }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col">
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((section) => (
          <div key={section.name} className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              {section.name}
            </h3>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors relative",
                    isActive
                      ? "bg-orange-50 text-foreground border-l-4 border-orange-500"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isActive 
                      ? "bg-orange-500 text-white" 
                      : "bg-orange-400 text-white hover:bg-orange-500"
                  )}>
                    <Icon size={16} />
                  </div>
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
