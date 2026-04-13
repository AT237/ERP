import { ContractItemFormLayout } from '@/components/layouts/ContractItemFormLayout';

interface ContractItemFormProps {
  onSave: () => void;
  contractId: string;
  itemId?: string;
}

export default function ContractItemForm({ onSave, contractId, itemId }: ContractItemFormProps) {
  return (
    <ContractItemFormLayout
      onSave={onSave}
      contractId={contractId}
      itemId={itemId}
    />
  );
}
