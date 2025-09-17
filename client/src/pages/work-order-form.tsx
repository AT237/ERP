import React from "react";
import { WorkOrderFormLayout } from '@/components/layouts/WorkOrderFormLayout';

interface WorkOrderFormProps {
  onSave: () => void;
  workOrderId?: string;
  parentId?: string;
}

export default function WorkOrderForm({ onSave, workOrderId, parentId }: WorkOrderFormProps) {
  return (
    <WorkOrderFormLayout onSave={onSave} workOrderId={workOrderId} parentId={parentId} />
  );
}