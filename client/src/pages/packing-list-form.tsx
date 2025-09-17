import React from "react";
import { PackingListFormLayout } from '@/components/layouts/PackingListFormLayout';

interface PackingListFormProps {
  onSave: () => void;
  packingListId?: string;
  parentId?: string;
}

export default function PackingListForm({ onSave, packingListId, parentId }: PackingListFormProps) {
  return (
    <PackingListFormLayout onSave={onSave} packingListId={packingListId} parentId={parentId} />
  );
}