import { db } from "../db";
import { quotations, customers, projects, companyProfiles, addresses } from "../../shared/schema";
import { eq } from "drizzle-orm";

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
