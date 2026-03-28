import { PackingListItemFormLayout } from '@/components/layouts/PackingListItemFormLayout';

interface PackingListItemFormProps {
  onSave: () => void;
  packingListId: string;
  itemId?: string;
}

export default function PackingListItemForm({ onSave, packingListId, itemId }: PackingListItemFormProps) {
  return (
    <PackingListItemFormLayout 
      onSave={onSave} 
      packingListId={packingListId} 
      lineItemId={itemId}
    />
  );
}
