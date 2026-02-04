import { createContext, useContext, useState, ReactNode } from 'react';

interface LayoutEditorContextType {
  isEditorMode: boolean;
  setEditorMode: (enabled: boolean) => void;
  toggleEditorMode: () => void;
}

const LayoutEditorContext = createContext<LayoutEditorContextType | undefined>(undefined);

export function LayoutEditorProvider({ children }: { children: ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(false);

  const setEditorMode = (enabled: boolean) => {
    setIsEditorMode(enabled);
  };

  const toggleEditorMode = () => {
    setIsEditorMode(prev => !prev);
  };

  return (
    <LayoutEditorContext.Provider value={{ isEditorMode, setEditorMode, toggleEditorMode }}>
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
