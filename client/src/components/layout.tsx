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
  type: 'section' | 'page';
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

  const closeTab = (tabId: string) => {
    if (tabId === 'dashboard') return; // Don't allow closing dashboard
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to dashboard
      if (activeTabId === tabId) {
        setActiveTabId('dashboard');
      }
      
      return newTabs;
    });
  };

  const renderActiveTabContent = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    
    if (!activeTab) {
      return children; // fallback to dashboard
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
        <Sidebar onSectionClick={handleSectionClick} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          {/* Tab Bar */}
          <div className="bg-gray-50 border-b border-border px-4 py-2">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer min-w-0 ${
                    activeTabId === tab.id
                      ? 'bg-white border-orange-500 text-orange-600'
                      : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <span className="text-sm font-medium truncate max-w-32">{tab.name}</span>
                  {tab.id !== 'dashboard' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="p-1 hover:bg-gray-300 rounded-full transition-colors"
                      data-testid={`close-tab-${tab.id}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {renderActiveTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
}