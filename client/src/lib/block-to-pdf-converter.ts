import { jsPDF } from 'jspdf';
import {
  renderPageNumbering,
  renderDateBlock,
  renderCompanyHeader,
  renderLineItemsTable,
  renderTotalsSummary,
  renderFooterBlock,
  renderTextBlock,
  renderDocumentTitle,
  PageNumberingConfig,
  DateBlockConfig,
  CompanyHeaderConfig,
  LineItemsTableConfig,
  TotalsSummaryConfig,
  FooterBlockConfig,
  TextBlockConfig
} from './layout-blocks';

// Union type for all possible block configurations
export type AnyBlockConfig = 
  | { type: 'pageNumbering'; config: PageNumberingConfig }
  | { type: 'date'; config: DateBlockConfig }
  | { type: 'companyHeader'; config: CompanyHeaderConfig }
  | { type: 'lineItemsTable'; config: LineItemsTableConfig }
  | { type: 'totalsSummary'; config: TotalsSummaryConfig }
  | { type: 'footer'; config: FooterBlockConfig }
  | { type: 'text'; config: TextBlockConfig }
  | { type: 'documentTitle'; config: TextBlockConfig & { centered?: boolean } };

/**
 * Universal block-to-PDF converter
 * Automatically selects the appropriate renderer based on block type
 */
export function renderBlockToPDF(
  doc: jsPDF,
  block: AnyBlockConfig
): number {
  switch (block.type) {
    case 'pageNumbering':
      return renderPageNumbering(doc, block.config);
    
    case 'date':
      return renderDateBlock(doc, block.config);
    
    case 'companyHeader':
      return renderCompanyHeader(doc, block.config);
    
    case 'lineItemsTable':
      return renderLineItemsTable(doc, block.config);
    
    case 'totalsSummary':
      return renderTotalsSummary(doc, block.config);
    
    case 'footer':
      return renderFooterBlock(doc, block.config);
    
    case 'text':
      return renderTextBlock(doc, block.config);
    
    case 'documentTitle':
      return renderDocumentTitle(doc, block.config);
    
    default:
      // Type guard ensures this is unreachable
      const _exhaustive: never = block;
      throw new Error(`Unknown block type: ${JSON.stringify(_exhaustive)}`);
  }
}

/**
 * Render multiple blocks sequentially to a PDF
 * Automatically tracks Y position across blocks
 */
export function renderBlocksToPDF(
  doc: jsPDF,
  blocks: AnyBlockConfig[],
  startYPos: number = 15
): number {
  let yPos = startYPos;
  
  for (const block of blocks) {
    yPos = renderBlockToPDF(doc, block);
  }
  
  return yPos;
}

/**
 * Create a complete PDF document from a block configuration array
 */
export function createPDFFromBlocks(
  blocks: AnyBlockConfig[],
  options?: {
    pageFormat?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
    startYPos?: number;
  }
): jsPDF {
  const doc = new jsPDF({
    format: options?.pageFormat || 'a4',
    orientation: options?.orientation || 'portrait'
  });
  
  renderBlocksToPDF(doc, blocks, options?.startYPos);
  
  return doc;
}

/**
 * Layout composition helper: create document sections
 */
export interface DocumentSection {
  name: string;
  blocks: AnyBlockConfig[];
  startOnNewPage?: boolean;
}

export function renderSectionsToPDF(
  doc: jsPDF,
  sections: DocumentSection[],
  startYPos: number = 15
): jsPDF {
  let yPos = startYPos;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Add new page for sections after the first if startOnNewPage is true
    if (i > 0 && section.startOnNewPage) {
      doc.addPage();
      yPos = startYPos;
    }
    
    yPos = renderBlocksToPDF(doc, section.blocks, yPos);
  }
  
  return doc;
}

/**
 * Helper to render a block and return both the PDF and final Y position
 */
export function renderBlockWithPosition(
  doc: jsPDF,
  block: AnyBlockConfig
): { doc: jsPDF; yPos: number } {
  const yPos = renderBlockToPDF(doc, block);
  return { doc, yPos };
}

/**
 * Batch rendering with automatic page breaks
 */
export interface BatchRenderOptions {
  pageHeight?: number;
  bottomMargin?: number;
  onPageBreak?: (doc: jsPDF, pageNumber: number) => void;
}

export function renderBlocksWithAutoPageBreak(
  doc: jsPDF,
  blocks: AnyBlockConfig[],
  startYPos: number = 15,
  options: BatchRenderOptions = {}
): number {
  const pageHeight = options.pageHeight || doc.internal.pageSize.height;
  const bottomMargin = options.bottomMargin || 20;
  const threshold = pageHeight - bottomMargin;
  
  let yPos = startYPos;
  let currentPage = 1;
  
  for (const block of blocks) {
    // Check if we need a page break
    if (yPos > threshold) {
      doc.addPage();
      yPos = startYPos;
      currentPage++;
      
      if (options.onPageBreak) {
        options.onPageBreak(doc, currentPage);
      }
    }
    
    yPos = renderBlockToPDF(doc, block);
  }
  
  return yPos;
}

/**
 * Export utilities
 */
export const blockConverter = {
  renderBlock: renderBlockToPDF,
  renderBlocks: renderBlocksToPDF,
  renderSections: renderSectionsToPDF,
  renderWithAutoPageBreak: renderBlocksWithAutoPageBreak,
  createDocument: createPDFFromBlocks
};
