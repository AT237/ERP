import { ComponentFormLayout } from '@/components/layouts/ComponentFormLayout';

interface ComponentFormProps {
  onSave: () => void;
  parentLineItemId: string;
  parentLineItemType: string;
  componentId?: string;
  contextPath?: string;
}

export default function ComponentForm({ onSave, parentLineItemId, parentLineItemType, componentId, contextPath }: ComponentFormProps) {
  return (
    <ComponentFormLayout
      onSave={onSave}
      parentLineItemId={parentLineItemId}
      parentLineItemType={parentLineItemType}
      componentId={componentId}
      contextPath={contextPath}
    />
  );
}
