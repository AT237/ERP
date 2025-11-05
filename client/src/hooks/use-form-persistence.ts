import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseFormPersistenceOptions {
  storageKey: string;
  excludeFields?: string[];
  onRestore?: () => void;
}

export function useFormPersistence<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  options: UseFormPersistenceOptions
) {
  const { storageKey, excludeFields = [], onRestore } = options;
  const isRestoredRef = useRef(false);

  // Restore form data from localStorage on mount
  useEffect(() => {
    if (isRestoredRef.current) return;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Filter out excluded fields
        const dataToRestore = Object.keys(parsedData).reduce((acc, key) => {
          if (!excludeFields.includes(key)) {
            acc[key] = parsedData[key];
          }
          return acc;
        }, {} as any);

        // Reset form with saved data
        form.reset(dataToRestore, { keepDefaultValues: false });
        isRestoredRef.current = true;
        
        if (onRestore) {
          onRestore();
        }
      }
    } catch (error) {
      console.error('Failed to restore form data:', error);
    }
  }, [storageKey, form, excludeFields, onRestore]);

  // Save form data to localStorage on every change
  useEffect(() => {
    const subscription = form.watch((formData) => {
      try {
        // Filter out excluded fields before saving
        const dataToSave = Object.keys(formData).reduce((acc, key) => {
          if (!excludeFields.includes(key) && formData[key] !== undefined) {
            acc[key] = formData[key];
          }
          return acc;
        }, {} as any);

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Failed to save form data:', error);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, storageKey, excludeFields]);

  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear saved form data:', error);
    }
  };

  return { clearSavedData };
}
