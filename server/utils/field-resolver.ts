import { db } from "../db";
import { quotations, customers, projects, companyProfiles, addresses, quotationItems, invoices, invoiceItems, paymentDays, unitsOfMeasure } from "../../shared/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Convert a numeric amount to English words.
 * Example: 14692.49 → "Fourteen thousand six hundred ninety-two euros and forty-nine cents"
 */
export function amountToWords(amount: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tensWords = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function threeDigits(n: number): string {
    if (n === 0) return '';
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' hundred';
      n = n % 100;
      if (n > 0) result += ' ';
    }
    if (n >= 20) {
      result += tensWords[Math.floor(n / 10)];
      if (n % 10 > 0) result += '-' + ones[n % 10];
    } else if (n > 0) {
      result += ones[n];
    }
    return result;
  }

  if (isNaN(amount) || amount < 0) return '';

  const intPart = Math.floor(amount);
  const centPart = Math.round((amount - intPart) * 100);

  let words = '';
  if (intPart === 0) {
    words = 'zero';
  } else {
    const millions = Math.floor(intPart / 1000000);
    const thousands = Math.floor((intPart % 1000000) / 1000);
    const remainder = intPart % 1000;
    if (millions > 0) words += threeDigits(millions) + ' million';
    if (thousands > 0) { if (words) words += ' '; words += threeDigits(thousands) + ' thousand'; }
    if (remainder > 0) { if (words) words += ' '; words += threeDigits(remainder); }
  }

  words = words.charAt(0).toUpperCase() + words.slice(1);
  words += intPart === 1 ? ' euro' : ' euros';
  if (centPart > 0) {
    words += ' and ' + threeDigits(centPart) + (centPart === 1 ? ' cent' : ' cents');
  }
  return words;
}

function applyPrintSortOrder<T extends { position?: number | null; positionNo?: string | null; description?: string | null; unitPrice?: string | null; lineTotal?: string | null; [key: string]: any }>(
  items: T[],
  sortOrder: string | null | undefined
): T[] {
  const order = sortOrder || "position";
  const posNum = (item: T) => parseInt(item.positionNo || "0", 10);
  return [...items].sort((a, b) => {
    switch (order) {
      case "position_high_low":
        return posNum(b) - posNum(a);
      case "price_high_low":
        return parseFloat(b.unitPrice || "0") - parseFloat(a.unitPrice || "0");
      case "price_low_high":
        return parseFloat(a.unitPrice || "0") - parseFloat(b.unitPrice || "0");
      case "alpha_az":
        return (a.description || "").localeCompare(b.description || "");
      case "alpha_za":
        return (b.description || "").localeCompare(a.description || "");
      case "position":
      case "position_low_high":
      default:
        return posNum(a) - posNum(b);
    }
  });
}

/**
 * Complete quotation data with all related entities for field binding
 */
export interface QuotationPrintData {
  quotation: {
    number: string;
    date: Date | null;
    validUntil: Date | null;
    description: string | null;
    revisionNumber: string | null;
    status: string | null;
    subtotal: string;
    taxAmount: string | null;
    totalAmount: string;
    incoTerms: string | null;
    paymentConditions: string | null;
    deliveryConditions: string | null;
    notes: string | null;
  };
  customer: {
    name: string;
    customerNumber: string;
    email: string | null;
    phone: string | null;
    address: {
      street: string | null;
      houseNumber: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    } | null;
  } | null;
  project: {
    name: string;
    projectNumber: string;
    description: string | null;
  } | null;
  company: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: {
      street: string | null;
      houseNumber: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    };
    kvkNummer: string | null;
    btwNummer: string | null;
    bankAccount: string | null;
    bankName: string | null;
  } | null;
  items: Array<{
    positionNo: string;
    description: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    lineType: string;
  }>;
}

/**
 * Load complete quotation data with all related entities
 */
export async function loadQuotationPrintData(quotationId: string): Promise<QuotationPrintData | null> {
  // Load quotation
  const quotation = await db.query.quotations.findFirst({
    where: eq(quotations.id, quotationId),
  });

  if (!quotation) {
    return null;
  }

  // Load customer with address
  let customerData = null;
  if (quotation.customerId) {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, quotation.customerId),
    });

    if (customer) {
      let addressData = null;
      if (customer.addressId) {
        const address = await db.query.addresses.findFirst({
          where: eq(addresses.id, customer.addressId),
        });
        if (address) {
          addressData = {
            street: address.street,
            houseNumber: address.houseNumber,
            postalCode: address.postalCode,
            city: address.city,
            country: address.country,
          };
        }
      }

      customerData = {
        name: customer.name,
        customerNumber: customer.customerNumber,
        email: customer.email,
        phone: customer.phone,
        address: addressData,
      };
    }
  }

  // Load project
  let projectData = null;
  if (quotation.projectId) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, quotation.projectId),
    });

    if (project) {
      projectData = {
        name: project.name,
        projectNumber: project.projectNumber,
        description: project.description,
      };
    }
  }

  // Load active company profile
  let companyData = null;
  const companyProfile = await db.query.companyProfiles.findFirst({
    where: eq(companyProfiles.isActive, true),
  });

  if (companyProfile) {
    companyData = {
      name: companyProfile.name,
      logoUrl: companyProfile.logoUrl,
      phone: companyProfile.phone,
      email: companyProfile.email,
      website: companyProfile.website,
      address: {
        street: companyProfile.street,
        houseNumber: companyProfile.houseNumber,
        postalCode: companyProfile.postalCode,
        city: companyProfile.city,
        country: companyProfile.country,
      },
      kvkNummer: companyProfile.kvkNummer,
      btwNummer: companyProfile.btwNummer,
      bankAccount: companyProfile.bankAccount,
      bankName: companyProfile.bankName,
    };
  }

  // Load quotation items
  const rawItems = await db.query.quotationItems.findMany({
    where: eq(quotationItems.quotationId, quotationId),
    orderBy: [asc(quotationItems.position)],
  });
  const items = applyPrintSortOrder(rawItems, quotation.printSortOrder);

  const itemsData = items.map((item, index) => ({
    positionNo: item.positionNo || String((index + 1) * 10).padStart(3, '0'), // e.g., "010", "020"
    description: item.description,
    quantity: parseFloat(String(item.quantity || 0)),
    unit: (item as any).unit || "",
    unitPrice: item.unitPrice || "0.00",
    lineTotal: item.lineTotal || "0.00",
    lineType: item.lineType || "standard",
  }));

  return {
    quotation: {
      number: quotation.quotationNumber,
      date: quotation.quotationDate,
      validUntil: quotation.validUntil,
      description: quotation.description,
      revisionNumber: quotation.revisionNumber,
      status: quotation.status,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      incoTerms: quotation.incoTerms,
      paymentConditions: quotation.paymentConditions,
      deliveryConditions: quotation.deliveryConditions,
      notes: quotation.notes,
    },
    customer: customerData,
    project: projectData,
    company: companyData,
    items: itemsData,
  };
}

/**
 * Complete invoice data with all related entities for field binding
 */
export interface InvoicePrintData {
  invoice: {
    number: string;
    date: Date | null;
    dueDate: Date | null;
    description: string | null;
    status: string | null;
    subtotal: string;
    taxAmount: string | null;
    totalAmount: string;
    paidAmount: string | null;
    notes: string | null;
    paymentTerms: string | null;
  };
  customer: {
    name: string;
    customerNumber: string;
    email: string | null;
    phone: string | null;
    address: {
      street: string | null;
      houseNumber: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    } | null;
  } | null;
  project: {
    name: string;
    projectNumber: string;
    description: string | null;
  } | null;
  company: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: {
      street: string | null;
      houseNumber: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
    };
    kvkNummer: string | null;
    btwNummer: string | null;
    bankAccount: string | null;
    bankName: string | null;
  } | null;
  items: Array<{
    positionNo: string;
    description: string;
    descriptionInternal: string | null;
    quantity: number;
    unit: string;
    unitPrice: string;
    lineTotal: string;
    lineType: string;
    discountPercent: string | null;
    workDate: Date | null;
    technicianNames: string | null;
    technicianIds: string | null;
    customerRateId: string | null;
    itemId: string | null;
    sourceSnippetId: string | null;
    sourceSnippetVersion: number | null;
  }>;
}

/**
 * Load complete invoice data with all related entities
 */
export async function loadInvoicePrintData(invoiceId: string): Promise<InvoicePrintData | null> {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });


  if (!invoice) {
    return null;
  }

  // Load customer with address
  let customerData = null;
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, invoice.customerId),
  });

  if (customer) {
    let addressData = null;
    if (customer.addressId) {
      const address = await db.query.addresses.findFirst({
        where: eq(addresses.id, customer.addressId),
      });
      if (address) {
        addressData = {
          street: address.street,
          houseNumber: address.houseNumber,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country,
        };
      }
    }
    customerData = {
      name: customer.name,
      customerNumber: customer.customerNumber,
      email: customer.email,
      phone: customer.phone,
      address: addressData,
    };
  }

  // Load project
  let projectData = null;
  if (invoice.projectId) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, invoice.projectId),
    });
    if (project) {
      projectData = {
        name: project.name,
        projectNumber: project.projectNumber,
        description: project.description,
      };
    }
  }

  // Load active company profile
  let companyData = null;
  const companyProfile = await db.query.companyProfiles.findFirst({
    where: eq(companyProfiles.isActive, true),
  });

  if (companyProfile) {
    companyData = {
      name: companyProfile.name,
      logoUrl: companyProfile.logoUrl,
      phone: companyProfile.phone,
      email: companyProfile.email,
      website: companyProfile.website,
      address: {
        street: companyProfile.street,
        houseNumber: companyProfile.houseNumber,
        postalCode: companyProfile.postalCode,
        city: companyProfile.city,
        country: companyProfile.country,
      },
      kvkNummer: companyProfile.kvkNummer,
      btwNummer: companyProfile.btwNummer,
      bankAccount: companyProfile.bankAccount,
      bankName: companyProfile.bankName,
    };
  }

  // Load payment days
  let paymentTermsLabel: string | null = null;
  if (invoice.paymentDaysId) {
    const paymentDay = await db.query.paymentDays.findFirst({
      where: eq(paymentDays.id, invoice.paymentDaysId),
    });
    if (paymentDay) {
      paymentTermsLabel = paymentDay.name_en || paymentDay.name_nl;
    }
  }

  // Load units of measure for code→name lookup (case-insensitive)
  const uomList = await db.select({ code: unitsOfMeasure.code, name: unitsOfMeasure.name }).from(unitsOfMeasure);
  const uomMap: Record<string, string> = Object.fromEntries(uomList.map(u => [u.code, u.name]));
  const uomMapLower: Record<string, string> = Object.fromEntries(uomList.map(u => [u.code.toLowerCase(), u.name]));

  // Load invoice items
  const rawItems = await db.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, invoiceId),
    orderBy: [asc(invoiceItems.position)],
  });
  const items = applyPrintSortOrder(rawItems, invoice.printSortOrder);

  const itemsData = items.map((item, index) => ({
    positionNo: item.positionNo || String((index + 1) * 10).padStart(3, '0'),
    description: item.description,
    descriptionInternal: item.descriptionInternal || null,
    quantity: parseFloat(String(item.quantity || 0)),
    unit: item.unit ? (uomMap[item.unit] || uomMapLower[item.unit.toLowerCase()] || item.unit) : "",
    unitPrice: item.unitPrice || "0.00",
    lineTotal: item.lineTotal || "0.00",
    lineType: item.lineType || "standard",
    discountPercent: item.discountPercent || null,
    workDate: item.workDate,
    technicianNames: item.technicianNames,
    technicianIds: item.technicianIds || null,
    customerRateId: item.customerRateId || null,
    itemId: item.itemId || null,
    sourceSnippetId: item.sourceSnippetId || null,
    sourceSnippetVersion: item.sourceSnippetVersion || null,
  }));

  return {
    invoice: {
      number: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      description: invoice.description,
      status: invoice.status,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      notes: invoice.notes,
      paymentTerms: paymentTermsLabel,
    },
    customer: customerData,
    project: projectData,
    company: companyData,
    items: itemsData,
  };
}

/**
 * Resolve a field key (dot notation) to its value
 * Examples:
 *   - 'quotation.number' -> '12345'
 *   - 'customer.address.city' -> 'Amsterdam'
 *   - 'company.logoUrl' -> 'https://...'
 */
export function resolveFieldValue(data: QuotationPrintData, fieldKey: string): any {
  const parts = fieldKey.split('.');

  // Virtual computed fields: {tableName}.totalAmountInWords
  if (parts.length === 2 && parts[1] === 'totalAmountInWords') {
    const tableData: any = (data as any)[parts[0]];
    if (tableData && tableData.totalAmount !== undefined) {
      return amountToWords(parseFloat(tableData.totalAmount || '0'));
    }
    return '';
  }

  let current: any = data;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    current = current[part];
  }

  return current;
}

/**
 * Resolve multiple fields at once
 */
export function resolveFields(
  data: QuotationPrintData,
  fieldKeys: string[]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of fieldKeys) {
    result[key] = resolveFieldValue(data, key);
  }

  return result;
}

/**
 * Format a field value based on its data type
 */
export function formatFieldValue(value: any, dataType: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (dataType) {
    case 'date': {
      const dateObj = value instanceof Date ? value : new Date(value);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\./g, '-');
      }
      return String(value);
    }

    case 'currency':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) return '€ 0,00';
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(numValue);

    case 'number':
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '0';
      return new Intl.NumberFormat('nl-NL').format(num);

    case 'text':
    default:
      return String(value);
  }
}
