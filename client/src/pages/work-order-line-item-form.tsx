import React from "react";
import { WorkOrderLineItemFormLayout } from '@/components/layouts/WorkOrderLineItemFormLayout';

interface WorkOrderLineItemFormProps {
  onSave: () => void;
  workOrderId: string;
  lineItemId?: string;
}

export default function WorkOrderLineItemForm({ onSave, workOrderId, lineItemId }: WorkOrderLineItemFormProps) {
  return (
    <WorkOrderLineItemFormLayout
      onSave={onSave}
      workOrderId={workOrderId}
      lineItemId={lineItemId}
    />
  );
}
