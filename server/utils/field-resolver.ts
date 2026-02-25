import { db } from "../db";
import { quotations, customers, projects, companyProfiles, addresses, quotationItems, invoices, invoiceItems } from "../../shared/schema";
import { eq, asc } from "drizzle-orm";

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
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
      country: string;
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
    positionNo: string; // Formatted position number (e.g., "010", "020")
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
  const items = await db.query.quotationItems.findMany({
    where: eq(quotationItems.quotationId, quotationId),
    orderBy: [asc(quotationItems.position)],
  });

  const itemsData = items.map((item, index) => ({
    positionNo: item.positionNo || String((index + 1) * 10).padStart(3, '0'), // e.g., "010", "020"
    description: item.description,
    quantity: item.quantity || 0,
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
  };
  customer: {
    name: string;
    customerNumber: string;
    email: string | null;
    phone: string | null;
    address: {
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
      country: string;
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
    workDate: Date | null;
    technicianNames: string | null;
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

  // Load invoice items
  const items = await db.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, invoiceId),
    orderBy: [asc(invoiceItems.position)],
  });

  const itemsData = items.map((item, index) => ({
    positionNo: item.positionNo || String((index + 1) * 10).padStart(3, '0'),
    description: item.description,
    quantity: item.quantity || 0,
    unitPrice: item.unitPrice || "0.00",
    lineTotal: item.lineTotal || "0.00",
    lineType: item.lineType || "standard",
    workDate: item.workDate,
    technicianNames: item.technicianNames,
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
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }
      return String(value);

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
