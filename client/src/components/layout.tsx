import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { X, Menu } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Sidebar from "./sidebar";
import MobileLayout from "./mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import SectionInfoPanel from "./section-info-panel";
import { CustomerProvider } from "@/contexts/CustomerContext";

// Lazy load components outside the render function to prevent re-importing
const CustomerTable = lazy(() => import('./customers-table'));
const SupplierTable = lazy(() => import('./supplier-table'));
const ContactPersonsTable = lazy(() => import('./contact-persons-table'));
const ContactPersonsPage = lazy(() => import('../pages/contact-persons'));
const QuotationsPage = lazy(() => import('../pages/quotations-simple'));
const AddressFormLayout = lazy(() => import('@/components/layouts/AddressFormLayout'));

// Lazy load form components
const QuotationForm = lazy(() => import('@/pages/quotation-form'));
const CustomerForm = lazy(() => import('@/pages/customer-form'));
const LineItemFormLayoutComponent = lazy(() => import('@/components/layouts/LineItemFormLayout').then(module => ({ default: module.LineItemFormLayout })));
const SupplierForm = lazy(() => import('@/pages/supplier-form'));
const InventoryForm = lazy(() => import('@/pages/inventory-form'));
const ProjectForm = lazy(() => import('@/pages/project-form'));
const WorkOrderForm = lazy(() => import('@/pages/work-order-form'));
const PurchaseOrderForm = lazy(() => import('@/pages/purchase-order-form'));
const SalesOrderForm = lazy(() => import('@/pages/sales-order-form'));
const PackingListForm = lazy(() => import('@/pages/packing-list-form'));
const InvoiceForm = lazy(() => import('@/pages/invoice-form'));
const TextSnippetForm = lazy(() => import('@/pages/text-snippet-form'));
const ContactPersonForm = lazy(() => import('@/pages/contact-person-form'));
const ImageForm = lazy(() => import('@/pages/image-form'));

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
  entityId?: string;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const userId = "admin"; // TODO: Get from auth context
  const isMobile = useIsMobile();

  // Fetch company logo from database (ID starting with "cad")
  const { data: companyLogo } = useQuery<{ imageData: string } | null>({
    queryKey: ['/api/masterdata/images/company-logo'],
  });
  
  // Get page name from route
  const getPageInfo = (path: string) => {
    // Check for customer-form with ID pattern
    const customerFormMatch = path.match(/^\/customer-form\/(.+)$/);
    if (customerFormMatch) {
      const customerId = customerFormMatch[1];
      return { id: `customer-${customerId}`, name: 'Loading...' };
    }
    
    // Check for quotation line item routes
    const quotationItemNewMatch = path.match(/^\/quotations\/([^/]+)\/items\/new$/);
    if (quotationItemNewMatch) {
      return { id: `quotation-line-new-${quotationItemNewMatch[1]}`, name: 'Offerteregel' };
    }
    
    const quotationItemEditMatch = path.match(/^\/quotations\/([^/]+)\/items\/([^/]+)$/);
    if (quotationItemEditMatch) {
      return { id: `quotation-line-${quotationItemEditMatch[2]}`, name: 'Offerteregel' };
    }
    
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
      case '/contact-persons':
        return { id: 'contact-persons', name: 'Contact Persons' };
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
      case '/sales-orders':
        return { id: 'sales-orders', name: 'Order' };
      case '/packing-lists':
        return { id: 'packing-lists', name: 'Packing Lists' };
      case '/reports':
        return { id: 'reports', name: 'Reports' };
      case '/addresses':
        return { id: 'addresses', name: 'Addresses' };
      case '/customer-form':
        return { id: 'new-customer', name: 'New Customer' };
      case '/text-snippets':
        return { id: 'text-snippets', name: 'Text Snippets' };
      case '/layout-designer':
        return { id: 'layout-designer', name: 'Layout Designer' };
      case '/master-data/uom':
        return { id: 'uom', name: 'Units of Measure' };
      case '/master-data/payment-terms':
        return { id: 'payment-terms', name: 'Payment Terms' };
      case '/master-data/incoterms':
        return { id: 'incoterms', name: 'Incoterms' };
      case '/master-data/vat':
        return { id: 'vat', name: 'VAT Rates' };
      case '/master-data/cities':
        return { id: 'cities', name: 'Cities' };
      case '/master-data/statuses':
        return { id: 'statuses', name: 'Statuses' };
      case '/welcome':
        return { id: 'welcome', name: 'Welcome' };
      default:
        return { id: 'page', name: 'Page' };
    }
  };

  const currentPage = getPageInfo(location);
  
  const [tabs, setTabs] = useState<Tab[]>([
    { id: currentPage.id, name: currentPage.name, type: 'page', content: children }
  ]);
  const [activeTabId, setActiveTabId] = useState(currentPage.id);
  
  // Unsaved changes tracking
  const [tabsWithUnsavedChanges, setTabsWithUnsavedChanges] = useState<Set<string>>(new Set());
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);
  
  // Ref to track last saved values to prevent unnecessary saves
  const lastSavedTab = useRef<{tabId: string, tabType: string} | null>(null);
  
  // Ref to track if we've already restored preferences to prevent overriding user selections
  const hasRestoredPreferences = useRef(false);

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
  
  // Restore last active tab from preferences - only once on initial load
  useEffect(() => {
    if (preferences && typeof preferences === 'object' && preferences !== null && 'lastActiveTab' in preferences && 'lastActiveTabType' in preferences && !hasRestoredPreferences.current) {
      // Only restore if it's not a page tab (to avoid conflicts with routing)
      if ((preferences as any).lastActiveTabType !== 'page') {
        setActiveTabId((preferences as any).lastActiveTab as string);
      }
      hasRestoredPreferences.current = true;
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
            navigationOrder: (preferences && typeof preferences === 'object' && preferences !== null && 'navigationOrder' in preferences) ? (preferences as any).navigationOrder : null,
            collapsedSections: (preferences && typeof preferences === 'object' && preferences !== null && 'collapsedSections' in preferences) ? (preferences as any).collapsedSections : {},
          });
        }, 500); // Reduced timeout to 500ms for better responsiveness

        return () => clearTimeout(saveTimeout);
      }
    }
  }, [activeTabId, tabs]); // Only depend on activeTabId and tabs, not preferences

  // Listen for unsaved changes events from form components
  useEffect(() => {
    const handleUnsavedChanges = (event: CustomEvent) => {
      const { tabId, hasUnsavedChanges } = event.detail;
      setTabsWithUnsavedChanges(prev => {
        const newSet = new Set(prev);
        if (hasUnsavedChanges) {
          newSet.add(tabId);
        } else {
          newSet.delete(tabId);
        }
        return newSet;
      });
    };

    window.addEventListener('tab-unsaved-changes', handleUnsavedChanges as EventListener);
    return () => {
      window.removeEventListener('tab-unsaved-changes', handleUnsavedChanges as EventListener);
    };
  }, []);

  // Update tab when route changes
  useEffect(() => {
    const pageInfo = getPageInfo(location);
    
    // Don't create tabs or set active tab for the welcome route
    // This is a neutral route used when all tabs are closed
    if (pageInfo.id === 'welcome') {
      return;
    }
    
    const existingTab = tabs.find(tab => tab.id === pageInfo.id);
    
    if (!existingTab) {
      // Add new tab for the page
      const newTab: Tab = {
        id: pageInfo.id,
        name: pageInfo.name,
        type: 'page',
        menuRoute: location,
        content: children
      };
      setTabs(prevTabs => [...prevTabs, newTab]);
    } else {
      // Update existing tab content
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === pageInfo.id ? { ...tab, content: children, menuRoute: location } : tab
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

  // Listen for global form tab open events - stable listener with functional updates
  useEffect(() => {
    const handleOpenFormTab = (e: CustomEvent) => {
      const formInfo = e.detail;
      
      // Use functional state updates to avoid stale closures
      setTabs(prevTabs => {
        // Check if tab already exists
        const existingTab = prevTabs.find(tab => tab.id === formInfo.id);
        
        if (existingTab) {
          // Tab exists, don't modify tabs
          return prevTabs;
        } else {
          // Create new tab for form
          const newTab = {
            id: formInfo.id,
            name: formInfo.name,
            type: 'form' as const,
            formType: formInfo.formType,
            parentId: formInfo.parentId,
            entityId: formInfo.entityId
          };
          
          return [...prevTabs, newTab];
        }
      });
      
      // Always set as active (whether existing or new)
      setActiveTabId(formInfo.id);
    };
    
    window.addEventListener('open-form-tab', handleOpenFormTab as EventListener);
    return () => window.removeEventListener('open-form-tab', handleOpenFormTab as EventListener);
  }, []); // Empty dependency array for stable listener

  // Listen for tab name updates (e.g., when customer number is loaded)
  useEffect(() => {
    const handleUpdateTabName = (e: CustomEvent) => {
      const { tabId, name } = e.detail;
      
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === tabId ? { ...tab, name } : tab
        )
      );
    };
    
    window.addEventListener('update-tab-name', handleUpdateTabName as EventListener);
    return () => window.removeEventListener('update-tab-name', handleUpdateTabName as EventListener);
  }, []);

  const handleMenuClick = (menuItem: {id: string, name: string, route?: string}) => {
    // Navigate to the route instead of creating a tab
    if (menuItem.route) {
      if (menuItem.route !== location) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          navigate(menuItem.route!);
        }, 0);
      } else {
        // If route already matches, ensure page tab exists by creating it if missing
        const pageInfo = getPageInfo(menuItem.route);
        const existingTab = tabs.find(tab => tab.id === pageInfo.id);
        
        if (!existingTab) {
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            // Create the page tab if it doesn't exist
            const newTab: Tab = {
              id: pageInfo.id,
              name: pageInfo.name,
              type: 'page',
              menuRoute: menuItem.route,
              content: children
            };
            setTabs(prevTabs => [...prevTabs, newTab]);
            // Ensure the page tab is active
            setActiveTabId(pageInfo.id);
          }, 0);
        } else {
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            // Ensure the page tab is active
            setActiveTabId(pageInfo.id);
          }, 0);
        }
      }
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
    // For form tabs, just set as active without navigation
    if (tab.type === 'form') {
      setActiveTabId(tab.id);
      return;
    }
    
    // For section tabs, just set as active without navigation
    if (tab.type === 'section') {
      setActiveTabId(tab.id);
      return;
    }
    
    // For page/menu tabs, navigate to the route and ensure tab becomes active
    if (tab.type === 'page' || tab.type === 'menu') {
      // Use menuRoute if available, otherwise get route by ID
      const route = tab.menuRoute || getRouteForTab(tab.id);
      if (route !== location) {
        setActiveTabId(tab.id); // immediate UX feedback
        navigate(route);
      } else {
        setActiveTabId(tab.id); // ensure activation when URL unchanged
      }
      return;
    }
  };
  
  // Helper function to get route for tab ID
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
      case 'contact-persons':
        return '/contact-persons';
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
      case 'sales-orders':
        return '/sales-orders';
      case 'packing-lists':
        return '/packing-lists';
      case 'reports':
        return '/reports';
      case 'addresses':
        return '/addresses';
      case 'text-snippets':
        return '/text-snippets';
      case 'layout-designer':
        return '/layout-designer';
      case 'uom':
        return '/master-data/uom';
      case 'payment-terms':
        return '/master-data/payment-terms';
      case 'incoterms':
        return '/master-data/incoterms';
      case 'vat':
        return '/master-data/vat';
      case 'cities':
        return '/master-data/cities';
      case 'statuses':
        return '/master-data/statuses';
      default:
        return '/dashboard';
    }
  };

  const closeTab = (tabId: string) => {
    // Check if tab has unsaved changes
    if (tabsWithUnsavedChanges.has(tabId)) {
      setPendingCloseTabId(tabId);
      setShowUnsavedChangesDialog(true);
      return;
    }
    
    // If no unsaved changes, proceed with closing
    performCloseTab(tabId);
  };

  const performCloseTab = (tabId: string) => {
    const tabToClose = tabs.find(tab => tab.id === tabId);
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to next appropriate tab
      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          // Calculate next active tab - prefer neighbor of closed tab, fallback to first
          let nextActiveTab;
          if (tabIndex > 0 && tabIndex < newTabs.length + 1) {
            // Try to get the tab that was to the right, or left if at the end
            nextActiveTab = newTabs[Math.min(tabIndex, newTabs.length - 1)];
          } else {
            // Fallback to first tab
            nextActiveTab = newTabs[0];
          }
          
          setActiveTabId(nextActiveTab.id);
          
          // If the closed tab was a page tab and the new active tab is also a page tab,
          // navigate to keep URL and sidebar highlighting synchronized
          if (tabToClose?.type === 'page' && nextActiveTab.type === 'page') {
            const route = nextActiveTab.menuRoute || getRouteForTab(nextActiveTab.id);
            if (route !== location) {
              navigate(route);
            }
          }
        } else {
          // If no tabs left, clear active tab to show welcome screen
          setActiveTabId('');
          // Navigate to a neutral route that doesn't correspond to any menu item
          // This prevents the dashboard from being highlighted when all tabs are closed
          // Use setTimeout to avoid setState during render warnings
          setTimeout(() => {
            navigate('/welcome');
          }, 0);
        }
      }
      
      return newTabs;
    });
    
    // Clean up unsaved changes tracking
    setTabsWithUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });
  };

  const handleConfirmCloseTab = () => {
    if (pendingCloseTabId) {
      performCloseTab(pendingCloseTabId);
      setPendingCloseTabId(null);
    }
    setShowUnsavedChangesDialog(false);
  };

  const handleCancelCloseTab = () => {
    setPendingCloseTabId(null);
    setShowUnsavedChangesDialog(false);
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
              <Suspense fallback={<div></div>}>
                <CustomerTable />
              </Suspense>
            </div>
          </CustomerProvider>
        );
      }

      if (activeTab.id === 'suppliers') {
        return (
          <div className="p-6">
            <Suspense fallback={<div></div>}>
              <SupplierTable />
            </Suspense>
          </div>
        );
      }

      if (activeTab.id === 'contact-persons') {
        return (
          <Suspense fallback={<div></div>}>
            <ContactPersonsPage />
          </Suspense>
        );
      }

      if (activeTab.id === 'quotations') {
        // Import and render Quotations component directly
        return (
          <Suspense fallback={<div></div>}>
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
        // Extract quotationId from tab.id if editing OR from parentId
        const quotationId = activeTab.id.startsWith('edit-quotation-') 
          ? activeTab.id.replace('edit-quotation-', '') 
          : activeTab.parentId;
        
        return (
          <Suspense fallback={<div></div>}>
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
        // Use entityId from tab if available, otherwise try to extract from tab.id
        const customerId = activeTab.entityId || (
          activeTab.id.startsWith('edit-customer-') 
            ? activeTab.id.replace('edit-customer-', '') 
            : undefined
        );
        
        return (
          <Suspense fallback={<div></div>}>
            <CustomerForm 
              customerId={customerId}
              parentId={activeTab.parentId}
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
      
      if (activeTab.formType === 'line-item' || activeTab.formType === 'quotation-item') {
        // Extract lineItemId and quotationId from tab.id
        // Format: 'edit-line-item-{lineItemId}' or 'quotation-item-{lineType}-{timestamp}'
        const isEditing = activeTab.id.startsWith('edit-line-item-');
        const lineItemId = isEditing ? activeTab.id.replace('edit-line-item-', '') : undefined;
        // For new items, get quotationId from parentId or tab data
        const quotationId = isEditing ? undefined : (activeTab.parentId || (activeTab as any).quotationId);
        
        return (
          <Suspense fallback={<div></div>}>
            <LineItemFormLayoutComponent 
              lineItemId={lineItemId}
              quotationId={quotationId}
              parentId={activeTab.parentId}
              onSave={() => {
                // Return to parent tab after save (typically quotation form or quotations list)
                if (activeTab.parentId) {
                  const parentTab = tabs.find(tab => tab.id === activeTab.parentId);
                  if (parentTab) {
                    setActiveTabId(activeTab.parentId);
                    closeTab(activeTab.id);
                  }
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'supplier') {
        const supplierId = activeTab.id.startsWith('edit-supplier-') 
          ? activeTab.id.replace('edit-supplier-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <SupplierForm 
              supplierId={supplierId}
              parentId={activeTab.parentId}
              onSave={() => {
                const suppliersTab = tabs.find(tab => tab.id === 'suppliers');
                if (suppliersTab) {
                  setActiveTabId('suppliers');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'inventory' || activeTab.formType === 'inventory-item') {
        const inventoryId = activeTab.id.startsWith('edit-inventory-') 
          ? activeTab.id.replace('edit-inventory-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <InventoryForm 
              inventoryId={inventoryId}
              parentId={activeTab.parentId}
              onSave={() => {
                const inventoryTab = tabs.find(tab => tab.id === 'inventory');
                if (inventoryTab) {
                  setActiveTabId('inventory');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'project') {
        const projectId = activeTab.id.startsWith('edit-project-') 
          ? activeTab.id.replace('edit-project-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <ProjectForm 
              projectId={projectId}
              parentId={activeTab.parentId}
              onSave={() => {
                const projectsTab = tabs.find(tab => tab.id === 'projects');
                if (projectsTab) {
                  setActiveTabId('projects');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'work-order') {
        const workOrderId = activeTab.id.startsWith('edit-work-order-') 
          ? activeTab.id.replace('edit-work-order-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <WorkOrderForm 
              workOrderId={workOrderId}
              parentId={activeTab.parentId}
              onSave={() => {
                const workOrdersTab = tabs.find(tab => tab.id === 'work-orders');
                if (workOrdersTab) {
                  setActiveTabId('work-orders');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'purchase-order') {
        const purchaseOrderId = activeTab.id.startsWith('edit-purchase-order-') 
          ? activeTab.id.replace('edit-purchase-order-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <PurchaseOrderForm 
              purchaseOrderId={purchaseOrderId}
              parentId={activeTab.parentId}
              onSave={() => {
                const purchaseOrdersTab = tabs.find(tab => tab.id === 'purchase-orders');
                if (purchaseOrdersTab) {
                  setActiveTabId('purchase-orders');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      /* Commented out - sales-order-form file doesn't exist
      if (activeTab.formType === 'sales-order') {
        const SalesOrderForm = lazy(() => import('@/pages/sales-order-form'));
        const salesOrderId = activeTab.id.startsWith('edit-sales-order-') 
          ? activeTab.id.replace('edit-sales-order-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <SalesOrderForm 
              salesOrderId={salesOrderId}
              parentId={activeTab.parentId}
              onSave={() => {
                const salesOrdersTab = tabs.find(tab => tab.id === 'sales-orders');
                if (salesOrdersTab) {
                  setActiveTabId('sales-orders');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      */
      
      /* Commented out - packing-list-form file doesn't exist
      if (activeTab.formType === 'packing-list') {
        const PackingListForm = lazy(() => import('@/pages/packing-list-form'));
        const packingListId = activeTab.id.startsWith('edit-packing-list-') 
          ? activeTab.id.replace('edit-packing-list-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <PackingListForm 
              packingListId={packingListId}
              parentId={activeTab.parentId}
              onSave={() => {
                const packingListsTab = tabs.find(tab => tab.id === 'packing-lists');
                if (packingListsTab) {
                  setActiveTabId('packing-lists');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      */
      
      /* Commented out - invoice-form file doesn't exist
      if (activeTab.formType === 'invoice') {
        const InvoiceForm = lazy(() => import('@/pages/invoice-form'));
        const invoiceId = activeTab.id.startsWith('edit-invoice-') 
          ? activeTab.id.replace('edit-invoice-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <InvoiceForm 
              invoiceId={invoiceId}
              parentId={activeTab.parentId}
              onSave={() => {
                const invoicesTab = tabs.find(tab => tab.id === 'invoices');
                if (invoicesTab) {
                  setActiveTabId('invoices');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      */
      
      /* Commented out - text-snippet-form file doesn't exist
      if (activeTab.formType === 'text-snippet') {
        const TextSnippetForm = lazy(() => import('@/pages/text-snippet-form'));
        const textSnippetId = activeTab.id.startsWith('edit-text-snippet-') 
          ? activeTab.id.replace('edit-text-snippet-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <TextSnippetForm 
              textSnippetId={textSnippetId}
              parentId={activeTab.parentId}
              onSave={() => {
                const textSnippetsTab = tabs.find(tab => tab.id === 'text-snippets');
                if (textSnippetsTab) {
                  setActiveTabId('text-snippets');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      */
      
      if (activeTab.formType === 'contact-person') {
        // Extract contactPersonId from tab.id if editing
        const contactPersonId = activeTab.id.startsWith('edit-contact-person-') 
          ? activeTab.id.replace('edit-contact-person-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <ContactPersonForm 
              contactPersonId={contactPersonId}
              onSave={() => {
                // Return to contact-persons tab after save
                const contactPersonsTab = tabs.find(tab => tab.id === 'contact-persons');
                if (contactPersonsTab) {
                  setActiveTabId('contact-persons');
                  closeTab(activeTab.id);
                }
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'address') {
        const addressId = activeTab.id.startsWith('edit-address-') 
          ? activeTab.id.replace('edit-address-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <AddressFormLayout 
              addressId={addressId}
              onSave={() => {
                // Navigate back to addresses page after saving
                navigate('/addresses');
                closeTab(activeTab.id);
              }} 
            />
          </Suspense>
        );
      }
      
      if (activeTab.formType === 'image') {
        const imageId = activeTab.id.startsWith('edit-image-') 
          ? activeTab.id.replace('edit-image-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <ImageForm 
              imageId={imageId}
              onSave={() => {
                // Navigate back to images page after saving
                navigate('/master-data/images');
                closeTab(activeTab.id);
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

  // Render mobile layout for mobile devices
  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Logo Bar */}
      <div className="bg-white border-b border-border px-4 md:px-6 py-2 md:py-4 flex items-center justify-between">
        {companyLogo?.imageData && (
          <img 
            src={companyLogo.imageData} 
            alt="ATE Solutions B.V." 
            className="h-10 md:h-20 w-auto object-contain"
            data-testid="top-logo-bar"
          />
        )}
        
        {/* User Info */}
        <div className="text-right">
          <div className="text-sm md:text-lg font-semibold text-foreground" data-testid="user-name">
            Admin Gebruiker
          </div>
          <div className="text-xs md:text-sm text-muted-foreground hidden md:block" data-testid="current-date">
            {formatDate(getCurrentTime())}
          </div>
          <div className="text-xs md:text-sm font-mono text-muted-foreground" data-testid="current-time">
            {formatTime(getCurrentTime())}
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Menu Button - small button in top left */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden fixed left-2 top-2 z-30 p-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-lg"
          data-testid="mobile-menu-trigger"
        >
          <Menu className="h-5 w-5" />
        </button>
        
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
        
        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar - Now at the very top of right area */}
          <div className="bg-gray-50 px-2 md:px-4 border-b-0 h-[44px] md:h-[62px] flex items-end">
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
                  <span className="text-xs md:text-sm font-medium truncate max-w-32 md:max-w-56">{tab.name}</span>
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
                    <X size={14} />
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
      
      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niet-opgeslagen wijzigingen</AlertDialogTitle>
            <AlertDialogDescription>
              Je hebt niet-opgeslagen wijzigingen in dit tabblad. Weet je zeker dat je dit tabblad wilt sluiten zonder op te slaan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCloseTab}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCloseTab} className="bg-orange-600 hover:bg-orange-700">
              Sluiten zonder opslaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}