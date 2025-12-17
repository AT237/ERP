// Client-side field resolver for layout preview
// Mirrors server/utils/field-resolver.ts but works with printData

export type PrintData = {
  quotation: Record<string, any>;
  customer: Record<string, any> | null;
  project: Record<string, any> | null;
  company: Record<string, any> | null;
  items?: Array<{
    lineNo: number;
    description: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    lineType: string;
  }>;
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

  // Field aliases for backward compatibility
  const fieldAliases: Record<string, string> = {
    'quotationDate': 'date',
    'quotationNumber': 'number',
  };

  // Navigate through the path
  let value = data;
  for (let key of fieldPath) {
    // Apply field alias if exists
    if (fieldAliases[key]) {
      key = fieldAliases[key];
    }
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
      // Format as DD/MM/YYYY
      return new Intl.DateTimeFormat('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);

    case 'text':
    default:
      // Handle address objects - convert to formatted string
      if (typeof value === 'object' && value !== null) {
        // Check if this looks like an address object
        if ('street' in value || 'city' in value || 'postalCode' in value) {
          const parts = [];
          if (value.street) {
            parts.push(value.street + (value.houseNumber ? ' ' + value.houseNumber : ''));
          }
          if (value.postalCode || value.city) {
            parts.push((value.postalCode || '') + ' ' + (value.city || '').trim());
          }
          if (value.country && value.country !== 'Netherlands' && value.country !== 'NL') {
            parts.push(value.country);
          }
          return parts.filter(p => p.trim()).join(', ');
        }
        // For other objects, return empty to avoid [object Object]
        return '';
      }
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
 * Item context for repeating blocks (line items)
 */
export type ItemContext = {
  item: Record<string, any>;
  index: number;
};

/**
 * Resolve a value from item context (for {{item.XXX}} placeholders)
 */
function resolveItemValue(fieldPath: string, itemContext: ItemContext): any {
  if (!fieldPath || !itemContext?.item) return null;
  
  const parts = fieldPath.split('.');
  let value: any = itemContext.item;
  
  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }
  
  return value;
}

/**
 * Replace all placeholders in text with resolved values
 * Removes empty placeholders and cleans up extra whitespace
 * Supports format specifier: {{field.path:format}} where format is text, date, currency, or number
 * Supports item context for repeating blocks: {{item.description}}, {{item.quantity}}, etc.
 * @param text - Text with {{field.path}} or {{field.path:format}} placeholders
 * @param printData - The print data object
 * @param itemContext - Optional item context for repeating blocks
 * @returns Cleaned text with resolved values
 */
export function replacePlaceholders(
  text: string,
  printData: PrintData,
  itemContext?: ItemContext
): string {
  if (!text) return '';

  // Replace data field placeholders with optional format specifier
  // Syntax: {{tableName.fieldName}} or {{tableName.fieldName:format}}
  // Also supports {{item.fieldName}} for repeating blocks
  // Formats: text (default), date, currency, number
  let result = text.replace(/\{\{([a-zA-Z_]+(?:\.[a-zA-Z_]+)*)(?::([a-zA-Z]+))?\}\}/g, (match, fieldPath, format) => {
    // Check if this is an item placeholder
    if (fieldPath.startsWith('item.') && itemContext) {
      const itemFieldPath = fieldPath.substring(5); // Remove 'item.' prefix
      const itemValue = resolveItemValue(itemFieldPath, itemContext);
      
      // Auto-detect format for item fields
      let resolvedFormat = format || 'text';
      if (!format) {
        const fieldName = itemFieldPath.toLowerCase();
        if (fieldName.includes('price') || fieldName.includes('total') || 
            fieldName.includes('amount') || fieldName === 'unitprice' || 
            fieldName === 'linetotal') {
          resolvedFormat = 'currency';
        }
      }
      
      return formatFieldValue(itemValue, resolvedFormat);
    }
    
    // Regular placeholder resolution
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
 * Check if text has content after placeholder resolution
 * If text contains placeholders, returns true only if at least one placeholder has a value
 * @param text - Text with {{field.path}} placeholders
 * @param printData - The print data object
 * @returns true if text has meaningful content (placeholders resolved to values)
 */
export function hasContent(
  text: string,
  printData: PrintData
): boolean {
  if (!text) return false;
  
  // Check if text contains any placeholders
  const placeholderRegex = /\{\{([a-zA-Z_]+(?:\.[a-zA-Z_]+)+)(?::([a-zA-Z]+))?\}\}/g;
  const placeholders = text.match(placeholderRegex);
  
  if (!placeholders || placeholders.length === 0) {
    // No placeholders, text always has content if not empty
    return text.trim().length > 0;
  }
  
  // Text has placeholders - check if at least one resolves to a non-empty value
  let hasAnyValue = false;
  for (const placeholder of placeholders) {
    // Extract field path from placeholder
    const match = placeholder.match(/\{\{([a-zA-Z_]+(?:\.[a-zA-Z_]+)+)(?::([a-zA-Z]+))?\}\}/);
    if (match) {
      const fieldPath = match[1];
      const value = resolveFieldValue(fieldPath, printData);
      if (value !== null && value !== undefined && value !== '') {
        hasAnyValue = true;
        break;
      }
    }
  }
  
  return hasAnyValue;
}

/**
 * Check if a block has any content after placeholder resolution
 * Used for collapse/shift logic and hideWhenEmpty feature
 * @param block - The block configuration
 * @param printData - The print data object
 * @returns true if block should be visible
 */
export function blockHasContent(
  block: any,
  printData: PrintData
): boolean {
  if (!block) return false;

  // If hideWhenEmpty is not enabled, always show block (backward compatible)
  if (!block.config?.hideWhenEmpty) {
    return true;
  }

  // hideWhenEmpty is enabled - check if block has actual content
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
      return !!(block.config?.text || block.config?.title);
    
    case 'Date Block':
      // Check if date source has a value
      const dateSource = block.config?.dateSource;
      if (dateSource === 'quotation') {
        return !!(printData.quotation?.date || printData.quotation?.createdAt);
      } else if (dateSource === 'validUntil') {
        return !!printData.quotation?.validUntil;
      }
      return true; // Today/custom dates always have content
    
    case 'Page Number':
      return true; // Page numbers always have content
    
    case 'Image':
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
    
    case 'Group':
      // Group has content if any child block has content
      const childBlocks = block.config?.childBlocks || [];
      return childBlocks.some((child: any) => blockHasContent(child, printData));
    
    case 'Line Items Table':
      // Has content if there are items
      const items = printData.quotation?.items || [];
      return items.length > 0;
    
    case 'Totals Summary':
      // Has content if there's a total amount
      return !!(printData.quotation?.totalAmount || printData.quotation?.subtotal);
    
    case 'Footer Block':
      return hasContent(block.config?.text || '', printData);
    
    default:
      return true; // Default to showing block
  }
}
