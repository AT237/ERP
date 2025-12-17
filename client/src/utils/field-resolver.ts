// Client-side field resolver for layout preview
// Mirrors server/utils/field-resolver.ts but works with printData

export type PrintData = {
  quotation: Record<string, any>;
  customer: Record<string, any> | null;
  project: Record<string, any> | null;
  company: Record<string, any> | null;
};

/**
 * Resolve a field value from print data using dot notation
 * @param fieldKey - e.g., "quotation.number", "customer.address.city", "company.name"
 * @param printData - The quotation print data object
 * @returns The resolved value or null
 */
export function resolveFieldValue(fieldKey: string, printData: PrintData): any {
  if (!fieldKey || !printData) return null;

  let parts = fieldKey.split('.');
  
  // First part is the table name (quotation, customer, project, company)
  // Support both singular and plural forms
  let tableName = parts[0];

  // Handle shorthand aliases like "address" -> "customer.address"
  const shorthandAliases: Record<string, { table: string; prefix: string[] }> = {
    'address': { table: 'customer', prefix: ['address'] },
  };
  
  if (shorthandAliases[tableName]) {
    const alias = shorthandAliases[tableName];
    tableName = alias.table;
    parts = [tableName, ...alias.prefix, ...parts.slice(1)];
  }

  const fieldPath = parts.slice(1);

  // Normalize table names (plural to singular)
  const tableAliases: Record<string, string> = {
    'quotations': 'quotation',
    'customers': 'customer',
    'projects': 'project',
    'companies': 'company',
  };
  if (tableAliases[tableName]) {
    tableName = tableAliases[tableName];
  }

  // Get the data object for this table
  let data: any = null;
  switch (tableName) {
    case 'quotation':
      data = printData.quotation;
      break;
    case 'customer':
      data = printData.customer;
      break;
    case 'project':
      data = printData.project;
      break;
    case 'company':
      data = printData.company;
      break;
    default:
      return null;
  }

  if (!data) return null;

  // Navigate through the path
  let value = data;
  for (const key of fieldPath) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}

/**
 * Format a field value based on its data type
 * @param value - The raw value
 * @param format - The format type: 'text', 'number', 'currency', 'date'
 * @returns Formatted string
 */
export function formatFieldValue(value: any, format: string = 'text'): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (format) {
    case 'currency':
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '€ 0,00';
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(num);

    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) return '0';
      return new Intl.NumberFormat('nl-NL').format(numValue);

    case 'date':
      const date = typeof value === 'string' ? new Date(value) : value;
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      return new Intl.DateTimeFormat('nl-NL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(date);

    case 'text':
    default:
      return String(value);
  }
}

/**
 * Resolve and format a field in one call
 * @param fieldKey - e.g., "quotation.number"
 * @param printData - The print data object
 * @param format - The format type
 * @returns Formatted string value
 */
export function resolveAndFormat(
  fieldKey: string,
  printData: PrintData,
  format: string = 'text'
): string {
  const value = resolveFieldValue(fieldKey, printData);
  return formatFieldValue(value, format);
}
