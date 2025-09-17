import React from "react";
import { TextSnippetFormLayout } from '@/components/layouts/TextSnippetFormLayout';

interface TextSnippetFormProps {
  onSave: () => void;
  textSnippetId?: string;
  parentId?: string;
}

export default function TextSnippetForm({ onSave, textSnippetId, parentId }: TextSnippetFormProps) {
  return (
    <TextSnippetFormLayout onSave={onSave} textSnippetId={textSnippetId} parentId={parentId} />
  );
}