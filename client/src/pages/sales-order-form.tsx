import React from "react";
import { SalesOrderFormLayout } from '@/components/layouts/SalesOrderFormLayout';

interface SalesOrderFormProps {
  onSave: () => void;
  salesOrderId?: string;
  parentId?: string;
}

export default function SalesOrderForm({ onSave, salesOrderId, parentId }: SalesOrderFormProps) {
  return (
    <SalesOrderFormLayout onSave={onSave} salesOrderId={salesOrderId} parentId={parentId} />
  );
}