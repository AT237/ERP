import EmployeeFormLayout from '@/components/layouts/EmployeeFormLayout';

interface EmployeeFormProps {
  onSave: () => void;
  employeeId?: string;
}

export default function EmployeeForm({ onSave, employeeId }: EmployeeFormProps) {
  return (
    <EmployeeFormLayout onSave={onSave} employeeId={employeeId} />
  );
}
