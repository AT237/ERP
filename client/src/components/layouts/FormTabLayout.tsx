import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";

export interface FormTab {
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
  const isMobile = useIsMobile();
  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={`-space-y-px ${className}`}>
      {/* Tab Bar - With white background */}
      <div className={`bg-white ${isMobile ? 'px-1' : 'px-4'} border-b-0 ${isMobile ? 'h-[50px]' : 'h-[62px]'} flex items-end`}>
        <div className={`flex items-end ${isMobile ? 'space-x-0.5' : 'space-x-1'} overflow-x-auto ${isMobile ? 'ml-0 w-full' : 'ml-2'}`}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${isMobile ? 'flex-1 justify-center' : ''} ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white relative z-10 border-2 border-orange-500 border-b-orange-500'
                  : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200 mb-[2px]'
              }`}
              onClick={() => onTabChange(tab.id)}
              data-testid={`form-tab-${tab.id}`}
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium truncate ${isMobile ? 'max-w-16' : 'max-w-32'}`}>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content - With orange border to connect with active tab */}
      <div className={`border border-orange-500 bg-white ${isMobile ? 'p-0' : 'p-6'} ${isMobile ? 'min-h-[300px]' : 'h-[400px]'} overflow-y-auto rounded-lg ${isMobile ? 'mx-0' : 'mx-4'}`}>
        {activeTabContent}
      </div>
    </div>
  );
}