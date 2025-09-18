import React from "react";
import ContactPersonFormLayout from '@/components/layouts/ContactPersonFormLayout';

interface ContactPersonFormProps {
  onSave: () => void;
  contactPersonId?: string;
}

export default function ContactPersonForm({ onSave, contactPersonId }: ContactPersonFormProps) {
  return (
    <ContactPersonFormLayout onSave={onSave} contactPersonId={contactPersonId} />
  );
}