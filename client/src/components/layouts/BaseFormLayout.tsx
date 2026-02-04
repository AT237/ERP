import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// InfoHeaderLayout removed per user request
import { FormTabLayout, type FormTab } from './FormTabLayout';
import { useIsMobile } from "@/hooks/use-mobile";
import { useLayoutEditor } from "@/contexts/LayoutEditorContext";

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
  // Header info fields removed per user request
  // headerFields: InfoField[];
  
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
  actionButtons,
  tabs,
  activeTab,
  onTabChange,
  isLoading = false
}: BaseFormLayoutProps) {
  const { isEditorMode, toggleEditorMode } = useLayoutEditor();
  const isMobile = useIsMobile();
  
  // Show skeleton instead of loading spinner to prevent flicker
  if (isLoading) {
    return (
      <div className={isMobile ? "p-2" : "p-6"}>
        <div className="space-y-4">
          {/* Header Skeleton - maintains exact layout structure */}
          <div className="relative p-2 h-16">
            {/* Header skeleton removed per user request */}
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 h-10 w-80 animate-pulse"></div>
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
        {/* Header with Info Fields and Action Buttons */}
        <div className={`relative pt-2 pb-0 ${isMobile ? 'px-0' : 'px-4'}`}>
          {/* Info Header removed per user request */}
          
          {/* Action Buttons */}
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
            
            {/* Spacer to push settings to the right */}
            <div className="flex-1" />
            
            {/* Layout Editor Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 ${isEditorMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Layout Editor</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleEditorMode} className="cursor-pointer">
                  <span className={`mr-2 ${isEditorMode ? 'text-blue-600 font-medium' : ''}`}>
                    {isEditorMode ? '✓' : '○'} Editor Mode
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Layout Rules</DropdownMenuLabel>
                <DropdownMenuItem disabled className="text-xs">
                  Positions 1-6 → left column
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs">
                  Positions 7-12 → right column
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-xs">
                  Textarea fields → right column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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