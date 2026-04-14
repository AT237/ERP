export interface FieldTable {
  name: string;
  label: string;
  fields: string[];
}

export const FIELD_LABELS: Record<string, string> = {
  positionNo: 'Pos. Nr.', lineType: 'Regeltype', description: 'Omschrijving',
  descriptionInternal: 'Interne omschrijving', quantity: 'Aantal', unit: 'Eenheid',
  unitPrice: 'Prijs per eenheid', lineTotal: 'Regel totaal', discountPercent: 'Korting %', netUnitPrice: 'Netto prijs (na korting)',
  printProjectNo: 'Project nr. afdrukken', printPaymentConditions: 'Betalingscondities afdrukken',
  workDate: 'Werkdatum', technicianNames: 'Techniciennamen', technicianIds: 'Techniciën IDs',
  customerRateId: 'Tarief ID', itemId: 'Artikel ID', sourceSnippetId: 'Snippet ID',
  sourceSnippetVersion: 'Snippet versie', deliveryDate: 'Leverdatum', hsCode: 'HS Code',
  countryOfOrigin: 'Land van oorsprong', lineImage: 'Regelafbeelding', printCocHs: 'COC/HS afdrukken', lineNumber: 'Regelnummer',
  quotationNumber: 'Offerte nr.', quotationDate: 'Offerte datum', validUntil: 'Geldig tot',
  validityDays: 'Geldig (dagen)', revisionNumber: 'Revisie nr.', status: 'Status',
  isBudgetQuotation: 'Budgetofferte', subtotal: 'Subtotaal', taxAmount: 'BTW bedrag',
  totalAmount: 'Totaal bedrag', totalAmountInWords: 'Totaal bedrag in woorden', incoTerms: 'Incoterms', paymentConditions: 'Betalingsconditie',
  portOfLoading: 'Port of Loading', portOfDischarge: 'Port of Discharge', finalDestination: 'Final Destination', modeOfShipment: 'Mode of Shipment', paymentTermsType: 'Payment Terms Type',
  countryOfOriginName: 'Land van oorsprong (naam)', grossWeight: 'Bruto gewicht', placeOfConsignment: 'Plaats van verzending', countryOfSupply: 'Land van levering', countryOfSupplyName: 'Land van levering (naam)', freightText: 'Vrachtinfo', deliveryTime: 'Levertijd', validity: 'Geldigheid', signoffName: 'Ondertekening', paymentSchedule: 'Betalingsschema',
  deliveryConditions: 'Leveringsconditie', notes: 'Notities', invoiceNumber: 'Factuur nr.',
  invoiceDate: 'Factuurdatum', dueDate: 'Vervaldatum', paidAmount: 'Betaald bedrag',
  orderNumber: 'Order nr.', orderDate: 'Orderdatum', expectedDate: 'Verwachte datum',
  expectedDeliveryDate: 'Verwachte levering', priority: 'Prioriteit', assignedTo: 'Toegewezen aan',
  packingListNumber: 'Paklijst nr.', packingDate: 'Pakdatum', shipDate: 'Verzenddatum',
  shippingMethod: 'Verzendmethode', shippingAddress: 'Verzendadres',
  trackingNumber: 'Track & Trace', totalWeight: 'Totaal gewicht', totalPackages: 'Totaal colli',
  packedQuantity: 'Ingepakt', packageNumber: 'Collinummer', weight: 'Gewicht', workOrderNumber: 'Werkorder nr.',
  requestNumber: 'Aanvraag nr.', requestDate: 'Aanvraagdatum', name: 'Naam',
  customerNumber: 'Klantnummer', kvkNummer: 'KvK nummer', generalEmail: 'Algemeen e-mail',
  email: 'E-mail', phone: 'Telefoon', mobile: 'Mobiel', contactPersonEmail: 'Contactpersoon e-mail',
  taxId: 'BTW nummer', bankAccount: 'Bankrekening', invoiceEmail: 'Factuur e-mail',
  invoiceNotes: 'Factuurnotities', memo: 'Memo', paymentTerms: 'Betaaltermijn',
  supplierNumber: 'Leveranciersnummer', contactPerson: 'Contactpersoon',
  prospectNumber: 'Prospectnummer', companyName: 'Bedrijfsnaam', contactName: 'Contactnaam',
  source: 'Bron', projectNumber: 'Projectnummer', startDate: 'Startdatum', endDate: 'Einddatum',
  totalValue: 'Totale waarde', progress: 'Voortgang', legalName: 'Juridische naam',
  website: 'Website', btwNummer: 'BTW nr.', iban: 'IBAN', bankName: 'Banknaam',
  'address.street': 'Adres - Straat', 'address.houseNumber': 'Adres - Huisnummer',
  'address.postalCode': 'Adres - Postcode', 'address.city': 'Adres - Stad', 'address.country': 'Adres - Land',
  street: 'Straat', houseNumber: 'Huisnummer', postalCode: 'Postcode', city: 'Stad',
  country: 'Land', province: 'Provincie', type: 'Type', code: 'Code', region: 'Regio',
  phoneCode: 'Telefooncode', category: 'Categorie', language: 'Taal', sku: 'Artikelcode',
  costPrice: 'Inkoopprijs', margin: 'Marge', currentStock: 'Huidige voorraad',
  minimumStock: 'Minimumvoorraad', symbol: 'Symbool', percentage: 'Percentage',
  isDefault: 'Standaard', order: 'Volgorde', color: 'Kleur', title: 'Titel',
  content: 'Inhoud', version: 'Versie', url: 'URL', width: 'Breedte', height: 'Hoogte',
  function: 'Functie', logoUrl: 'Logo URL',
  vatRatePercent: 'BTW tarief (%)',
  contractNumber: 'Contractnummer', contractDate: 'Contractdatum',
  articleNumber: 'Artikelnummer', itemType: 'Item Type', indentLevel: 'Inspringing',
  fontFamily: 'Lettertype', fontWeight: 'Lettergewicht', fontColor: 'Letterkleur',
  countryName: 'Landnaam',
  collieNumber: 'Collinummer',
};

export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

export const AVAILABLE_TABLES: FieldTable[] = [
  { name: 'quotation', label: 'Offerte', fields: ['quotationNumber', 'quotationDate', 'validUntil', 'validityDays', 'description', 'revisionNumber', 'status', 'isBudgetQuotation', 'subtotal', 'taxAmount', 'totalAmount', 'totalAmountInWords', 'incoTerms', 'paymentConditions', 'deliveryConditions', 'notes'] },
  { name: 'quotationItems', label: 'Offerte Regels', fields: ['positionNo', 'lineType', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal', 'itemId', 'sourceSnippetId', 'deliveryDate', 'hsCode', 'countryOfOrigin', 'lineImage', 'printCocHs'] },
  { name: 'invoice', label: 'Factuur', fields: ['invoiceNumber', 'invoiceDate', 'dueDate', 'description', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'totalAmountInWords', 'paidAmount', 'vatRatePercent', 'notes', 'paymentTerms', 'workOrderNumbers', 'incoTerms', 'printProjectNo', 'printPaymentConditions'] },
  { name: 'invoiceItems', label: 'Factuur Regels', fields: ['positionNo', 'lineType', 'description', 'descriptionInternal', 'quantity', 'unit', 'unitPrice', 'discountPercent', 'netUnitPrice', 'lineTotal', 'workDate', 'technicianNames', 'technicianIds', 'customerRateId', 'itemId', 'sourceSnippetId', 'sourceSnippetVersion', 'hsCode', 'countryOfOrigin', 'lineImage', 'printCocHs'] },
  { name: 'proformaInvoice', label: 'Proforma Factuur', fields: ['proformaNumber', 'invoiceNumber', 'invoiceDate', 'dueDate', 'description', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'totalAmountInWords', 'paidAmount', 'vatRatePercent', 'notes', 'paymentTerms', 'incoTerms', 'portOfLoading', 'portOfDischarge', 'finalDestination', 'modeOfShipment', 'paymentTermsType', 'paymentSchedule', 'countryOfOrigin', 'countryOfOriginName', 'grossWeight', 'placeOfConsignment', 'countryOfSupply', 'countryOfSupplyName', 'freightText', 'deliveryTime', 'validity', 'signoffName', 'printProjectNo', 'printPaymentConditions'] },
  { name: 'proformaInvoiceItems', label: 'Proforma Factuur Regels', fields: ['positionNo', 'lineType', 'description', 'descriptionInternal', 'quantity', 'unit', 'unitPrice', 'discountPercent', 'netUnitPrice', 'lineTotal', 'workDate', 'technicianNames', 'technicianIds', 'customerRateId', 'itemId', 'sourceSnippetId', 'sourceSnippetVersion', 'hsCode', 'countryOfOrigin', 'lineImage', 'printCocHs'] },
  { name: 'purchaseOrder', label: 'Inkooporder', fields: ['orderNumber', 'orderDate', 'expectedDate', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
  { name: 'purchaseOrderItems', label: 'Inkooporder Regels', fields: ['positionNo', 'lineType', 'description', 'quantity', 'unit', 'unitPrice', 'discountPercent', 'lineTotal', 'costPrice', 'hsCode', 'countryOfOrigin', 'itemId'] },
  { name: 'salesOrder', label: 'Verkooporder', fields: ['orderNumber', 'orderDate', 'expectedDeliveryDate', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
  { name: 'salesOrderItems', label: 'Verkooporder Regels', fields: ['positionNo', 'lineNumber', 'description', 'quantity', 'unit', 'unitPrice', 'lineTotal'] },
  { name: 'workOrders', label: 'Werkorders (gekoppeld)', fields: ['orderNumber', 'title', 'description', 'status', 'priority', 'assignedTo', 'startDate', 'dueDate', 'completedDate', 'estimatedHours', 'actualHours'] },
  { name: 'packingList', label: 'Paklijst', fields: ['packingListNumber', 'packingDate', 'shipDate', 'status', 'shippingMethod', 'shippingAddress', 'trackingNumber', 'totalWeight', 'totalPackages', 'notes'] },
  { name: 'packingListItems', label: 'Paklijst Regels', fields: ['positionNo', 'lineType', 'description', 'descriptionInternal', 'quantity', 'packedQuantity', 'unit', 'itemId', 'hsCode', 'countryOfOrigin', 'lineImage', 'printCocHs', 'weight', 'collieNumber'] },
  { name: 'quotationRequest', label: 'Offerte Aanvraag', fields: ['requestNumber', 'requestDate', 'dueDate', 'title', 'description', 'requirements', 'status', 'priority', 'subtotal', 'taxAmount', 'totalAmount', 'notes'] },
  { name: 'quotationRequestItems', label: 'Offerte Aanvraag Regels', fields: ['positionNo', 'lineType', 'description', 'quantity', 'unit', 'unitPrice', 'discountPercent', 'lineTotal', 'costPrice', 'hsCode', 'countryOfOrigin', 'itemId'] },
  { name: 'contract', label: 'Contract', fields: ['contractNumber', 'contractDate', 'validUntil', 'description', 'status', 'notes'] },
  { name: 'contractItems', label: 'Contract Regels', fields: ['articleNumber', 'itemType', 'content', 'indentLevel', 'fontFamily', 'fontSize', 'fontWeight', 'fontColor'] },

  { name: 'customer', label: 'Klant', fields: ['customerNumber', 'name', 'kvkNummer', 'generalEmail', 'email', 'phone', 'mobile', 'contactPersonEmail', 'taxId', 'bankAccount', 'invoiceEmail', 'invoiceNotes', 'memo', 'paymentTerms', 'status', 'countryName', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },
  { name: 'customerContact', label: 'Klant Contact', fields: ['name', 'email', 'phone', 'function'] },
  { name: 'supplier', label: 'Leverancier', fields: ['supplierNumber', 'name', 'email', 'phone', 'contactPerson', 'taxId', 'paymentTerms', 'status', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },
  { name: 'prospect', label: 'Prospect', fields: ['prospectNumber', 'companyName', 'contactName', 'email', 'phone', 'status', 'source', 'notes'] },
  { name: 'project', label: 'Project', fields: ['projectNumber', 'name', 'description', 'status', 'startDate', 'endDate', 'totalValue', 'progress'] },
  { name: 'company', label: 'Bedrijf (Eigen)', fields: ['name', 'legalName', 'email', 'phone', 'website', 'kvkNummer', 'btwNummer', 'iban', 'bankName', 'logoUrl', 'address.street', 'address.houseNumber', 'address.postalCode', 'address.city', 'address.country'] },

  { name: 'inventoryItem', label: 'Product/Artikel', fields: ['name', 'sku', 'description', 'category', 'unit', 'unitPrice', 'costPrice', 'margin', 'currentStock', 'minimumStock', 'status'] },

  { name: 'address', label: 'Adres', fields: ['street', 'houseNumber', 'postalCode', 'city', 'country', 'province', 'type'] },
  { name: 'country', label: 'Land', fields: ['code', 'name', 'region', 'phoneCode'] },
  { name: 'city', label: 'Stad', fields: ['name', 'postalCode', 'province'] },
  { name: 'language', label: 'Taal', fields: ['code', 'name'] },

  { name: 'unitOfMeasure', label: 'Eenheid', fields: ['code', 'name', 'description', 'symbol'] },
  { name: 'paymentDays', label: 'Betalingsdagen', fields: ['code', 'days', 'description'] },
  { name: 'paymentSchedule', label: 'Betalingsschema', fields: ['code', 'name', 'description'] },
  { name: 'paymentTerms', label: 'Betalingsvoorwaarden', fields: ['code', 'description', 'days'] },
  { name: 'incoterms', label: 'Incoterms', fields: ['code', 'name', 'description'] },
  { name: 'vatRate', label: 'BTW Tarief', fields: ['code', 'percentage', 'description', 'isDefault'] },
  { name: 'status', label: 'Status', fields: ['code', 'name', 'category', 'color', 'order'] },

  { name: 'textSnippet', label: 'Tekst Snippet', fields: ['title', 'content', 'category', 'language', 'version'] },
  { name: 'image', label: 'Afbeelding', fields: ['name', 'description', 'url', 'category', 'width', 'height'] },
];

export function getContractPlaceholderTables(): FieldTable[] {
  const orderedNames = ['customer', 'company', 'contract', 'contractItems'];
  return orderedNames
    .map(name => AVAILABLE_TABLES.find(t => t.name === name))
    .filter((t): t is FieldTable => !!t);
}
