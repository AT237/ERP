import React from "react";
import { QuotationFormLayout } from '@/components/layouts/QuotationFormLayout';

interface QuotationFormProps {
  onSave: () => void;
  quotationId?: string;
}

export default function QuotationForm({ onSave, quotationId }: QuotationFormProps) {
  return (
    <QuotationFormLayout onSave={onSave} quotationId={quotationId} />
  );
}