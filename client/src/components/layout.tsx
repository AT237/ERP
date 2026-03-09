import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { X, Menu, PanelRightClose } from "lucide-react";
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
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

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
const InvoiceLineItemForm = lazy(() => import('@/pages/invoice-line-item-form'));
const TextSnippetForm = lazy(() => import('@/pages/text-snippet-form'));
const ContactPersonForm = lazy(() => import('@/pages/contact-person-form'));
const EmployeesPage = lazy(() => import('@/pages/employees'));
const EmployeeForm = lazy(() => import('@/pages/employee-form'));
const ImageForm = lazy(() => import('@/pages/image-form'));
const MasterDataTable = lazy(() => import('./masterdata-table'));
const MasterDataFormLayout = lazy(() => import('@/components/layouts/MasterDataFormLayout'));
const DevFuturesPage = lazy(() => import('@/pages/dev-futures'));

const DashboardPage = lazy(() => import('@/pages/dashboard'));
const InventoryPage = lazy(() => import('@/pages/inventory'));
const InvoicesPage = lazy(() => import('@/pages/invoices'));
const ProjectsPage = lazy(() => import('@/pages/projects'));
const WorkOrdersPage = lazy(() => import('@/pages/work-orders'));
const PurchaseOrdersPage = lazy(() => import('@/pages/purchase-orders'));
const SalesOrdersPage = lazy(() => import('@/pages/sales-orders'));
const PackingListsPage = lazy(() => import('@/pages/packing-lists'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const PdfArchivePage = lazy(() => import('@/pages/pdf-archive'));
const AddressesPage = lazy(() => import('@/pages/addresses'));
const TextSnippetsPage = lazy(() => import('@/pages/text-snippets'));
const LayoutDesignerPage = lazy(() => import('@/pages/layout-designer'));
const LayoutDesignerForm = lazy(() => import('@/pages/layout-designer-form'));
const ImagesPage = lazy(() => import('@/pages/images'));
const PictogramsPage = lazy(() => import('@/pages/pictograms'));
const StyleGuidePage = lazy(() => import('@/pages/style-guide'));
import { getMasterDataConfig } from "@/config/masterdata-config";

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
    
    // Check for invoice line item routes
    const invoiceItemNewMatch = path.match(/^\/invoices\/([^/]+)\/items\/new$/);
    if (invoiceItemNewMatch) {
      return { id: `invoice-line-new-${invoiceItemNewMatch[1]}`, name: 'Invoice Line' };
    }
    
    const invoiceItemEditMatch = path.match(/^\/invoices\/([^/]+)\/items\/([^/]+)$/);
    if (invoiceItemEditMatch) {
      return { id: `invoice-line-${invoiceItemEditMatch[2]}`, name: 'Invoice Line' };
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
      case '/employees':
        return { id: 'employees', name: 'Employees' };
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
      case '/pdf-archive':
        return { id: 'pdf-archive', name: 'PDF Database' };
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
      case '/master-data/pictograms':
        return { id: 'pictograms', name: 'Pictograms' };
      case '/style-guide':
        return { id: 'design-system', name: 'Design System' };
      case '/dev-futures':
        return { id: 'dev-futures', name: 'Feature Wishes' };
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
  
  // Split screen state - rightPanelTabIds tracks which tabs are in the right panel
  // All tabs remain in the main `tabs` array as single source of truth
  const [rightPanelTabIds, setRightPanelTabIds] = useState<Set<string>>(new Set());
  const [rightPanelActiveTabId, setRightPanelActiveTabId] = useState<string>('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'left' | 'right' | null>(null);
  const [showDropZone, setShowDropZone] = useState(false);
  const [showLeftDropZone, setShowLeftDropZone] = useState(false);
  const leftPanelTabs = tabs.filter(t => !rightPanelTabIds.has(t.id));
  const rightPanelTabs = tabs.filter(t => rightPanelTabIds.has(t.id));
  const isSplitScreen = rightPanelTabs.length > 0;
  
  // Track which panel the user is interacting with (for opening tabs in correct panel)
  const activePanelRef = useRef<'left' | 'right'>('left');
  const rightPanelTabIdsRef = useRef<Set<string>>(rightPanelTabIds);
  useEffect(() => { rightPanelTabIdsRef.current = rightPanelTabIds; }, [rightPanelTabIds]);

  // Unsaved changes tracking
  const [tabsWithUnsavedChanges, setTabsWithUnsavedChanges] = useState<Set<string>>(new Set());
  const tabsWithUnsavedChangesRef = useRef<Set<string>>(new Set());
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
      if (hasUnsavedChanges) {
        tabsWithUnsavedChangesRef.current.add(tabId);
      } else {
        tabsWithUnsavedChangesRef.current.delete(tabId);
      }
      setTabsWithUnsavedChanges(new Set(tabsWithUnsavedChangesRef.current));
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
      const targetPanel = formInfo.targetPanel || activePanelRef.current;
      
      // Use functional state updates to avoid stale closures
      setTabs(prevTabs => {
        const existingTab = prevTabs.find(tab => tab.id === formInfo.id);
        
        if (existingTab) {
          return prevTabs;
        } else {
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
      
      // Open in the correct panel based on where the action originated
      if (targetPanel === 'right') {
        setRightPanelTabIds(prev => {
          const next = new Set(prev);
          next.add(formInfo.id);
          return next;
        });
        setRightPanelActiveTabId(formInfo.id);
      } else {
        if (rightPanelTabIdsRef.current.has(formInfo.id)) {
          setRightPanelActiveTabId(formInfo.id);
        } else {
          setActiveTabId(formInfo.id);
        }
      }
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
      case 'employees':
        return '/employees';
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
      case 'pdf-archive':
        return '/pdf-archive';
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
    // Check ref for most up-to-date unsaved changes status (avoids React state race condition)
    if (tabsWithUnsavedChangesRef.current.has(tabId)) {
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
          
          // If the closed tab was a page tab, navigate away from its URL
          // so that future navigate() calls to the same URL work correctly
          if (tabToClose?.type === 'page') {
            const closedRoute = tabToClose.menuRoute;
            if (closedRoute && closedRoute === location) {
              if (nextActiveTab.type === 'page') {
                // Navigate to the next page tab's route
                const route = nextActiveTab.menuRoute || getRouteForTab(nextActiveTab.id);
                if (route !== location) {
                  navigate(route);
                }
              } else {
                // Next tab is a form type — navigate to /welcome (neutral)
                // so the URL no longer matches the closed tab, allowing
                // it to be reopened later via navigate()
                navigate('/welcome');
              }
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
    
    // Clean up unsaved changes tracking and right panel tracking
    setTabsWithUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });
    setRightPanelTabIds(prev => {
      if (prev.has(tabId)) {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      }
      return prev;
    });
  };

  const handleConfirmCloseTab = () => {
    if (pendingCloseTabId) {
      const isInRightPanel = rightPanelTabIds.has(pendingCloseTabId);
      if (isInRightPanel) {
        setRightPanelTabIds(prev => {
          const next = new Set(prev);
          next.delete(pendingCloseTabId!);
          const remaining = tabs.filter(t => next.has(t.id));
          if (rightPanelActiveTabId === pendingCloseTabId) {
            if (remaining.length > 0) {
              setRightPanelActiveTabId(remaining[0].id);
            } else {
              setRightPanelActiveTabId('');
            }
          }
          return next;
        });
        setTabs(prev => prev.filter(t => t.id !== pendingCloseTabId));
      } else {
        performCloseTab(pendingCloseTabId);
      }
      setTabsWithUnsavedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingCloseTabId!);
        return newSet;
      });
      setPendingCloseTabId(null);
    }
    setShowUnsavedChangesDialog(false);
  };

  const handleCancelCloseTab = () => {
    setPendingCloseTabId(null);
    setShowUnsavedChangesDialog(false);
  };

  const handleTabDragStart = useCallback((e: React.DragEvent, tabId: string, source: 'left' | 'right') => {
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTabId(tabId);
    setDragSource(source);
    setShowDropZone(true);
    setShowLeftDropZone(true);
  }, []);

  const handleTabDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragSource(null);
    setShowDropZone(false);
    setShowLeftDropZone(false);
  }, []);

  const handleDropOnRightPanel = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setShowDropZone(false);
    setShowLeftDropZone(false);
    const tabId = e.dataTransfer.getData('text/plain');
    if (!tabId) return;

    if (dragSource === 'left') {
      if (leftPanelTabs.length <= 1) return;

      setRightPanelTabIds(prev => {
        const next = new Set(prev);
        next.add(tabId);
        return next;
      });
      if (activeTabId === tabId) {
        const remaining = leftPanelTabs.filter(t => t.id !== tabId);
        if (remaining.length > 0) setActiveTabId(remaining[0].id);
      }
      setRightPanelActiveTabId(tabId);
    }
    setDraggedTabId(null);
    setDragSource(null);
  }, [leftPanelTabs, activeTabId, dragSource]);

  const handleDropOnLeftPanel = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setShowDropZone(false);
    setShowLeftDropZone(false);
    const tabId = e.dataTransfer.getData('text/plain');
    if (!tabId) return;

    if (dragSource === 'right') {
      setRightPanelTabIds(prev => {
        const next = new Set(prev);
        next.delete(tabId);
        const remaining = tabs.filter(t => next.has(t.id));
        if (remaining.length === 0) {
          setRightPanelActiveTabId('');
        } else if (rightPanelActiveTabId === tabId) {
          setRightPanelActiveTabId(remaining[0].id);
        }
        return next;
      });
      setActiveTabId(tabId);
    }
    setDraggedTabId(null);
    setDragSource(null);
  }, [tabs, rightPanelActiveTabId, dragSource]);

  const closeRightPanelTab = useCallback((tabId: string) => {
    if (tabsWithUnsavedChangesRef.current.has(tabId)) {
      setPendingCloseTabId(tabId);
      setShowUnsavedChangesDialog(true);
      return;
    }
    
    setRightPanelTabIds(prev => {
      const next = new Set(prev);
      next.delete(tabId);
      const remaining = tabs.filter(t => next.has(t.id));
      if (rightPanelActiveTabId === tabId) {
        if (remaining.length > 0) {
          setRightPanelActiveTabId(remaining[0].id);
        } else {
          setRightPanelActiveTabId('');
        }
      }
      return next;
    });
    
    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    setTabsWithUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(tabId);
      return newSet;
    });
  }, [tabs, rightPanelActiveTabId, tabsWithUnsavedChanges]);

  const closeRightPanel = useCallback(() => {
    if (rightPanelTabs.length > 0 && !activeTabId) {
      setActiveTabId(rightPanelTabs[0].id);
    }
    setRightPanelTabIds(new Set());
    setRightPanelActiveTabId('');
  }, [rightPanelTabs, activeTabId]);

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

  const renderTabContent = (tab: Tab, _panelTabs: Tab[], panelSetActiveTabId: (id: string) => void, panelCloseTab: (id: string) => void) => {
    if (!tab) return null;
    const allTabs = tabs;
    
    if (tab.type === 'section') {
      return (
        <SectionInfoPanel 
          sectionId={tab.id}
          sectionName={tab.name}
          onClose={() => panelCloseTab(tab.id)}
        />
      );
    }

    const masterDataIdMap: Record<string, string> = {
      'payment-terms': 'payment-terms',
      'payment-days': 'payment-days',
      'uom': 'units-of-measure',
      'rates-and-charges': 'rates-and-charges',
      'incoterms': 'incoterms',
      'vat': 'vat-rates',
      'cities': 'cities',
      'statuses': 'statuses',
    };
    const masterDataConfigKey = masterDataIdMap[tab.id];
    if (masterDataConfigKey) {
      const mdConfig = getMasterDataConfig(masterDataConfigKey);
      if (mdConfig) {
        return (
          <Suspense fallback={<div></div>}>
            <MasterDataTable
              title={mdConfig.title}
              endpoint={mdConfig.endpoint}
              schema={mdConfig.schema}
              fields={mdConfig.fields}
              columns={mdConfig.columns}
            />
          </Suspense>
        );
      }
    }
    
    if (tab.type === 'menu' || tab.type === 'page') {
      if (tab.id === 'dashboard') {
        return (
          <Suspense fallback={<div></div>}>
            <DashboardPage />
          </Suspense>
        );
      }

      if (tab.id === 'customers') {
        return (
          <CustomerProvider>
            <Suspense fallback={<div></div>}>
              <CustomerTable />
            </Suspense>
          </CustomerProvider>
        );
      }

      if (tab.id === 'suppliers') {
        return (
          <Suspense fallback={<div></div>}>
            <SupplierTable />
          </Suspense>
        );
      }

      if (tab.id === 'contact-persons') {
        return (
          <Suspense fallback={<div></div>}>
            <ContactPersonsPage />
          </Suspense>
        );
      }

      if (tab.id === 'employees') {
        return (
          <Suspense fallback={<div></div>}>
            <EmployeesPage />
          </Suspense>
        );
      }

      if (tab.id === 'quotations') {
        return (
          <Suspense fallback={<div></div>}>
            <QuotationsPage onCreateNew={handleFormClick} />
          </Suspense>
        );
      }

      if (tab.id === 'inventory') {
        return (
          <Suspense fallback={<div></div>}>
            <InventoryPage />
          </Suspense>
        );
      }

      if (tab.id === 'invoices') {
        return (
          <Suspense fallback={<div></div>}>
            <InvoicesPage />
          </Suspense>
        );
      }

      if (tab.id === 'projects') {
        return (
          <Suspense fallback={<div></div>}>
            <ProjectsPage />
          </Suspense>
        );
      }

      if (tab.id === 'work-orders') {
        return (
          <Suspense fallback={<div></div>}>
            <WorkOrdersPage />
          </Suspense>
        );
      }

      if (tab.id === 'purchase-orders') {
        return (
          <Suspense fallback={<div></div>}>
            <PurchaseOrdersPage />
          </Suspense>
        );
      }

      if (tab.id === 'sales-orders') {
        return (
          <Suspense fallback={<div></div>}>
            <SalesOrdersPage />
          </Suspense>
        );
      }

      if (tab.id === 'packing-lists') {
        return (
          <Suspense fallback={<div></div>}>
            <PackingListsPage />
          </Suspense>
        );
      }

      if (tab.id === 'reports') {
        return (
          <Suspense fallback={<div></div>}>
            <ReportsPage />
          </Suspense>
        );
      }

      if (tab.id === 'pdf-archive') {
        return (
          <Suspense fallback={<div></div>}>
            <PdfArchivePage />
          </Suspense>
        );
      }

      if (tab.id === 'addresses') {
        return (
          <Suspense fallback={<div></div>}>
            <AddressesPage />
          </Suspense>
        );
      }

      if (tab.id === 'text-snippets') {
        return (
          <Suspense fallback={<div></div>}>
            <TextSnippetsPage />
          </Suspense>
        );
      }

      if (tab.id === 'layout-designer') {
        return (
          <Suspense fallback={<div></div>}>
            <LayoutDesignerPage />
          </Suspense>
        );
      }

      if (tab.id === 'images') {
        return (
          <Suspense fallback={<div></div>}>
            <ImagesPage />
          </Suspense>
        );
      }

      if (tab.id === 'pictograms') {
        return (
          <Suspense fallback={<div></div>}>
            <PictogramsPage />
          </Suspense>
        );
      }

      if (tab.id === 'design-system') {
        return (
          <Suspense fallback={<div></div>}>
            <StyleGuidePage />
          </Suspense>
        );
      }

      if (tab.id === 'dev-futures') {
        return (
          <Suspense fallback={<div></div>}>
            <DevFuturesPage />
          </Suspense>
        );
      }

      return tab.content || children;
    }
    
    if (tab.type === 'form') {
      if (tab.formType === 'quotation') {
        const quotationId = tab.id.startsWith('edit-quotation-') 
          ? tab.id.replace('edit-quotation-', '') 
          : tab.parentId;
        
        return (
          <Suspense fallback={<div></div>}>
            <QuotationForm 
              quotationId={quotationId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'customer') {
        const customerId = tab.entityId || (
          tab.id.startsWith('customer-') 
            ? tab.id.replace('customer-', '') 
            : undefined
        );
        
        return (
          <Suspense fallback={<div></div>}>
            <CustomerForm
              key={tab.id}
              customerId={customerId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'line-item' || tab.formType === 'quotation-item') {
        const isEditing = tab.id.startsWith('edit-line-item-');
        const lineItemId = isEditing ? tab.id.replace('edit-line-item-', '') : undefined;
        const quotationId = isEditing ? undefined : (tab.parentId || (tab as any).quotationId);
        
        return (
          <Suspense fallback={<div></div>}>
            <LineItemFormLayoutComponent 
              lineItemId={lineItemId}
              quotationId={quotationId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'supplier') {
        const supplierId = tab.id.startsWith('edit-supplier-') 
          ? tab.id.replace('edit-supplier-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <SupplierForm 
              supplierId={supplierId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'inventory' || tab.formType === 'inventory-item') {
        const inventoryId = tab.id.startsWith('edit-inventory-') 
          ? tab.id.replace('edit-inventory-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <InventoryForm 
              inventoryId={inventoryId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'project') {
        const projectId = tab.id.startsWith('edit-project-') 
          ? tab.id.replace('edit-project-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <ProjectForm 
              projectId={projectId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'work-order') {
        const workOrderId = tab.id.startsWith('edit-work-order-') 
          ? tab.id.replace('edit-work-order-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <WorkOrderForm 
              workOrderId={workOrderId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'purchase-order') {
        const purchaseOrderId = tab.id.startsWith('edit-purchase-order-') 
          ? tab.id.replace('edit-purchase-order-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <PurchaseOrderForm 
              purchaseOrderId={purchaseOrderId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'invoice') {
        const invoiceId = tab.id.startsWith('edit-invoice-') 
          ? tab.parentId
          : tab.id.startsWith('view-invoice-')
          ? tab.parentId
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <InvoiceForm 
              invoiceId={invoiceId}
              parentId={tab.parentId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'contact-person') {
        const contactPersonId = tab.id.startsWith('edit-contact-person-') 
          ? tab.id.replace('edit-contact-person-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <ContactPersonForm 
              contactPersonId={contactPersonId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }

      if (tab.formType === 'employee') {
        const employeeId = tab.id.startsWith('employee-edit-') 
          ? tab.id.replace('employee-edit-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <EmployeeForm 
              employeeId={employeeId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'address') {
        const addressId = tab.id.startsWith('edit-address-') 
          ? tab.id.replace('edit-address-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <AddressFormLayout 
              addressId={addressId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType === 'image') {
        const imageId = tab.id.startsWith('edit-image-') 
          ? tab.id.replace('edit-image-', '') 
          : undefined;
        
        return (
          <Suspense fallback={<div></div>}>
            <ImageForm 
              imageId={imageId}
              onSave={() => {}} 
            />
          </Suspense>
        );
      }
      
      if (tab.formType?.startsWith('masterdata-')) {
        const mdType = tab.formType.replace('masterdata-', '');
        const mdConfig = getMasterDataConfig(mdType);
        if (mdConfig) {
          const entityId = tab.entityId || undefined;
          return (
            <Suspense fallback={<div></div>}>
              <MasterDataFormLayout
                type={mdType}
                id={entityId}
                onSave={() => {}}
              />
            </Suspense>
          );
        }
      }

      if (tab.formType === 'layout-designer') {
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Laden...</div>}>
            <LayoutDesignerForm layoutId={tab.entityId!} />
          </Suspense>
        );
      }

      if (tab.formType === 'invoice-line-item') {
        const lineItemId = tab.entityId ?? tab.id.replace('invoice-line-item-edit-', '');
        const invoiceId = tab.parentId;
        return (
          <Suspense fallback={<div></div>}>
            <InvoiceLineItemForm
              invoiceId={invoiceId!}
              itemId={lineItemId}
              onSave={() => {}}
            />
          </Suspense>
        );
      }

      return (
        <div className="p-6">
          <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Form for {tab.name} will be implemented here.</p>
          </div>
        </div>
      );
    }
    
    return tab.content || children;
  };

  const renderActiveTabContent = () => {
    if (leftPanelTabs.length === 0 && !isSplitScreen) {
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
    
    return (
      <>
        {leftPanelTabs.map(tab => (
          <div
            key={tab.id}
            className="h-full flex flex-col"
            style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}
          >
            {renderTabContent(tab, leftPanelTabs, setActiveTabId, closeTab)}
          </div>
        ))}
      </>
    );
  };

  const renderRightPanelContent = () => {
    if (rightPanelTabs.length === 0) return null;
    return (
      <>
        {rightPanelTabs.map(tab => (
          <div
            key={tab.id}
            className="h-full flex flex-col"
            style={{ display: tab.id === rightPanelActiveTabId ? 'flex' : 'none' }}
          >
            {renderTabContent(tab, rightPanelTabs, setRightPanelActiveTabId, closeRightPanelTab)}
          </div>
        ))}
      </>
    );
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
            className="h-8 md:h-16 w-auto object-contain"
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
        
        <div className="hidden md:flex h-full">
          <Sidebar onSectionClick={handleSectionClick} onMenuClick={handleMenuClick} />
        </div>
        
        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isSplitScreen ? (
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              {/* Left Panel */}
              <ResizablePanel defaultSize={50} minSize={25}>
                <div className="flex flex-col h-full overflow-hidden"
                  onPointerDown={() => { activePanelRef.current = 'left'; }}
                  onDragOver={(e) => { if (dragSource === 'right') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                  onDrop={handleDropOnLeftPanel}
                >
                  <div className="bg-gray-50 px-2 md:px-4 border-b-0 h-[44px] md:h-[62px] flex items-end relative">
                    <div className="flex items-end space-x-1 overflow-x-auto flex-1">
                      {leftPanelTabs.map((tab) => (
                        <div
                          key={tab.id}
                          draggable
                          onDragStart={(e) => handleTabDragStart(e, tab.id, 'left')}
                          onDragEnd={handleTabDragEnd}
                          className={`flex items-center gap-1 px-3 py-2 rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${
                            activeTabId === tab.id
                              ? 'bg-orange-500 text-white relative z-10 border-2 border-orange-500 border-b-orange-500'
                              : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200 mb-[2px]'
                          }`}
                          onClick={() => handleTabClick(tab)}
                          onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } }}
                          onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } }}
                          data-testid={`tab-${tab.id}`}
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          <span className="text-xs md:text-sm font-medium truncate max-w-32 md:max-w-56">{tab.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className={`p-0.5 rounded-full transition-colors ${activeTabId === tab.id ? 'hover:bg-orange-600' : 'hover:bg-gray-300'}`}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {showLeftDropZone && dragSource === 'right' && (
                      <div className="absolute inset-0 bg-orange-100 border-2 border-dashed border-orange-400 rounded-lg flex items-center justify-center z-20 pointer-events-auto">
                        <span className="text-orange-600 font-medium text-sm">Drop here to move to left panel</span>
                      </div>
                    )}
                  </div>
                  <main className={`flex-1 flex flex-col overflow-hidden ${leftPanelTabs.length > 0 ? 'border-2 border-orange-500 bg-white rounded-lg' : 'bg-white'}`}>
                    <div className="flex-1 overflow-auto">
                      {renderActiveTabContent()}
                    </div>
                  </main>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Right Panel */}
              <ResizablePanel defaultSize={50} minSize={25}>
                <div className="flex flex-col h-full overflow-hidden relative"
                  onPointerDown={() => { activePanelRef.current = 'right'; }}
                  onDragOver={(e) => { if (dragSource === 'left') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                  onDrop={handleDropOnRightPanel}
                >
                  {showDropZone && dragSource === 'left' && leftPanelTabs.length > 1 && (
                    <div className="absolute inset-0 bg-orange-100/80 border-2 border-dashed border-orange-400 rounded-lg flex items-center justify-center z-20 pointer-events-none">
                      <div className="text-center">
                        <PanelRightClose className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <span className="text-orange-600 font-medium text-sm">Drop here to move to right panel</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 px-2 md:px-4 border-b-0 h-[44px] md:h-[62px] flex items-end">
                    <div className="flex items-end space-x-1 overflow-x-auto flex-1">
                      {rightPanelTabs.map((tab) => (
                        <div
                          key={tab.id}
                          draggable
                          onDragStart={(e) => handleTabDragStart(e, tab.id, 'right')}
                          onDragEnd={handleTabDragEnd}
                          className={`flex items-center gap-1 px-3 py-2 rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${
                            rightPanelActiveTabId === tab.id
                              ? 'bg-orange-500 text-white relative z-10 border-2 border-orange-500 border-b-orange-500'
                              : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200 mb-[2px]'
                          }`}
                          onClick={() => setRightPanelActiveTabId(tab.id)}
                          onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); closeRightPanelTab(tab.id); } }}
                          onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeRightPanelTab(tab.id); } }}
                          data-testid={`tab-right-${tab.id}`}
                          style={{ fontFamily: 'Arial, sans-serif' }}
                        >
                          <span className="text-xs md:text-sm font-medium truncate max-w-32 md:max-w-56">{tab.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); closeRightPanelTab(tab.id); }} className={`p-0.5 rounded-full transition-colors ${rightPanelActiveTabId === tab.id ? 'hover:bg-orange-600' : 'hover:bg-gray-300'}`}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={closeRightPanel}
                      className="ml-2 mb-1 p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Close right panel"
                    >
                      <PanelRightClose size={16} />
                    </button>
                  </div>
                  <main className="flex-1 flex flex-col overflow-hidden border-2 border-orange-500 bg-white rounded-lg">
                    <div className="flex-1 overflow-auto">
                      {renderRightPanelContent()}
                    </div>
                  </main>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <>
              {/* Tab Bar - single panel mode */}
              <div className="bg-gray-50 px-2 md:px-4 border-b-0 h-[44px] md:h-[62px] flex items-end relative">
                <div className="flex items-end space-x-1 overflow-x-auto flex-1">
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      draggable
                      onDragStart={(e) => handleTabDragStart(e, tab.id, 'left')}
                      onDragEnd={handleTabDragEnd}
                      className={`flex items-center gap-1 px-3 py-2 rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${
                        activeTabId === tab.id
                          ? 'bg-orange-500 text-white relative z-10 border-2 border-orange-500 border-b-orange-500'
                          : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200 mb-[2px]'
                      }`}
                      onClick={() => handleTabClick(tab)}
                      onMouseDown={(e) => {
                        if (e.button === 1) {
                          e.preventDefault();
                          closeTab(tab.id);
                        }
                      }}
                      onAuxClick={(e) => {
                        if (e.button === 1) {
                          e.preventDefault();
                          closeTab(tab.id);
                        }
                      }}
                      onTouchStart={(e) => {
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

              {/* Drop zone overlay - appears on the right when dragging */}
              {showDropZone && dragSource === 'left' && leftPanelTabs.length > 1 && (
                <div className="flex flex-1 overflow-hidden relative">
                  <main className={`flex-1 flex flex-col overflow-hidden ${leftPanelTabs.length > 0 ? 'border-2 border-orange-500 bg-white rounded-lg' : 'bg-white'}`}>
                    <div className="flex-1 overflow-auto">
                      {renderActiveTabContent()}
                    </div>
                  </main>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1/3 bg-orange-100/80 border-2 border-dashed border-orange-400 rounded-lg flex items-center justify-center z-30 transition-all"
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={handleDropOnRightPanel}
                  >
                    <div className="text-center">
                      <PanelRightClose className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                      <span className="text-orange-600 font-medium text-sm">Drop here to open in split view</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Normal content (no drag) */}
              {!showDropZone && (
                <main className={`flex-1 flex flex-col overflow-hidden ${
                  leftPanelTabs.length > 0 ? 'border-2 border-orange-500 bg-white rounded-lg' : 'bg-white'
                }`}>
                  <div className="flex-1 overflow-auto">
                    {renderActiveTabContent()}
                  </div>
                </main>
              )}
            </>
          )}
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