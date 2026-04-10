import { ContractFormLayout } from "@/components/layouts/ContractFormLayout";

interface ContractFormProps {
  onSave: () => void;
  contractId?: string;
  parentId?: string;
}

export default function ContractForm({ onSave, contractId, parentId }: ContractFormProps) {
  return (
    <ContractFormLayout
      onSave={onSave}
      contractId={contractId}
      parentId={parentId}
    />
  );
}
