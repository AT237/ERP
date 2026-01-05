import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Menu, Settings, ChevronRight, Home, BarChart3
} from "lucide-react";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { defaultNavigation } from "./sidebar";

interface MobileLayoutProps {
  children: React.ReactNode;
}

const bottomNavItems = [
  { id: "dashboard", name: "Home", href: "/dashboard", icon: Home },
  { id: "quotations", name: "Offertes", href: "/quotations", icon: defaultNavigation.find(s => s.id === "sales")?.items.find(i => i.id === "quotations")?.icon || BarChart3 },
  { id: "customers", name: "Klanten", href: "/customers", icon: defaultNavigation.find(s => s.id === "relations")?.items.find(i => i.id === "customers")?.icon || BarChart3 },
  { id: "inventory", name: "Voorraad", href: "/inventory", icon: defaultNavigation.find(s => s.id === "inventory")?.items.find(i => i.id === "stock")?.icon || BarChart3 },
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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <img 
          src={logoImage} 
          alt="ATE Solutions" 
          className="h-10 w-auto object-contain"
          data-testid="mobile-logo"
        />
        
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button 
              className="h-11 w-11 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
              data-testid="mobile-menu-button"
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] p-0">
            <SheetHeader className="p-4 border-b bg-orange-500 text-white">
              <SheetTitle className="text-white text-lg">Menu</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-full pb-20">
              {defaultNavigation.map((section) => (
                <div key={section.id} className="border-b">
                  <div className="px-4 py-3 bg-gray-100 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    {section.name}
                  </div>
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.href)}
                        className={`w-full flex items-center gap-3 px-4 py-4 min-h-[52px] text-left transition-colors ${
                          isActive(item.href) 
                            ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500' 
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                        data-testid={`menu-item-${item.id}`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="flex-1 font-medium text-base">{item.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              ))}
              
              <div className="p-4">
                <button
                  onClick={() => handleNavClick('/master-data/company-details')}
                  className="w-full flex items-center gap-3 px-4 py-4 min-h-[52px] text-gray-600 hover:bg-gray-50 active:bg-gray-100 rounded-lg"
                  data-testid="menu-item-settings"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium text-base">Instellingen</span>
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
      <nav className="bg-white border-t border-gray-200 px-2 py-2 shrink-0 safe-area-inset-bottom">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.href)}
                className={`relative flex flex-col items-center justify-center py-3 px-4 rounded-lg min-w-[72px] min-h-[60px] transition-colors ${
                  active 
                    ? 'text-orange-500' 
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <IconComponent className={`h-6 w-6 ${active ? 'text-orange-500' : ''}`} />
                <span className={`text-sm mt-1 font-medium ${active ? 'text-orange-500' : ''}`}>
                  {item.name}
                </span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-orange-500 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
