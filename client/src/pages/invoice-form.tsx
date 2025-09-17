import React from "react";
import { InvoiceFormLayout } from "@/components/layouts/InvoiceFormLayout";

interface InvoiceFormProps {
  onSave: () => void;
  invoiceId?: string;
  parentId?: string;
}

export default function InvoiceForm({ onSave, invoiceId, parentId }: InvoiceFormProps) {
  return (
    <InvoiceFormLayout 
      onSave={onSave}
      invoiceId={invoiceId}
      parentId={parentId}
    />
  );
}