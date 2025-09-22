import { useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
// InfoField import removed per user request
import type { FormTab } from './FormTabLayout';
import { UseFormReturn, FieldValues, FieldPath } from 'react-hook-form';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Layout options for form fields
 */
export type FieldLayout = 
  | 'single'      // Single field taking full width
  | 'two-column'  // Two fields side by side  
  | 'three-column' // Three columns: [30%_130px_30%] like in CustomerFormLayout
  | 'custom';     // Custom layout with custom component

/**
 * Field validation state for visual feedback
 */
export interface FieldValidation {
  error?: string;
  warning?: string;
  isRequired?: boolean;
  dynamicallyRequired?: boolean; // For conditionally required fields (like BTW based on country)
}

/**
 * Configuration for form field appearance and behavior
 */
export interface FormField2<T extends FieldValues = FieldValues> {
  // Basic field properties
  key: FieldPath<T>;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'custom' | 'display';
  
  // Layout and positioning
  layout?: FieldLayout;
  width?: string; // CSS width (e.g., '30%', '200px')
  labelWidth?: string; // Override default label width
  
  // Input properties
  placeholder?: string;
  maxLength?: number;
  rows?: number; // For textarea
  disabled?: boolean;
  
  // Select options
  options?: Array<{ value: string; label: string }>;
  
  // Custom component
  customComponent?: ReactNode;
  
  // Display field (read-only)
  displayValue?: string | ReactNode;
  displayClassName?: string;
  
  // Form integration
  register?: any; // react-hook-form register
  setValue?: (value: any) => void;
  watch?: () => any;
  validation?: FieldValidation;
  
  // Change tracking
  isModified?: boolean;
  
  // Test IDs
  testId?: string;
  
  // Additional styling
  className?: string;
  wrapperClassName?: string;
}

/**
 * A row can contain multiple fields for complex layouts
 */
export interface FormRow<T extends FieldValues = FieldValues> {
  type: 'field' | 'fields' | 'section-header' | 'custom' | 'two-column';
  
  // Single field
  field?: FormField2<T>;
  
  // Multiple fields in same row
  fields?: FormField2<T>[];
  
  // Two-column layout
  leftColumn?: FormField2<T>[];
  rightColumn?: FormField2<T>[];
  
  // Section header
  sectionTitle?: string;
  sectionTitleClassName?: string;
  
  // Custom content
  customContent?: ReactNode;
  
  // Row styling
  className?: string;
}

/**
 * Form section with rows
 */
export interface FormSection2<T extends FieldValues = FieldValues> {
  id: string;
  label: string;
  icon?: ReactNode;
  rows: FormRow<T>[];
}

/**
 * Change tracking configuration
 */
export interface ChangeTrackingConfig {
  enabled: boolean;
  suppressTracking?: boolean;
  modifiedFieldClassName?: string;
  onChangesDetected?: (hasChanges: boolean, modifiedFields: Set<string>) => void;
}

/**
 * Main props for LayoutForm2 component
 */
export interface LayoutForm2Props<T extends FieldValues = FieldValues> {
  // Form sections (tabs)
  sections: FormSection2<T>[];
  
  // Active tab management
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  
  // Form integration
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  
  // Action buttons
  actionButtons: ActionButton[];
  
  // Header fields removed per user request
  // headerFields?: InfoField[];
  
  // Change tracking (optional)
  changeTracking?: ChangeTrackingConfig;
  
  // Original form values for change tracking
  originalValues?: Partial<T>;
  
  // Loading state
  isLoading?: boolean;
  
  // Styling
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get CSS class for field based on its validation and modification status
 */
function getFieldClassName(
  field: FormField2,
  changeTracking?: ChangeTrackingConfig,
  baseClassName: string = ""
): string {
  let className = baseClassName;
  
  // Add modified field styling if change tracking is enabled
  if (changeTracking?.enabled && !changeTracking?.suppressTracking && field.isModified) {
    const modifiedClass = changeTracking.modifiedFieldClassName || 
      'ring-2 ring-orange-400 border-orange-400 bg-orange-50 dark:bg-orange-950';
    className = `${className} ${modifiedClass}`;
  }
  
  // Add validation styling
  if (field.validation?.dynamicallyRequired) {
    className = `${className} border-orange-300 focus:border-orange-500`;
  }
  
  // Add custom className
  if (field.className) {
    className = `${className} ${field.className}`;
  }
  
  return className.trim();
}

/**
 * Render a form field based on its configuration
 */
function renderField<T extends FieldValues>(
  field: FormField2<T>, 
  changeTracking?: ChangeTrackingConfig
): ReactNode {
  const className = getFieldClassName(field as FormField2<FieldValues>, changeTracking);
  
  const baseProps = {
    id: field.key as string,
    placeholder: field.placeholder,
    disabled: field.disabled,
    maxLength: field.maxLength,
    'data-testid': field.testId || `input-${field.key}`,
    className,
  };

  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'number':
      return (
        <Input
          {...baseProps}
          type={field.type}
          {...(field.register || {})}
        />
      );
    
    case 'textarea':
      return (
        <Textarea
          {...baseProps}
          rows={field.rows || 3}
          {...(field.register || {})}
        />
      );
    
    case 'select':
      return (
        <Select 
          onValueChange={field.setValue}
          value={field.watch?.() || ""}
        >
          <SelectTrigger className={className} data-testid={field.testId || `select-${field.key}`}>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case 'display':
      return (
        <div className={`p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md ${field.displayClassName || ''}`}>
          <div className="text-sm text-gray-600 dark:text-gray-400" data-testid={field.testId || `text-${field.key}`}>
            {field.displayValue}
          </div>
        </div>
      );
    
    case 'custom':
      return field.customComponent;
    
    default:
      return null;
  }
}

/**
 * Render validation messages for a field
 */
function renderFieldValidation(field: FormField2): ReactNode {
  if (field.validation?.error) {
    return (
      <p className="text-sm text-red-600 mt-1">
        {field.validation.error}
      </p>
    );
  }
  
  if (field.validation?.warning) {
    return (
      <p className="text-sm text-orange-600 mt-1">
        {field.validation.warning}
      </p>
    );
  }
  
  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * LayoutForm2 - A beautiful, reusable form layout component
 * 
 * Captures all the visual beauty from CustomerFormLayout while being completely configurable.
 * Features the same two-column grid structure, tab system, and styling patterns.
 */
export function LayoutForm2<T extends FieldValues = FieldValues>({
  sections,
  activeSection,
  onSectionChange,
  form,
  onSubmit,
  actionButtons,
  // headerFields removed per user request
  changeTracking,
  originalValues,
  isLoading = false,
  className = ""
}: LayoutForm2Props<T>) {

  // ========================================================================
  // CHANGE TRACKING LOGIC
  // ========================================================================
  
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  
  /**
   * Compare values for change detection
   */
  const compareValues = useCallback((original: any, current: any): boolean => {
    if (typeof original !== typeof current) return false;
    if (original === null || current === null) return original === current;
    return String(original).trim() === String(current).trim();
  }, []);

  /**
   * Check for changes and update tracking state
   */
  const checkForChanges = useCallback(() => {
    if (!changeTracking?.enabled || !originalValues) return false;
    
    const currentValues = form.getValues();
    const modifiedFieldsSet = new Set<string>();
    let hasChanges = false;

    // Compare each field with original values
    Object.keys(originalValues).forEach(fieldName => {
      const originalValue = originalValues[fieldName as keyof T];
      const currentValue = currentValues[fieldName as FieldPath<T>];
      
      if (!compareValues(originalValue, currentValue)) {
        modifiedFieldsSet.add(fieldName);
        hasChanges = true;
      }
    });

    setModifiedFields(modifiedFieldsSet);
    changeTracking.onChangesDetected?.(hasChanges, modifiedFieldsSet);
    
    return hasChanges;
  }, [changeTracking, originalValues, form, compareValues]);

  // Set up change tracking watchers
  useEffect(() => {
    if (!changeTracking?.enabled || changeTracking.suppressTracking) return;
    
    const subscription = form.watch(() => {
      // Debounce change checking
      const timeout = setTimeout(() => {
        checkForChanges();
      }, 200);
      
      return () => clearTimeout(timeout);
    });

    return () => subscription.unsubscribe();
  }, [form, checkForChanges, changeTracking]);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  
  /**
   * Render a single row with proper layout
   */
  const renderRow = useCallback((row: FormRow<T>, rowIndex: number): ReactNode => {
    switch (row.type) {
      case 'section-header':
        // Section headers removed - tab titles provide sufficient context
        return null;
      
      case 'custom':
        return (
          <div key={`custom-${rowIndex}`} className={row.className}>
            {row.customContent}
          </div>
        );
      
      case 'field':
        if (!row.field) return null;
        
        const field = {
          ...row.field,
          isModified: modifiedFields.has(row.field.key as string)
        };
        
        return (
          <div key={field.key as string} className={`flex items-center gap-6 w-full max-w-[540px] ${row.className || ''}`}>
            <Label 
              htmlFor={field.key as string} 
              className="text-sm font-medium text-right w-[130px] shrink-0"
            >
              {field.label}
              {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
            </Label>
            <div className={`w-[380px] ${field.wrapperClassName || ''}`}>
              {renderField(field, changeTracking)}
              {renderFieldValidation(field)}
            </div>
          </div>
        );
      
      case 'fields':
        if (!row.fields || row.fields.length === 0) return null;
        
        // Handle multi-field layouts (like the three-column layout in CustomerFormLayout)
        return (
          <div key={`fields-${rowIndex}`} className={`flex items-center gap-6 w-full max-w-[540px] ${row.className || ''}`}>
            {/* First field's label */}
            <Label 
              htmlFor={row.fields[0].key as string} 
              className="text-sm font-medium text-right w-[130px] shrink-0"
            >
              {row.fields[0].label}
              {(row.fields[0].validation?.isRequired || row.fields[0].validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
            </Label>
            
            {/* Multi-column field layout with individual containers */}
            <div className="w-[380px] flex gap-16 items-center">
              {row.fields.map((field, fieldIndex) => {
                const fieldWithModified = {
                  ...field,
                  isModified: modifiedFields.has(field.key as string)
                };
                
                if (fieldIndex === 0) {
                  // First field (no label, already rendered above)
                  return (
                    <div key={field.key as string} className={`flex-1 ${field.wrapperClassName || ''}`}>
                      {renderField(fieldWithModified, changeTracking)}
                      {renderFieldValidation(fieldWithModified)}
                    </div>
                  );
                } else {
                  // All other fields with label to the left
                  return (
                    <div key={field.key as string} className="flex items-center gap-6">
                      <Label 
                        htmlFor={field.key as string} 
                        className="text-sm font-medium text-right w-[130px] shrink-0"
                      >
                        {field.label}
                        {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
                      </Label>
                      <div className={`flex-1 ${field.wrapperClassName || ''}`}>
                        {renderField(fieldWithModified, changeTracking)}
                        {renderFieldValidation(fieldWithModified)}
                      </div>
                    </div>
                  );
                }
              })}
              
              {/* Fill empty cells if odd number of fields */}
              {row.fields.length % 2 === 1 && row.fields.length > 1 && (
                <div></div>
              )}
            </div>
            
            {/* Additional fields beyond the first 3 */}
            {row.fields.slice(3).map((field) => {
              const fieldWithModified = {
                ...field,
                isModified: modifiedFields.has(field.key as string)
              };
              
              return (
                <div key={field.key as string} className="flex items-center gap-6 w-full max-w-[540px] mt-1">
                  <Label 
                    htmlFor={field.key as string} 
                    className="text-sm font-medium text-right w-[130px] shrink-0"
                  >
                    {field.label}
                    {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
                  </Label>
                  <div className={`w-[380px] ${field.wrapperClassName || ''}`}>
                    {renderField(fieldWithModified, changeTracking)}
                    {renderFieldValidation(fieldWithModified)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      
      case 'two-column':
        const leftFields = row.leftColumn || [];
        const rightFields = row.rightColumn || [];
        
        return (
          <div key={`two-column-${rowIndex}`} className={`flex gap-8 ${row.className || ''}`}>
            {/* Left Column */}
            <div className="space-y-[6px]">
              {leftFields.map((field) => {
                const fieldWithModified = {
                  ...field,
                  isModified: modifiedFields.has(field.key as string)
                };
                
                return (
                  <div key={field.key as string} className="flex items-center gap-6 w-full max-w-[540px]">
                    <Label 
                      htmlFor={field.key as string} 
                      className="text-sm font-medium text-right w-[130px] shrink-0"
                    >
                      {field.label}
                      {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
                    </Label>
                    <div className={`w-[380px] ${field.wrapperClassName || ''}`}>
                      {renderField(fieldWithModified, changeTracking)}
                      {renderFieldValidation(fieldWithModified)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Right Column */}
            <div className="space-y-[6px]">
              {rightFields.map((field) => {
                const fieldWithModified = {
                  ...field,
                  isModified: modifiedFields.has(field.key as string)
                };
                
                return (
                  <div key={field.key as string} className="flex items-center gap-6 w-full max-w-[540px]">
                    <Label 
                      htmlFor={field.key as string} 
                      className="text-sm font-medium text-right w-[130px] shrink-0"
                    >
                      {field.label}
                      {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
                    </Label>
                    <div className={`w-[380px] ${field.wrapperClassName || ''}`}>
                      {renderField(fieldWithModified, changeTracking)}
                      {renderFieldValidation(fieldWithModified)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }, [modifiedFields, changeTracking, renderField, renderFieldValidation]);

  // ========================================================================
  // CREATE TABS
  // ========================================================================
  
  const tabs: FormTab[] = useMemo(() => {
    return sections.map(section => ({
      id: section.id,
      label: section.label,
      content: (
        <div className="space-y-[6px]">
          {section.rows.map((row, rowIndex) => renderRow(row, rowIndex))}
        </div>
      )
    }));
  }, [sections, renderRow]);

  // ========================================================================
  // RENDER
  // ========================================================================
  
  return (
    <div className={`layout-form2 ${className}`}>
      <BaseFormLayout
        actionButtons={actionButtons}
        tabs={tabs}
        activeTab={activeSection}
        onTabChange={onSectionChange}
        isLoading={isLoading}
      />
    </div>
  );
}

// ============================================================================
// CONVENIENCE HELPERS
// ============================================================================

/**
 * Helper function to create a simple field row
 */
export function createFieldRow<T extends FieldValues>(
  field: FormField2<T>, 
  className?: string
): FormRow<T> {
  return {
    type: 'field',
    field,
    className
  };
}

/**
 * Helper function to create a multi-field row (for three-column layouts)
 */
export function createFieldsRow<T extends FieldValues>(
  fields: FormField2<T>[], 
  className?: string
): FormRow<T> {
  return {
    type: 'fields',
    fields,
    className
  };
}

/**
 * Helper function to create a section header row
 */
export function createSectionHeaderRow<T extends FieldValues>(
  title: string, 
  className?: string,
  titleClassName?: string
): FormRow<T> {
  return {
    type: 'section-header',
    sectionTitle: title,
    className,
    sectionTitleClassName: titleClassName
  };
}

/**
 * Helper function to create a two-column layout row
 */
export function createTwoColumnRow<T extends FieldValues>(
  leftColumn: FormField2<T>[], 
  rightColumn: FormField2<T>[],
  className?: string
): FormRow<T> {
  return {
    type: 'two-column',
    leftColumn,
    rightColumn,
    className
  };
}

/**
 * Helper function to create a custom content row
 */
export function createCustomRow<T extends FieldValues>(
  content: ReactNode, 
  className?: string
): FormRow<T> {
  return {
    type: 'custom',
    customContent: content,
    className
  };
}