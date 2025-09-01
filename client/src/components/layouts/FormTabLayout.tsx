import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return (
    <div className={`space-y-4 ${className}`}>
      <Tabs value={activeTab} onValueChange={onTabChange}>
        {/* Tab Navigation - Styled like main navigation */}
        <TabsList className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-auto tab-transition">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="
                relative px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200
                data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md
                data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-300
                data-[state=inactive]:hover:bg-gray-200 dark:data-[state=inactive]:hover:bg-gray-700
                min-w-[120px] text-center
              "
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content - With orange border and smooth transitions */}
        <div className="border-2 border-orange-200 dark:border-orange-700 rounded-lg bg-white dark:bg-gray-900 p-6 transition-smooth">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 transition-smooth">
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}