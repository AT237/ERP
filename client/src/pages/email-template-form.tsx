import { EmailTemplateFormLayout } from "@/components/layouts/EmailTemplateFormLayout";

interface EmailTemplateFormProps {
  onSave: () => void;
  emailTemplateId?: string;
  parentId?: string;
}

export default function EmailTemplateForm({ onSave, emailTemplateId, parentId }: EmailTemplateFormProps) {
  return (
    <EmailTemplateFormLayout
      onSave={onSave}
      emailTemplateId={emailTemplateId}
      parentId={parentId}
    />
  );
}
