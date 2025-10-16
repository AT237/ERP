import {
  BlockPosition,
  BlockStyle,
  PageNumberingConfig,
  DateBlockConfig,
  CompanyHeaderConfig,
  LineItemsTableConfig,
  TotalsSummaryConfig,
  FooterBlockConfig,
  TextBlockConfig
} from './layout-blocks';

// Default styling presets
export const defaultStyles = {
  header: {
    fontSize: 9,
    fontFamily: 'helvetica' as const,
    fontStyle: 'bold' as const,
    textColor: [0, 0, 0] as [number, number, number],
    alignment: 'left' as const
  },
  body: {
    fontSize: 9,
    fontFamily: 'helvetica' as const,
    fontStyle: 'normal' as const,
    textColor: [0, 0, 0] as [number, number, number],
    alignment: 'left' as const
  },
  title: {
    fontSize: 16,
    fontFamily: 'helvetica' as const,
    fontStyle: 'bold' as const,
    textColor: [0, 0, 0] as [number, number, number],
    alignment: 'center' as const
  },
  footer: {
    fontSize: 8,
    fontFamily: 'helvetica' as const,
    fontStyle: 'normal' as const,
    textColor: [0, 0, 0] as [number, number, number],
    alignment: 'left' as const
  }
};

// Configuration builder helpers
export function createPageNumberingConfig(
  position: BlockPosition,
  options?: Partial<PageNumberingConfig>
): PageNumberingConfig {
  return {
    position,
    style: options?.style || defaultStyles.footer,
    format: options?.format || 'of_total',
    currentPage: options?.currentPage || 1,
    totalPages: options?.totalPages || 1
  };
}

export function createDateBlockConfig(
  position: BlockPosition,
  date: string,
  options?: Partial<DateBlockConfig>
): DateBlockConfig {
  return {
    position,
    style: options?.style || defaultStyles.body,
    label: options?.label || 'Date:',
    date
  };
}

export function createCompanyHeaderConfig(
  position: BlockPosition,
  company: CompanyHeaderConfig['company'],
  options?: Partial<CompanyHeaderConfig>
): CompanyHeaderConfig {
  return {
    position,
    style: options?.style || defaultStyles.header,
    company,
    showLabel: options?.showLabel ?? false,
    labelText: options?.labelText || 'Company:'
  };
}

export function createLineItemsTableConfig(
  position: BlockPosition,
  items: LineItemsTableConfig['items'],
  options?: Partial<LineItemsTableConfig>
): LineItemsTableConfig {
  return {
    position,
    style: options?.style || defaultStyles.body,
    headers: options?.headers || {
      position: 'Position',
      description: 'Description',
      quantity: 'Quantity',
      unitPrice: 'Unit Price:',
      totalPrice: 'Total Price:'
    },
    columnPositions: options?.columnPositions || {
      position: 15,
      description: 35,
      quantity: 130,
      unitPrice: 155,
      totalPrice: 180
    },
    items,
    currency: options?.currency || '€',
    quantitySuffix: options?.quantitySuffix || 'Pcs.',
    descriptionMaxWidth: options?.descriptionMaxWidth || 105,
    autoPageBreak: options?.autoPageBreak ?? true,
    pageBreakThreshold: options?.pageBreakThreshold || 250
  };
}

export function createTotalsSummaryConfig(
  position: BlockPosition,
  totalAmount: number,
  options?: Partial<TotalsSummaryConfig>
): TotalsSummaryConfig {
  return {
    position,
    style: options?.style || defaultStyles.body,
    totalAmount,
    currency: options?.currency || '€',
    showInWords: options?.showInWords ?? true,
    totalLabel: options?.totalLabel || 'Total:',
    inWordsLabel: options?.inWordsLabel || 'Amount in words:',
    totalLabelOffset: options?.totalLabelOffset || 25,
    inWordsOffset: options?.inWordsOffset || 80
  };
}

export function createFooterBlockConfig(
  position: BlockPosition,
  sections: FooterBlockConfig['sections'],
  options?: Partial<FooterBlockConfig>
): FooterBlockConfig {
  return {
    position,
    style: options?.style || defaultStyles.footer,
    sections
  };
}

export function createTextBlockConfig(
  position: BlockPosition,
  text: string,
  options?: Partial<TextBlockConfig>
): TextBlockConfig {
  return {
    position,
    style: options?.style || defaultStyles.body,
    text,
    maxWidth: options?.maxWidth,
    isBold: options?.isBold ?? false
  };
}

// Default block configurations for common use cases
export const defaultBlockConfigs = {
  // Standard A4 page dimensions (210 x 297 mm = ~595 x 842 points)
  a4Portrait: {
    width: 595,
    height: 842,
    margin: 15
  },
  
  a4Landscape: {
    width: 842,
    height: 595,
    margin: 15
  },
  
  // Default supplier info for ATE Solutions
  defaultSupplier: {
    name: 'ATE Solutions B.V.',
    address: 'Oude Telgterweg 255',
    postalCode: '3853PG',
    city: 'ERMELO',
    phone: '0031 682332087',
    email: 'info@atesolutions.nl',
    vatNumber: 'NL 8656 38792 B01',
    cocNumber: '91385415',
    iban: 'NL28INGB 0102962979',
    country: 'The Netherlands'
  }
};

// Asset management helpers
export interface BlockAsset {
  id: string;
  type: 'logo' | 'image' | 'signature';
  dataUri: string; // Base64 encoded image
  width?: number;
  height?: number;
}

const assetRegistry: Map<string, BlockAsset> = new Map();

export function registerAsset(asset: BlockAsset): void {
  assetRegistry.set(asset.id, asset);
}

export function getAsset(id: string): BlockAsset | undefined {
  return assetRegistry.get(id);
}

export function listAssets(type?: BlockAsset['type']): BlockAsset[] {
  const assets = Array.from(assetRegistry.values());
  return type ? assets.filter(asset => asset.type === type) : assets;
}

// Utility to convert image file to data URI for use in PDF
export async function imageToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Template text snippets for common blocks
export const templateTexts = {
  quotation: {
    title: (quotationNumber: string) => `QUOTATION ${quotationNumber}`,
    description: 'Quotation description:',
    notes: 'Notes:',
    conditions: {
      payment: 'Payment conditions:',
      delivery: 'Delivery:',
      deliveryTime: 'Delivery time:',
      validity: 'Validity:'
    },
    signature: 'Kind regards, A. Tomassen',
    footer: 'Our general terms and conditions apply to all our deliveries.'
  },
  
  invoice: {
    title: (invoiceNumber: string) => `INVOICE ${invoiceNumber}`,
    dueDate: 'Due date:',
    paymentTerms: 'Payment terms:',
    bankDetails: 'Bank details:',
    footer: 'Please pay within the specified term.'
  },
  
  packingList: {
    title: (packingListNumber: string) => `PACKING LIST ${packingListNumber}`,
    shipmentDate: 'Shipment date:',
    carrier: 'Carrier:',
    trackingNumber: 'Tracking number:'
  }
};

// Multi-language support for block text
export const translations = {
  en: {
    position: 'Position',
    description: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price:',
    totalPrice: 'Total Price:',
    total: 'Total:',
    amountInWords: 'Amount in words:',
    date: 'Date:',
    supplier: 'Supplier:',
    customer: 'Customer:',
    pageOf: 'of'
  },
  
  nl: {
    position: 'Positie',
    description: 'Omschrijving',
    quantity: 'Aantal',
    unitPrice: 'Eenheidsprijs:',
    totalPrice: 'Totaalprijs:',
    total: 'Totaal:',
    amountInWords: 'Bedrag in woorden:',
    date: 'Datum:',
    supplier: 'Leverancier:',
    customer: 'Klant:',
    pageOf: 'van'
  }
};

export function getTranslations(language: 'en' | 'nl' = 'en') {
  return translations[language];
}
