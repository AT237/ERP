import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, Building, Users, Truck, Package, FileText, 
  Receipt, FolderOpen, ClipboardList, ShoppingCart, Box, UserPlus, Contact,
  ChevronDown, ChevronUp, FileCheck, CreditCard, CheckSquare
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
    name: "Relaties",
    collapsible: true,
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
      { name: "Contact Persons", href: "/contacts", icon: Contact },
      { name: "Prospects", href: "/prospects", icon: UserPlus }
    ]
  },
  {
    name: "Inventory",
    collapsible: true,
    items: [
      { name: "Stock Management", href: "/inventory", icon: Package },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart }
    ]
  },
  {
    name: "Sales",
    collapsible: true,
    items: [
      { name: "Sales Quotations", href: "/quotations", icon: FileText },
      { name: "Sales Proforma Invoices", href: "/proforma-invoices", icon: FileCheck },
      { name: "Sales Orders", href: "/sales-orders", icon: ShoppingCart },
      { name: "Order Confirmations", href: "/order-confirmations", icon: CheckSquare },
      { name: "Sales Projects", href: "/projects", icon: FolderOpen },
      { name: "Sales Work Orders", href: "/work-orders", icon: ClipboardList },
      { name: "Sales Packing Lists", href: "/packing-lists", icon: Box }
    ]
  },
  {
    name: "Operations",
    collapsible: true,
    items: [
      { name: "Projects", href: "/projects", icon: FolderOpen },
      { name: "Work Orders", href: "/work-orders", icon: ClipboardList },
      { name: "Packing Lists", href: "/packing-lists", icon: Box }
    ]
  },
  {
    name: "Reports",
    collapsible: true,
    items: [
      { name: "Analytics", href: "/reports", icon: BarChart3 }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col">
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((section) => {
          const isCollapsed = collapsedSections[section.name];
          const isCollapsible = section.collapsible;
          
          return (
            <div key={section.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  {section.name}
                </h3>
                {isCollapsible && (
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    data-testid={`toggle-${section.name.toLowerCase()}`}
                  >
                    {isCollapsed ? (
                      <ChevronDown size={14} className="text-muted-foreground" />
                    ) : (
                      <ChevronUp size={14} className="text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              {(!isCollapsible || !isCollapsed) && section.items.map((item) => {
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
        )})}
      </nav>
    </aside>
  );
}
