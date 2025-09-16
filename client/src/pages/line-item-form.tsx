import React from "react";
import { LineItemFormLayout } from '@/components/layouts/LineItemFormLayout';

interface LineItemFormProps {
  onSave: () => void;
  quotationId: string;
  itemId?: string;
}

export default function LineItemForm({ onSave, quotationId, itemId }: LineItemFormProps) {
  return (
    <LineItemFormLayout 
      onSave={onSave} 
      quotationId={quotationId} 
      lineItemId={itemId}
    />
  );
}