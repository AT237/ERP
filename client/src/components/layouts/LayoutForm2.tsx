import { useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { BaseFormLayout, type ActionButton } from './BaseFormLayout';
// InfoField import removed per user request
import type { FormTab } from './FormTabLayout';
import { UseFormReturn, FieldValues, FieldPath } from 'react-hook-form';
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useIsMobile } from "@/hooks/use-mobile";

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
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'custom' | 'display';
  
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
 * Form persistence configuration
 */
export interface FormPersistenceConfig {
  formType: string;        // e.g., 'customer', 'supplier', 'quotation'
  entityId?: string;       // Optional ID when editing an existing entity
  scope?: string;          // Optional scope for nested/modal forms
  disabled?: boolean;      // Disable persistence for this form
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
  
  // Info fields for header
  infoFields?: Array<{ label: string; value: string | ReactNode }>;
  
  // Change tracking (optional)
  changeTracking?: ChangeTrackingConfig;
  
  // Original form values for change tracking
  originalValues?: Partial<T>;
  
  // Form persistence (auto-save to localStorage)
  // Either provide persistence config (recommended) or a manual key (deprecated)
  persistence?: FormPersistenceConfig;
  formPersistenceKey?: string; // Deprecated: use persistence instead
  onFormPersistenceClear?: () => void; // Deprecated: clearing is now automatic
  
  // Loading state
  isLoading?: boolean;
  
  // Styling
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a standardized form persistence key
 */
export function buildFormPersistenceKey(config: FormPersistenceConfig): string {
  const { formType, entityId, scope } = config;
  const parts = ['erp-form', formType];
  
  if (scope) {
    parts.push(scope);
  }
  
  parts.push(entityId || 'new');
  
  return parts.join('-');
}

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
  const className = getFieldClassName(field as FormField2<FieldValues>, changeTracking, "w-full");
  
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
    
    case 'date':
      return (
        <DatePicker
          value={field.watch?.() || ""}
          onChange={(value) => field.setValue?.(value)}
          placeholder={field.placeholder || "dd-mm-yyyy"}
          disabled={field.disabled}
          className={className}
          testId={field.testId || `date-${field.key}`}
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
    
    case 'checkbox':
      return (
        <Checkbox
          id={field.key as string}
          checked={field.watch?.() ?? false}
          onCheckedChange={(checked) => field.setValue?.(checked === true)}
          disabled={field.disabled}
          data-testid={field.testId || `checkbox-${field.key}`}
        />
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
  infoFields,
  changeTracking,
  originalValues,
  persistence,
  formPersistenceKey, // Deprecated
  onFormPersistenceClear, // Deprecated
  isLoading = false,
  className = ""
}: LayoutForm2Props<T>) {

  // ========================================================================
  // MOBILE DETECTION
  // ========================================================================
  const isMobile = useIsMobile();

  // ========================================================================
  // FORM PERSISTENCE - AUTO-SAVE TO LOCALSTORAGE
  // ========================================================================
  
  // Generate persistence key automatically from config or use manual key (deprecated)
  const generatedKey = persistence && !persistence.disabled 
    ? buildFormPersistenceKey(persistence)
    : formPersistenceKey; // Fallback to deprecated manual key
  
  // Always call the hook to comply with React's rules of hooks
  // The hook itself will skip persistence logic if no valid key is provided
  const { clearSavedData } = useFormPersistence(form, {
    storageKey: generatedKey || '__no_persistence__'
  });
  
  // Store the clear function ref so we can call it after successful submit
  const clearSavedDataRef = useRef(clearSavedData);
  useEffect(() => {
    clearSavedDataRef.current = clearSavedData;
  }, [clearSavedData]);
  
  // Expose clearSavedData to parent via callback (deprecated - now automatic)
  useEffect(() => {
    if (onFormPersistenceClear && formPersistenceKey) {
      window.addEventListener(`clear-form-data-${formPersistenceKey}`, clearSavedData);
      return () => {
        window.removeEventListener(`clear-form-data-${formPersistenceKey}`, clearSavedData);
      };
    }
  }, [formPersistenceKey, clearSavedData, onFormPersistenceClear]);

  // ========================================================================
  // CHANGE TRACKING LOGIC
  // ========================================================================
  
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  
  /**
   * Compare values for change detection
   * Handles type conversions between string/number and null/undefined
   */
  const compareValues = useCallback((original: any, current: any): boolean => {
    // Both null/undefined are equal
    if ((original === null || original === undefined) && (current === null || current === undefined)) {
      return true;
    }
    // One is null/undefined but not the other
    if (original === null || original === undefined || current === null || current === undefined) {
      // Empty string equals null/undefined
      if (original === '' || current === '') {
        return (original === '' || original === null || original === undefined) && 
               (current === '' || current === null || current === undefined);
      }
      return false;
    }
    // Convert both to strings and compare (handles number/string conversions)
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
  // FIELD PAIR HELPER - UNIFIED GRID APPROACH  
  // ========================================================================
  
  const renderSimpleField = useCallback((field: FormField2<T>) => {
    const fieldWithModified = {
      ...field,
      isModified: modifiedFields.has(field.key as string)
    };

    // Checkbox layout: use same grid as other fields (130px label column + field column)
    // Checkbox aligns with input fields, label appears after checkbox
    if (field.type === 'checkbox') {
      if (isMobile) {
        return (
          <div key={field.key as string} className="flex items-center gap-2 pt-2">
            {renderField(fieldWithModified, changeTracking)}
            <Label 
              htmlFor={field.key as string} 
              className="text-sm font-medium cursor-pointer"
            >
              {field.label}
            </Label>
            {renderFieldValidation(fieldWithModified)}
          </div>
        );
      }
      // Desktop: use grid layout to align checkbox with other input fields
      return (
        <div key={field.key as string} className="grid grid-cols-[130px_1fr] items-start gap-3">
          <div></div>
          <div className="flex items-center gap-2 pt-2">
            {renderField(fieldWithModified, changeTracking)}
            <Label 
              htmlFor={field.key as string} 
              className="text-sm font-medium cursor-pointer"
            >
              {field.label}
            </Label>
            {renderFieldValidation(fieldWithModified)}
          </div>
        </div>
      );
    }

    // Mobile layout: label above field, full width
    if (isMobile) {
      return (
        <div key={field.key as string} className="space-y-1">
          <Label 
            htmlFor={field.key as string} 
            className="text-sm font-medium"
          >
            {field.label}
            {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
          </Label>
          <div className={field.wrapperClassName || ''}>
            {renderField(fieldWithModified, changeTracking)}
            {renderFieldValidation(fieldWithModified)}
          </div>
        </div>
      );
    }

    // Desktop layout: label beside field
    return (
      <div key={field.key as string} className="grid grid-cols-[130px_1fr] items-start gap-3">
        <Label 
          htmlFor={field.key as string} 
          className="text-sm font-medium text-right pt-2"
        >
          {field.label}
          {(field.validation?.isRequired || field.validation?.dynamicallyRequired) && <span className="text-red-600 ml-1">*</span>}
        </Label>
        <div className={field.wrapperClassName || ''}>
          {renderField(fieldWithModified, changeTracking)}
          {renderFieldValidation(fieldWithModified)}
        </div>
      </div>
    );
  }, [isMobile, modifiedFields, changeTracking, renderField, renderFieldValidation]);

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
        return (
          <div key={`field-${rowIndex}`} className="grid grid-cols-2 gap-8">
            {renderSimpleField(row.field)}
          </div>
        );
      
      case 'fields':
        if (!row.fields || row.fields.length === 0) return null;
        
        return (
          <div key={`fields-${rowIndex}`} className="grid grid-cols-2 gap-8">
            {row.fields.map((field) => renderSimpleField(field))}
          </div>
        );
      
      case 'two-column':
        const leftFields = row.leftColumn || [];
        const rightFields = row.rightColumn || [];
        const maxFields = Math.max(leftFields.length, rightFields.length);
        
        return (
          <div key={`two-column-${rowIndex}`} className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              {leftFields.map((field) => renderSimpleField(field))}
            </div>
            <div className="space-y-4">
              {rightFields.map((field) => renderSimpleField(field))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }, [modifiedFields, changeTracking, renderField, renderFieldValidation, renderSimpleField]);

  // ========================================================================
  // CREATE TABS
  // ========================================================================
  
  const tabs: FormTab[] = useMemo(() => {
    return sections.map(section => {
      // Verzamel alle velden uit alle rijen van deze sectie
      const allFields: FormField2<T>[] = [];
      
      // Check if this section uses explicit two-column layout
      const hasTwoColumnLayout = section.rows.some(row => row.type === 'two-column');
      
      if (hasTwoColumnLayout && !isMobile) {
        // Use explicit two-column layout
        const twoColRow = section.rows.find(row => row.type === 'two-column');
        const leftFields = twoColRow?.leftColumn || [];
        const rightFields = twoColRow?.rightColumn || [];
        
        return {
          id: section.id,
          label: section.label,
          content: (
            <div className="grid grid-cols-2 gap-8 pt-[10px]">
              <div className="flex flex-col gap-[20px]">
                {leftFields.map((field, idx) => (
                  <div key={field.key as string || idx}>
                    {renderSimpleField(field)}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-[20px]">
                {rightFields.map((field, idx) => (
                  <div key={field.key as string || idx}>
                    {renderSimpleField(field)}
                  </div>
                ))}
              </div>
            </div>
          )
        };
      }
      
      // Collect all fields for automatic layout
      section.rows.forEach(row => {
        if (row.type === 'field' && row.field) {
          allFields.push(row.field);
        } else if (row.type === 'fields' && row.fields) {
          allFields.push(...row.fields);
        } else if (row.type === 'two-column') {
          if (row.leftColumn) allFields.push(...row.leftColumn);
          if (row.rightColumn) allFields.push(...row.rightColumn);
        }
      });
      
      // STANDARD LAYOUT: Separate large fields (textarea, custom) to the right column
      // Small fields (text, number, select, date, checkbox) go to the left column
      const isLargeField = (field: FormField2<T>) => 
        field.type === 'textarea' || field.type === 'custom';
      
      const leftFields = allFields.filter(f => !isLargeField(f));
      const rightFields = allFields.filter(f => isLargeField(f));
      
      // If we have large fields, use two-column layout with large fields on right
      if (rightFields.length > 0 && !isMobile) {
        return {
          id: section.id,
          label: section.label,
          content: (
            <div className="grid grid-cols-2 gap-8 pt-[10px]">
              <div className="flex flex-col gap-[20px]">
                {leftFields.map((field, idx) => (
                  <div key={field.key as string || idx}>
                    {renderSimpleField(field)}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-[20px]">
                {rightFields.map((field, idx) => (
                  <div key={field.key as string || idx}>
                    {renderSimpleField(field)}
                  </div>
                ))}
              </div>
            </div>
          )
        };
      }
      
      // No large fields - use row-first distribution
      const numRows = Math.ceil(allFields.length / 2);
      const rows: Array<{left?: FormField2<T>, right?: FormField2<T>}> = [];
      for (let i = 0; i < numRows; i++) {
        rows.push({
          left: allFields[i * 2],
          right: allFields[i * 2 + 1]
        });
      }
      
      return {
        id: section.id,
        label: section.label,
        content: isMobile ? (
          // Mobile layout: single column, all fields stacked
          <div className="space-y-4 px-2 pt-2 pb-4">
            {allFields.map((field, idx) => (
              <div key={field.key as string || idx}>
                {renderSimpleField(field)}
              </div>
            ))}
          </div>
        ) : (
          // Desktop layout: 2-column grid with dynamic rows, gap-[20px] spacing
          <div className="flex flex-col gap-[20px] pt-[10px]">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-8">
                {row.left && renderSimpleField(row.left)}
                {row.right && renderSimpleField(row.right)}
              </div>
            ))}
          </div>
        )
      };
    });
  }, [sections, isMobile, renderSimpleField]);

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