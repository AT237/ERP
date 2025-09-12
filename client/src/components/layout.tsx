import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { X, Menu } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Sidebar from "./sidebar";

import SectionInfoPanel from "./section-info-panel";
import { CustomerProvider } from "@/contexts/CustomerContext";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";

// Lazy load components outside the render function to prevent re-importing
const CustomerTable = lazy(() => import('./customer-table'));
const SupplierTable = lazy(() => import('./supplier-table'));
const ContactPersonsTable = lazy(() => import('./contact-persons-table'));

interface LayoutProps {
  children: React.ReactNode;
}

interface Tab {
  id: string;
  name: string;
  type: 'section' | 'page' | 'menu' | 'form';
  menuRoute?: string;
  content?: React.ReactNode;
  formType?: string;
  parentId?: string;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const userId = "admin"; // TODO: Get from auth context
  
  // Get page name from route
  const getPageInfo = (path: string) => {
    switch (path) {
      case '/':
      case '/dashboard':
        return { id: 'dashboard', name: 'Dashboard' };
      case '/customers':
        return { id: 'customers', name: 'Customers' };
      case '/inventory':
        return { id: 'inventory', name: 'Stock Management' };
      case '/suppliers':
        return { id: 'suppliers', name: 'Suppliers' };
      case '/contacts':
        return { id: 'contacts', name: 'Contact Persons' };
      case '/quotations':
        return { id: 'quotations', name: 'Quotations' };
      case '/invoices':
        return { id: 'invoices', name: 'Invoices' };
      case '/projects':
        return { id: 'projects', name: 'Projects' };
      case '/work-orders':
        return { id: 'work-orders', name: 'Work Orders' };
      case '/purchase-orders':
        return { id: 'purchase-orders', name: 'Purchase Orders' };
      case '/packing-lists':
        return { id: 'packing-lists', name: 'Packing Lists' };
      case '/reports':
        return { id: 'reports', name: 'Reports' };
      default:
        return { id: 'page', name: 'Page' };
    }
  };

  const currentPage = getPageInfo(location);
  
  const [tabs, setTabs] = useState<Tab[]>([
    { id: currentPage.id, name: currentPage.name, type: 'page', content: children }
  ]);
  const [activeTabId, setActiveTabId] = useState(currentPage.id);
  
  // Ref to track last saved values to prevent unnecessary saves
  const lastSavedTab = useRef<{tabId: string, tabType: string} | null>(null);

  // Load user preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/user-preferences", userId],
  });

  // Save user preferences
  const savePreferences = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/user-preferences`, {
        userId,
        lastActiveTab: data.lastActiveTab,
        lastActiveTabType: data.lastActiveTabType,
        navigationOrder: data.navigationOrder,
        collapsedSections: data.collapsedSections,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences", userId] });
    },
    onError: (error: any) => {
      console.error("Failed to save last view:", error);
    },
  });
  
  // Restore last active tab from preferences
  useEffect(() => {
    if (preferences?.lastActiveTab && preferences?.lastActiveTabType) {
      // Only restore if it's not a page tab (to avoid conflicts with routing)
      if (preferences.lastActiveTabType !== 'page') {
        setActiveTabId(preferences.lastActiveTab);
      }
    }
  }, [preferences]);

  // Save active tab when it changes (debounced)
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab && preferences !== undefined) {
      // Only save if the tab actually changed from what we last saved
      const shouldSave = !lastSavedTab.current || 
        lastSavedTab.current.tabId !== activeTabId || 
        lastSavedTab.current.tabType !== activeTab.type;
        
      if (shouldSave) {
        const saveTimeout = setTimeout(() => {
          // Update our tracking ref BEFORE making the save
          lastSavedTab.current = { tabId: activeTabId, tabType: activeTab.type };
          
          savePreferences.mutate({
            lastActiveTab: activeTabId,
            lastActiveTabType: activeTab.type,
            navigationOrder: (preferences as any)?.navigationOrder || null,
            collapsedSections: (preferences as any)?.collapsedSections || {},
          });
        }, 500); // Reduced timeout to 500ms for better responsiveness

        return () => clearTimeout(saveTimeout);
      }
    }
  }, [activeTabId, tabs]); // Only depend on activeTabId and tabs, not preferences

  // Update tab when route changes
  useEffect(() => {
    const pageInfo = getPageInfo(location);
    const existingTab = tabs.find(tab => tab.id === pageInfo.id);
    
    if (!existingTab) {
      // Add new tab for the page
      const newTab: Tab = {
        id: pageInfo.id,
        name: pageInfo.name,
        type: 'page',
        content: children
      };
      setTabs(prevTabs => [...prevTabs, newTab]);
    } else {
      // Update existing tab content
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === pageInfo.id ? { ...tab, content: children } : tab
        )
      );
    }
    
    setActiveTabId(pageInfo.id);
  }, [location, children]);

  // Get current time only when needed, no interval
  const getCurrentTime = () => new Date();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleSectionClick = (section: {id: string, name: string}) => {
    // Check if tab already exists - prevent unnecessary state updates
    const existingTab = tabs.find(tab => tab.id === section.id);
    
    if (existingTab) {
      // Only switch if not already active - prevents flicker
      if (activeTabId !== section.id) {
        setActiveTabId(section.id);
      }
    } else {
      // Create new tab with optimized update
      const newTab: Tab = {
        id: section.id,
        name: section.name,
        type: 'section'
      };
      
      // Batch state updates to prevent flicker
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTabId(section.id);
    }
  };

  // Listen for global form tab open events
  useEffect(() => {
    const handleOpenFormTab = (e: CustomEvent) => {
      const formInfo = e.detail;
      // Check if tab already exists
      const existingTab = tabs.find(tab => tab.id === formInfo.id);
      
      if (existingTab) {
        // Switch to existing tab
        setActiveTabId(formInfo.id);
      } else {
        // Create new tab for form
        const newTab = {
          id: formInfo.id,
          name: formInfo.name,
          type: 'form' as const,
          formType: formInfo.formType,
          parentId: formInfo.parentId
        };
        
        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveTabId(formInfo.id);
      }
    };
    
    window.addEventListener('open-form-tab', handleOpenFormTab as EventListener);
    return () => window.removeEventListener('open-form-tab', handleOpenFormTab as EventListener);
  }, [tabs]);

  const handleMenuClick = (menuItem: {id: string, name: string, route?: string}) => {
    // Navigate to the route instead of creating a tab
    if (menuItem.route) {
      navigate(menuItem.route);
    }
  };

  const handleFormClick = (formInfo: {id: string, name: string, formType: string, parentId?: string}) => {
    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.id === formInfo.id);
    
    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(formInfo.id);
    } else {
      // Create new tab for form
      const newTab: Tab = {
        id: formInfo.id,
        name: formInfo.name,
        type: 'form',
        formType: formInfo.formType,
        parentId: formInfo.parentId
      };
      
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTabId(formInfo.id);
    }
  };

  // Handle tab click to navigate to the correct route
  const handleTabClick = (tab: Tab) => {
    // Only navigate for page/menu/section tabs, not form tabs
    if (tab.type === 'form') {
      // For form tabs, just set as active without navigation
      setActiveTabId(tab.id);
      return;
    }
    
    // Get the route for this tab based on its ID
    const getRouteForTab = (tabId: string) => {
      switch (tabId) {
        case 'dashboard':
          return '/dashboard';
        case 'customers':
          return '/customers';
        case 'inventory':
          return '/inventory';
        case 'suppliers':
          return '/suppliers';
        case 'contacts':
          return '/contacts';
        case 'quotations':
          return '/quotations';
        case 'invoices':
          return '/invoices';
        case 'projects':
          return '/projects';
        case 'work-orders':
          return '/work-orders';
        case 'purchase-orders':
          return '/purchase-orders';
        case 'packing-lists':
          return '/packing-lists';
        case 'reports':
          return '/reports';
        default:
          return '/dashboard';
      }
    };

    const route = getRouteForTab(tab.id);
    if (route !== location) {
      navigate(route);
    }
    setActiveTabId(tab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to first remaining tab or dashboard
      if (activeTabId === tabId) {
        const remainingTabs = newTabs;
        if (remainingTabs.length > 0) {
          setActiveTabId(remainingTabs[0].id);
        } else {
          // If no tabs left, clear active tab to show welcome screen
          setActiveTabId('');
        }
      }
      
      return newTabs;
    });
  };

  const motivationalMessages = [
    {
      title: "Power Your Next Project! ⚡",
      message: "Ready to energize your workflow? Start by exploring your projects, managing utilities, or checking your latest reports.",
      action: "Click on any menu item to get started"
    },
    {
      title: "Let's Get Electric! 🔌", 
      message: "Your utility empire awaits! Whether it's managing power grids, tracking projects, or analyzing performance - everything starts here.",
      action: "Choose a section from the sidebar to begin"
    },
    {
      title: "Spark Innovation Today! ⚡",
      message: "From power distribution to project excellence - your tools are ready. Time to illuminate your business potential!",
      action: "Select any module to jumpstart your productivity"
    },
    {
      title: "Current Status: Ready to Work! 🌟",
      message: "Your electrical projects and utility operations are waiting for your expertise. Let's power up and make things happen!",
      action: "Open a menu item to start managing your projects"
    },
    {
      title: "High Voltage Productivity Ahead! ⚡",
      message: "Transform your utility business with smart project management. Every great electrical project starts with a single click.",
      action: "Navigate to any section to begin your journey"
    }
  ];

  // State for rotating motivational messages
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Timer for rotating messages every 30 seconds
  useEffect(() => {
    if (tabs.length === 0) {
      const interval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % motivationalMessages.length);
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [tabs.length]); // Remove motivationalMessages.length from dependency

  const renderActiveTabContent = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    
    // If no tabs exist, show motivational message
    if (tabs.length === 0) {
      const message = motivationalMessages[currentMessageIndex];
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-4">{message.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{message.message}</p>
              <p className="text-sm text-orange-600 font-medium">{message.action}</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-sm text-muted-foreground">Welcome to ATE Solutions - Where Power Meets Precision</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (!activeTab) {
      // No active tab found - show empty state instead of dashboard
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-muted-foreground">No tab selected</p>
          </div>
        </div>
      );
    }
    
    if (activeTab.type === 'section') {
      return (
        <SectionInfoPanel 
          sectionId={activeTab.id}
          sectionName={activeTab.name}
          onClose={() => closeTab(activeTab.id)}
        />
      );
    }
    
    if (activeTab.type === 'menu') {
      // Render specific menu components
      if (activeTab.id === 'customers') {
        return (
          <CustomerProvider>
            <div className="p-6">
              <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
                <CustomerTable />
              </Suspense>
            </div>
          </CustomerProvider>
        );
      }

      if (activeTab.id === 'suppliers') {
        return (
          <div className="p-6">
            <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
              <SupplierTable />
            </Suspense>
          </div>
        );
      }

      if (activeTab.id === 'contacts') {
        return (
          <div className="p-6">
            <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
              <ContactPersonsTable />
            </Suspense>
          </div>
        );
      }

      if (activeTab.id === 'quotations') {
        // Import and render Quotations component directly
        const QuotationsPage = lazy(() => import('../pages/quotations-simple'));
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
            <QuotationsPage onCreateNew={handleFormClick} />
          </Suspense>
        );
      }
      
      // Master Data components
      if (activeTab.id === 'uom') {
        return (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Units of Measure management will be implemented here.</p>
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            </div>
          </div>
        );
      }
      
      if (activeTab.id === 'payment-terms') {
        return (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Payment Terms management will be implemented here.</p>
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            </div>
          </div>
        );
      }
      
      if (activeTab.id === 'incoterms') {
        return (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Incoterms management will be implemented here.</p>
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            </div>
          </div>
        );
      }
      
      if (activeTab.id === 'vat') {
        return (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">VAT Rates management will be implemented here.</p>
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            </div>
          </div>
        );
      }
      
      if (activeTab.id === 'cities') {
        return (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Cities management will be implemented here.</p>
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            </div>
          </div>
        );
      }
      
      if (activeTab.id === 'statuses') {
        return (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Statuses management will be implemented here.</p>
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            </div>
          </div>
        );
      }
      
      // Default placeholder for other menu items
      return (
        <div className="p-6">
          <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Content for {activeTab.name} will be implemented here.</p>
            {activeTab.menuRoute && (
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            )}
          </div>
        </div>
      );
    }
    
    if (activeTab.type === 'form') {
      // Handle form tabs
      if (activeTab.formType === 'quotation') {
        const QuotationForm = lazy(() => import('@/pages/quotation-form'));
        // Extract quotationId from tab.id if editing
        const quotationId = activeTab.id.startsWith('edit-quotation-') 
          ? activeTab.id.replace('edit-quotation-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
            <QuotationForm 
              quotationId={quotationId}
              onSave={() => {
                // Return to quotations tab after save
                const quotationsTab = tabs.find(tab => tab.id === 'quotations');
                if (quotationsTab) {
                  setActiveTabId('quotations');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'customer') {
        const CustomerForm = lazy(() => import('@/pages/customer-form'));
        // Extract customerId from tab.id if editing
        const customerId = activeTab.id.startsWith('edit-customer-') 
          ? activeTab.id.replace('edit-customer-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
            <CustomerForm 
              customerId={customerId}
              onSave={() => {
                // Return to customers tab after save
                const customersTab = tabs.find(tab => tab.id === 'customers');
                if (customersTab) {
                  setActiveTabId('customers');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      // Default form placeholder
      return (
        <div className="p-6">
          <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Form for {activeTab.name} will be implemented here.</p>
          </div>
        </div>
      );
    }
    
    return activeTab.content || children; // page content
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Logo Bar */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <img 
          src={logoImage} 
          alt="ATE Solutions B.V." 
          className="h-20 w-auto object-contain"
          data-testid="top-logo-bar"
        />
        
        {/* User Info */}
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground" data-testid="user-name">
            Admin Gebruiker
          </div>
          <div className="text-sm text-muted-foreground" data-testid="current-date">
            {formatDate(getCurrentTime())}
          </div>
          <div className="text-sm font-mono text-muted-foreground" data-testid="current-time">
            {formatTime(getCurrentTime())}
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Trigger Bar - always visible on mobile */}
        <div className="md:hidden fixed left-0 top-[100px] bottom-0 z-30 w-12 bg-orange-500 border-r border-orange-600 flex flex-col items-center py-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md hover:bg-orange-600 text-white transition-colors"
            data-testid="mobile-menu-trigger"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
            <div className="fixed left-0 top-[100px] bottom-0 w-64 bg-white border-r border-border" onClick={(e) => e.stopPropagation()}>
              <div className="h-full overflow-y-auto">
                <Sidebar onSectionClick={(section) => {
                  handleSectionClick(section);
                  setMobileMenuOpen(false);
                }} onMenuClick={(menuItem) => {
                  handleMenuClick(menuItem);
                  setMobileMenuOpen(false);
                }} />
              </div>
            </div>
          </div>
        )}
        
        <div className="hidden md:block">
          <Sidebar onSectionClick={handleSectionClick} onMenuClick={handleMenuClick} />
        </div>
        
        {/* Right Content Area - adjust margin for mobile trigger */}
        <div className="flex-1 flex flex-col overflow-hidden md:ml-0 ml-12">
          {/* Tab Bar - Now at the very top of right area */}
          <div className="bg-gray-50 px-4 border-b-0 h-[62px] flex items-end">
            <div className="flex items-end space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-1 px-3 py-2 rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${
                    activeTabId === tab.id
                      ? 'bg-orange-500 text-white relative z-10 border-2 border-orange-500 border-b-orange-500'
                      : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200 mb-[2px]'
                  }`}
                  onClick={() => handleTabClick(tab)}
                  onMouseDown={(e) => {
                    // Middle mouse button (scroll wheel click) to close tab
                    if (e.button === 1) {
                      e.preventDefault();
                      closeTab(tab.id);
                    }
                  }}
                  onAuxClick={(e) => {
                    // Alternative middle click handler for better browser compatibility
                    if (e.button === 1) {
                      e.preventDefault();
                      closeTab(tab.id);
                    }
                  }}
                  onTouchStart={(e) => {
                    // Handle 3-finger tap for touchpad (when supported)
                    if (e.touches.length === 3) {
                      e.preventDefault();
                      closeTab(tab.id);
                    }
                  }}
                  data-testid={`tab-${tab.id}`}
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  <span className="text-xs font-medium truncate max-w-24">{tab.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className={`p-0.5 rounded-full transition-colors ${
                      activeTabId === tab.id ? 'hover:bg-orange-600' : 'hover:bg-gray-300'
                    }`}
                    data-testid={`close-tab-${tab.id}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main content area with orange border to connect with active tab */}
          <main className={`flex-1 flex flex-col overflow-hidden ${
            tabs.length > 0 ? 'border-2 border-orange-500 bg-white rounded-lg' : 'bg-white'
          }`}>
            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {renderActiveTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}