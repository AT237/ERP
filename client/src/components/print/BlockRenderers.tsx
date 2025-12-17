// Block renderer components for layout preview
import { resolveAndFormat, PrintData, replacePlaceholders, blockHasContent } from '@/utils/field-resolver';

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

// Data field placeholders - use {{table.field}} or {{table.field:format}} syntax in text blocks
// Formats: text (default), date, currency, number
// Auto-detection: fields with 'date', 'amount', 'price', 'total' are auto-formatted
// Shorthand: {{address.field}} = {{customer.address.field}}
export const DATA_FIELD_EXAMPLES = [
  { code: '{{quotation.number}}', label: 'Offertenummer' },
  { code: '{{quotation.date}}', label: 'Offertedatum (auto datum)' },
  { code: '{{quotation.validUntil}}', label: 'Geldig tot (auto datum)' },
  { code: '{{quotation.totalAmount}}', label: 'Totaalbedrag (auto €)' },
  { code: '{{quotation.subtotal}}', label: 'Subtotaal (auto €)' },
  { code: '{{quotation.taxAmount}}', label: 'BTW bedrag (auto €)' },
  { code: '{{quotation.description}}', label: 'Omschrijving' },
  { code: '{{quotation.status}}', label: 'Status' },
  { code: '{{customer.name}}', label: 'Klantnaam' },
  { code: '{{customer.customerNumber}}', label: 'Klantnummer' },
  { code: '{{customer.email}}', label: 'Klant e-mail' },
  { code: '{{customer.phone}}', label: 'Klant telefoon' },
  { code: '{{address.street}}', label: 'Klant straat' },
  { code: '{{address.houseNumber}}', label: 'Klant huisnummer' },
  { code: '{{address.postalCode}}', label: 'Klant postcode' },
  { code: '{{address.city}}', label: 'Klant plaats' },
  { code: '{{address.country}}', label: 'Klant land' },
  { code: '{{project.name}}', label: 'Projectnaam' },
  { code: '{{project.projectNumber}}', label: 'Projectnummer' },
  { code: '{{company.name}}', label: 'Bedrijfsnaam' },
  { code: '{{company.email}}', label: 'Bedrijf e-mail' },
  { code: '{{company.phone}}', label: 'Bedrijf telefoon' },
  { code: '{{company.address.street}}', label: 'Bedrijf straat' },
  { code: '{{company.address.houseNumber}}', label: 'Bedrijf huisnummer' },
  { code: '{{company.address.postalCode}}', label: 'Bedrijf postcode' },
  { code: '{{company.address.city}}', label: 'Bedrijf plaats' },
  { code: '{{company.address.country}}', label: 'Bedrijf land' },
  { code: '{{company.kvkNummer}}', label: 'Bedrijf KVK' },
  { code: '{{company.btwNummer}}', label: 'Bedrijf BTW' },
  { code: '{{company.bankAccount}}', label: 'Bedrijf IBAN' },
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

  // Replace data field placeholders using the improved replacePlaceholders function
  // This removes empty placeholders and cleans up extra whitespace
  result = replacePlaceholders(result, printData);

  return result;
}

// Text Block - static text content with variable support and inline HTML formatting
export function TextBlockRenderer({ block, printData, currentPage = 1, totalPages = 1 }: BlockRendererProps) {
  const rawText = block.config?.text || 'Tekst...';
  const processedText = replaceTextVariables(rawText, printData, currentPage, totalPages);
  
  // Check if text contains HTML formatting tags
  const hasHtmlFormatting = /<(b|i|u|span|strong|em)[^>]*>/i.test(processedText);
  
  // Convert newlines to <br> for HTML rendering
  const htmlText = hasHtmlFormatting 
    ? processedText.replace(/\n/g, '<br />')
    : processedText;
  
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
  
  // Render with HTML if formatting tags are present
  if (hasHtmlFormatting) {
    return (
      <div style={containerStyle}>
        <div 
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: htmlText }}
        />
      </div>
    );
  }
  
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

// Date Block - current date, specific date, or from document data
export function DateBlockRenderer({ block, printData }: BlockRendererProps) {
  const label = block.config?.label || 'Date:';
  const dateSource = block.config?.dateSource || 'today'; // 'today', 'quotation', 'custom'
  
  let dateValue: Date | null = null;
  
  if (dateSource === 'quotation' && printData?.quotation?.date) {
    dateValue = new Date(printData.quotation.date);
  } else if (dateSource === 'validUntil' && printData?.quotation?.validUntil) {
    dateValue = new Date(printData.quotation.validUntil);
  } else if (dateSource === 'custom' && block.config?.date) {
    dateValue = new Date(block.config.date);
  } else {
    dateValue = new Date(); // default to today
  }
  
  const formattedDate = dateValue && !isNaN(dateValue.getTime())
    ? dateValue.toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <div style={block.style || {}} className="flex gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span>{formattedDate}</span>
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

// Group Block - container for multiple blocks with optional collapse-when-empty
export function GroupBlockRenderer({ block, printData, currentPage = 1, totalPages = 1 }: BlockRendererProps) {
  const childBlocks = block.config?.childBlocks || [];
  const collapseEmpty = block.config?.collapseEmpty || false;
  
  // Convert mm to px for rendering
  const mmToPx = (mm: number) => mm * 3.7795275591;
  
  // If collapseEmpty is enabled, filter out empty blocks and recalculate positions
  let visibleBlocks = childBlocks;
  let cumulativeOffset = 0;
  
  if (collapseEmpty) {
    // Sort blocks by y-position first for correct collapse order
    const sortedBlocks = [...childBlocks].sort((a: any, b: any) => 
      (a.position?.y || 0) - (b.position?.y || 0)
    );
    
    visibleBlocks = [];
    for (const childBlock of sortedBlocks) {
      // Check if block has content
      const hasContent = blockHasContent(childBlock, printData);
      
      if (hasContent) {
        // Shift block up by accumulated offset from ALL previously hidden blocks
        visibleBlocks.push({
          ...childBlock,
          position: {
            x: childBlock.position?.x || 0,
            y: (childBlock.position?.y || 0) - cumulativeOffset,
          }
        });
      } else {
        // Add height of this hidden block to cumulative offset (no extra gap needed)
        cumulativeOffset += (childBlock.size?.height || 25);
      }
    }
  }
  
  // If no visible blocks and collapseEmpty is enabled, render nothing (fully collapse)
  if (collapseEmpty && visibleBlocks.length === 0) {
    return null;
  }
  
  // Calculate actual height needed based on visible blocks
  let calculatedHeight = 0;
  if (collapseEmpty && visibleBlocks.length > 0) {
    for (const vBlock of visibleBlocks) {
      const blockBottom = (vBlock.position?.y || 0) + (vBlock.size?.height || 25);
      calculatedHeight = Math.max(calculatedHeight, blockBottom);
    }
  }
  
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: collapseEmpty && calculatedHeight > 0 ? `${mmToPx(calculatedHeight)}px` : '100%',
    overflow: 'visible',
  };
  
  return (
    <div style={containerStyle}>
      {visibleBlocks.map((childBlock: any, index: number) => {
        const BlockRenderer = BlockRenderers[childBlock.type];
        
        const blockStyle: React.CSSProperties = {
          position: 'absolute',
          left: `${mmToPx(childBlock.position?.x || 0)}px`,
          top: `${mmToPx(childBlock.position?.y || 0)}px`,
          width: `${mmToPx(childBlock.size?.width || 50)}px`,
          height: `${mmToPx(childBlock.size?.height || 25)}px`,
        };
        
        if (BlockRenderer) {
          return (
            <div key={childBlock.id || index} style={blockStyle}>
              <BlockRenderer block={childBlock} printData={printData} currentPage={currentPage} totalPages={totalPages} />
            </div>
          );
        }
        return null;
      })}
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
  'Group': GroupBlockRenderer,
};

// Fallback renderer for unknown block types
export function UnknownBlockRenderer({ block }: BlockRendererProps) {
  return (
    <div className="border border-dashed border-orange-300 bg-orange-50 p-2 rounded text-xs">
      <div className="text-orange-600 font-medium">Onbekend block type: {block.type}</div>
    </div>
  );
}
