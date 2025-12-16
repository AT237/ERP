// Block renderer components for layout preview
import { resolveAndFormat, PrintData } from '@/utils/field-resolver';

export interface BlockRendererProps {
  block: any;
  printData: PrintData;
  currentPage?: number;
  totalPages?: number;
}

// Text variables that can be used in text blocks
export const TEXT_VARIABLES = [
  { code: '[PAGINANUMMER]', label: 'Paginanummer', description: 'Huidige pagina' },
  { code: '[TOTAALPAGINAS]', label: 'Totaal paginas', description: 'Totaal aantal paginas' },
  { code: '[VANDAAG]', label: 'Vandaag', description: 'Huidige datum' },
  { code: '[DATUM]', label: 'Documentdatum', description: 'Datum van document' },
  { code: '[JAAR]', label: 'Jaar', description: 'Huidig jaar' },
];

// Data field placeholders - use {{table.field}} syntax in text blocks
export const DATA_FIELD_EXAMPLES = [
  { code: '{{quotation.number}}', label: 'Offertenummer' },
  { code: '{{quotation.totalAmount}}', label: 'Totaalbedrag' },
  { code: '{{quotation.date}}', label: 'Offertedatum' },
  { code: '{{customer.name}}', label: 'Klantnaam' },
  { code: '{{customer.email}}', label: 'Klant e-mail' },
  { code: '{{project.name}}', label: 'Projectnaam' },
  { code: '{{company.name}}', label: 'Bedrijfsnaam' },
];

// Function to replace text variables with actual values
export function replaceTextVariables(
  text: string, 
  printData: PrintData,
  currentPage: number = 1,
  totalPages: number = 1
): string {
  if (!text) return text;
  
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  // Get document date if available
  const documentDate = printData.quotation?.createdAt || printData.quotation?.date;
  const documentDateFormatted = documentDate 
    ? new Date(documentDate).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : todayFormatted;

  let result = text
    .replace(/\[PAGINANUMMER\]/g, String(currentPage))
    .replace(/\[TOTAALPAGINAS\]/g, String(totalPages))
    .replace(/\[VANDAAG\]/g, todayFormatted)
    .replace(/\[DATUM\]/g, documentDateFormatted)
    .replace(/\[JAAR\]/g, String(today.getFullYear()));

  // Replace data field placeholders: {{tableName.fieldName}}
  result = result.replace(/\{\{([a-zA-Z_]+)\.([a-zA-Z_]+)\}\}/g, (match, tableName, fieldName) => {
    const fieldKey = `${tableName}.${fieldName}`;
    const value = resolveAndFormat(fieldKey, printData, 'text');
    return value || match; // Return original if not found
  });

  return result;
}

// Text Block - static text content with variable support
export function TextBlockRenderer({ block, printData, currentPage = 1, totalPages = 1 }: BlockRendererProps) {
  const rawText = block.config?.text || 'Tekst...';
  const processedText = replaceTextVariables(rawText, printData, currentPage, totalPages);
  
  // Map alignH/alignV to CSS
  const getTextAlign = (alignH?: string): 'left' | 'center' | 'right' => {
    switch (alignH) {
      case 'center': return 'center';
      case 'right': return 'right';
      default: return 'left';
    }
  };
  
  const getVerticalAlign = (alignV?: string): string => {
    switch (alignV) {
      case 'middle': return 'center';
      case 'bottom': return 'flex-end';
      default: return 'flex-start';
    }
  };
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: getVerticalAlign(block.config?.alignV),
    justifyContent: block.config?.alignH === 'center' ? 'center' : block.config?.alignH === 'right' ? 'flex-end' : 'flex-start',
    width: '100%',
    height: '100%',
  };
  
  const textStyle: React.CSSProperties = {
    fontFamily: block.style?.fontFamily || 'helvetica',
    fontSize: block.style?.fontSize ? `${block.style.fontSize}pt` : '9pt',
    fontWeight: block.style?.fontWeight || 'normal',
    fontStyle: block.style?.fontStyle || 'normal',
    textDecoration: block.style?.textDecoration || 'none',
    color: block.style?.color || '#000000',
    textAlign: getTextAlign(block.config?.alignH),
    whiteSpace: 'pre-wrap',
    margin: 0,
    width: '100%',
  };
  
  return (
    <div style={containerStyle}>
      <p style={textStyle}>{processedText}</p>
    </div>
  );
}

// Data Field Block - dynamic field from database
export function DataFieldRenderer({ block, printData }: BlockRendererProps) {
  const { tableName, fieldName, label } = block.config || {};
  
  if (!tableName || !fieldName) {
    return <div className="text-xs text-gray-400 italic">Veld niet geconfigureerd</div>;
  }

  const fieldKey = `${tableName}.${fieldName}`;
  const value = resolveAndFormat(fieldKey, printData, 'text');

  return (
    <div style={block.style || {}} className="flex gap-2 text-sm">
      {label && <span className="font-medium">{label}</span>}
      <span>{value || '-'}</span>
    </div>
  );
}

// Company Header Block - company information
export function CompanyHeaderRenderer({ block, printData }: BlockRendererProps) {
  const company = printData.company;
  
  if (!company) {
    return <div className="text-xs text-gray-400 italic">Bedrijfsgegevens niet beschikbaar</div>;
  }

  const showLabel = block.config?.showLabel !== false;
  const labelText = block.config?.labelText || 'Van:';

  return (
    <div style={block.style || {}} className="space-y-1 text-sm">
      {showLabel && <div className="font-semibold text-orange-600">{labelText}</div>}
      <div className="font-medium">{company.name}</div>
      {company.address && (
        <>
          <div>
            {company.address.street} {company.address.houseNumber}
          </div>
          <div>
            {company.address.postalCode} {company.address.city}
          </div>
          {company.address.country && company.address.country !== 'Netherlands' && (
            <div>{company.address.country}</div>
          )}
        </>
      )}
      {company.phone && <div>Tel: {company.phone}</div>}
      {company.email && <div>Email: {company.email}</div>}
      {company.website && <div>Web: {company.website}</div>}
      {company.kvkNummer && <div>KVK: {company.kvkNummer}</div>}
      {company.btwNummer && <div>BTW: {company.btwNummer}</div>}
    </div>
  );
}

// Date Block - current date or specific date
export function DateBlockRenderer({ block }: BlockRendererProps) {
  const label = block.config?.label || 'Datum:';
  const date = block.config?.date 
    ? new Date(block.config.date).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  return (
    <div style={block.style || {}} className="flex gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span>{date}</span>
    </div>
  );
}

// Document Title Block - large title text
export function DocumentTitleRenderer({ block }: BlockRendererProps) {
  const text = block.config?.text || 'OFFERTE';

  return (
    <div style={block.style || {}} className="text-2xl font-bold text-orange-600">
      {text}
    </div>
  );
}

// Page Number Block - page numbering
export function PageNumberRenderer({ block }: BlockRendererProps) {
  const format = block.config?.format || 'of_total';
  const currentPage = block.config?.currentPage || 1;
  const totalPages = block.config?.totalPages || 1;

  let text = '';
  switch (format) {
    case 'of_total':
      text = `Pagina ${currentPage} van ${totalPages}`;
      break;
    case 'current_only':
      text = `Pagina ${currentPage}`;
      break;
    default:
      text = `${currentPage}`;
  }

  // Map alignH/alignV to CSS
  const getJustify = (alignH?: string): string => {
    switch (alignH) {
      case 'center': return 'center';
      case 'right': return 'flex-end';
      default: return 'flex-start';
    }
  };
  
  const getAlignItems = (alignV?: string): string => {
    switch (alignV) {
      case 'middle': return 'center';
      case 'bottom': return 'flex-end';
      default: return 'flex-start';
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: getJustify(block.config?.alignH),
    alignItems: getAlignItems(block.config?.alignV),
    width: '100%',
    height: '100%',
    ...block.style,
  };

  return (
    <div style={containerStyle} className="text-sm text-gray-600">
      {text}
    </div>
  );
}

// Helper function to get alignment styles
function getAlignmentStyles(alignH?: string, alignV?: string): React.CSSProperties {
  const styles: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
  };
  
  switch (alignH) {
    case 'left':
      styles.justifyContent = 'flex-start';
      break;
    case 'center':
      styles.justifyContent = 'center';
      break;
    case 'right':
      styles.justifyContent = 'flex-end';
      break;
    default:
      styles.justifyContent = 'flex-start';
  }
  
  switch (alignV) {
    case 'top':
      styles.alignItems = 'flex-start';
      break;
    case 'middle':
      styles.alignItems = 'center';
      break;
    case 'bottom':
      styles.alignItems = 'flex-end';
      break;
    default:
      styles.alignItems = 'flex-start';
  }
  
  return styles;
}

// Image Block - logo or other images
export function ImageBlockRenderer({ block, printData }: BlockRendererProps) {
  const { src, alt = 'Image', fit = 'contain', alignH, alignV } = block.config || {};
  
  // Special handling for company logo
  const imageSrc = src === 'company.logo' && printData.company?.logoUrl
    ? printData.company.logoUrl
    : src;

  if (!imageSrc) {
    return <div className="text-xs text-gray-400 italic">Geen afbeelding</div>;
  }

  const alignmentStyles = getAlignmentStyles(alignH, alignV);

  return (
    <div style={{ 
      ...alignmentStyles, 
      ...(block.style || {}),
      width: '100%',
      height: '100%',
    }}>
      <img
        src={imageSrc}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: fit as any,
        }}
      />
    </div>
  );
}

// Line Items Table Block - quotation line items
export function LineItemsTableRenderer({ block, printData }: BlockRendererProps) {
  // TODO: Extend print-data endpoint to include line items
  // For now, show placeholder
  
  return (
    <div style={block.style || {}} className="border border-gray-300 rounded p-4">
      <div className="text-sm font-medium mb-2">Offerte Regels</div>
      <div className="text-xs text-gray-400 italic">
        Offerte regels worden hier getoond (nog niet geïmplementeerd)
      </div>
      <div className="mt-2 border-t pt-2 text-xs text-gray-500">
        <div className="grid grid-cols-4 gap-2 font-medium mb-1">
          <div>Omschrijving</div>
          <div className="text-right">Aantal</div>
          <div className="text-right">Prijs</div>
          <div className="text-right">Totaal</div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-gray-400">
          <div>Voorbeeld product</div>
          <div className="text-right">1</div>
          <div className="text-right">€ 100,00</div>
          <div className="text-right">€ 100,00</div>
        </div>
      </div>
    </div>
  );
}

// Totals Summary Block - subtotal, tax, total
export function TotalsSummaryRenderer({ block, printData }: BlockRendererProps) {
  const quotation = printData.quotation;
  
  if (!quotation) {
    return <div className="text-xs text-gray-400 italic">Totalen niet beschikbaar</div>;
  }

  const subtotal = resolveAndFormat('quotation.subtotal', printData, 'currency');
  const taxAmount = resolveAndFormat('quotation.taxAmount', printData, 'currency');
  const totalAmount = resolveAndFormat('quotation.totalAmount', printData, 'currency');

  return (
    <div style={block.style || {}} className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>Subtotaal:</span>
        <span className="font-medium">{subtotal}</span>
      </div>
      {taxAmount && (
        <div className="flex justify-between">
          <span>BTW:</span>
          <span className="font-medium">{taxAmount}</span>
        </div>
      )}
      <div className="flex justify-between border-t pt-1 font-bold text-base">
        <span>Totaal:</span>
        <span className="text-orange-600">{totalAmount}</span>
      </div>
    </div>
  );
}

// Footer Block - footer content
export function FooterBlockRenderer({ block }: BlockRendererProps) {
  const text = block.config?.text || '';

  return (
    <div style={block.style || {}} className="text-xs text-gray-600">
      {text || 'Voettekst...'}
    </div>
  );
}

// Main block renderer map
export const BlockRenderers: Record<string, React.FC<BlockRendererProps>> = {
  'Text': TextBlockRenderer,
  'Text Block': TextBlockRenderer,
  'Data Field': DataFieldRenderer,
  'Company Header': CompanyHeaderRenderer,
  'Date Block': DateBlockRenderer,
  'Document Title': DocumentTitleRenderer,
  'Page Number': PageNumberRenderer,
  'Image': ImageBlockRenderer,
  'Line Items Table': LineItemsTableRenderer,
  'Totals Summary': TotalsSummaryRenderer,
  'Footer Block': FooterBlockRenderer,
};

// Fallback renderer for unknown block types
export function UnknownBlockRenderer({ block }: BlockRendererProps) {
  return (
    <div className="border border-dashed border-orange-300 bg-orange-50 p-2 rounded text-xs">
      <div className="text-orange-600 font-medium">Onbekend block type: {block.type}</div>
    </div>
  );
}
