import { useState } from 'react';
import { FieldErrors } from 'react-hook-form';

export interface ValidationError {
  field: string;
  label: string;
  message: string;
  section?: string;
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

export function useValidationErrors(
  fieldLabelMap?: Record<string, { label: string; section?: string }>
) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const onInvalid = (fieldErrors: FieldErrors) => {
    const errorList: ValidationError[] = [];
    for (const [field, error] of Object.entries(fieldErrors)) {
      const info = fieldLabelMap?.[field];
      errorList.push({
        field,
        label: info?.label || humanizeFieldName(field),
        message: (error as any)?.message || 'Dit veld is verplicht',
        section: info?.section,
      });
    }
    setErrors(errorList);
    setDialogOpen(true);
  };

  const handleShowFields = (
    setActiveTab?: (tab: string) => void,
    setActiveSection?: (section: string) => void
  ) => {
    if (errors.length > 0) {
      const firstError = errors[0];
      if (firstError.section) {
        setActiveTab?.(firstError.section);
        setActiveSection?.(firstError.section);
      }
      setTimeout(() => {
        const sel = [
          `[name="${firstError.field}"]`,
          `[data-testid*="${firstError.field}"]`,
          `[id="${firstError.field}"]`,
        ].join(', ');
        const el = document.querySelector(sel) as HTMLElement;
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    setDialogOpen(false);
  };

  return { dialogOpen, setDialogOpen, errors, onInvalid, handleShowFields };
}
