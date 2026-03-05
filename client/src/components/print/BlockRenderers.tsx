// Block renderer components for layout preview
import { resolveAndFormat, PrintData, replacePlaceholders, blockHasContent, ItemContext } from '@/utils/field-resolver';

export interface BlockRendererProps {
  block: any;
  printData: PrintData;
  currentPage?: number;
  totalPages?: number;
  itemContext?: ItemContext;
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

// Item field placeholders - for repeating blocks (line items)
export const ITEM_FIELD_EXAMPLES = [
  { code: '{{item.positionNo}}', label: 'Positienummer' },
  { code: '{{item.description}}', label: 'Omschrijving' },
  { code: '{{item.quantity}}', label: 'Aantal' },
  { code: '{{item.unitPrice}}', label: 'Eenheidsprijs (auto €)' },
  { code: '{{item.lineTotal}}', label: 'Regeltotaal (auto €)' },
  { code: '{{item.lineType}}', label: 'Type regel' },
];

// Function to replace text variables with actual values
export function replaceTextVariables(
  text: string, 
  printData: PrintData,
  currentPage: number = 1,
  totalPages: number = 1,
  itemContext?: ItemContext
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
  // Pass itemContext for {{item.XXX}} placeholders in repeating blocks
  result = replacePlaceholders(result, printData, itemContext);

  return result;
}

// Text Block - static text content with variable support and inline HTML formatting
export function TextBlockRenderer({ block, printData, currentPage = 1, totalPages = 1, itemContext }: BlockRendererProps) {
  const rawText = block.config?.text || 'Tekst...';
  const processedText = replaceTextVariables(rawText, printData, currentPage, totalPages, itemContext);
  
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

  const getFontFamily = (font?: string): string => {
    const fontMap: Record<string, string> = {
      'helvetica': 'Arial, Helvetica, sans-serif',
      'arial': 'Arial, sans-serif',
      'calibri': 'Calibri, "Segoe UI", sans-serif',
      'times': '"Times New Roman", Times, serif',
      'courier': '"Courier New", Courier, monospace',
      'georgia': 'Georgia, serif',
      'verdana': 'Verdana, sans-serif',
    };
    return fontMap[font || 'arial'] || font || 'Arial, Helvetica, sans-serif';
  };
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: getVerticalAlign(block.config?.alignV),
    justifyContent: block.config?.alignH === 'center' ? 'center' : block.config?.alignH === 'right' ? 'flex-end' : 'flex-start',
    width: '100%',
    height: '100%',
  };
  
  const textStyle: React.CSSProperties = {
    fontFamily: getFontFamily(block.style?.fontFamily),
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
    ? (() => {
        const d = dateValue.getDate().toString().padStart(2, '0');
        const mo = (dateValue.getMonth() + 1).toString().padStart(2, '0');
        const y = dateValue.getFullYear();
        return `${d}-${mo}-${y}`;
      })()
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
export function PageNumberRenderer({ block, currentPage = 1, totalPages = 1 }: BlockRendererProps) {
  const format = block.config?.format || 'of_total';

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
  const items = printData.items || [];
  const config = block.config || {};
  
  // Get header labels from config or use defaults
  const headerLabels = config.headerLabels || {
    position: "Pos",
    description: "Omschrijving",
    quantity: "Aantal",
    unit: "Eenh.",
    unitPrice: "Prijs",
    total: "Totaal",
  };
  
  const showHeader = config.showHeader !== false;
  const showBorders = config.showBorders !== false;
  const zebraStriping = config.zebraStriping === true;
  const showUnit = config.showUnit === true;
  
  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '€ 0,00';
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(num);
  };

  // Format quantity — Dutch comma decimal, strip trailing zeros
  const formatQuantity = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 6 }).format(num);
  };
  
  // Items are already sorted server-side by printSortOrder — use as-is
  const sortedItems = items;
  
  if (sortedItems.length === 0) {
    return (
      <div style={block.style || {}} className="text-xs text-gray-400 italic p-2">
        Geen offerteregels beschikbaar
      </div>
    );
  }

  return (
    <div style={block.style || {}} className="w-full h-full overflow-hidden">
      <table className="w-full text-xs border-collapse" style={{ fontSize: block.style?.fontSize || 9 }}>
        {showHeader && (
          <thead>
            <tr className={showBorders ? "border-b border-gray-300" : ""}>
              <th className="py-1 px-1 text-left w-8 font-semibold">{headerLabels.position}</th>
              <th className="py-1 px-1 text-left font-semibold">{headerLabels.description}</th>
              <th className="py-1 px-1 text-right w-14 font-semibold">{headerLabels.quantity}</th>
              {showUnit && <th className="py-1 px-1 text-left w-12 font-semibold">{headerLabels.unit}</th>}
              <th className="py-1 px-1 text-right w-18 font-semibold">{headerLabels.unitPrice}</th>
              <th className="py-1 px-1 text-right w-18 font-semibold">{headerLabels.total}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {sortedItems.map((item, index) => {
            const isTextLine = item.lineType === 'text';
            const rowClass = [
              showBorders ? "border-b border-gray-200" : "",
              zebraStriping && index % 2 === 1 ? "bg-gray-50" : "",
            ].filter(Boolean).join(" ");
            
            return (
              <tr key={index} className={rowClass}>
                <td className="py-1 px-1 text-gray-500">{item.positionNo}</td>
                <td className={`py-1 px-1 ${isTextLine ? 'font-medium' : ''}`}>{item.description}</td>
                <td className="py-1 px-1 text-right">{isTextLine ? '' : formatQuantity(item.quantity)}</td>
                {showUnit && <td className="py-1 px-1 text-left text-gray-600">{isTextLine ? '' : (item.unit || '')}</td>}
                <td className="py-1 px-1 text-right">{isTextLine ? '' : formatCurrency(item.unitPrice)}</td>
                <td className="py-1 px-1 text-right">{isTextLine ? '' : formatCurrency(item.lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
export function GroupBlockRenderer({ block, printData, currentPage = 1, totalPages = 1, itemContext }: BlockRendererProps) {
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
      // Check if block has content (pass itemContext so {{item.*}} fields are evaluated)
      const hasContent = blockHasContent(childBlock, printData, itemContext);
      
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

  // Apply cumulative marginBottom offsets: shift each block's y by the sum of all
  // previous blocks' marginBottom values (sorted by y-position ascending).
  const sortedVisible = [...visibleBlocks].sort((a: any, b: any) =>
    (a.position?.y || 0) - (b.position?.y || 0)
  );
  let cumulativeMarginOffset = 0;
  const blocksWithMargin = sortedVisible.map((childBlock: any) => {
    const marginBottomMm = parseFloat(childBlock.style?.marginBottom || '0') || 0;
    const adjusted = {
      ...childBlock,
      position: {
        ...childBlock.position,
        y: (childBlock.position?.y || 0) + cumulativeMarginOffset,
      },
    };
    cumulativeMarginOffset += marginBottomMm;
    return adjusted;
  });

  // Calculate actual height: include each block's own marginBottom so the container
  // is tall enough to show the spacing after the last block too.
  let calculatedHeight = 0;
  for (const vBlock of blocksWithMargin) {
    const blockMargin = parseFloat(vBlock.style?.marginBottom || '0') || 0;
    const blockBottom = (vBlock.position?.y || 0) + (vBlock.size?.height || 25) + blockMargin;
    calculatedHeight = Math.max(calculatedHeight, blockBottom);
  }

  const useCalculatedHeight = collapseEmpty || cumulativeMarginOffset > 0;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: useCalculatedHeight && calculatedHeight > 0 ? `${mmToPx(calculatedHeight)}px` : '100%',
    overflow: 'visible',
  };
  
  return (
    <div style={containerStyle}>
      {blocksWithMargin.map((childBlock: any, index: number) => {
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
              <BlockRenderer block={childBlock} printData={printData} currentPage={currentPage} totalPages={totalPages} itemContext={itemContext} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// Line Block - horizontal or vertical line
export function LineBlockRenderer({ block }: BlockRendererProps) {
  const { orientation = 'horizontal', strokeWidth = 1, strokeColor = '#000000', strokeStyle = 'solid' } = block.config || {};
  
  const borderStyle = strokeStyle === 'dashed' ? 'dashed' : strokeStyle === 'dotted' ? 'dotted' : 'solid';
  
  if (orientation === 'vertical') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 0,
            height: '100%',
            borderLeft: `${strokeWidth}px ${borderStyle} ${strokeColor}`,
          }}
        />
      </div>
    );
  }
  
  // Horizontal line: use border-top for crisp sub-pixel rendering at any Y position
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          width: '100%',
          height: 0,
          borderTop: `${strokeWidth}px ${borderStyle} ${strokeColor}`,
        }}
      />
    </div>
  );
}

// Rectangle Block - box with optional fill
export function RectangleBlockRenderer({ block }: BlockRendererProps) {
  const { 
    strokeWidth = 1, 
    strokeColor = '#000000', 
    strokeStyle = 'solid',
    fillColor = 'transparent',
    borderRadius = 0,
  } = block.config || {};
  
  const borderStyleValue = strokeStyle === 'dashed' ? 'dashed' : strokeStyle === 'dotted' ? 'dotted' : 'solid';
  
  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        border: `${strokeWidth}px ${borderStyleValue} ${strokeColor}`,
        backgroundColor: fillColor,
        borderRadius: `${borderRadius}px`,
        boxSizing: 'border-box',
      }}
    />
  );
}

// Item Repeater Block - repeats child content for each quotation line item
export function ItemRepeaterRenderer({ block, printData, currentPage = 1, totalPages = 1 }: BlockRendererProps) {
  const items = printData.items || [];
  const config = block.config || {};
  const itemSpacing = config.itemSpacing || 5;
  
  const sortedItems = [...items].sort((a, b) => {
    const posA = parseInt(a.positionNo || '0', 10);
    const posB = parseInt(b.positionNo || '0', 10);
    return posA - posB;
  });
  
  if (sortedItems.length === 0) {
    return (
      <div style={block.style || {}} className="text-xs text-gray-400 italic p-2">
        Geen offerteregels beschikbaar
      </div>
    );
  }

  const getFontFamily = (font?: string): string => {
    const fontMap: Record<string, string> = {
      'helvetica': 'Arial, Helvetica, sans-serif',
      'arial': 'Arial, sans-serif',
      'calibri': 'Calibri, "Segoe UI", sans-serif',
      'times': '"Times New Roman", Times, serif',
      'courier': '"Courier New", Courier, monospace',
      'georgia': 'Georgia, serif',
      'verdana': 'Verdana, sans-serif',
    };
    return fontMap[font || 'arial'] || font || 'Arial, Helvetica, sans-serif';
  };

  return (
    <div style={{ ...block.style, width: '100%' }} className="flex flex-col">
      {sortedItems.map((item, index) => {
        const itemContext = { item, index };
        
        return (
          <div 
            key={index} 
            style={{ 
              marginBottom: index < sortedItems.length - 1 ? `${itemSpacing}px` : 0,
              position: 'relative',
              width: '100%',
              minHeight: block.size?.height || 20,
            }}
          >
            {(config.childBlocks || []).map((childBlock: any, childIndex: number) => {
              const Renderer = BlockRenderers[childBlock.type] || UnknownBlockRenderer;
              
              return (
                <div
                  key={childIndex}
                  style={{
                    position: 'absolute',
                    left: `${childBlock.position?.x || 0}px`,
                    top: `${childBlock.position?.y || 0}px`,
                    width: `${childBlock.size?.width || 50}px`,
                    minHeight: `${childBlock.size?.height || 20}px`,
                    fontSize: `${childBlock.style?.fontSize || 9}pt`,
                    fontFamily: getFontFamily(childBlock.style?.fontFamily),
                    color: childBlock.style?.color || '#000000',
                  }}
                >
                  <Renderer 
                    block={childBlock} 
                    printData={printData}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemContext={itemContext}
                  />
                </div>
              );
            })}
          </div>
        );
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
  'Item Repeater': ItemRepeaterRenderer,
  'Totals Summary': TotalsSummaryRenderer,
  'Footer Block': FooterBlockRenderer,
  'Group': GroupBlockRenderer,
  'Line': LineBlockRenderer,
  'Rectangle': RectangleBlockRenderer,
};

// Fallback renderer for unknown block types
export function UnknownBlockRenderer({ block }: BlockRendererProps) {
  return (
    <div className="border border-dashed border-orange-300 bg-orange-50 p-2 rounded text-xs">
      <div className="text-orange-600 font-medium">Onbekend block type: {block.type}</div>
    </div>
  );
}
