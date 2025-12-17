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

/**
 * Replace all placeholders in text with resolved values
 * Removes empty placeholders and cleans up extra whitespace
 * Supports format specifier: {{field.path:format}} where format is text, date, currency, or number
 * @param text - Text with {{field.path}} or {{field.path:format}} placeholders
 * @param printData - The print data object
 * @returns Cleaned text with resolved values
 */
export function replacePlaceholders(
  text: string,
  printData: PrintData
): string {
  if (!text) return '';

  // Replace data field placeholders with optional format specifier
  // Syntax: {{tableName.fieldName}} or {{tableName.fieldName:format}}
  // Formats: text (default), date, currency, number
  let result = text.replace(/\{\{([a-zA-Z_]+(?:\.[a-zA-Z_]+)+)(?::([a-zA-Z]+))?\}\}/g, (match, fieldPath, format) => {
    // Auto-detect format based on field name if not specified
    let resolvedFormat = format || 'text';
    if (!format) {
      const fieldName = fieldPath.split('.').pop() || '';
      const fieldNameLower = fieldName.toLowerCase();
      // Auto-detect date fields (check both original and lowercase)
      if (fieldNameLower.includes('date') || fieldNameLower.includes('datum') || 
          fieldNameLower.includes('createdat') || fieldNameLower.includes('updatedat') ||
          fieldNameLower === 'validuntil' || fieldNameLower.includes('quotationdate')) {
        resolvedFormat = 'date';
      }
      // Auto-detect currency fields
      else if (fieldNameLower.includes('amount') || fieldNameLower.includes('price') || 
               fieldNameLower.includes('total') || fieldNameLower.includes('bedrag') ||
               fieldNameLower.includes('prijs') || fieldNameLower.includes('subtotal') ||
               fieldNameLower.includes('taxamount')) {
        resolvedFormat = 'currency';
      }
    }
    
    const value = resolveAndFormat(fieldPath, printData, resolvedFormat);
    // Return empty string if no value (will be cleaned up later)
    return value || '';
  });

  // Clean up extra whitespace caused by removed placeholders
  // - Multiple spaces become single space
  result = result.replace(/  +/g, ' ');
  // - Trim leading/trailing whitespace from each line
  result = result.split('\n').map(line => line.trim()).join('\n');
  // - Remove empty lines that only had placeholders
  result = result.replace(/^\s*$/gm, '').replace(/\n\n+/g, '\n');
  // - Trim overall result
  result = result.trim();

  return result;
}

/**
 * Check if text contains any unresolved placeholders after processing
 * @param text - Text with {{field.path}} placeholders
 * @param printData - The print data object
 * @returns true if all placeholders resolve to non-empty values
 */
export function hasContent(
  text: string,
  printData: PrintData
): boolean {
  if (!text) return false;
  
  const processedText = replacePlaceholders(text, printData);
  return processedText.length > 0;
}

/**
 * Check if a block has any content after placeholder resolution
 * Used for collapse/shift logic
 * @param block - The block configuration
 * @param printData - The print data object
 * @returns true if block has displayable content
 */
export function blockHasContent(
  block: any,
  printData: PrintData
): boolean {
  if (!block) return false;

  // Handle different block types
  switch (block.type) {
    case 'Text':
    case 'Text Block':
      return hasContent(block.config?.text || '', printData);
    
    case 'Data Field':
      const { tableName, fieldName } = block.config || {};
      if (!tableName || !fieldName) return false;
      const fieldKey = `${tableName}.${fieldName}`;
      const value = resolveFieldValue(fieldKey, printData);
      return value !== null && value !== undefined && value !== '';
    
    case 'Company Header':
      return !!printData.company;
    
    case 'Document Title':
    case 'Date Block':
    case 'Page Number':
      return true; // These always have content
    
    case 'Image':
      // Check all possible image config properties (top-level and nested)
      return !!(
        block.config?.imagePath || 
        block.config?.imageUrl || 
        block.config?.src || 
        block.config?.imageId ||
        block.config?.image?.id ||
        block.config?.image?.url ||
        block.config?.image?.path ||
        block.config?.image?.src
      );
    
    default:
      return true; // Default to showing block
  }
}
