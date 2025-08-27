import { Link, useLocation } from "wouter";
import { 
  BarChart3, Building, Users, Truck, Package, FileText, 
  Receipt, FolderOpen, ClipboardList, ShoppingCart, Box 
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";

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
      {/* Company Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="ATE Solutions B.V." 
            className="h-16 w-auto object-contain"
            data-testid="sidebar-company-logo"
          />
        </div>
      </div>
      
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
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon size={20} />
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
