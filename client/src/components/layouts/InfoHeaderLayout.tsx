import React from 'react';

interface InfoField {
  label: string;
  value: string | React.ReactNode;
}

interface InfoHeaderLayoutProps {
  fields: InfoField[];
  className?: string;
}

export function InfoHeaderLayout({ fields, className = "" }: InfoHeaderLayoutProps) {
  return (
    <div className={`flex items-center gap-6 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 rounded-lg border border-orange-200 dark:border-orange-700 ${className}`}>
      {fields.map((field, index) => (
        <span key={index} className="text-lg font-bold text-orange-800 dark:text-orange-200">
          {field.value}
        </span>
      ))}
    </div>
  );
}