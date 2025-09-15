import React from "react";
import { CustomerFormLayout } from '@/components/layouts/CustomerFormLayout';

interface CustomerFormProps {
  onSave: () => void;
  customerId?: string;
  parentId?: string;
}

export default function CustomerForm({ onSave, customerId, parentId }: CustomerFormProps) {
  return (
    <CustomerFormLayout onSave={onSave} customerId={customerId} parentId={parentId} />
  );
}