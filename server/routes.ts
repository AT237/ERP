import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

function parseDateFields(body: Record<string, any>, fields: string[]): Record<string, any> {
  const result = { ...body };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      const parsed = new Date(result[field]);
      if (!isNaN(parsed.getTime())) {
        result[field] = parsed;
      } else {
        const parts = result[field].split("-");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) {
            result[field] = d;
          }
        }
      }
    }
  }
  return result;
}

// Coerce numeric quantity to string so drizzle-zod decimal schema accepts it
function coerceQuantity(body: Record<string, any>): Record<string, any> {
  if (body.quantity !== undefined && typeof body.quantity === 'number') {
    return { ...body, quantity: String(body.quantity) };
  }
  return body;
}

import { loadQuotationPrintData, loadInvoicePrintData } from "./utils/field-resolver";
import {
  insertCustomerSchema, insertSupplierSchema, insertProspectSchema, insertInventoryItemSchema,
  insertProjectSchema, insertQuotationSchema, insertQuotationItemSchema,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema, insertSalesOrderSchema, insertSalesOrderItemSchema,
  insertWorkOrderSchema, insertPackingListSchema,
  insertPackingListItemSchema, insertUserPreferencesSchema, insertCustomerContactSchema,
  insertAddressSchema, insertCountrySchema, insertLanguageSchema, insertUnitOfMeasureSchema, 
  insertPaymentDaySchema, insertPaymentScheduleSchema, insertPaymentTermSchema, insertRateAndChargeSchema, insertIncotermSchema,
  insertVatRateSchema, insertCitySchema, insertStatusSchema, insertImageSchema, insertCompanyProfileSchema, insertTextSnippetSchema, insertTextSnippetUsageSchema, insertInventoryCategorySchema, inventoryCategories,
  insertDocumentLayoutSchema, insertLayoutBlockSchema, insertLayoutSectionSchema,
  insertLayoutElementSchema, insertDocumentLayoutFieldSchema, insertSectionTemplateSchema,
  insertDevFutureSchema, devFutures, insertCustomerRateSchema, insertTechnicianSchema, insertEmployeeSchema,
  unitsOfMeasure, inventoryItems, invoiceItems, ratesAndCharges,
  quotations, invoices, projects, purchaseOrders, suppliers,
  quotationItems, salesOrders, packingLists, quotationRequests, proformaInvoices
} from "@shared/schema";
import { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db, pool, checkDatabaseStatus } from './db';

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get("/api/customers/:id/check-usages", async (req, res) => {
    try {
      const { id } = req.params;
      const [customerQuotations, customerInvoices, customerProjects] = await Promise.all([
        db.select().from(quotations).where(eq(quotations.customerId, id)),
        db.select().from(invoices).where(eq(invoices.customerId, id)),
        db.select().from(projects).where(eq(projects.customerId, id))
      ]);

      const usages: { location: string; count: number; examples: string[] }[] = [];
      if (customerQuotations.length > 0) usages.push({ location: "Quotations", count: customerQuotations.length, examples: customerQuotations.slice(0, 3).map(q => q.quotationNumber) });
      if (customerInvoices.length > 0) usages.push({ location: "Invoices", count: customerInvoices.length, examples: customerInvoices.slice(0, 3).map(i => i.invoiceNumber) });
      if (customerProjects.length > 0) usages.push({ location: "Projects", count: customerProjects.length, examples: customerProjects.slice(0, 3).map(p => p.projectNumber || p.name) });

      res.json({ canDelete: usages.length === 0, usages });
    } catch (error) {
      console.error("Error checking customer usages:", error);
      res.status(500).json({ message: "Failed to check customer usages" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [customerQuotations, customerInvoices, customerProjects] = await Promise.all([
        db.select().from(quotations).where(eq(quotations.customerId, id)).limit(1),
        db.select().from(invoices).where(eq(invoices.customerId, id)).limit(1),
        db.select().from(projects).where(eq(projects.customerId, id)).limit(1)
      ]);

      if (customerQuotations.length > 0 || customerInvoices.length > 0 || customerProjects.length > 0) {
        return res.status(409).json({ message: "Customer is in use and cannot be deleted" });
      }

      await storage.deleteCustomer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Customers with extended data (address, primary contact)
  app.get("/api/customers/extended", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const addresses = await storage.getAddresses();
      const contacts = await storage.getCustomerContacts();
      
      // Create lookup maps
      const addressMap = new Map(addresses.map(a => [a.id, a]));
      
      // Group contacts by customer and find first contact
      const primaryContactMap = new Map<string, typeof contacts[0]>();
      for (const contact of contacts) {
        if (contact.customerId && !primaryContactMap.has(contact.customerId)) {
          primaryContactMap.set(contact.customerId, contact);
        }
      }
      
      // Enrich customers with related data
      const enrichedCustomers = customers.map(customer => {
        const address = customer.addressId ? addressMap.get(customer.addressId) : null;
        const primaryContact = primaryContactMap.get(customer.id);
        
        return {
          ...customer,
          // Address fields
          street: address?.street || '',
          houseNumber: address?.houseNumber || '',
          postalCode: address?.postalCode || '',
          city: address?.city || '',
          country: address?.country || '',
          // Primary contact fields
          primaryContactName: primaryContact?.name || '',
          primaryContactEmail: primaryContact?.email || '',
          primaryContactPhone: primaryContact?.phone || '',
        };
      });
      
      res.json(enrichedCustomers);
    } catch (error) {
      console.error("Error fetching extended customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['lastContactDate', 'conversionDate']);
      const customerData = insertCustomerSchema.parse(body);
      // Convert empty strings to null for nullable foreign key fields
      const cleanedData = {
        ...customerData,
        addressId: customerData.addressId === '' ? null : customerData.addressId,
        paymentDaysId: customerData.paymentDaysId === '' ? null : customerData.paymentDaysId,
        paymentScheduleId: customerData.paymentScheduleId === '' ? null : customerData.paymentScheduleId,
        countryCode: customerData.countryCode === '' ? null : customerData.countryCode,
        languageId: customerData.languageId === '' ? null : customerData.languageId,
        vatRateId: (customerData as any).vatRateId === '' ? null : (customerData as any).vatRateId,
        rateId: (customerData as any).rateId === '' ? null : (customerData as any).rateId,
      };
      const customer = await storage.createCustomer(cleanedData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['lastContactDate', 'conversionDate']);
      const customerData = insertCustomerSchema.partial().parse(body);
      // Convert empty strings to null for nullable foreign key fields
      const cleanedData = {
        ...customerData,
        addressId: customerData.addressId === '' ? null : customerData.addressId,
        paymentDaysId: customerData.paymentDaysId === '' ? null : customerData.paymentDaysId,
        paymentScheduleId: customerData.paymentScheduleId === '' ? null : customerData.paymentScheduleId,
        countryCode: customerData.countryCode === '' ? null : customerData.countryCode,
        languageCode: customerData.languageCode === '' ? null : customerData.languageCode,
        vatRateId: (customerData as any).vatRateId === '' ? null : (customerData as any).vatRateId,
        rateId: (customerData as any).rateId === '' ? null : (customerData as any).rateId,
      };
      const customer = await storage.updateCustomer(req.params.id, cleanedData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ message: "Failed to update customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      // Convert empty strings to null for nullable foreign key fields
      const cleanedData = {
        ...customerData,
        addressId: customerData.addressId === '' ? null : customerData.addressId,
        paymentDaysId: customerData.paymentDaysId === '' ? null : customerData.paymentDaysId,
        paymentScheduleId: customerData.paymentScheduleId === '' ? null : customerData.paymentScheduleId,
        countryCode: customerData.countryCode === '' ? null : customerData.countryCode,
        languageCode: customerData.languageCode === '' ? null : customerData.languageCode,
        vatRateId: (customerData as any).vatRateId === '' ? null : (customerData as any).vatRateId,
        rateId: (customerData as any).rateId === '' ? null : (customerData as any).rateId,
      };
      const customer = await storage.updateCustomer(req.params.id, cleanedData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ message: "Failed to update customer" });
    }
  });

  // Customer Contact routes
  app.get("/api/customer-contacts", async (req, res) => {
    try {
      const contacts = await storage.getCustomerContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
      res.status(500).json({ message: "Failed to fetch customer contacts" });
    }
  });

  app.get("/api/customer-contacts/by-customer/:customerId", async (req, res) => {
    try {
      const contacts = await storage.getCustomerContactsByCustomer(req.params.customerId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
      res.status(500).json({ message: "Failed to fetch customer contacts" });
    }
  });

  app.get("/api/customer-contacts/:id", async (req, res) => {
    try {
      const contact = await storage.getCustomerContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Customer contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching customer contact:", error);
      res.status(500).json({ message: "Failed to fetch customer contact" });
    }
  });

  app.post("/api/customer-contacts", async (req, res) => {
    try {
      const contactData = insertCustomerContactSchema.parse(req.body);
      const contact = await storage.createCustomerContact(contactData);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating customer contact:", error);
      res.status(400).json({ message: "Failed to create customer contact" });
    }
  });

  app.patch("/api/customer-contacts/:id", async (req, res) => {
    try {
      const contactData = insertCustomerContactSchema.partial().parse(req.body);
      const contact = await storage.updateCustomerContact(req.params.id, contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error updating customer contact:", error);
      res.status(400).json({ message: "Failed to update customer contact" });
    }
  });

  app.delete("/api/customer-contacts/:id", async (req, res) => {
    try {
      await storage.deleteCustomerContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer contact:", error);
      res.status(500).json({ message: "Failed to delete customer contact" });
    }
  });

  app.get("/api/customer-contacts/search", async (req, res) => {
    try {
      const { q, customerId } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }
      const contacts = await storage.searchCustomerContacts(q, customerId as string | undefined);
      res.json(contacts);
    } catch (error) {
      console.error("Error searching customer contacts:", error);
      res.status(500).json({ message: "Failed to search customer contacts" });
    }
  });

  // Customer rates routes
  app.get("/api/customer-rates/:customerId", async (req, res) => {
    try {
      const rates = await storage.getCustomerRates(req.params.customerId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching customer rates:", error);
      res.status(500).json({ message: "Failed to fetch customer rates" });
    }
  });

  app.post("/api/customer-rates", async (req, res) => {
    try {
      const rateData = insertCustomerRateSchema.parse(req.body);
      const rate = await storage.createCustomerRate(rateData);
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating customer rate:", error);
      res.status(400).json({ message: "Failed to create customer rate" });
    }
  });

  app.patch("/api/customer-rates/:id", async (req, res) => {
    try {
      const rateData = insertCustomerRateSchema.partial().parse(req.body);
      const rate = await storage.updateCustomerRate(req.params.id, rateData);
      res.json(rate);
    } catch (error) {
      console.error("Error updating customer rate:", error);
      res.status(400).json({ message: "Failed to update customer rate" });
    }
  });

  app.delete("/api/customer-rates/:id", async (req, res) => {
    try {
      await storage.deleteCustomerRate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer rate:", error);
      res.status(500).json({ message: "Failed to delete customer rate" });
    }
  });

  // Address routes
  app.get("/api/addresses", async (req, res) => {
    try {
      const { q } = req.query;
      let addresses;
      if (q && typeof q === 'string') {
        addresses = await storage.searchAddresses(q);
      } else {
        addresses = await storage.getAddresses();
      }
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ message: "Failed to fetch addresses" });
    }
  });

  app.get("/api/addresses/:id", async (req, res) => {
    try {
      const address = await storage.getAddress(req.params.id);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.json(address);
    } catch (error) {
      console.error("Error fetching address:", error);
      res.status(500).json({ message: "Failed to fetch address" });
    }
  });

  app.post("/api/addresses", async (req, res) => {
    try {
      const addressData = insertAddressSchema.parse(req.body);
      const address = await storage.createAddress(addressData);
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      res.status(400).json({ message: "Failed to create address" });
    }
  });

  app.patch("/api/addresses/:id", async (req, res) => {
    try {
      const addressData = insertAddressSchema.partial().parse(req.body);
      const address = await storage.updateAddress(req.params.id, addressData);
      res.json(address);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(400).json({ message: "Failed to update address" });
    }
  });

  app.delete("/api/addresses/:id", async (req, res) => {
    try {
      await storage.deleteAddress(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ message: "Failed to delete address" });
    }
  });

  // Country routes
  app.get("/api/countries", async (req, res) => {
    try {
      const { q } = req.query;
      let countries;
      if (q && typeof q === 'string') {
        countries = await storage.searchCountries(q);
      } else {
        countries = await storage.getCountries();
      }
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.get("/api/countries/:id", async (req, res) => {
    try {
      const country = await storage.getCountry(req.params.id);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      console.error("Error fetching country:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  app.get("/api/countries/by-code/:code", async (req, res) => {
    try {
      const country = await storage.getCountryByCode(req.params.code);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      console.error("Error fetching country:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  app.post("/api/countries", async (req, res) => {
    try {
      const countryData = insertCountrySchema.parse(req.body);
      const country = await storage.createCountry(countryData);
      res.status(201).json(country);
    } catch (error) {
      console.error("Error creating country:", error);
      res.status(400).json({ message: "Failed to create country" });
    }
  });

  app.patch("/api/countries/:id", async (req, res) => {
    try {
      const countryData = insertCountrySchema.partial().parse(req.body);
      const country = await storage.updateCountry(req.params.id, countryData);
      res.json(country);
    } catch (error) {
      console.error("Error updating country:", error);
      res.status(400).json({ message: "Failed to update country" });
    }
  });

  app.delete("/api/countries/:id", async (req, res) => {
    try {
      await storage.deleteCountry(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting country:", error);
      res.status(500).json({ message: "Failed to delete country" });
    }
  });

  // Language routes
  app.get("/api/languages", async (req, res) => {
    try {
      const { q } = req.query;
      let languages;
      if (q && typeof q === 'string') {
        languages = await storage.searchLanguages(q);
      } else {
        languages = await storage.getLanguages();
      }
      res.json(languages);
    } catch (error) {
      console.error("Error fetching languages:", error);
      res.status(500).json({ message: "Failed to fetch languages" });
    }
  });

  app.get("/api/languages/:id", async (req, res) => {
    try {
      const language = await storage.getLanguage(req.params.id);
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      res.json(language);
    } catch (error) {
      console.error("Error fetching language:", error);
      res.status(500).json({ message: "Failed to fetch language" });
    }
  });

  app.get("/api/languages/by-code/:code", async (req, res) => {
    try {
      const language = await storage.getLanguageByCode(req.params.code);
      if (!language) {
        return res.status(404).json({ message: "Language not found" });
      }
      res.json(language);
    } catch (error) {
      console.error("Error fetching language:", error);
      res.status(500).json({ message: "Failed to fetch language" });
    }
  });

  app.post("/api/languages", async (req, res) => {
    try {
      const languageData = insertLanguageSchema.parse(req.body);
      const language = await storage.createLanguage(languageData);
      res.status(201).json(language);
    } catch (error) {
      console.error("Error creating language:", error);
      res.status(400).json({ message: "Failed to create language" });
    }
  });

  app.patch("/api/languages/:id", async (req, res) => {
    try {
      const languageData = insertLanguageSchema.partial().parse(req.body);
      const language = await storage.updateLanguage(req.params.id, languageData);
      res.json(language);
    } catch (error) {
      console.error("Error updating language:", error);
      res.status(400).json({ message: "Failed to update language" });
    }
  });

  app.delete("/api/languages/:id", async (req, res) => {
    try {
      await storage.deleteLanguage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting language:", error);
      res.status(500).json({ message: "Failed to delete language" });
    }
  });

  // Supplier routes
  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(400).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(400).json({ message: "Failed to update supplier" });
    }
  });

  app.get("/api/suppliers/:id/check-usages", async (req, res) => {
    try {
      const { id } = req.params;
      const usages: { location: string; id: string; label: string }[] = [];

      const linkedPOs = await db.select().from(purchaseOrders).where(eq(purchaseOrders.supplierId, id));
      for (const po of linkedPOs) {
        usages.push({ location: "Purchase Orders", id: po.id, label: po.orderNumber || po.id });
      }

      res.json({ canDelete: usages.length === 0, usages });
    } catch (error) {
      console.error("Error checking supplier usages:", error);
      res.status(500).json({ message: "Failed to check supplier usages" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const supplierPurchaseOrders = await db.select().from(purchaseOrders).where(eq(purchaseOrders.supplierId, id)).limit(1);

      if (supplierPurchaseOrders.length > 0) {
        return res.status(409).json({ message: "Supplier is in use and cannot be deleted" });
      }

      await storage.deleteSupplier(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Prospect routes
  app.get("/api/prospects", async (req, res) => {
    try {
      const prospects = await storage.getProspects();
      res.json(prospects);
    } catch (error) {
      console.error("Error fetching prospects:", error);
      res.status(500).json({ message: "Failed to fetch prospects" });
    }
  });

  app.get("/api/prospects/:id", async (req, res) => {
    try {
      const prospect = await storage.getProspect(req.params.id);
      if (!prospect) {
        return res.status(404).json({ message: "Prospect not found" });
      }
      res.json(prospect);
    } catch (error) {
      console.error("Error fetching prospect:", error);
      res.status(500).json({ message: "Failed to fetch prospect" });
    }
  });

  app.post("/api/prospects", async (req, res) => {
    try {
      const prospectData = insertProspectSchema.parse(req.body);
      const prospect = await storage.createProspect(prospectData);
      res.status(201).json(prospect);
    } catch (error) {
      console.error("Error creating prospect:", error);
      res.status(400).json({ message: "Failed to create prospect" });
    }
  });

  app.patch("/api/prospects/:id", async (req, res) => {
    try {
      const prospectData = insertProspectSchema.partial().parse(req.body);
      const prospect = await storage.updateProspect(req.params.id, prospectData);
      res.json(prospect);
    } catch (error) {
      console.error("Error updating prospect:", error);
      res.status(400).json({ message: "Failed to update prospect" });
    }
  });

  app.delete("/api/prospects/:id", async (req, res) => {
    try {
      await storage.deleteProspect(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting prospect:", error);
      res.status(500).json({ message: "Failed to delete prospect" });
    }
  });

  // Inventory routes
  app.get("/api/inventory/:id/check-usages", async (req, res) => {
    try {
      const { id } = req.params;
      const [itemQuotationItems, itemInvoiceItems, itemPurchaseOrderItems, itemPackingListItems] = await Promise.all([
        db.select().from(quotationItems).where(eq(quotationItems.itemId, id)),
        db.select().from(invoiceItems).where(eq(invoiceItems.itemId, id)),
        db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.itemId, id)),
        db.select().from(packingListItems).where(eq(packingListItems.itemId, id))
      ]);

      const usages: { location: string; count: number; examples: string[] }[] = [];
      if (itemQuotationItems.length > 0) usages.push({ location: "Quotation Items", count: itemQuotationItems.length, examples: itemQuotationItems.slice(0, 3).map(q => q.description || '') });
      if (itemInvoiceItems.length > 0) usages.push({ location: "Invoice Items", count: itemInvoiceItems.length, examples: itemInvoiceItems.slice(0, 3).map(i => i.description || '') });
      if (itemPurchaseOrderItems.length > 0) usages.push({ location: "Purchase Order Items", count: itemPurchaseOrderItems.length, examples: [] });
      if (itemPackingListItems.length > 0) usages.push({ location: "Packing List Items", count: itemPackingListItems.length, examples: [] });

      res.json({ canDelete: usages.length === 0, usages });
    } catch (error) {
      console.error("Error checking inventory usages:", error);
      res.status(500).json({ message: "Failed to check inventory usages" });
    }
  });

  app.get("/api/inventory", async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/inventory/low-stock", async (req, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/inventory/:id", async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(400).json({ message: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(req.params.id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(400).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [itemQuotationItems, itemInvoiceItems, itemPurchaseOrderItems, itemPackingListItems] = await Promise.all([
        db.select().from(quotationItems).where(eq(quotationItems.itemId, id)).limit(1),
        db.select().from(invoiceItems).where(eq(invoiceItems.itemId, id)).limit(1),
        db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.itemId, id)).limit(1),
        db.select().from(packingListItems).where(eq(packingListItems.itemId, id)).limit(1)
      ]);

      if (itemQuotationItems.length > 0 || itemInvoiceItems.length > 0 || itemPurchaseOrderItems.length > 0 || itemPackingListItems.length > 0) {
        return res.status(409).json({ message: "Inventory item is in use and cannot be deleted" });
      }

      await storage.deleteInventoryItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/projects/:id/invoiced-total", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as total FROM invoices WHERE project_id = $1`,
        [id]
      );
      const total = result.rows[0]?.total || "0.00";
      res.json({ total: parseFloat(total).toFixed(2) });
    } catch (error) {
      console.error("Error fetching invoiced total:", error);
      res.status(500).json({ message: "Failed to fetch invoiced total" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['startDate', 'endDate']);
      const projectData = insertProjectSchema.parse(body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['startDate', 'endDate']);
      const projectData = insertProjectSchema.partial().parse(body);
      const project = await storage.updateProject(req.params.id, projectData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Quotation routes
  app.get("/api/quotations", async (req, res) => {
    try {
      const quotations = await storage.getQuotations();
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", async (req, res) => {
    try {
      const quotation = await storage.getQuotation(req.params.id);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ message: "Failed to fetch quotation" });
    }
  });

  // Combined quotation details endpoint (quotation + items + customer in one call)
  app.get("/api/quotations/:id/details", async (req, res) => {
    try {
      const details = await storage.getQuotationDetails(req.params.id);
      if (!details) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(details);
    } catch (error) {
      console.error("Error fetching quotation details:", error);
      res.status(500).json({ message: "Failed to fetch quotation details" });
    }
  });

  app.get("/api/quotations/:id/items", async (req, res) => {
    try {
      const items = await storage.getQuotationItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching quotation items:", error);
      res.status(500).json({ message: "Failed to fetch quotation items" });
    }
  });

  // Get quotation print data with all related entities for PDF generation
  app.get("/api/quotations/:id/print-data", async (req, res) => {
    try {
      const printData = await loadQuotationPrintData(req.params.id);
      if (!printData) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(printData);
    } catch (error) {
      console.error("Error fetching quotation print data:", error);
      res.status(500).json({ message: "Failed to fetch quotation print data" });
    }
  });

  app.get("/api/invoices/:id/print-data", async (req, res) => {
    try {
      const printData = await loadInvoicePrintData(req.params.id);
      if (!printData) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(printData);
    } catch (error) {
      console.error("Error fetching invoice print data:", error);
      res.status(500).json({ message: "Failed to fetch invoice print data" });
    }
  });

  app.post("/api/quotations", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['quotationDate', 'deliveryDate']);
      const quotationData = insertQuotationSchema.parse(body);
      const quotation = await storage.createQuotation(quotationData);
      res.status(201).json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Failed to create quotation", 
          error: error.message,
          details: error.toString()
        });
      } else {
        res.status(400).json({ message: "Failed to create quotation", error: "Unknown error" });
      }
    }
  });

  app.post("/api/quotations/:id/items", async (req, res) => {
    try {
      const itemData = insertQuotationItemSchema.parse(coerceQuantity({
        ...req.body,
        quotationId: req.params.id
      }));
      const item = await storage.addQuotationItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding quotation item:", error);
      if (error instanceof Error && error.message.includes("Positienummer")) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to add quotation item" });
      }
    }
  });

  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['quotationDate', 'deliveryDate']);
      const quotationData = insertQuotationSchema.partial().parse(body);
      const quotation = await storage.updateQuotation(req.params.id, quotationData);
      res.json(quotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(400).json({ message: "Failed to update quotation" });
    }
  });

  app.get("/api/quotation-items/:id", async (req, res) => {
    try {
      const item = await storage.getQuotationItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Quotation item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching quotation item:", error);
      res.status(500).json({ message: "Failed to fetch quotation item" });
    }
  });

  app.put("/api/quotation-items/:id", async (req, res) => {
    try {
      const itemData = insertQuotationItemSchema.partial().parse(coerceQuantity(req.body));
      const item = await storage.updateQuotationItem(req.params.id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating quotation item:", error);
      if (error instanceof Error && error.message.includes("Positienummer")) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to update quotation item" });
      }
    }
  });

  app.delete("/api/quotation-items/:id", async (req, res) => {
    try {
      await storage.deleteQuotationItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quotation item:", error);
      res.status(500).json({ message: "Failed to delete quotation item" });
    }
  });

  app.delete("/api/quotations/:id", async (req, res) => {
    try {
      await storage.deleteQuotation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ message: "Failed to delete quotation" });
    }
  });

  // Conversion endpoints - preserve text lines exactly during conversion
  app.post("/api/quotations/:id/convert-to-sales-order", async (req, res) => {
    try {
      const salesOrder = await storage.convertQuotationToSalesOrder(req.params.id);
      res.status(201).json({
        message: "Quotation successfully converted to sales order",
        salesOrder: salesOrder,
        preservationNote: "All text lines and snippet references preserved exactly as-is"
      });
    } catch (error) {
      console.error("Error converting quotation to sales order:", error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Failed to convert quotation to sales order", 
          error: error.message 
        });
      } else {
        res.status(400).json({ message: "Failed to convert quotation to sales order", error: "Unknown error" });
      }
    }
  });

  // Invoice routes
  app.get("/api/invoices/next-number", async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const pattern = `^CI-${currentYear}-[0-9]{3}$`;
      const rows = await db.execute(
        sql`SELECT invoice_number FROM invoices WHERE invoice_number ~ ${pattern} ORDER BY invoice_number`
      );
      const used = new Set((rows.rows as any[]).map((r: any) => r.invoice_number as string));
      let next = 1;
      while (used.has(`CI-${currentYear}-${String(next).padStart(3, '0')}`)) {
        next++;
      }
      res.json({ number: `CI-${currentYear}-${String(next).padStart(3, '0')}` });
    } catch (error) {
      console.error("Error generating next invoice number:", error);
      res.status(500).json({ message: "Failed to generate next invoice number" });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      const invoiceList = await storage.getInvoices();
      const customerList = await storage.getCustomers();
      const customerMap = new Map(customerList.map(c => [c.id, c.name]));
      const result = invoiceList.map(inv => ({
        ...inv,
        customerName: customerMap.get(inv.customerId) || null,
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.get("/api/invoices/:id/items", async (req, res) => {
    try {
      const items = await storage.getInvoiceItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
    }
  });

  app.get("/api/invoices/:id/work-orders", async (req, res) => {
    try {
      const workOrderIds = await storage.getInvoiceWorkOrderIds(req.params.id);
      res.json(workOrderIds);
    } catch (error) {
      console.error("Error fetching invoice work orders:", error);
      res.status(500).json({ message: "Failed to fetch invoice work orders" });
    }
  });

  app.put("/api/invoices/:id/work-orders", async (req, res) => {
    try {
      const { workOrderIds } = req.body;
      if (!Array.isArray(workOrderIds)) {
        return res.status(400).json({ message: "workOrderIds must be an array" });
      }
      await storage.setInvoiceWorkOrders(req.params.id, workOrderIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating invoice work orders:", error);
      res.status(500).json({ message: "Failed to update invoice work orders" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['invoiceDate', 'dueDate']);
      const invoiceData = insertInvoiceSchema.parse(body);
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      if (error?.code === '23505' && error?.constraint?.includes('invoice_number')) {
        res.status(409).json({ message: `Factuurnummer "${req.body.invoiceNumber}" is al in gebruik. Kies een ander nummer.` });
      } else {
        res.status(400).json({ message: "Failed to create invoice" });
      }
    }
  });

  app.post("/api/invoices/:id/items", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['workDate']);
      const itemData = insertInvoiceItemSchema.parse(coerceQuantity({
        ...body,
        invoiceId: req.params.id
      }));
      const item = await storage.addInvoiceItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding invoice item:", error);
      res.status(400).json({ message: "Failed to add invoice item" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['invoiceDate', 'dueDate']);
      const invoiceData = insertInvoiceSchema.partial().parse(body);
      const invoice = await storage.updateInvoice(req.params.id, invoiceData);
      res.json(invoice);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      if (error?.code === '23505' && error?.constraint?.includes('invoice_number')) {
        res.status(409).json({ message: `Factuurnummer "${req.body.invoiceNumber}" is al in gebruik. Kies een ander nummer.` });
      } else {
        res.status(400).json({ message: "Failed to update invoice" });
      }
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Invoice Item routes
  app.get("/api/invoice-items/:id", async (req, res) => {
    try {
      const item = await storage.getInvoiceItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Invoice item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching invoice item:", error);
      res.status(500).json({ message: "Failed to fetch invoice item" });
    }
  });

  app.put("/api/invoice-items/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['workDate']);
      const itemData = insertInvoiceItemSchema.partial().parse(coerceQuantity(body));
      const item = await storage.updateInvoiceItem(req.params.id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating invoice item:", error);
      res.status(400).json({ message: "Failed to update invoice item" });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    try {
      await storage.deleteInvoiceItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      res.status(500).json({ message: "Failed to delete invoice item" });
    }
  });

  // Purchase Order routes
  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const orders = await storage.getPurchaseOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const order = await storage.getPurchaseOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.get("/api/purchase-orders/:id/items", async (req, res) => {
    try {
      const items = await storage.getPurchaseOrderItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching purchase order items:", error);
      res.status(500).json({ message: "Failed to fetch purchase order items" });
    }
  });

  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['orderDate', 'expectedDate']);
      const orderData = insertPurchaseOrderSchema.parse(body);
      const order = await storage.createPurchaseOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(400).json({ message: "Failed to create purchase order" });
    }
  });

  app.post("/api/purchase-orders/:id/items", async (req, res) => {
    try {
      const itemData = insertPurchaseOrderItemSchema.parse({
        ...req.body,
        purchaseOrderId: req.params.id
      });
      const item = await storage.addPurchaseOrderItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding purchase order item:", error);
      res.status(400).json({ message: "Failed to add purchase order item" });
    }
  });

  app.put("/api/purchase-orders/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['orderDate', 'expectedDate']);
      const orderData = insertPurchaseOrderSchema.partial().parse(body);
      const order = await storage.updatePurchaseOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(400).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete("/api/purchase-orders/:id", async (req, res) => {
    try {
      await storage.deletePurchaseOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Sales Order routes
  app.get("/api/sales-orders", async (req, res) => {
    try {
      const orders = await storage.getSalesOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
      res.status(500).json({ message: "Failed to fetch sales orders" });
    }
  });

  app.get("/api/sales-orders/:id", async (req, res) => {
    try {
      const order = await storage.getSalesOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Sales order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching sales order:", error);
      res.status(500).json({ message: "Failed to fetch sales order" });
    }
  });

  app.get("/api/sales-orders/:id/items", async (req, res) => {
    try {
      const items = await storage.getSalesOrderItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching sales order items:", error);
      res.status(500).json({ message: "Failed to fetch sales order items" });
    }
  });

  app.post("/api/sales-orders", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['orderDate', 'expectedDeliveryDate']);
      const orderData = insertSalesOrderSchema.parse(body);
      const order = await storage.createSalesOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating sales order:", error);
      res.status(400).json({ message: "Failed to create sales order" });
    }
  });

  app.post("/api/sales-orders/:id/items", async (req, res) => {
    try {
      const itemData = insertSalesOrderItemSchema.parse({
        ...req.body,
        salesOrderId: req.params.id
      });
      const item = await storage.addSalesOrderItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding sales order item:", error);
      res.status(400).json({ message: "Failed to add sales order item" });
    }
  });

  app.put("/api/sales-orders/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['orderDate', 'expectedDeliveryDate']);
      const orderData = insertSalesOrderSchema.partial().parse(body);
      const order = await storage.updateSalesOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating sales order:", error);
      res.status(400).json({ message: "Failed to update sales order" });
    }
  });

  app.patch("/api/sales-orders/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['orderDate', 'expectedDeliveryDate']);
      const orderData = insertSalesOrderSchema.partial().parse(body);
      const order = await storage.updateSalesOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating sales order:", error);
      res.status(400).json({ message: "Failed to update sales order" });
    }
  });

  app.put("/api/sales-orders/:id/items/:itemId", async (req, res) => {
    try {
      const itemData = insertSalesOrderItemSchema.partial().parse(req.body);
      const item = await storage.updateSalesOrderItem(req.params.itemId, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating sales order item:", error);
      res.status(400).json({ message: "Failed to update sales order item" });
    }
  });

  app.delete("/api/sales-orders/:id", async (req, res) => {
    try {
      await storage.deleteSalesOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sales order:", error);
      res.status(500).json({ message: "Failed to delete sales order" });
    }
  });

  app.delete("/api/sales-orders/:id/items/:itemId", async (req, res) => {
    try {
      await storage.deleteSalesOrderItem(req.params.itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sales order item:", error);
      res.status(500).json({ message: "Failed to delete sales order item" });
    }
  });

  // Sales Order to Invoice conversion endpoint - preserve text lines exactly during conversion
  app.post("/api/sales-orders/:id/convert-to-invoice", async (req, res) => {
    try {
      const invoice = await storage.convertSalesOrderToInvoice(req.params.id);
      res.status(201).json({
        message: "Sales order successfully converted to invoice",
        invoice: invoice,
        preservationNote: "All text lines and snippet references preserved exactly as-is"
      });
    } catch (error) {
      console.error("Error converting sales order to invoice:", error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Failed to convert sales order to invoice", 
          error: error.message 
        });
      } else {
        res.status(400).json({ message: "Failed to convert sales order to invoice", error: "Unknown error" });
      }
    }
  });

  // Work Order routes
  app.get("/api/work-orders", async (req, res) => {
    try {
      const orders = await storage.getWorkOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.get("/api/work-orders/:id", async (req, res) => {
    try {
      const order = await storage.getWorkOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Work order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching work order:", error);
      res.status(500).json({ message: "Failed to fetch work order" });
    }
  });

  app.post("/api/work-orders", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['startDate', 'dueDate', 'completedDate']);
      const orderData = insertWorkOrderSchema.parse(body);
      const order = await storage.createWorkOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating work order:", error);
      res.status(400).json({ message: "Failed to create work order" });
    }
  });

  app.put("/api/work-orders/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['startDate', 'dueDate', 'completedDate']);
      const orderData = insertWorkOrderSchema.partial().parse(body);
      const order = await storage.updateWorkOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating work order:", error);
      res.status(400).json({ message: "Failed to update work order" });
    }
  });

  app.delete("/api/work-orders/:id", async (req, res) => {
    try {
      await storage.deleteWorkOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work order:", error);
      res.status(500).json({ message: "Failed to delete work order" });
    }
  });

  // Packing List routes
  app.get("/api/packing-lists", async (req, res) => {
    try {
      const lists = await storage.getPackingLists();
      res.json(lists);
    } catch (error) {
      console.error("Error fetching packing lists:", error);
      res.status(500).json({ message: "Failed to fetch packing lists" });
    }
  });

  app.get("/api/packing-lists/:id", async (req, res) => {
    try {
      const list = await storage.getPackingList(req.params.id);
      if (!list) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      res.json(list);
    } catch (error) {
      console.error("Error fetching packing list:", error);
      res.status(500).json({ message: "Failed to fetch packing list" });
    }
  });

  app.get("/api/packing-lists/:id/items", async (req, res) => {
    try {
      const items = await storage.getPackingListItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching packing list items:", error);
      res.status(500).json({ message: "Failed to fetch packing list items" });
    }
  });

  app.post("/api/packing-lists", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['packingDate', 'shipDate']);
      const listData = insertPackingListSchema.parse(body);
      const list = await storage.createPackingList(listData);
      res.status(201).json(list);
    } catch (error) {
      console.error("Error creating packing list:", error);
      res.status(400).json({ message: "Failed to create packing list" });
    }
  });

  app.post("/api/packing-lists/:id/items", async (req, res) => {
    try {
      const itemData = insertPackingListItemSchema.parse({
        ...req.body,
        packingListId: req.params.id
      });
      const item = await storage.addPackingListItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding packing list item:", error);
      res.status(400).json({ message: "Failed to add packing list item" });
    }
  });

  app.put("/api/packing-lists/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['packingDate', 'shipDate']);
      const listData = insertPackingListSchema.partial().parse(body);
      const list = await storage.updatePackingList(req.params.id, listData);
      res.json(list);
    } catch (error) {
      console.error("Error updating packing list:", error);
      res.status(400).json({ message: "Failed to update packing list" });
    }
  });

  app.delete("/api/packing-lists/:id", async (req, res) => {
    try {
      await storage.deletePackingList(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting packing list:", error);
      res.status(500).json({ message: "Failed to delete packing list" });
    }
  });

  // User Preferences routes
  app.get("/api/user-preferences/:userId", async (req, res) => {
    try {
      const preferences = await storage.getUserPreferences(req.params.userId);
      res.json(preferences || { navigationOrder: null, collapsedSections: {} });
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.post("/api/user-preferences", async (req, res) => {
    try {
      const preferencesData = insertUserPreferencesSchema.parse(req.body);
      const preferences = await storage.saveUserPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error("Error saving user preferences:", error);
      res.status(400).json({ message: "Failed to save user preferences" });
    }
  });

  // Master Data routes - Inventory Categories
  app.get("/api/masterdata/inventory-categories", async (req, res) => {
    try {
      const categories = await db.select().from(inventoryCategories).orderBy(inventoryCategories.sortOrder, inventoryCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      res.status(500).json({ message: "Failed to fetch inventory categories" });
    }
  });

  app.post("/api/masterdata/inventory-categories", async (req, res) => {
    try {
      const data = insertInventoryCategorySchema.parse(req.body);
      const [category] = await db.insert(inventoryCategories).values(data).returning();
      res.json(category);
    } catch (error: any) {
      console.error("Error creating inventory category:", error);
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Deze code bestaat al. Kies een andere code." });
      }
      res.status(400).json({ message: "Failed to create inventory category" });
    }
  });

  app.get("/api/masterdata/inventory-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [category] = await db.select().from(inventoryCategories).where(eq(inventoryCategories.id, id));
      if (!category) return res.status(404).json({ message: "Category not found" });
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory category" });
    }
  });

  app.put("/api/masterdata/inventory-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertInventoryCategorySchema.partial().parse(req.body);
      const [category] = await db.update(inventoryCategories).set(data).where(eq(inventoryCategories.id, id)).returning();
      if (!category) return res.status(404).json({ message: "Category not found" });
      res.json(category);
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Deze code bestaat al." });
      }
      res.status(500).json({ message: "Failed to update inventory category" });
    }
  });

  app.delete("/api/masterdata/inventory-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(inventoryCategories).where(eq(inventoryCategories.id, id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete inventory category" });
    }
  });

  // Master Data routes - Units of Measure
  app.get("/api/masterdata/units-of-measure", async (req, res) => {
    try {
      const units = await storage.getUnitsOfMeasure();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units of measure:", error);
      res.status(500).json({ message: "Failed to fetch units of measure" });
    }
  });

  app.post("/api/masterdata/units-of-measure", async (req, res) => {
    try {
      const unitData = insertUnitOfMeasureSchema.parse(req.body);
      const unit = await storage.createUnitOfMeasure(unitData);
      res.json(unit);
    } catch (error: any) {
      console.error("Error creating unit of measure:", error);
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Deze code bestaat al. Kies een andere code." });
      }
      res.status(400).json({ message: "Failed to create unit of measure" });
    }
  });

  // Master Data routes - Payment Days
  app.get("/api/masterdata/payment-days", async (req, res) => {
    try {
      const paymentDays = await storage.getPaymentDays();
      res.json(paymentDays);
    } catch (error) {
      console.error("Error fetching payment days:", error);
      res.status(500).json({ message: "Failed to fetch payment days" });
    }
  });

  app.post("/api/masterdata/payment-days", async (req, res) => {
    try {
      const paymentDayData = insertPaymentDaySchema.parse(req.body);
      const paymentDay = await storage.createPaymentDay(paymentDayData);
      res.json(paymentDay);
    } catch (error) {
      console.error("Error creating payment day:", error);
      res.status(400).json({ message: "Failed to create payment day" });
    }
  });

  app.get("/api/masterdata/payment-days/:id", async (req, res) => {
    try {
      const paymentDay = await storage.getPaymentDay(req.params.id);
      if (!paymentDay) {
        return res.status(404).json({ message: "Payment day not found" });
      }
      res.json(paymentDay);
    } catch (error) {
      console.error("Error fetching payment day:", error);
      res.status(500).json({ message: "Failed to fetch payment day" });
    }
  });

  app.put("/api/masterdata/payment-days/:id", async (req, res) => {
    try {
      const paymentDayData = insertPaymentDaySchema.partial().parse(req.body);
      const paymentDay = await storage.updatePaymentDay(req.params.id, paymentDayData);
      res.json(paymentDay);
    } catch (error) {
      console.error("Error updating payment day:", error);
      res.status(400).json({ message: "Failed to update payment day" });
    }
  });

  app.delete("/api/masterdata/payment-days/:id", async (req, res) => {
    try {
      await storage.deletePaymentDay(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment day:", error);
      res.status(500).json({ message: "Failed to delete payment day" });
    }
  });

  // Master Data routes - Payment Schedules
  app.get("/api/masterdata/payment-schedules", async (req, res) => {
    try {
      const schedules = await storage.getPaymentSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching payment schedules:", error);
      res.status(500).json({ message: "Failed to fetch payment schedules" });
    }
  });

  app.post("/api/masterdata/payment-schedules", async (req, res) => {
    try {
      const scheduleData = insertPaymentScheduleSchema.parse(req.body);
      const schedule = await storage.createPaymentSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating payment schedule:", error);
      res.status(400).json({ message: "Failed to create payment schedule" });
    }
  });

  app.get("/api/masterdata/payment-schedules/:id", async (req, res) => {
    try {
      const schedule = await storage.getPaymentSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Payment schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching payment schedule:", error);
      res.status(500).json({ message: "Failed to fetch payment schedule" });
    }
  });

  app.put("/api/masterdata/payment-schedules/:id", async (req, res) => {
    try {
      const scheduleData = insertPaymentScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updatePaymentSchedule(req.params.id, scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating payment schedule:", error);
      res.status(400).json({ message: "Failed to update payment schedule" });
    }
  });

  app.delete("/api/masterdata/payment-schedules/:id", async (req, res) => {
    try {
      await storage.deletePaymentSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment schedule:", error);
      res.status(500).json({ message: "Failed to delete payment schedule" });
    }
  });

  // Master Data routes - Payment Terms
  app.get("/api/masterdata/payment-terms", async (req, res) => {
    try {
      const terms = await storage.getPaymentTerms();
      res.json(terms);
    } catch (error) {
      console.error("Error fetching payment terms:", error);
      res.status(500).json({ message: "Failed to fetch payment terms" });
    }
  });

  app.post("/api/masterdata/payment-terms", async (req, res) => {
    try {
      const termData = insertPaymentTermSchema.parse(req.body);
      const term = await storage.createPaymentTerm(termData);
      res.json(term);
    } catch (error) {
      console.error("Error creating payment term:", error);
      res.status(400).json({ message: "Failed to create payment term" });
    }
  });

  // Master Data routes - Incoterms
  app.get("/api/masterdata/incoterms", async (req, res) => {
    try {
      const incoterms = await storage.getIncoterms();
      res.json(incoterms);
    } catch (error) {
      console.error("Error fetching incoterms:", error);
      res.status(500).json({ message: "Failed to fetch incoterms" });
    }
  });

  app.post("/api/masterdata/incoterms", async (req, res) => {
    try {
      const incotermData = insertIncotermSchema.parse(req.body);
      const incoterm = await storage.createIncoterm(incotermData);
      res.json(incoterm);
    } catch (error) {
      console.error("Error creating incoterm:", error);
      res.status(400).json({ message: "Failed to create incoterm" });
    }
  });

  // Master Data routes - Rates and Charges
  app.get("/api/masterdata/rates-and-charges/next-code", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT code FROM rates_and_charges WHERE code LIKE 'RC-%' ORDER BY code DESC LIMIT 1`
      );
      let nextNum = 1;
      if (result.rows.length > 0) {
        const lastCode = result.rows[0].code;
        const num = parseInt(lastCode.replace('RC-', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      const nextCode = `RC-${String(nextNum).padStart(4, '0')}`;
      res.json({ code: nextCode });
    } catch (error) {
      console.error("Error generating next code:", error);
      res.status(500).json({ message: "Failed to generate next code" });
    }
  });

  app.get("/api/masterdata/rates-and-charges", async (req, res) => {
    try {
      const rates = await storage.getRatesAndCharges();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching rates and charges:", error);
      res.status(500).json({ message: "Failed to fetch rates and charges" });
    }
  });

  app.post("/api/masterdata/rates-and-charges", async (req, res) => {
    try {
      const rateData = insertRateAndChargeSchema.parse(req.body);
      const rate = await storage.createRateAndCharge(rateData);
      res.json(rate);
    } catch (error) {
      console.error("Error creating rate and charge:", error);
      res.status(400).json({ message: "Failed to create rate and charge" });
    }
  });

  // Master Data routes - Technicians
  app.get("/api/masterdata/technicians", async (req, res) => {
    try {
      const techs = await storage.getTechnicians();
      res.json(techs);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  app.post("/api/masterdata/technicians", async (req, res) => {
    try {
      const techData = insertTechnicianSchema.parse(req.body);
      const tech = await storage.createTechnician(techData);
      res.json(tech);
    } catch (error) {
      console.error("Error creating technician:", error);
      res.status(400).json({ message: "Failed to create technician" });
    }
  });

  app.get("/api/masterdata/technicians/:id", async (req, res) => {
    try {
      const tech = await storage.getTechnician(req.params.id);
      if (!tech) return res.status(404).json({ message: "Technician not found" });
      res.json(tech);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technician" });
    }
  });

  app.put("/api/masterdata/technicians/:id", async (req, res) => {
    try {
      const techData = insertTechnicianSchema.partial().parse(req.body);
      const tech = await storage.updateTechnician(req.params.id, techData);
      res.json(tech);
    } catch (error) {
      res.status(400).json({ message: "Failed to update technician" });
    }
  });

  app.delete("/api/masterdata/technicians/:id", async (req, res) => {
    try {
      await storage.deleteTechnician(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete technician" });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const emps = await storage.getEmployees();
      res.json(emps);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['dateOfBirth']);
      const empData = insertEmployeeSchema.parse(body);
      const emp = await storage.createEmployee(empData);
      res.json(emp);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(400).json({ message: "Failed to create employee" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const emp = await storage.getEmployee(req.params.id);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      res.json(emp);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const body = parseDateFields(req.body, ['dateOfBirth']);
      const empData = insertEmployeeSchema.partial().parse(body);
      const emp = await storage.updateEmployee(req.params.id, empData);
      res.json(emp);
    } catch (error) {
      res.status(400).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Master Data routes - VAT Rates
  app.get("/api/masterdata/vat-rates", async (req, res) => {
    try {
      const rates = await storage.getVatRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching VAT rates:", error);
      res.status(500).json({ message: "Failed to fetch VAT rates" });
    }
  });

  app.post("/api/masterdata/vat-rates", async (req, res) => {
    try {
      const rateData = insertVatRateSchema.parse(req.body);
      const rate = await storage.createVatRate(rateData);
      res.json(rate);
    } catch (error) {
      console.error("Error creating VAT rate:", error);
      res.status(400).json({ message: "Failed to create VAT rate" });
    }
  });

  // Master Data routes - Cities
  app.get("/api/masterdata/cities", async (req, res) => {
    try {
      const cities = await storage.getCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  app.post("/api/masterdata/cities", async (req, res) => {
    try {
      const cityData = insertCitySchema.parse(req.body);
      const city = await storage.createCity(cityData);
      res.json(city);
    } catch (error) {
      console.error("Error creating city:", error);
      res.status(400).json({ message: "Failed to create city" });
    }
  });

  // Master Data routes - Statuses
  app.get("/api/masterdata/statuses", async (req, res) => {
    try {
      const statuses = await storage.getStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
      res.status(500).json({ message: "Failed to fetch statuses" });
    }
  });

  app.post("/api/masterdata/statuses", async (req, res) => {
    try {
      const statusData = insertStatusSchema.parse(req.body);
      const status = await storage.createStatus(statusData);
      res.json(status);
    } catch (error) {
      console.error("Error creating status:", error);
      res.status(400).json({ message: "Failed to create status" });
    }
  });

  // Master Data routes - Images
  // Company logo endpoint - returns first logo with ID starting with "cad"
  app.get("/api/masterdata/images/company-logo", async (req, res) => {
    try {
      const { images } = await import("@shared/schema");
      const { like, eq, and, asc } = await import("drizzle-orm");
      const [logo] = await db.select()
        .from(images)
        .where(and(
          like(images.id, 'cad%'),
          eq(images.isActive, true)
        ))
        .orderBy(asc(images.id))
        .limit(1);
      res.json(logo || null);
    } catch (error) {
      console.error("Error fetching company logo:", error);
      res.status(500).json({ message: "Failed to fetch company logo" });
    }
  });

  app.get("/api/masterdata/images", async (req, res) => {
    try {
      const { images } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const imageList = await db.select().from(images).where(eq(images.isActive, true));
      res.json(imageList);
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.post("/api/masterdata/images", async (req, res) => {
    try {
      const imageData = insertImageSchema.parse(req.body);
      const { images } = await import("@shared/schema");
      const [image] = await db.insert(images).values(imageData).returning();
      res.json(image);
    } catch (error) {
      console.error("Error creating image:", error);
      res.status(400).json({ message: "Failed to create image" });
    }
  });

  // Master Data individual item routes (GET, PUT, DELETE by ID)
  // Images individual routes
  app.get("/api/masterdata/images/:id", async (req, res) => {
    try {
      const { images } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [image] = await db.select().from(images).where(eq(images.id, req.params.id));
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  app.put("/api/masterdata/images/:id", async (req, res) => {
    try {
      const imageData = insertImageSchema.partial().parse(req.body);
      const { images } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [image] = await db.update(images)
        .set(imageData)
        .where(eq(images.id, req.params.id))
        .returning();
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      console.error("Error updating image:", error);
      res.status(400).json({ message: "Failed to update image" });
    }
  });

  app.patch("/api/masterdata/images/:id", async (req, res) => {
    try {
      const imageData = insertImageSchema.partial().parse(req.body);
      const { images } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [image] = await db.update(images)
        .set(imageData)
        .where(eq(images.id, req.params.id))
        .returning();
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      console.error("Error updating image:", error);
      res.status(400).json({ message: "Failed to update image" });
    }
  });

  app.delete("/api/masterdata/images/:id", async (req, res) => {
    try {
      const { images } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(images)
        .set({ isActive: false })
        .where(eq(images.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Pictograms CRUD routes
  app.get("/api/masterdata/pictograms", async (req, res) => {
    try {
      const { pictograms } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const result = await db.select().from(pictograms).where(eq(pictograms.isActive, true));
      res.json(result);
    } catch (error) {
      console.error("Error fetching pictograms:", error);
      res.status(500).json({ message: "Failed to fetch pictograms" });
    }
  });

  app.get("/api/masterdata/pictograms/:id", async (req, res) => {
    try {
      const { pictograms } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [result] = await db.select().from(pictograms).where(eq(pictograms.id, req.params.id));
      if (!result) {
        return res.status(404).json({ message: "Pictogram not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching pictogram:", error);
      res.status(500).json({ message: "Failed to fetch pictogram" });
    }
  });

  app.post("/api/masterdata/pictograms", async (req, res) => {
    try {
      const { pictograms, insertPictogramSchema } = await import("@shared/schema");
      const data = insertPictogramSchema.parse(req.body);
      const [result] = await db.insert(pictograms).values(data).returning();
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating pictogram:", error);
      res.status(500).json({ message: "Failed to create pictogram" });
    }
  });

  app.put("/api/masterdata/pictograms/:id", async (req, res) => {
    try {
      const { pictograms, insertPictogramSchema } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const data = insertPictogramSchema.partial().parse(req.body);
      const [result] = await db.update(pictograms)
        .set(data)
        .where(eq(pictograms.id, req.params.id))
        .returning();
      res.json(result);
    } catch (error) {
      console.error("Error updating pictogram:", error);
      res.status(500).json({ message: "Failed to update pictogram" });
    }
  });

  app.delete("/api/masterdata/pictograms/:id", async (req, res) => {
    try {
      const { pictograms } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(pictograms)
        .set({ isActive: false })
        .where(eq(pictograms.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pictogram:", error);
      res.status(500).json({ message: "Failed to delete pictogram" });
    }
  });

  // Units of Measure individual routes
  app.get("/api/masterdata/units-of-measure/:id", async (req, res) => {
    try {
      const unit = await storage.getUnitOfMeasure(req.params.id);
      if (!unit) {
        return res.status(404).json({ message: "Unit of measure not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error fetching unit of measure:", error);
      res.status(500).json({ message: "Failed to fetch unit of measure" });
    }
  });

  app.put("/api/masterdata/units-of-measure/:id", async (req, res) => {
    try {
      const unitData = insertUnitOfMeasureSchema.partial().parse(req.body);
      const unit = await storage.updateUnitOfMeasure(req.params.id, unitData);
      res.json(unit);
    } catch (error: any) {
      console.error("Error updating unit of measure:", error);
      if (error?.code === "23505") {
        return res.status(409).json({ message: "Deze code bestaat al. Kies een andere code." });
      }
      res.status(400).json({ message: "Failed to update unit of measure" });
    }
  });

  app.get("/api/masterdata/units-of-measure/:id/check-usages", async (req, res) => {
    try {
      const [uom] = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.id, req.params.id));
      if (!uom) return res.status(404).json({ message: "Unit of measure not found" });
      const code = uom.code;
      const usages: Array<{ location: string; count: number; examples: string[] }> = [];
      const invItems = await db.select({ name: inventoryItems.name }).from(inventoryItems).where(eq(inventoryItems.unit, code));
      if (invItems.length > 0) {
        usages.push({ location: "Inventory Items", count: invItems.length, examples: invItems.slice(0, 3).map(i => i.name) });
      }
      const invLineItems = await db.select({ description: invoiceItems.description }).from(invoiceItems).where(eq(invoiceItems.unit, code));
      if (invLineItems.length > 0) {
        usages.push({ location: "Invoice Line Items", count: invLineItems.length, examples: invLineItems.slice(0, 3).map(i => i.description) });
      }
      const rateItems = await db.select({ name: ratesAndCharges.name, code: ratesAndCharges.code }).from(ratesAndCharges).where(eq(ratesAndCharges.unit, code));
      if (rateItems.length > 0) {
        usages.push({ location: "Rates & Charges", count: rateItems.length, examples: rateItems.slice(0, 3).map(i => `${i.code} – ${i.name}`) });
      }
      res.json({ canDelete: usages.length === 0, usages });
    } catch (error) {
      console.error("Error checking unit of measure usages:", error);
      res.status(500).json({ message: "Failed to check usages" });
    }
  });

  app.delete("/api/masterdata/units-of-measure/:id", async (req, res) => {
    try {
      const [uom] = await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.id, req.params.id));
      if (!uom) return res.status(404).json({ message: "Unit of measure not found" });

      const code = uom.code;
      const usages: Array<{ location: string; count: number; examples: string[] }> = [];

      const invItems = await db.select({ name: inventoryItems.name }).from(inventoryItems).where(eq(inventoryItems.unit, code));
      if (invItems.length > 0) {
        usages.push({ location: "Inventory Items", count: invItems.length, examples: invItems.slice(0, 3).map(i => i.name) });
      }
      const invLineItems = await db.select({ description: invoiceItems.description }).from(invoiceItems).where(eq(invoiceItems.unit, code));
      if (invLineItems.length > 0) {
        usages.push({ location: "Invoice Line Items", count: invLineItems.length, examples: invLineItems.slice(0, 3).map(i => i.description) });
      }
      const rateItems = await db.select({ name: ratesAndCharges.name, code: ratesAndCharges.code }).from(ratesAndCharges).where(eq(ratesAndCharges.unit, code));
      if (rateItems.length > 0) {
        usages.push({ location: "Rates & Charges", count: rateItems.length, examples: rateItems.slice(0, 3).map(i => `${i.code} – ${i.name}`) });
      }

      if (usages.length > 0) {
        return res.status(409).json({
          message: `Cannot delete "${uom.name}": it is used in ${usages.map(u => u.location).join(", ")}`,
          usages,
        });
      }

      await storage.deleteUnitOfMeasure(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting unit of measure:", error);
      res.status(500).json({ message: "Failed to delete unit of measure" });
    }
  });

  // Payment Terms individual routes
  app.get("/api/masterdata/payment-terms/:id", async (req, res) => {
    try {
      const term = await storage.getPaymentTerm(req.params.id);
      if (!term) {
        return res.status(404).json({ message: "Payment term not found" });
      }
      res.json(term);
    } catch (error) {
      console.error("Error fetching payment term:", error);
      res.status(500).json({ message: "Failed to fetch payment term" });
    }
  });

  app.put("/api/masterdata/payment-terms/:id", async (req, res) => {
    try {
      const termData = insertPaymentTermSchema.partial().parse(req.body);
      const term = await storage.updatePaymentTerm(req.params.id, termData);
      res.json(term);
    } catch (error) {
      console.error("Error updating payment term:", error);
      res.status(400).json({ message: "Failed to update payment term" });
    }
  });

  app.delete("/api/masterdata/payment-terms/:id", async (req, res) => {
    try {
      await storage.deletePaymentTerm(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment term:", error);
      res.status(500).json({ message: "Failed to delete payment term" });
    }
  });

  // Incoterms individual routes
  app.get("/api/masterdata/incoterms/:id", async (req, res) => {
    try {
      const incoterm = await storage.getIncoterm(req.params.id);
      if (!incoterm) {
        return res.status(404).json({ message: "Incoterm not found" });
      }
      res.json(incoterm);
    } catch (error) {
      console.error("Error fetching incoterm:", error);
      res.status(500).json({ message: "Failed to fetch incoterm" });
    }
  });

  app.put("/api/masterdata/incoterms/:id", async (req, res) => {
    try {
      const incotermData = insertIncotermSchema.partial().parse(req.body);
      const incoterm = await storage.updateIncoterm(req.params.id, incotermData);
      res.json(incoterm);
    } catch (error) {
      console.error("Error updating incoterm:", error);
      res.status(400).json({ message: "Failed to update incoterm" });
    }
  });

  app.delete("/api/masterdata/incoterms/:id", async (req, res) => {
    try {
      await storage.deleteIncoterm(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting incoterm:", error);
      res.status(500).json({ message: "Failed to delete incoterm" });
    }
  });

  // Rates and Charges individual routes
  app.get("/api/masterdata/rates-and-charges/:id", async (req, res) => {
    try {
      const rate = await storage.getRateAndCharge(req.params.id);
      if (!rate) {
        return res.status(404).json({ message: "Rate and charge not found" });
      }
      res.json(rate);
    } catch (error) {
      console.error("Error fetching rate and charge:", error);
      res.status(500).json({ message: "Failed to fetch rate and charge" });
    }
  });

  app.put("/api/masterdata/rates-and-charges/:id", async (req, res) => {
    try {
      const rateData = insertRateAndChargeSchema.partial().parse(req.body);
      const rate = await storage.updateRateAndCharge(req.params.id, rateData);
      res.json(rate);
    } catch (error) {
      console.error("Error updating rate and charge:", error);
      res.status(400).json({ message: "Failed to update rate and charge" });
    }
  });

  app.delete("/api/masterdata/rates-and-charges/:id", async (req, res) => {
    try {
      await storage.deleteRateAndCharge(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting rate and charge:", error);
      res.status(500).json({ message: "Failed to delete rate and charge" });
    }
  });

  // VAT Rates individual routes
  app.get("/api/masterdata/vat-rates/:id", async (req, res) => {
    try {
      const rate = await storage.getVatRate(req.params.id);
      if (!rate) {
        return res.status(404).json({ message: "VAT rate not found" });
      }
      res.json(rate);
    } catch (error) {
      console.error("Error fetching VAT rate:", error);
      res.status(500).json({ message: "Failed to fetch VAT rate" });
    }
  });

  app.put("/api/masterdata/vat-rates/:id", async (req, res) => {
    try {
      const rateData = insertVatRateSchema.partial().parse(req.body);
      const rate = await storage.updateVatRate(req.params.id, rateData);
      res.json(rate);
    } catch (error) {
      console.error("Error updating VAT rate:", error);
      res.status(400).json({ message: "Failed to update VAT rate" });
    }
  });

  app.delete("/api/masterdata/vat-rates/:id", async (req, res) => {
    try {
      await storage.deleteVatRate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting VAT rate:", error);
      res.status(500).json({ message: "Failed to delete VAT rate" });
    }
  });

  // Cities individual routes
  app.get("/api/masterdata/cities/:id", async (req, res) => {
    try {
      const city = await storage.getCity(req.params.id);
      if (!city) {
        return res.status(404).json({ message: "City not found" });
      }
      res.json(city);
    } catch (error) {
      console.error("Error fetching city:", error);
      res.status(500).json({ message: "Failed to fetch city" });
    }
  });

  app.put("/api/masterdata/cities/:id", async (req, res) => {
    try {
      const cityData = insertCitySchema.partial().parse(req.body);
      const city = await storage.updateCity(req.params.id, cityData);
      res.json(city);
    } catch (error) {
      console.error("Error updating city:", error);
      res.status(400).json({ message: "Failed to update city" });
    }
  });

  app.delete("/api/masterdata/cities/:id", async (req, res) => {
    try {
      await storage.deleteCity(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting city:", error);
      res.status(500).json({ message: "Failed to delete city" });
    }
  });

  // Statuses individual routes
  app.get("/api/masterdata/statuses/:id", async (req, res) => {
    try {
      const status = await storage.getStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ message: "Status not found" });
      }
      res.json(status);
    } catch (error) {
      console.error("Error fetching status:", error);
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });

  app.put("/api/masterdata/statuses/:id", async (req, res) => {
    try {
      const statusData = insertStatusSchema.partial().parse(req.body);
      const status = await storage.updateStatus(req.params.id, statusData);
      res.json(status);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(400).json({ message: "Failed to update status" });
    }
  });

  app.delete("/api/masterdata/statuses/:id", async (req, res) => {
    try {
      await storage.deleteStatus(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting status:", error);
      res.status(500).json({ message: "Failed to delete status" });
    }
  });

  // Company Profiles routes
  app.get("/api/masterdata/company-profiles", async (req, res) => {
    try {
      const profiles = await storage.getCompanyProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching company profiles:", error);
      res.status(500).json({ message: "Failed to fetch company profiles" });
    }
  });

  app.get("/api/masterdata/company-profiles/active", async (req, res) => {
    try {
      const profile = await storage.getActiveCompanyProfile();
      if (!profile) {
        return res.status(404).json({ message: "No active company profile found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching active company profile:", error);
      res.status(500).json({ message: "Failed to fetch active company profile" });
    }
  });

  app.post("/api/masterdata/company-profiles", async (req, res) => {
    try {
      const profileData = insertCompanyProfileSchema.parse(req.body);
      const profile = await storage.createCompanyProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating company profile:", error);
      res.status(400).json({ message: "Failed to create company profile" });
    }
  });

  app.get("/api/masterdata/company-profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getCompanyProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Company profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ message: "Failed to fetch company profile" });
    }
  });

  app.put("/api/masterdata/company-profiles/:id", async (req, res) => {
    try {
      const profileData = insertCompanyProfileSchema.partial().parse(req.body);
      const profile = await storage.updateCompanyProfile(req.params.id, profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(400).json({ message: "Failed to update company profile" });
    }
  });

  app.delete("/api/masterdata/company-profiles/:id", async (req, res) => {
    try {
      await storage.deleteCompanyProfile(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company profile:", error);
      res.status(500).json({ message: "Failed to delete company profile" });
    }
  });

  // Text Snippets Management routes
  app.get("/api/text-snippets", async (req, res) => {
    try {
      const { category } = req.query;
      let snippets;
      if (category && typeof category === 'string') {
        snippets = await storage.getTextSnippetsByCategory(category);
      } else {
        snippets = await storage.getTextSnippets();
      }
      res.json(snippets);
    } catch (error) {
      console.error("Error fetching text snippets:", error);
      res.status(500).json({ message: "Failed to fetch text snippets" });
    }
  });

  app.get("/api/text-snippets/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }
      const snippets = await storage.searchTextSnippets(q);
      res.json(snippets);
    } catch (error) {
      console.error("Error searching text snippets:", error);
      res.status(500).json({ message: "Failed to search text snippets" });
    }
  });

  app.get("/api/text-snippets/:id", async (req, res) => {
    try {
      const snippet = await storage.getTextSnippet(req.params.id);
      if (!snippet) {
        return res.status(404).json({ message: "Text snippet not found" });
      }
      res.json(snippet);
    } catch (error) {
      console.error("Error fetching text snippet:", error);
      res.status(500).json({ message: "Failed to fetch text snippet" });
    }
  });

  app.post("/api/text-snippets", async (req, res) => {
    try {
      const snippetData = insertTextSnippetSchema.parse(req.body);
      const snippet = await storage.createTextSnippet(snippetData);
      res.status(201).json(snippet);
    } catch (error) {
      console.error("Error creating text snippet:", error);
      res.status(400).json({ message: "Failed to create text snippet" });
    }
  });

  app.put("/api/text-snippets/:id", async (req, res) => {
    try {
      const snippetData = insertTextSnippetSchema.partial().parse(req.body);
      const snippet = await storage.updateTextSnippet(req.params.id, snippetData);
      res.json(snippet);
    } catch (error) {
      console.error("Error updating text snippet:", error);
      res.status(400).json({ message: "Failed to update text snippet" });
    }
  });

  app.patch("/api/text-snippets/:id", async (req, res) => {
    try {
      const snippetData = insertTextSnippetSchema.partial().parse(req.body);
      const snippet = await storage.updateTextSnippet(req.params.id, snippetData);
      res.json(snippet);
    } catch (error) {
      console.error("Error updating text snippet:", error);
      res.status(400).json({ message: "Failed to update text snippet" });
    }
  });

  app.delete("/api/text-snippets/:id", async (req, res) => {
    try {
      await storage.deleteTextSnippet(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting text snippet:", error);
      res.status(500).json({ message: "Failed to delete text snippet" });
    }
  });

  // Text Snippets Usage Tracking routes
  app.post("/api/text-snippets/:id/use", async (req, res) => {
    try {
      const usageData = insertTextSnippetUsageSchema.parse({
        ...req.body,
        snippetId: req.params.id
      });
      const usage = await storage.recordSnippetUsage(usageData);
      res.status(201).json(usage);
    } catch (error) {
      console.error("Error recording snippet usage:", error);
      res.status(400).json({ message: "Failed to record snippet usage" });
    }
  });

  app.get("/api/text-snippets/:id/usage", async (req, res) => {
    try {
      const usages = await storage.getSnippetUsages(req.params.id);
      res.json(usages);
    } catch (error) {
      console.error("Error fetching snippet usage:", error);
      res.status(500).json({ message: "Failed to fetch snippet usage" });
    }
  });

  // Database status endpoint
  app.get('/api/database/status', async (req: Request, res: Response) => {
    try {
      const status = await checkDatabaseStatus();
      res.json({ connected: status });
    } catch (error) {
      res.status(500).json({ connected: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // =============================================================================
  // LAYOUT MANAGEMENT ROUTES
  // =============================================================================

  // Document Layouts
  app.get("/api/layouts", async (req, res) => {
    try {
      const documentType = req.query.documentType as string | undefined;
      const layouts = await storage.getDocumentLayouts(documentType);
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching layouts:", error);
      res.status(500).json({ message: "Failed to fetch layouts" });
    }
  });

  app.get("/api/layouts/:id", async (req, res) => {
    try {
      const layout = await storage.getDocumentLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ message: "Layout not found" });
      }
      res.json(layout);
    } catch (error) {
      console.error("Error fetching layout:", error);
      res.status(500).json({ message: "Failed to fetch layout" });
    }
  });

  app.get("/api/layouts/default/:documentType", async (req, res) => {
    try {
      const layout = await storage.getDefaultLayout(req.params.documentType);
      if (!layout) {
        return res.status(404).json({ message: "Default layout not found" });
      }
      res.json(layout);
    } catch (error) {
      console.error("Error fetching default layout:", error);
      res.status(500).json({ message: "Failed to fetch default layout" });
    }
  });

  app.post("/api/layouts", async (req, res) => {
    try {
      const layoutData = insertDocumentLayoutSchema.parse(req.body);
      const executeResult = await db.execute(sql`SELECT generate_layout_number() as "layoutNumber"`);
      const rows = (executeResult as any).rows ?? executeResult;
      const layoutNumber = (rows[0] as any).layoutNumber;
      const layout = await storage.createDocumentLayout({ ...layoutData, layoutNumber });
      res.status(201).json(layout);
    } catch (error) {
      console.error("Error creating layout:", error);
      res.status(400).json({ message: "Failed to create layout" });
    }
  });

  app.put("/api/layouts/:id", async (req, res) => {
    try {
      const layoutData = insertDocumentLayoutSchema.partial().parse(req.body);
      const layout = await storage.updateDocumentLayout(req.params.id, layoutData);
      res.json(layout);
    } catch (error) {
      console.error("Error updating layout:", error);
      res.status(400).json({ message: "Failed to update layout" });
    }
  });

  app.delete("/api/layouts/:id", async (req, res) => {
    try {
      await storage.deleteDocumentLayout(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting layout:", error);
      res.status(500).json({ message: "Failed to delete layout" });
    }
  });

  // Layout Blocks
  app.get("/api/layout-blocks", async (req, res) => {
    try {
      const documentType = req.query.documentType as string | undefined;
      const blocks = await storage.getLayoutBlocks(documentType);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching layout blocks:", error);
      res.status(500).json({ message: "Failed to fetch layout blocks" });
    }
  });

  app.get("/api/layout-blocks/:id", async (req, res) => {
    try {
      const block = await storage.getLayoutBlock(req.params.id);
      if (!block) {
        return res.status(404).json({ message: "Layout block not found" });
      }
      res.json(block);
    } catch (error) {
      console.error("Error fetching layout block:", error);
      res.status(500).json({ message: "Failed to fetch layout block" });
    }
  });

  app.post("/api/layout-blocks", async (req, res) => {
    try {
      const blockData = insertLayoutBlockSchema.parse(req.body);
      const block = await storage.createLayoutBlock(blockData);
      res.status(201).json(block);
    } catch (error) {
      console.error("Error creating layout block:", error);
      res.status(400).json({ message: "Failed to create layout block" });
    }
  });

  app.put("/api/layout-blocks/:id", async (req, res) => {
    try {
      const blockData = insertLayoutBlockSchema.partial().parse(req.body);
      const block = await storage.updateLayoutBlock(req.params.id, blockData);
      res.json(block);
    } catch (error) {
      console.error("Error updating layout block:", error);
      res.status(400).json({ message: "Failed to update layout block" });
    }
  });

  app.delete("/api/layout-blocks/:id", async (req, res) => {
    try {
      await storage.deleteLayoutBlock(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting layout block:", error);
      res.status(500).json({ message: "Failed to delete layout block" });
    }
  });

  // Layout Sections
  app.get("/api/layout-sections", async (req, res) => {
    try {
      const layoutId = req.query.layoutId as string;
      if (!layoutId) {
        return res.status(400).json({ message: "layoutId is required" });
      }
      const sections = await storage.getLayoutSections(layoutId);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching layout sections:", error);
      res.status(500).json({ message: "Failed to fetch layout sections" });
    }
  });

  app.get("/api/layout-sections/:id", async (req, res) => {
    try {
      const section = await storage.getLayoutSection(req.params.id);
      if (!section) {
        return res.status(404).json({ message: "Layout section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("Error fetching layout section:", error);
      res.status(500).json({ message: "Failed to fetch layout section" });
    }
  });

  app.post("/api/layout-sections", async (req, res) => {
    try {
      const sectionData = insertLayoutSectionSchema.parse(req.body);
      const section = await storage.createLayoutSection(sectionData);
      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating layout section:", error);
      res.status(400).json({ message: "Failed to create layout section" });
    }
  });

  app.put("/api/layout-sections/:id", async (req, res) => {
    try {
      const sectionData = insertLayoutSectionSchema.partial().parse(req.body);
      const section = await storage.updateLayoutSection(req.params.id, sectionData);
      res.json(section);
    } catch (error) {
      console.error("Error updating layout section:", error);
      res.status(400).json({ message: "Failed to update layout section" });
    }
  });

  app.delete("/api/layout-sections/:id", async (req, res) => {
    try {
      await storage.deleteLayoutSection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting layout section:", error);
      res.status(500).json({ message: "Failed to delete layout section" });
    }
  });

  // Section Templates
  app.get("/api/section-templates", async (req, res) => {
    try {
      const templates = await storage.getSectionTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching section templates:", error);
      res.status(500).json({ message: "Failed to fetch section templates" });
    }
  });

  app.get("/api/section-templates/:id", async (req, res) => {
    try {
      const template = await storage.getSectionTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Section template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching section template:", error);
      res.status(500).json({ message: "Failed to fetch section template" });
    }
  });

  app.post("/api/section-templates", async (req, res) => {
    try {
      const templateData = insertSectionTemplateSchema.parse(req.body);
      const template = await storage.createSectionTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating section template:", error);
      res.status(400).json({ message: "Failed to create section template" });
    }
  });

  app.delete("/api/section-templates/:id", async (req, res) => {
    try {
      await storage.deleteSectionTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting section template:", error);
      res.status(500).json({ message: "Failed to delete section template" });
    }
  });

  // Layout Elements
  app.get("/api/layout-elements", async (req, res) => {
    try {
      const sectionId = req.query.sectionId as string;
      if (!sectionId) {
        return res.status(400).json({ message: "sectionId is required" });
      }
      const elements = await storage.getLayoutElements(sectionId);
      res.json(elements);
    } catch (error) {
      console.error("Error fetching layout elements:", error);
      res.status(500).json({ message: "Failed to fetch layout elements" });
    }
  });

  app.get("/api/layout-elements/:id", async (req, res) => {
    try {
      const element = await storage.getLayoutElement(req.params.id);
      if (!element) {
        return res.status(404).json({ message: "Layout element not found" });
      }
      res.json(element);
    } catch (error) {
      console.error("Error fetching layout element:", error);
      res.status(500).json({ message: "Failed to fetch layout element" });
    }
  });

  app.post("/api/layout-elements", async (req, res) => {
    try {
      const elementData = insertLayoutElementSchema.parse(req.body);
      const element = await storage.createLayoutElement(elementData);
      res.status(201).json(element);
    } catch (error) {
      console.error("Error creating layout element:", error);
      res.status(400).json({ message: "Failed to create layout element" });
    }
  });

  app.put("/api/layout-elements/:id", async (req, res) => {
    try {
      const elementData = insertLayoutElementSchema.partial().parse(req.body);
      const element = await storage.updateLayoutElement(req.params.id, elementData);
      res.json(element);
    } catch (error) {
      console.error("Error updating layout element:", error);
      res.status(400).json({ message: "Failed to update layout element" });
    }
  });

  app.delete("/api/layout-elements/:id", async (req, res) => {
    try {
      await storage.deleteLayoutElement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting layout element:", error);
      res.status(500).json({ message: "Failed to delete layout element" });
    }
  });

  // Document Layout Fields
  app.get("/api/document-fields/:documentType", async (req, res) => {
    try {
      const fields = await storage.getDocumentLayoutFields(req.params.documentType);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching document fields:", error);
      res.status(500).json({ message: "Failed to fetch document fields" });
    }
  });

  app.get("/api/document-fields/field/:id", async (req, res) => {
    try {
      const field = await storage.getDocumentLayoutField(req.params.id);
      if (!field) {
        return res.status(404).json({ message: "Document field not found" });
      }
      res.json(field);
    } catch (error) {
      console.error("Error fetching document field:", error);
      res.status(500).json({ message: "Failed to fetch document field" });
    }
  });

  app.post("/api/document-fields", async (req, res) => {
    try {
      const fieldData = insertDocumentLayoutFieldSchema.parse(req.body);
      const field = await storage.createDocumentLayoutField(fieldData);
      res.status(201).json(field);
    } catch (error) {
      console.error("Error creating document field:", error);
      res.status(400).json({ message: "Failed to create document field" });
    }
  });

  app.put("/api/document-fields/:id", async (req, res) => {
    try {
      const fieldData = insertDocumentLayoutFieldSchema.partial().parse(req.body);
      const field = await storage.updateDocumentLayoutField(req.params.id, fieldData);
      res.json(field);
    } catch (error) {
      console.error("Error updating document field:", error);
      res.status(400).json({ message: "Failed to update document field" });
    }
  });

  app.delete("/api/document-fields/:id", async (req, res) => {
    try {
      await storage.deleteDocumentLayoutField(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document field:", error);
      res.status(500).json({ message: "Failed to delete document field" });
    }
  });

  // Development Futures routes
  app.get("/api/dev-futures", async (req, res) => {
    try {
      const futures = await db.select().from(devFutures).orderBy(devFutures.sortOrder, devFutures.createdAt);
      res.json(futures);
    } catch (error) {
      console.error("Error fetching dev futures:", error);
      res.status(500).json({ message: "Failed to fetch dev futures" });
    }
  });

  app.post("/api/dev-futures", async (req, res) => {
    try {
      const data = insertDevFutureSchema.parse(req.body);
      const [newFuture] = await db.insert(devFutures).values(data).returning();
      res.status(201).json(newFuture);
    } catch (error) {
      console.error("Error creating dev future:", error);
      res.status(400).json({ message: "Failed to create dev future" });
    }
  });

  app.patch("/api/dev-futures/:id", async (req, res) => {
    try {
      const data = insertDevFutureSchema.partial().parse(req.body);
      const [updated] = await db.update(devFutures).set(data).where(eq(devFutures.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating dev future:", error);
      res.status(400).json({ message: "Failed to update dev future" });
    }
  });

  app.delete("/api/dev-futures/:id", async (req, res) => {
    try {
      await db.delete(devFutures).where(eq(devFutures.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dev future:", error);
      res.status(500).json({ message: "Failed to delete dev future" });
    }
  });

  // Entity Attachments (photos/files linked to any entity)
  app.get("/api/attachments/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const attachments = await storage.getEntityAttachments(entityType, entityId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post("/api/attachments/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { fileName, mimeType, fileData, width, height, sortOrder } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ message: "fileName and fileData are required" });
      }
      const attachment = await storage.createEntityAttachment({
        entityType,
        entityId,
        fileName,
        mimeType: mimeType || "image/jpeg",
        fileData,
        width,
        height,
        sortOrder: sortOrder ?? 0,
      });
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ message: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      await storage.deleteEntityAttachment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // GitHub auto-backup endpoint
  app.post("/api/github-backup", async (req, res) => {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(500).json({ message: "GITHUB_TOKEN not configured" });
    }

    const repoUrl = `https://${token}@github.com/AT237/ERP.git`;
    const now = new Date().toISOString().slice(0, 10);

    try {
      // Export database to SQL file first
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        try {
          await execAsync(`pg_dump "${dbUrl}" --no-password -f database_backup.sql`);
        } catch {
          // Continue even if db export fails
        }
      }

      await execAsync('git config user.email "auto-backup@replit.com"');
      await execAsync('git config user.name "Auto Backup"');
      await execAsync(`git remote set-url origin ${repoUrl}`);
      await execAsync("git add -A");
      try {
        await execAsync(`git commit -m "Auto backup ${now}"`);
      } catch {
        // Nothing to commit is fine
      }
      await execAsync("git push origin main");
      res.json({ success: true, message: `Backup pushed to GitHub on ${now}` });
    } catch (error: any) {
      console.error("GitHub backup error:", error);
      res.status(500).json({ message: "Backup failed", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}