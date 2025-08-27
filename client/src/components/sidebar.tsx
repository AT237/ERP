import { useState, useEffect } from "react";
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
  Receipt, FolderOpen, ClipboardList, ShoppingCart, Box, UserPlus, Contact,
  ChevronDown, ChevronUp, FileCheck, CreditCard, CheckSquare, GripVertical, Settings, Save, MoreVertical
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

const defaultNavigation = [
  {
    id: "overview",
    name: "Overview",
    collapsible: true,
    items: [
      { id: "dashboard", name: "Dashboard", href: "/dashboard", icon: BarChart3 }
    ]
  },
  {
    id: "relaties",
    name: "Relaties",
    collapsible: true,
    items: [
      { id: "customers", name: "Customers", href: "/customers", icon: Users },
      { id: "suppliers", name: "Suppliers", href: "/suppliers", icon: Truck },
      { id: "contacts", name: "Contact Persons", href: "/contacts", icon: Contact },
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
    id: "sales",
    name: "Sales",
    collapsible: true,
    items: [
      { id: "quotations", name: "Quotations", href: "/quotations", icon: FileText },
      { id: "proforma", name: "Proforma Invoices", href: "/proforma-invoices", icon: FileCheck },
      { id: "orders", name: "Orders", href: "/sales-orders", icon: ShoppingCart },
      { id: "confirmations", name: "Order Confirmations", href: "/order-confirmations", icon: CheckSquare },
      { id: "sales-projects", name: "Projects", href: "/projects", icon: FolderOpen },
      { id: "sales-work", name: "Work Orders", href: "/work-orders", icon: ClipboardList },
      { id: "sales-packing", name: "Packing Lists", href: "/packing-lists", icon: Box }
    ]
  },
  {
    id: "operations",
    name: "Operations",
    collapsible: true,
    items: [
      { id: "projects", name: "Projects", href: "/projects", icon: FolderOpen },
      { id: "work-orders", name: "Work Orders", href: "/work-orders", icon: ClipboardList },
      { id: "packing-lists", name: "Packing Lists", href: "/packing-lists", icon: Box }
    ]
  },
  {
    id: "reports",
    name: "Reports",
    collapsible: true,
    items: [
      { id: "analytics", name: "Analytics", href: "/reports", icon: BarChart3 }
    ]
  }
];

function SortableNavItem({ item, sectionId, isEditMode }: { item: any; sectionId: string; isEditMode: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${sectionId}-${item.id}` });

  const [location] = useLocation();
  const Icon = item.icon;
  const isActive = location === item.href || (item.href === "/dashboard" && location === "/");

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
      <Link
        href={item.href}
        className={cn(
          "flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors relative flex-1",
          isActive
            ? "bg-orange-50 text-foreground border-l-4 border-orange-500"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
          isActive 
            ? "bg-orange-500 text-white" 
            : "bg-orange-400 text-white hover:bg-orange-500"
        )}>
          <Icon size={14} />
        </div>
        <span className="text-sm font-medium">{item.name}</span>
      </Link>
    </div>
  );
}

function SortableSection({ section, collapsedSections, toggleSection, isEditMode }: any) {
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
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 flex-1">
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
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [navigation, setNavigation] = useState(defaultNavigation);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalNavigation, setOriginalNavigation] = useState(defaultNavigation);
  const queryClient = useQueryClient();
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences", userId] });
    },
    onError: (error: any) => {
      console.error("Failed to save preferences:", error);
      // Silently fail for now, preferences will work locally
    },
  });

  // Initialize navigation and collapsed sections from preferences
  useEffect(() => {
    if (preferences && typeof preferences === 'object') {
      if ((preferences as any).navigationOrder && Array.isArray((preferences as any).navigationOrder)) {
        setNavigation((preferences as any).navigationOrder);
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
    
    // Only save collapsed sections immediately, not navigation order
    if (!isEditMode) {
      setTimeout(() => {
        savePreferences.mutate({
          navigationOrder: navigation,
          collapsedSections: newCollapsedSections,
        });
      }, 500);
    }
  };

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

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col relative">
      {/* Settings in top-right corner */}
      <div className="absolute top-2 right-2 z-10">
        {isEditMode ? (
          <button
            onClick={toggleEditMode}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
            data-testid="save-edit-mode"
          >
            <Save size={16} />
            Opslaan
          </button>
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
                Menu volgorde aanpassen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={isEditMode ? handleDragEnd : () => {}}
        >
          <SortableContext
            items={Array.isArray(navigation) ? navigation.map(section => section.id) : []}
            strategy={verticalListSortingStrategy}
          >
            {Array.isArray(navigation) ? navigation.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                collapsedSections={collapsedSections}
                toggleSection={toggleSection}
                isEditMode={isEditMode}
              />
            )) : null}
          </SortableContext>
        </DndContext>
      </nav>
    </aside>
  );
}
