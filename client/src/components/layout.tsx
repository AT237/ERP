import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Sidebar from "./sidebar";
import Header from "./header";
import SectionInfoPanel from "./section-info-panel";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";

interface LayoutProps {
  children: React.ReactNode;
}

interface Tab {
  id: string;
  name: string;
  type: 'section' | 'page' | 'menu';
  menuRoute?: string;
  content?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'dashboard', name: 'Dashboard', type: 'page', content: children }
  ]);
  const [activeTabId, setActiveTabId] = useState('dashboard');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.id === section.id);
    
    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(section.id);
    } else {
      // Create new tab
      const newTab: Tab = {
        id: section.id,
        name: section.name,
        type: 'section'
      };
      
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTabId(section.id);
    }
  };

  const handleMenuClick = (menuItem: {id: string, name: string, route?: string}) => {
    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.id === menuItem.id);
    
    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(menuItem.id);
    } else {
      // Create new tab for menu item
      const newTab: Tab = {
        id: menuItem.id,
        name: menuItem.name,
        type: 'menu',
        menuRoute: menuItem.route
      };
      
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTabId(menuItem.id);
    }
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
  }, [tabs.length, motivationalMessages.length]);

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
      return (
        <div className="p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground">{activeTab.name}</h1>
            <p className="text-muted-foreground">Manage your {activeTab.name.toLowerCase()} here.</p>
          </div>
          <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Content for {activeTab.name} will be implemented here.</p>
            {activeTab.menuRoute && (
              <p className="text-sm text-muted-foreground mt-2">Route: {activeTab.menuRoute}</p>
            )}
          </div>
        </div>
      );
    }
    
    return children; // dashboard content
  };

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
            {formatDate(currentTime)}
          </div>
          <div className="text-sm font-mono text-muted-foreground" data-testid="current-time">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onSectionClick={handleSectionClick} onMenuClick={handleMenuClick} />
        
        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar - Now at the very top of right area */}
          <div className="bg-gray-50 border-b border-border px-4 py-1">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-1 px-3 py-1 rounded-t-lg border-b-2 transition-colors cursor-pointer min-w-0 font-sans ${
                    activeTabId === tab.id
                      ? 'bg-white border-orange-500 text-orange-600'
                      : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
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
                    className="p-0.5 hover:bg-gray-300 rounded-full transition-colors"
                    data-testid={`close-tab-${tab.id}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <main className="flex-1 flex flex-col overflow-hidden">
            <Header activeTab={tabs.find(tab => tab.id === activeTabId)} />
            
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