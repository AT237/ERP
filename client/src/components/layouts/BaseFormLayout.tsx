import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InfoHeaderLayout, type InfoField } from './InfoHeaderLayout';
import { FormTabLayout, type FormTab } from './FormTabLayout';

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
  // Header info fields (like quotation number, status, etc)
  headerFields: InfoField[];
  
  // Action buttons (Cancel, Save, etc)
  actionButtons: ActionButton[];
  
  // Tab system
  tabs: FormTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  
  // Optional loading state
  isLoading?: boolean;
}

export function BaseFormLayout({
  headerFields,
  actionButtons,
  tabs,
  activeTab,
  onTabChange,
  isLoading = false
}: BaseFormLayoutProps) {
  // Show skeleton instead of loading spinner to prevent flicker
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {/* Header Skeleton - maintains exact layout structure */}
          <div className="relative p-2 h-16">
            <div className="absolute left-2 w-fit">
              <div className="flex items-center gap-6 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 h-12 w-64 animate-pulse"></div>
            </div>
            <div className="ml-[350px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 h-10 w-80 animate-pulse"></div>
          </div>

          {/* Content Skeleton */}
          <Card className="border-0 shadow-none ml-2">
            <CardContent className="p-0">
              <div className="bg-white px-4 border-b-0 h-[62px] flex items-end">
                <div className="flex items-end space-x-1">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg px-3 py-2 h-8 w-16 animate-pulse"></div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg px-3 py-2 h-8 w-20 animate-pulse"></div>
                </div>
              </div>
              <div className="border-2 border-orange-500 bg-white p-6 h-[400px] flex items-center justify-center">
                <div className="text-gray-400">Loading...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ minHeight: '100vh' }}>
      <div className="space-y-4">
        {/* Main Content Area - exact original structure with stable dimensions */}
        <Card className="border-0 shadow-none ml-2">
          <CardContent className="p-0">
            <FormTabLayout
              activeTab={activeTab}
              onTabChange={onTabChange}
              tabs={tabs}
            />
          </CardContent>
        </Card>

        {/* Actions Section - moved below the orange border */}
        <div className="ml-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
          {actionButtons.map((button) => (
            <Button
              key={button.key}
              variant={button.variant || 'outline'}
              size="sm"
              onClick={button.onClick}
              disabled={button.disabled || button.loading}
              className={`h-8 text-xs ${button.className || ''} ${
                button.variant === 'default' ? 'bg-green-600 text-white hover:bg-green-700' : ''
              }`}
              data-testid={button.testId || `button-${button.key}`}
            >
              {button.loading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
              ) : (
                button.icon && <span className="mr-1">{button.icon}</span>
              )}
              {button.loading ? 'Loading...' : button.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}