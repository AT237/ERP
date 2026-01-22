import React from "react";
import { InvoiceLineItemFormLayout } from '@/components/layouts/InvoiceLineItemFormLayout';

interface InvoiceLineItemFormProps {
  onSave: () => void;
  invoiceId: string;
  itemId?: string;
}

export default function InvoiceLineItemForm({ onSave, invoiceId, itemId }: InvoiceLineItemFormProps) {
  return (
    <InvoiceLineItemFormLayout 
      onSave={onSave} 
      invoiceId={invoiceId} 
      lineItemId={itemId}
    />
  );
}
