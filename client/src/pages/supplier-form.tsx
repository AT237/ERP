import React from "react";
import { SupplierFormLayout } from '@/components/layouts/SupplierFormLayout';

interface SupplierFormProps {
  onSave: () => void;
  supplierId?: string;
  parentId?: string;
}

export default function SupplierForm({ onSave, supplierId, parentId }: SupplierFormProps) {
  return (
    <SupplierFormLayout onSave={onSave} supplierId={supplierId} parentId={parentId} />
  );
}