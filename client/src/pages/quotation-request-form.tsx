import { QuotationRequestFormLayout } from '@/components/layouts/QuotationRequestFormLayout';

interface QuotationRequestFormProps {
  onSave: () => void;
  quotationRequestId?: string;
  parentId?: string;
}

export default function QuotationRequestForm({ onSave, quotationRequestId, parentId }: QuotationRequestFormProps) {
  return (
    <QuotationRequestFormLayout
      onSave={onSave}
      quotationRequestId={quotationRequestId}
      parentId={parentId}
    />
  );
}
