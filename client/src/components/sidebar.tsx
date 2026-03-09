import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  BarChart3, Building, Users, Truck, Package, FileText, 
  Receipt, FolderOpen, ClipboardList, ShoppingCart, Box, UserPlus, Contact, UserCheck,
  ChevronDown, ChevronUp, FileCheck, CreditCard, CheckSquare, GripVertical, Settings, Save, MoreVertical, Search, ChevronsDown, ChevronsUp,
  Ruler, Calendar, Plane, Percent, MapPin, Tag, BookOpen, Layout, Image, Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const defaultNavigation = [
  {
    id: "overview",
    name: "Overview",
    collapsible: true,
    items: [
      { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: BarChart3 }
    ]
  },
  {
    id: "relations",
    name: "Relations",
    collapsible: true,
    items: [
      { id: "customers", name: "Customers", href: "/customers", icon: Users },
      { id: "suppliers", name: "Suppliers", href: "/suppliers", icon: Truck },
      { id: "contact-persons", name: "Contact Persons", href: "/contact-persons", icon: Contact },
      { id: "employees", name: "Employees", href: "/employees", icon: UserCheck },
      { id: "addresses", name: "Addresses", href: "/addresses", icon: MapPin },
      { id: "prospects", name: "Prospects", href: "/prospects", icon: UserPlus }
    ]
  },
  {
    id: "inventory",
    name: "Inventory",
    collapsible: true,
    items: [
      { id: "stock", name: "Stock Management", href: "/inventory", icon: Package },
      { id: "purchase-orders", name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart }
    ]
  },
  {
    id: "master-data",
    name: "Master Data",
    collapsible: true,
    items: [
      { id: "company-details", name: "Our Company Details", href: "/master-data/company-details", icon: Building },
      { id: "text-snippets", name: "Text Snippets", href: "/text-snippets", icon: BookOpen },
      { id: "images", name: "Images", href: "/master-data/images", icon: Image },
      { id: "uom", name: "Units of Measure", href: "/master-data/uom", icon: Ruler },
      { id: "payment-terms", name: "Payment Terms", href: "/master-data/payment-terms", icon: Calendar },
      { id: "rates-and-charges", name: "Rates & Charges", href: "/master-data/rates-and-charges", icon: CreditCard },
      { id: "incoterms", name: "Incoterms", href: "/master-data/incoterms", icon: Plane },
      { id: "vat", name: "VAT Rates", href: "/master-data/vat", icon: Percent },
      { id: "cities", name: "Cities", href: "/master-data/cities", icon: MapPin },
      { id: "statuses", name: "Statuses", href: "/master-data/statuses", icon: Tag },
      { id: "pictograms", name: "Pictograms", href: "/master-data/pictograms", icon: FileCheck }
    ]
  },
  {
    id: "sales",
    name: "Sales",
    collapsible: true,
    items: [
      { id: "quotations", name: "Quotations", href: "/quotations", icon: FileText },
      { id: "proforma", name: "Proforma Invoices", href: "/proforma-invoices", icon: FileCheck },
      { id: "invoices", name: "Invoices", href: "/invoices", icon: Receipt },
      { id: "orders", name: "Orders", href: "/sales-orders", icon: ShoppingCart }
    ]
  },
  {
    id: "operations",
    name: "Operations",
    collapsible: true,
    items: [
      { id: "confirmations", name: "Order Confirmations", href: "/order-confirmations", icon: CheckSquare },
      { id: "work-orders", name: "Work Orders", href: "/work-orders", icon: ClipboardList },
      { id: "projects", name: "Projects", href: "/projects", icon: FolderOpen },
      { id: "packing-lists", name: "Packing Lists", href: "/packing-lists", icon: Box }
    ]
  },
  {
    id: "reports",
    name: "Reports",
    collapsible: true,
    items: [
      { id: "analytics", name: "Analytics", href: "/reports", icon: BarChart3 },
      { id: "pdf-archive", name: "PDF Database", href: "/pdf-archive", icon: Archive }
    ]
  },
  {
    id: "tools",
    name: "Tools",
    collapsible: true,
    items: [
      { id: "layout-designer", name: "Layout Designer", href: "/layout-designer", icon: Layout },
      { id: "style-guide", name: "Design System", href: "/style-guide", icon: FileText }
    ]
  },
  {
    id: "development",
    name: "Software Development Futures",
    collapsible: true,
    items: [
      { id: "dev-futures", name: "Feature Wishes", href: "/dev-futures", icon: FileCheck }
    ]
  }
];

function SortableNavItem({ item, sectionId, isEditMode, onMenuClick }: { item: any; sectionId: string; isEditMode: boolean; onMenuClick?: (menuItem: {id: string, name: string, route?: string}) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${sectionId}-${item.id}` });

  const [location] = useLocation();
  const IconComponent = item.icon;
  const isActive = location === item.href;
  
  // Ensure IconComponent is a valid React component
  const isValidComponent = typeof IconComponent === 'function';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-accent rounded transition-colors mr-2"
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical size={12} className="text-muted-foreground" />
        </div>
      )}
      <button
        onClick={() => onMenuClick?.({id: item.id, name: item.name, route: item.href})}
        className={cn(
          "flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors relative flex-1 text-left w-full",
          isActive
            ? "bg-orange-50 text-foreground border-l-4 border-orange-500"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
        disabled={isEditMode}
      >
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
          isActive 
            ? "bg-orange-500 text-white" 
            : "bg-orange-400 text-white hover:bg-orange-500"
        )}>
          {isValidComponent ? <IconComponent size={14} /> : <div className="w-3.5 h-3.5 bg-current rounded opacity-50" />}
        </div>
        <span className="text-sm font-medium">{item.name}</span>
      </button>
    </div>
  );
}

function SortableSection({ section, collapsedSections, toggleSection, isEditMode, onSectionClick, onMenuClick }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const isCollapsed = collapsedSections[section.name];
  const isCollapsible = section.collapsible;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-0.5">
      <div className="flex items-center">
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing hover:bg-accent rounded transition-colors mr-2"
            data-testid={`drag-section-${section.id}`}
          >
            <GripVertical size={12} className="text-muted-foreground" />
          </div>
        )}
        {isCollapsible && (
          <button
            onClick={() => toggleSection(section.name)}
            className="p-1 hover:bg-accent rounded transition-colors mr-1"
            data-testid={`toggle-${section.name.toLowerCase()}`}
          >
            {isCollapsed ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronUp size={14} className="text-muted-foreground" />
            )}
          </button>
        )}
        <h3 
          className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 flex-1 cursor-pointer hover:text-orange-500 transition-colors"
          onClick={() => onSectionClick?.({id: section.id, name: section.name})}
          data-testid={`section-header-${section.id}`}
        >
          {section.name}
        </h3>
      </div>
      {(!isCollapsible || !isCollapsed) && (
        <SortableContext
          items={section.items.map((item: any) => `${section.id}-${item.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {section.items.map((item: any) => (
            <SortableNavItem
              key={item.id}
              item={item}
              sectionId={section.id}
              isEditMode={isEditMode}
              onMenuClick={onMenuClick}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

interface SidebarProps {
  onSectionClick?: (section: {id: string, name: string}) => void;
  onMenuClick?: (menuItem: {id: string, name: string, route?: string}) => void;
}

export default function Sidebar({ onSectionClick, onMenuClick }: SidebarProps) {
  const [navigation, setNavigation] = useState(defaultNavigation);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [originalNavigation, setOriginalNavigation] = useState(defaultNavigation);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  
  // Ref to track last saved collapsed sections to prevent unnecessary saves
  const lastSavedCollapsedSections = useRef<Record<string, boolean>>({});
  
  // For demo purposes, using admin user ID. In real app, get from auth context
  const userId = "admin";

  // Load user preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/user-preferences", userId],
  });

  // Save user preferences
  const savePreferences = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/user-preferences`, {
        userId,
        navigationOrder: data.navigationOrder,
        collapsedSections: data.collapsedSections,
      });
    },
    onSuccess: () => {
      // Use setQueryData to update cache without refetch to prevent flicker
      queryClient.setQueryData(["/api/user-preferences", userId], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            navigationOrder: navigation,
            collapsedSections: lastSavedCollapsedSections.current,
          };
        }
        return oldData;
      });
    },
    onError: (error: any) => {
      console.error("Failed to save preferences:", error);
      // Silently fail for now, preferences will work locally
    },
  });

  // Merge saved navigation with default navigation to include new items
  const mergeNavigationWithDefaults = (savedNav: typeof defaultNavigation): typeof defaultNavigation => {
    const mergedSections: typeof defaultNavigation = [];
    
    // For each section in default navigation
    for (const defaultSection of defaultNavigation) {
      const savedSection = savedNav.find((s: any) => s.id === defaultSection.id);
      
      if (savedSection) {
        // Merge items: keep saved order but add new items from defaults
        const mergedItems: typeof defaultSection.items = [];
        const savedItemIds = new Set(savedSection.items?.map((i: any) => i.id) || []);
        const defaultItemIds = new Set(defaultSection.items?.map(i => i.id) || []);
        
        // First add items from saved order (if they still exist in defaults)
        if (savedSection.items) {
          for (const savedItem of savedSection.items) {
            const defaultItem = defaultSection.items?.find(i => i.id === savedItem.id);
            if (defaultItem) {
              // Use default item data (updated name/icon) but keep position from saved
              mergedItems.push(defaultItem);
            }
          }
        }
        
        // Then add new items from defaults that weren't in saved
        if (defaultSection.items) {
          for (const defaultItem of defaultSection.items) {
            if (!savedItemIds.has(defaultItem.id)) {
              mergedItems.push(defaultItem);
            }
          }
        }
        
        mergedSections.push({
          ...defaultSection,
          items: mergedItems
        });
      } else {
        // Section is new, add it entirely
        mergedSections.push(defaultSection);
      }
    }
    
    return mergedSections;
  };

  // Initialize navigation and collapsed sections from preferences
  useEffect(() => {
    if (preferences && typeof preferences === 'object') {
      if ((preferences as any).navigationOrder && Array.isArray((preferences as any).navigationOrder)) {
        // Merge saved navigation with defaults to include new items
        const mergedNav = mergeNavigationWithDefaults((preferences as any).navigationOrder);
        setNavigation(mergedNav);
      }
      if ((preferences as any).collapsedSections && typeof (preferences as any).collapsedSections === 'object') {
        setCollapsedSections((preferences as any).collapsedSections);
      }
    }
  }, [preferences]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = (sectionName: string) => {
    const newCollapsedSections = {
      ...collapsedSections,
      [sectionName]: !collapsedSections[sectionName]
    };
    setCollapsedSections(newCollapsedSections);
    
    // Only save if collapsed sections actually changed from what we last saved
    if (!isEditMode) {
      const hasChanged = JSON.stringify(lastSavedCollapsedSections.current) !== JSON.stringify(newCollapsedSections);
      
      if (hasChanged) {
        setTimeout(() => {
          // Update tracking ref BEFORE making the save
          lastSavedCollapsedSections.current = newCollapsedSections;
          
          savePreferences.mutate({
            navigationOrder: navigation,
            collapsedSections: newCollapsedSections,
          });
        }, 300); // Reduced timeout for better responsiveness
      }
    }
  };

  const toggleAllSections = () => {
    const allCollapsed = navigation.every(section => collapsedSections[section.name]);
    const newCollapsedSections: Record<string, boolean> = {};
    
    navigation.forEach(section => {
      newCollapsedSections[section.name] = !allCollapsed;
    });
    
    setCollapsedSections(newCollapsedSections);
    
    // Save to database
    if (!isEditMode) {
      setTimeout(() => {
        savePreferences.mutate({
          navigationOrder: navigation,
          collapsedSections: newCollapsedSections,
        });
      }, 500);
    }
  };

  const areAllSectionsCollapsed = navigation.every(section => collapsedSections[section.name]);

  const toggleEditMode = () => {
    if (isEditMode) {
      // Save changes
      savePreferences.mutate({
        navigationOrder: navigation,
        collapsedSections,
      });
      setIsEditMode(false);
    } else {
      // Enter edit mode - save current state as backup
      setOriginalNavigation([...navigation]);
      setIsEditMode(true);
    }
  };

  const cancelEdit = () => {
    setNavigation(originalNavigation);
    setIsEditMode(false);
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      // Handle section reordering
      if (!activeId.includes('-') && !overId.includes('-')) {
        setNavigation((items) => {
          const oldIndex = items.findIndex((item) => item.id === activeId);
          const newIndex = items.findIndex((item) => item.id === overId);
          const newNavigation = arrayMove(items, oldIndex, newIndex);
          
          // Don't auto-save in edit mode
          
          return newNavigation;
        });
      } else {
        // Handle item reordering within a section
        const activeParts = activeId.split('-');
        const overParts = overId.split('-');
        
        if (activeParts.length === 2 && overParts.length === 2 && activeParts[0] === overParts[0]) {
          const sectionId = activeParts[0];
          const activeItemId = activeParts[1];
          const overItemId = overParts[1];
          
          setNavigation((sections) => {
            const newSections = [...sections];
            const sectionIndex = newSections.findIndex(s => s.id === sectionId);
            
            if (sectionIndex !== -1) {
              const section = newSections[sectionIndex];
              const oldIndex = section.items.findIndex((item: any) => item.id === activeItemId);
              const newIndex = section.items.findIndex((item: any) => item.id === overItemId);
              
              const newItems = arrayMove(section.items, oldIndex, newIndex);
              newSections[sectionIndex] = { ...section, items: newItems };
              
              // Don't auto-save in edit mode
            }
            
            return newSections;
          });
        }
      }
    }
  }

  // Filter navigation based on search query
  const filteredNavigation = navigation.map(section => {
    if (!searchQuery.trim()) {
      return section; // Return all items if no search query
    }
    
    const filteredItems = section.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return {
      ...section,
      items: filteredItems
    };
  }).filter(section => section.items.length > 0 || !searchQuery.trim()); // Hide empty sections when searching

  // When searching, temporarily expand sections that have matches
  const effectiveCollapsedSections = searchQuery.trim() 
    ? filteredNavigation.reduce((acc, section) => {
        // If this section has matching items, expand it during search
        if (section.items.length > 0) {
          acc[section.name] = false; // Expand section
        } else {
          acc[section.name] = collapsedSections[section.name] || false;
        }
        return acc;
      }, {} as Record<string, boolean>)
    : collapsedSections;

  return (
    <aside className="w-72 h-full bg-card border-r border-border flex flex-col">
      {/* Search Bar and Settings */}
      <div className="px-4 border-b border-border h-[62px] flex items-center">
        <div className="flex items-center gap-2">
          {/* Toggle All Sections Button */}
          <button
            onClick={toggleAllSections}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title={areAllSectionsCollapsed ? "Expand all sections" : "Collapse all sections"}
            data-testid="toggle-all-sections"
          >
            {areAllSectionsCollapsed ? (
              <ChevronsDown size={20} className="text-muted-foreground" />
            ) : (
              <ChevronsUp size={20} className="text-muted-foreground" />
            )}
          </button>
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              data-testid="menu-search"
            />
          </div>
          
          {isEditMode ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={toggleEditMode}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
                data-testid="save-edit-mode"
              >
                <Save size={16} />
                Save
              </button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 hover:bg-accent rounded-md transition-colors"
                  data-testid="settings-menu"
                >
                  <Settings size={16} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-2 border-border shadow-lg">
                <DropdownMenuItem onClick={toggleEditMode} className="cursor-pointer px-3 py-2 text-sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Adjust menu order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        {searchQuery.trim() && (
          <div className="text-xs text-muted-foreground mb-2">
            {filteredNavigation.reduce((total, section) => total + section.items.length, 0)} results found
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={isEditMode ? handleDragEnd : () => {}}
        >
          <SortableContext
            items={Array.isArray(filteredNavigation) ? filteredNavigation.map(section => section.id) : []}
            strategy={verticalListSortingStrategy}
          >
            {Array.isArray(filteredNavigation) ? filteredNavigation.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                collapsedSections={effectiveCollapsedSections}
                toggleSection={toggleSection}
                isEditMode={isEditMode}
                onSectionClick={onSectionClick}
                onMenuClick={onMenuClick}
              />
            )) : null}
          </SortableContext>
        </DndContext>
      </nav>
    </aside>
  );
}
