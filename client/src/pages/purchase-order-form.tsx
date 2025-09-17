import React from "react";
import { PurchaseOrderFormLayout } from '@/components/layouts/PurchaseOrderFormLayout';

interface PurchaseOrderFormProps {
  onSave: () => void;
  purchaseOrderId?: string;
  parentId?: string;
}

export default function PurchaseOrderForm({ onSave, purchaseOrderId, parentId }: PurchaseOrderFormProps) {
  return (
    <PurchaseOrderFormLayout onSave={onSave} purchaseOrderId={purchaseOrderId} parentId={parentId} />
  );
}