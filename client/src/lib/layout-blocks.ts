import { jsPDF } from 'jspdf';

// Block Configuration Types
export interface BlockPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface BlockStyle {
  fontSize?: number;
  fontFamily?: 'helvetica' | 'times' | 'courier';
  fontStyle?: 'normal' | 'bold' | 'italic';
  textColor?: [number, number, number];
  alignment?: 'left' | 'center' | 'right';
}

export interface PageNumberingConfig {
  position: BlockPosition;
  style?: BlockStyle;
  format: 'simple' | 'of_total'; // "1" or "1 of 3"
  currentPage: number;
  totalPages: number;
}

export interface DateBlockConfig {
  position: BlockPosition;
  style?: BlockStyle;
  label?: string; // e.g., "Date:", "Datum:"
  date: string; // formatted date string
}

export interface CompanyHeaderConfig {
  position: BlockPosition;
  style?: BlockStyle;
  company: {
    name: string;
    address?: string;
    postalCode?: string;
    city?: string;
    phone?: string;
    email?: string;
    vatNumber?: string;
    cocNumber?: string;
    iban?: string;
    country?: string;
  };
  showLabel?: boolean; // Show "Supplier:" or "Customer:" label
  labelText?: string;
}

export interface LineItemsTableConfig {
  position: BlockPosition;
  style?: BlockStyle;
  headers: {
    position: string;
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  };
  columnPositions: {
    position: number;
    description: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
  items: Array<{
    position: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  currency?: string;
  quantitySuffix?: string; // e.g., "Pcs.", "Units", "Items"
  descriptionMaxWidth?: number; // max width for description text wrapping
  autoPageBreak?: boolean;
  pageBreakThreshold?: number; // y position threshold for page break
}

export interface TotalsSummaryConfig {
  position: BlockPosition;
  style?: BlockStyle;
  totalAmount: number;
  currency?: string;
  showInWords?: boolean;
  totalLabel?: string; // e.g., "Total:", "Totaal:"
  inWordsLabel?: string; // e.g., "Amount in words:"
  totalLabelOffset?: number; // x-offset for total amount value
  inWordsOffset?: number; // x-offset for "amount in words" text
}

export interface FooterBlockConfig {
  position: BlockPosition;
  style?: BlockStyle;
  sections: Array<{
    label: string;
    value: string;
    indent?: number;
  }>;
}

export interface TextBlockConfig {
  position: BlockPosition;
  style?: BlockStyle;
  text: string;
  maxWidth?: number; // for text wrapping
  isBold?: boolean;
}

// Block Renderer Functions

export function renderPageNumbering(
  doc: jsPDF,
  config: PageNumberingConfig
): number {
  const { position, style, format, currentPage, totalPages } = config;
  
  doc.setFontSize(style?.fontSize || 9);
  doc.setFont(style?.fontFamily || 'helvetica', style?.fontStyle || 'normal');
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  const text = format === 'of_total' 
    ? `${currentPage} of ${totalPages}` 
    : `${currentPage}`;
  
  // Handle alignment
  if (style?.alignment === 'right') {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, position.x - textWidth, position.y);
  } else if (style?.alignment === 'center') {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, position.x - (textWidth / 2), position.y);
  } else {
    doc.text(text, position.x, position.y);
  }
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return position.y + 5;
}

export function renderDateBlock(
  doc: jsPDF,
  config: DateBlockConfig
): number {
  const { position, style, label, date } = config;
  
  doc.setFontSize(style?.fontSize || 9);
  doc.setFont(style?.fontFamily || 'helvetica', style?.fontStyle || 'normal');
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  const text = label ? `${label} ${date}` : date;
  
  // Handle alignment
  if (style?.alignment === 'right') {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, position.x - textWidth, position.y);
  } else if (style?.alignment === 'center') {
    const textWidth = doc.getTextWidth(text);
    doc.text(text, position.x - (textWidth / 2), position.y);
  } else {
    doc.text(text, position.x, position.y);
  }
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return position.y + 5;
}

export function renderCompanyHeader(
  doc: jsPDF,
  config: CompanyHeaderConfig
): number {
  const { position, style, company, showLabel, labelText } = config;
  let yPos = position.y;
  
  doc.setFontSize(style?.fontSize || 9);
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  // Determine font styles - respect style.fontStyle or use sensible defaults
  const headerFontStyle = style?.fontStyle || 'bold'; // Company name/label default to bold
  const detailFontStyle = style?.fontStyle || 'normal'; // Details default to normal
  
  // Helper function to render text with alignment
  const renderAlignedText = (text: string, baseX: number, y: number) => {
    if (style?.alignment === 'right') {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, baseX - textWidth, y);
    } else if (style?.alignment === 'center') {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, baseX - (textWidth / 2), y);
    } else {
      doc.text(text, baseX, y);
    }
  };
  
  // Company label
  if (showLabel && labelText) {
    doc.setFont(style?.fontFamily || 'helvetica', headerFontStyle);
    renderAlignedText(labelText, position.x, yPos);
    yPos += 5;
  }
  
  // Company name
  doc.setFont(style?.fontFamily || 'helvetica', headerFontStyle);
  const nameXPos = showLabel ? position.x + 15 : position.x;
  renderAlignedText(company.name, nameXPos, yPos);
  yPos += 5;
  
  // Company details
  doc.setFont(style?.fontFamily || 'helvetica', detailFontStyle);
  const indent = showLabel ? position.x + 15 : position.x;
  const detailXPos = showLabel ? position.x : indent;
  
  if (company.address) {
    renderAlignedText(company.address, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.postalCode || company.city) {
    const cityLine = `${company.postalCode || ''}${company.postalCode && company.city ? ', ' : ''}${company.city || ''}`;
    renderAlignedText(cityLine, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.phone) {
    renderAlignedText(company.phone, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.email) {
    renderAlignedText(company.email, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.vatNumber) {
    renderAlignedText(`VAT no. ${company.vatNumber}`, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.cocNumber) {
    renderAlignedText(`C.o.c. no. ${company.cocNumber}`, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.iban) {
    renderAlignedText(`IBAN: ${company.iban}`, detailXPos, yPos);
    yPos += 5;
  }
  
  if (company.country) {
    renderAlignedText(company.country, detailXPos, yPos);
    yPos += 5;
  }
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return yPos;
}

export function renderLineItemsTable(
  doc: jsPDF,
  config: LineItemsTableConfig
): number {
  const { 
    position, 
    style, 
    headers, 
    columnPositions, 
    items, 
    currency = '€', 
    quantitySuffix = 'Pcs.',
    descriptionMaxWidth = 105,
    autoPageBreak, 
    pageBreakThreshold 
  } = config;
  let yPos = position.y;
  
  doc.setFontSize(style?.fontSize || 9);
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  // Determine font styles - respect style.fontStyle or use sensible defaults
  const headerFontStyle = style?.fontStyle || 'bold'; // Headers default to bold
  const itemFontStyle = style?.fontStyle || 'normal'; // Items default to normal
  
  // Calculate current table bounds from absolute column positions
  const minColumnX = Math.min(
    columnPositions.position,
    columnPositions.description,
    columnPositions.quantity,
    columnPositions.unitPrice,
    columnPositions.totalPrice
  );
  const maxColumnX = Math.max(
    columnPositions.position,
    columnPositions.description,
    columnPositions.quantity,
    columnPositions.unitPrice,
    columnPositions.totalPrice
  );
  const tableWidth = position.width || (maxColumnX - minColumnX);
  
  let tableXOffset = 0;
  
  // Apply table-level alignment by calculating offset from current position to desired position
  // position.x is the anchor point; alignment determines what part of the table anchors there
  if (style?.alignment === 'right') {
    // Table should end at position.x: shift from current maxColumnX to position.x
    tableXOffset = position.x - maxColumnX;
  } else if (style?.alignment === 'center') {
    // Table center should be at position.x: shift from current center to position.x
    const currentCenterX = minColumnX + (tableWidth / 2);
    tableXOffset = position.x - currentCenterX;
  } else {
    // Left alignment (default): table should start at position.x
    tableXOffset = position.x - minColumnX;
  }
  
  // Table headers
  doc.setFont(style?.fontFamily || 'helvetica', headerFontStyle);
  doc.text(headers.position, columnPositions.position + tableXOffset, yPos);
  doc.text(headers.description, columnPositions.description + tableXOffset, yPos);
  doc.text(headers.quantity, columnPositions.quantity + tableXOffset, yPos);
  doc.text(headers.unitPrice, columnPositions.unitPrice + tableXOffset, yPos);
  doc.text(headers.totalPrice, columnPositions.totalPrice + tableXOffset, yPos);
  
  yPos += 5;
  
  // Table items
  doc.setFont(style?.fontFamily || 'helvetica', itemFontStyle);
  items.forEach((item) => {
    // Check for page break
    if (autoPageBreak && pageBreakThreshold && yPos > pageBreakThreshold) {
      doc.addPage();
      yPos = 30;
      
      // Re-render headers on new page
      doc.setFont(style?.fontFamily || 'helvetica', headerFontStyle);
      doc.text(headers.position, columnPositions.position + tableXOffset, yPos);
      doc.text(headers.description, columnPositions.description + tableXOffset, yPos);
      doc.text(headers.quantity, columnPositions.quantity + tableXOffset, yPos);
      doc.text(headers.unitPrice, columnPositions.unitPrice + tableXOffset, yPos);
      doc.text(headers.totalPrice, columnPositions.totalPrice + tableXOffset, yPos);
      yPos += 5;
      doc.setFont(style?.fontFamily || 'helvetica', itemFontStyle);
    }
    
    // Position number
    doc.setFont(style?.fontFamily || 'helvetica', headerFontStyle);
    doc.text(item.position, columnPositions.position + tableXOffset, yPos);
    
    // Description (multi-line)
    doc.setFont(style?.fontFamily || 'helvetica', itemFontStyle);
    const descLines = doc.splitTextToSize(item.description, descriptionMaxWidth);
    descLines.forEach((line: string, idx: number) => {
      doc.text(line, columnPositions.description + tableXOffset, yPos + (idx * 5));
    });
    
    // Quantity
    doc.text(`${item.quantity} ${quantitySuffix}`, columnPositions.quantity + tableXOffset, yPos);
    
    // Unit Price
    const unitPriceFormatted = `${currency} ${item.unitPrice.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    doc.text(unitPriceFormatted, columnPositions.unitPrice + tableXOffset, yPos);
    
    // Total Price
    const totalPriceFormatted = `${currency} ${item.totalPrice.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    doc.text(totalPriceFormatted, columnPositions.totalPrice + tableXOffset, yPos);
    
    yPos += Math.max(descLines.length * 5, 5) + 10;
  });
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return yPos + 5;
}

export function renderTotalsSummary(
  doc: jsPDF,
  config: TotalsSummaryConfig
): number {
  const { 
    position, 
    style, 
    totalAmount, 
    currency = '€', 
    showInWords, 
    totalLabel = 'Total:', 
    inWordsLabel = 'Amount in words:',
    totalLabelOffset = 25,
    inWordsOffset = 0
  } = config;
  let yPos = position.y;
  
  doc.setFontSize(style?.fontSize || 9);
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  // Total line - respect style.fontStyle or default to bold for emphasis
  doc.setFont(style?.fontFamily || 'helvetica', style?.fontStyle || 'bold');
  
  const totalText = `${totalLabel} ${currency} ${totalAmount.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  
  // Handle alignment for total line
  if (style?.alignment === 'right') {
    const textWidth = doc.getTextWidth(totalText);
    doc.text(totalText, position.x - textWidth, yPos);
  } else if (style?.alignment === 'center') {
    const textWidth = doc.getTextWidth(totalText);
    doc.text(totalText, position.x - (textWidth / 2), yPos);
  } else {
    // Left alignment (default) - render label and amount separately with offset
    doc.text(totalLabel, position.x, yPos);
    doc.text(`${currency} ${totalAmount.toLocaleString('nl-NL', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, position.x + totalLabelOffset, yPos);
  }
  
  yPos += 10;
  
  // Amount in words
  if (showInWords) {
    // Respect fontStyle for in-words line as well, default to normal for subtle emphasis
    doc.setFont(style?.fontFamily || 'helvetica', style?.fontStyle || 'normal');
    // Use style.fontSize or default to slightly smaller (8) for in-words emphasis
    doc.setFontSize(style?.fontSize ? style.fontSize - 1 : 8);
    const inWords = numberToWords(totalAmount);
    const inWordsText = `${inWordsLabel} ${inWords}`;
    
    // Handle alignment for in-words line
    if (style?.alignment === 'right') {
      const textWidth = doc.getTextWidth(inWordsText);
      doc.text(inWordsText, position.x - textWidth, yPos);
    } else if (style?.alignment === 'center') {
      const textWidth = doc.getTextWidth(inWordsText);
      doc.text(inWordsText, position.x - (textWidth / 2), yPos);
    } else {
      doc.text(inWordsText, position.x + inWordsOffset, yPos);
    }
    yPos += 10;
  }
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return yPos;
}

export function renderFooterBlock(
  doc: jsPDF,
  config: FooterBlockConfig
): number {
  const { position, style, sections } = config;
  let yPos = position.y;
  
  doc.setFontSize(style?.fontSize || 9);
  doc.setFont(style?.fontFamily || 'helvetica', style?.fontStyle || 'normal');
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  // Helper function for alignment
  const renderAlignedText = (text: string, baseX: number, y: number) => {
    if (style?.alignment === 'right') {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, baseX - textWidth, y);
    } else if (style?.alignment === 'center') {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, baseX - (textWidth / 2), y);
    } else {
      doc.text(text, baseX, y);
    }
  };
  
  sections.forEach((section) => {
    const xPos = position.x + (section.indent || 0);
    const text = section.label ? `${section.label} ${section.value}` : section.value;
    renderAlignedText(text, xPos, yPos);
    yPos += 5;
  });
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return yPos;
}

export function renderTextBlock(
  doc: jsPDF,
  config: TextBlockConfig
): number {
  const { position, style, text, maxWidth, isBold } = config;
  let yPos = position.y;
  
  doc.setFontSize(style?.fontSize || 9);
  doc.setFont(
    style?.fontFamily || 'helvetica', 
    isBold ? 'bold' : (style?.fontStyle || 'normal')
  );
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  if (maxWidth) {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      // Handle alignment for each line
      if (style?.alignment === 'right') {
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, position.x + maxWidth - lineWidth, yPos);
      } else if (style?.alignment === 'center') {
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, position.x + (maxWidth - lineWidth) / 2, yPos);
      } else {
        doc.text(line, position.x, yPos);
      }
      yPos += 5;
    });
  } else {
    // Handle alignment for single line
    if (style?.alignment === 'right') {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, position.x - textWidth, yPos);
    } else if (style?.alignment === 'center') {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, position.x - (textWidth / 2), yPos);
    } else {
      doc.text(text, position.x, yPos);
    }
    yPos += 5;
  }
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return yPos;
}

export function renderDocumentTitle(
  doc: jsPDF,
  config: TextBlockConfig & { centered?: boolean }
): number {
  const { position, style, text, centered } = config;
  
  doc.setFontSize(style?.fontSize || 16);
  doc.setFont(style?.fontFamily || 'helvetica', style?.fontStyle || 'bold');
  
  if (style?.textColor) {
    doc.setTextColor(...style.textColor);
  }
  
  if (centered || style?.alignment === 'center') {
    const pageWidth = doc.internal.pageSize.width;
    const titleWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - titleWidth) / 2, position.y);
  } else if (style?.alignment === 'right') {
    const titleWidth = doc.getTextWidth(text);
    doc.text(text, position.x - titleWidth, position.y);
  } else {
    doc.text(text, position.x, position.y);
  }
  
  // Reset color
  doc.setTextColor(0, 0, 0);
  
  return position.y + 10;
}

// Helper function for number to words conversion (moved from QuotationFormLayout)
function numberToWords(amount: number): string {
  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  let result = '';
  
  if (euros >= 1000000) {
    const millions = Math.floor(euros / 1000000);
    result += numberToWords(millions).replace(' euro', '') + ' million ';
    const remainder = euros % 1000000;
    if (remainder > 0) result += numberToWords(remainder).replace(' euro', '') + ' ';
  } else if (euros >= 1000) {
    const thousands = Math.floor(euros / 1000);
    result += numberToWords(thousands).replace(' euro', '') + ' thousand ';
    const remainder = euros % 1000;
    if (remainder > 0) result += numberToWords(remainder).replace(' euro', '') + ' ';
  } else if (euros >= 100) {
    const hundreds = Math.floor(euros / 100);
    result += ones[hundreds] + ' hundred ';
    const remainder = euros % 100;
    if (remainder > 0) result += numberToWords(remainder).replace(' euro', '') + ' ';
  } else if (euros >= 20) {
    result += tens[Math.floor(euros / 10)] + ' ';
    if (euros % 10 > 0) result += ones[euros % 10] + ' ';
  } else if (euros >= 10) {
    result += teens[euros - 10] + ' ';
  } else if (euros > 0) {
    result += ones[euros] + ' ';
  } else if (euros === 0) {
    // Handle zero case explicitly
    result += 'zero ';
  }
  
  result += 'euro';
  
  if (cents > 0) {
    result += ' and ' + numberToWords(cents).replace(' euro', '') + ' cent';
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}
