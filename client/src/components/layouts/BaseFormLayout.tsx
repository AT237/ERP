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
      <div className="w-full">
        <div className="w-full bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-1 h-10 animate-pulse" />
        <div className={isMobile ? "p-2" : "p-6"}>
          <Card className="border-0 shadow-none">
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
    <div className="w-full">
      {/* Standard Toolbar - Full Width */}
      {toolbar ? (
        <FormToolbar {...toolbar} />
      ) : actionButtons && actionButtons.length > 0 ? (
        <div className="w-full bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-1 flex items-center gap-1">
          {actionButtons.map((button) => (
            <Button
              key={button.key}
              variant="ghost"
              size="sm"
              onClick={button.onClick}
              disabled={button.disabled || button.loading}
              className="h-8 px-2"
              data-testid={button.testId || `button-${button.key}`}
            >
              {button.loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                button.icon && <span>{button.icon}</span>
              )}
              {!button.icon && button.label}
            </Button>
          ))}
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className={isMobile ? "p-2" : "p-6"}>
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