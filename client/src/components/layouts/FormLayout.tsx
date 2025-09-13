import React, { ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'custom';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  customComponent?: ReactNode;
  addButton?: {
    onClick: () => void;
    'data-testid'?: string;
  };
  register?: any; // react-hook-form register
  error?: string;
  setValue?: (value: string) => void;
  'data-testid'?: string;
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export interface FormLayoutProps {
  sections: FormSection[];
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitVariant?: 'default' | 'destructive';
}

export function FormLayout({
  sections,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitVariant = 'default'
}: FormLayoutProps) {
  
  const renderField = (field: FormField) => {
    const baseInputProps = {
      id: field.key,
      placeholder: field.placeholder,
      'data-testid': field['data-testid'] || `input-${field.key}`,
      className: "flex-1"
    };

    switch (field.type) {
      case 'select':
        return (
          <div className="flex gap-2 flex-1">
            <Select onValueChange={field.setValue}>
              <SelectTrigger 
                data-testid={field['data-testid'] || `select-${field.key}`} 
                className="flex-1"
              >
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
            {field.addButton && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={field.addButton.onClick}
                data-testid={field.addButton['data-testid']}
              >
                <Plus size={16} />
              </Button>
            )}
          </div>
        );
      
      case 'date':
        return (
          <Input
            {...baseInputProps}
            type="text"
            placeholder="DD-MM-YYYY"
            maxLength={10}
            onChange={(e) => {
              // Apply European date mask
              let value = e.target.value.replace(/\D/g, '');
              if (value.length >= 2) value = value.slice(0, 2) + '-' + value.slice(2);
              if (value.length >= 5) value = value.slice(0, 5) + '-' + value.slice(5, 9);
              e.target.value = value;
              // Call original onChange if it exists
              field.register?.onChange?.(e);
            }}
            {...(field.register || {})}
          />
        );
      
      case 'custom':
        return field.customComponent;
      
      default:
        return (
          <Input
            {...baseInputProps}
            type={field.type}
            {...(field.register || {})}
          />
        );
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-8">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-6">
          <h3 className="text-lg font-semibold text-orange-600 border-b border-orange-200 pb-2 w-full min-w-[300px]">
            {section.title}
          </h3>
          <div className="space-y-6">
            {section.fields.map((field) => (
              <div key={field.key} className="flex items-start gap-6">
                <Label 
                  htmlFor={field.key} 
                  className="w-36 text-left pt-2 font-medium"
                >
                  {field.label} {field.required && '*'}
                </Label>
                <div className="flex-1">
                  {renderField(field)}
                  {field.error && (
                    <p className="text-sm text-destructive mt-1">
                      {field.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Form Actions */}
      <div className="flex items-center justify-start space-x-4 pt-8 border-t mt-8">
        <Button
          type="submit"
          className={submitVariant === 'default' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          variant={submitVariant}
          disabled={isSubmitting}
          data-testid="button-form-submit"
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-form-cancel"
        >
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}