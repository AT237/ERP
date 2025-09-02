import React from 'react';

interface FormTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface FormTabLayoutProps {
  tabs: FormTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function FormTabLayout({ tabs, activeTab, onTabChange, className = "" }: FormTabLayoutProps) {
  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`space-y-0 ${className}`}>
      {/* Tab Bar - With white background */}
      <div className="bg-white px-4 border-b-0 h-[62px] flex items-end">
        <div className="flex items-end space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-2 rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white relative z-10 border-2 border-orange-500 border-b-orange-500'
                  : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200 mb-[2px]'
              }`}
              onClick={() => onTabChange(tab.id)}
              data-testid={`form-tab-${tab.id}`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <span className="text-xs font-medium truncate max-w-32">{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content - With orange border to connect with active tab */}
      <div className="border-2 border-orange-500 bg-white p-6 h-[500px] overflow-y-auto rounded-b-lg rounded-tr-lg">
        {activeTabContent}
      </div>
    </div>
  );
}