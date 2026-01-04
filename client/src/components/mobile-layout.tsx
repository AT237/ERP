import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Users, FileText, Menu, Package, Truck, 
  FolderOpen, ClipboardList, Box, ShoppingCart, Receipt,
  Settings, ChevronRight, Home
} from "lucide-react";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
}

const bottomNavItems: NavItem[] = [
  { id: "dashboard", name: "Home", href: "/dashboard", icon: Home },
  { id: "quotations", name: "Offertes", href: "/quotations", icon: FileText },
  { id: "customers", name: "Klanten", href: "/customers", icon: Users },
  { id: "inventory", name: "Voorraad", href: "/inventory", icon: Package },
];

const menuSections = [
  {
    title: "Relaties",
    items: [
      { id: "customers", name: "Klanten", href: "/customers", icon: Users },
      { id: "suppliers", name: "Leveranciers", href: "/suppliers", icon: Truck },
    ]
  },
  {
    title: "Verkoop",
    items: [
      { id: "quotations", name: "Offertes", href: "/quotations", icon: FileText },
      { id: "orders", name: "Orders", href: "/sales-orders", icon: ShoppingCart },
      { id: "invoices", name: "Facturen", href: "/invoices", icon: Receipt },
    ]
  },
  {
    title: "Operaties",
    items: [
      { id: "projects", name: "Projecten", href: "/projects", icon: FolderOpen },
      { id: "work-orders", name: "Werkorders", href: "/work-orders", icon: ClipboardList },
      { id: "packing-lists", name: "Paklijsten", href: "/packing-lists", icon: Box },
    ]
  },
  {
    title: "Voorraad",
    items: [
      { id: "inventory", name: "Voorraadbeheer", href: "/inventory", icon: Package },
      { id: "purchase-orders", name: "Inkooporders", href: "/purchase-orders", icon: ShoppingCart },
    ]
  },
];

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard" && (location === "/" || location === "/dashboard")) return true;
    return location.startsWith(href) && href !== "/dashboard";
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    setMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Compact Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
        <img 
          src={logoImage} 
          alt="ATE Solutions" 
          className="h-8 w-auto object-contain"
          data-testid="mobile-logo"
        />
        
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button 
              className="h-11 w-11 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
              data-testid="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b bg-orange-500 text-white">
              <SheetTitle className="text-white">Menu</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-full pb-20">
              {menuSections.map((section) => (
                <div key={section.title} className="border-b">
                  <div className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.href)}
                      className={`w-full flex items-center gap-3 px-4 py-4 min-h-[48px] text-left transition-colors ${
                        isActive(item.href) 
                          ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500' 
                          : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1 font-medium">{item.name}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              ))}
              
              <div className="p-4">
                <button
                  onClick={() => handleNavClick('/master-data/company-details')}
                  className="w-full flex items-center gap-3 px-4 py-4 min-h-[48px] text-gray-600 hover:bg-gray-50 active:bg-gray-100 rounded-lg"
                  data-testid="menu-item-settings"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Instellingen</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content Area - fills available space */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bg-white border-t border-gray-200 px-2 py-1 shrink-0 safe-area-inset-bottom">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.href)}
                className={`relative flex flex-col items-center justify-center py-3 px-4 rounded-lg min-w-[64px] min-h-[56px] transition-colors ${
                  active 
                    ? 'text-orange-500' 
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className={`h-6 w-6 ${active ? 'text-orange-500' : ''}`} />
                <span className={`text-xs mt-1 font-medium ${active ? 'text-orange-500' : ''}`}>
                  {item.name}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-500 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
