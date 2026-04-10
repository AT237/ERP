import { ProjectLineItemFormLayout } from '@/components/layouts/ProjectLineItemFormLayout';

interface ProjectLineItemFormProps {
  onSave: () => void;
  projectId: string;
  itemId?: string;
}

export default function ProjectLineItemForm({ onSave, projectId, itemId }: ProjectLineItemFormProps) {
  return (
    <ProjectLineItemFormLayout
      onSave={onSave}
      projectId={projectId}
      lineItemId={itemId}
    />
  );
}
