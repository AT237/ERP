import React from "react";
import { ProformaInvoiceLineItemFormLayout } from '@/components/layouts/ProformaInvoiceLineItemFormLayout';

interface ProformaInvoiceLineItemFormProps {
  onSave: () => void;
  proformaInvoiceId: string;
  itemId?: string;
}

export default function ProformaInvoiceLineItemForm({ onSave, proformaInvoiceId, itemId }: ProformaInvoiceLineItemFormProps) {
  return (
    <ProformaInvoiceLineItemFormLayout 
      onSave={onSave} 
      proformaInvoiceId={proformaInvoiceId} 
      lineItemId={itemId}
    />
  );
}
