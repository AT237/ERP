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
    <div className={`flex items-center gap-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2 shadow-lg shadow-orange-500/20 ring-1 ring-orange-500/10 ${className}`}>
      {fields.map((field, index) => (
        <span key={index} className="text-xl font-bold text-orange-800 dark:text-orange-200 whitespace-nowrap">
          {field.value}
        </span>
      ))}
    </div>
  );
}