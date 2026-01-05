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
    <div className="flex flex-col h-screen w-full max-w-full overflow-hidden bg-gray-50">
      {/* Header - fully responsive */}
      <header className="bg-white border-b border-gray-200 px-3 py-2 shrink-0 w-full">
        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          {/* Logo - shrinks if needed */}
          <div className="flex-1 min-w-0 flex items-center">
            <img 
              src={logoImage} 
              alt="ATE Solutions" 
              className="h-10 max-w-[60%] object-contain object-left"
              data-testid="mobile-logo"
            />
          </div>
          
          {/* Menu button - fixed size, always visible */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button 
                className="shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
                data-testid="mobile-menu-button"
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[320px] p-0">
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
                          <IconComponent className="h-5 w-5 shrink-0" />
                          <span className="flex-1 font-medium text-base truncate">{item.name}</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
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
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className="font-medium text-base">Instellingen</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content - fills available space, scrollable */}
      <main className="flex-1 overflow-auto w-full min-w-0">
        <div className="w-full min-w-0">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - responsive grid */}
      <nav className="bg-white border-t border-gray-200 px-1 py-1 shrink-0 w-full safe-area-inset-bottom">
        <div className="grid grid-cols-4 gap-1 w-full">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.href)}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg min-h-[56px] transition-colors ${
                  active 
                    ? 'text-orange-500' 
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-100'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <IconComponent className={`h-6 w-6 shrink-0 ${active ? 'text-orange-500' : ''}`} />
                <span className={`text-xs mt-1 font-medium truncate max-w-full ${active ? 'text-orange-500' : ''}`}>
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
