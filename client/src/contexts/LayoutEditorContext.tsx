import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface FieldOverride {
  isRequired?: boolean;
  position?: number;
}

interface LayoutEditorContextType {
  isEditorMode: boolean;
  setEditorMode: (enabled: boolean) => void;
  toggleEditorMode: () => void;
  fieldOverrides: Record<string, FieldOverride>;
  toggleFieldRequired: (fieldKey: string, currentRequired: boolean) => void;
  setFieldPosition: (fieldKey: string, position: number) => void;
  getFieldOverride: (fieldKey: string) => FieldOverride | undefined;
  clearOverrides: () => void;
}

const LayoutEditorContext = createContext<LayoutEditorContextType | undefined>(undefined);

export function LayoutEditorProvider({ children }: { children: ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, FieldOverride>>({});

  const setEditorMode = (enabled: boolean) => {
    setIsEditorMode(enabled);
  };

  const toggleEditorMode = () => {
    setIsEditorMode(prev => !prev);
  };

  const toggleFieldRequired = useCallback((fieldKey: string, currentRequired: boolean) => {
    setFieldOverrides(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        isRequired: !currentRequired
      }
    }));
  }, []);

  const setFieldPosition = useCallback((fieldKey: string, position: number) => {
    setFieldOverrides(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        position
      }
    }));
  }, []);

  const getFieldOverride = useCallback((fieldKey: string) => {
    return fieldOverrides[fieldKey];
  }, [fieldOverrides]);

  const clearOverrides = useCallback(() => {
    setFieldOverrides({});
  }, []);

  return (
    <LayoutEditorContext.Provider value={{ 
      isEditorMode, 
      setEditorMode, 
      toggleEditorMode,
      fieldOverrides,
      toggleFieldRequired,
      setFieldPosition,
      getFieldOverride,
      clearOverrides
    }}>
      {children}
    </LayoutEditorContext.Provider>
  );
}

export function useLayoutEditor() {
  const context = useContext(LayoutEditorContext);
  if (context === undefined) {
    throw new Error('useLayoutEditor must be used within a LayoutEditorProvider');
  }
  return context;
}
