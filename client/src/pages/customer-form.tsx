import React from "react";
import { CustomerFormLayout } from '@/components/layouts/CustomerFormLayout';

interface CustomerFormProps {
  onSave: () => void;
  customerId?: string;
}

export default function CustomerForm({ onSave, customerId }: CustomerFormProps) {
  return (
    <CustomerFormLayout onSave={onSave} customerId={customerId} />
  );
}