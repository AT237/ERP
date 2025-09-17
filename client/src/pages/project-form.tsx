import React from "react";
import { ProjectFormLayout } from '@/components/layouts/ProjectFormLayout';

interface ProjectFormProps {
  onSave: () => void;
  projectId?: string;
  parentId?: string;
}

export default function ProjectForm({ onSave, projectId, parentId }: ProjectFormProps) {
  return (
    <ProjectFormLayout onSave={onSave} projectId={projectId} parentId={parentId} />
  );
}