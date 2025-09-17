import React from "react";
import { InventoryFormLayout } from '@/components/layouts/InventoryFormLayout';

interface InventoryFormProps {
  onSave: () => void;
  inventoryId?: string;
  parentId?: string;
}

export default function InventoryForm({ onSave, inventoryId, parentId }: InventoryFormProps) {
  return (
    <InventoryFormLayout onSave={onSave} inventoryId={inventoryId} parentId={parentId} />
  );
}