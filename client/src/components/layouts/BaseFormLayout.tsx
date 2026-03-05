import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormTabLayout, type FormTab } from './FormTabLayout';
import { FormToolbar, type FormToolbarProps } from './FormToolbar';
import { useIsMobile } from "@/hooks/use-mobile";

export interface ActionButton {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
}

export interface BaseFormLayoutProps {
  // Legacy action buttons (for backwards compatibility)
  actionButtons?: ActionButton[];
  
  // New standard toolbar props
  toolbar?: FormToolbarProps;
  
  // Tab system
  tabs: FormTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  
  // Optional loading state
  isLoading?: boolean;
}

export function BaseFormLayout({
  actionButtons,
  toolbar,
  tabs,
  activeTab,
  onTabChange,
  isLoading = false
}: BaseFormLayoutProps) {
  const isMobile = useIsMobile();
  
  // Show skeleton instead of loading spinner to prevent flicker
  if (isLoading) {
    return (
      <div className={isMobile ? "p-2" : "p-6"}>
        <div className="space-y-4">
          <div className="relative p-2 h-16">
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 h-10 w-80 animate-pulse"></div>
          </div>
          <Card className="border-0 shadow-none ml-2">
            <CardContent className="p-0">
              <div className="bg-white px-4 border-b-0 h-[62px] flex items-end">
                <div className="flex items-end space-x-1">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg px-3 py-2 h-8 w-16 animate-pulse"></div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg px-3 py-2 h-8 w-20 animate-pulse"></div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-6 h-[400px] space-y-4">
                <div className="bg-gray-200 dark:bg-gray-800 h-6 w-3/4 rounded animate-pulse"></div>
                <div className="bg-gray-200 dark:bg-gray-800 h-4 w-1/2 rounded animate-pulse"></div>
                <div className="bg-gray-200 dark:bg-gray-800 h-4 w-2/3 rounded animate-pulse"></div>
                <div className="bg-gray-200 dark:bg-gray-800 h-4 w-1/3 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? "p-2" : "p-6"}>
      <div className="space-y-2">
        {/* Toolbar - sticky so it stays visible when scrolling */}
        <div className={`sticky top-0 z-20 bg-white pt-2 pb-2 ${isMobile ? 'px-0' : 'px-4'}`}>
          {toolbar ? (
            <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${isMobile ? 'px-2 py-1' : 'px-2 py-1'} flex items-center gap-1`}>
              <FormToolbar {...toolbar} />
            </div>
          ) : actionButtons && actionButtons.length > 0 ? (
            <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${isMobile ? 'px-2 py-2' : 'px-4 py-2'} flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
              {actionButtons.map((button) => (
                <Button
                  key={button.key}
                  variant={button.variant || 'outline'}
                  size="sm"
                  onClick={button.onClick}
                  disabled={button.disabled || button.loading}
                  className={`${isMobile ? 'h-9 text-sm flex-1 min-w-[80px]' : 'h-8 text-xs'} ${button.className || ''} ${
                    button.variant === 'default' ? 'bg-green-600 text-white hover:bg-green-700' : ''
                  }`}
                  data-testid={button.testId || `button-${button.key}`}
                >
                  {button.loading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                  ) : (
                    button.icon && <span className="mr-1">{button.icon}</span>
                  )}
                  {button.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Main Content Area */}
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <FormTabLayout
              activeTab={activeTab}
              onTabChange={onTabChange}
              tabs={tabs}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}