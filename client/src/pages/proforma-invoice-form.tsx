import React from "react";
import { ProformaInvoiceFormLayout } from "@/components/layouts/ProformaInvoiceFormLayout";

interface ProformaInvoiceFormProps {
  onSave: () => void;
  invoiceId?: string;
  parentId?: string;
}

export default function ProformaInvoiceForm({ onSave, invoiceId, parentId }: ProformaInvoiceFormProps) {
  return (
    <ProformaInvoiceFormLayout 
      onSave={onSave}
      invoiceId={invoiceId}
      parentId={parentId}
    />
  );
}
