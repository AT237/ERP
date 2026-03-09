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
  const mx = isMobile ? 'mx-0' : 'mx-4';

  return (
    <div className={className}>
      {/* Tab bar — sits above the orange frame, same horizontal width as the frame (mx-4) */}
      <div
        className={`sticky top-14 z-10 bg-white ${mx} ${isMobile ? 'h-[46px] px-1' : 'h-[40px] px-2'} flex items-end`}
      >
        <div className={`flex items-end ${isMobile ? 'space-x-0.5 w-full' : 'space-x-1'} overflow-x-auto`}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 ${isMobile ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-t-lg transition-colors cursor-pointer min-w-0 font-sans ${isMobile ? 'flex-1 justify-center' : ''} ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white border border-orange-500 border-b-0'
                  : 'bg-gray-100 border border-gray-300 border-b-0 text-gray-600 hover:bg-gray-200'
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

      {/* Orange frame — starts directly below the tab bar.
          All tab contents are rendered but inactive ones are hidden via CSS
          so that form field refs remain mounted and react-hook-form tracks
          all field values regardless of which tab is currently active. */}
      <div className={`border border-orange-500 bg-white ${isMobile ? 'p-2' : 'p-6'} rounded-lg ${mx}`}>
        {tabs.map((tab) => (
          <div key={tab.id} className={tab.id === activeTab ? '' : 'hidden'}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
