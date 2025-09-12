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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {/* Header with Title and Controls - exact original quotation layout */}
        <div className="relative p-2">
          {/* Title Section */}
          <InfoHeaderLayout 
            fields={headerFields}
            className="absolute left-2 w-fit"
          />
          
          {/* Actions Section - starts at fixed coordinate like original quotation */}
          <div className="ml-[350px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
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

        {/* Main Content Area - exact original structure */}
        <Card className="border-0 shadow-none ml-2">
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