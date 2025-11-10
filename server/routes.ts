import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loadQuotationPrintData } from "./utils/field-resolver";
import {
  insertCustomerSchema, insertSupplierSchema, insertProspectSchema, insertInventoryItemSchema,
  insertProjectSchema, insertQuotationSchema, insertQuotationItemSchema,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema, insertSalesOrderSchema, insertSalesOrderItemSchema,
  insertWorkOrderSchema, insertPackingListSchema,
  insertPackingListItemSchema, insertUserPreferencesSchema, insertCustomerContactSchema,
  insertAddressSchema, insertCountrySchema, insertLanguageSchema, insertUnitOfMeasureSchema, 
  insertPaymentDaySchema, insertPaymentScheduleSchema, insertPaymentTermSchema, insertIncotermSchema,
  insertVatRateSchema, insertCitySchema, insertStatusSchema, insertImageSchema, insertCompanyProfileSchema, insertTextSnippetSchema, insertTextSnippetUsageSchema,
  insertDocumentLayoutSchema, insertLayoutBlockSchema, insertLayoutSectionSchema,
  insertLayoutElementSchema, insertDocumentLayoutFieldSchema
} from "@shared/schema";
import { Request, Response } from 'express';
import { db, checkDatabaseStatus } from './db';

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

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
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
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ message: "Failed to update customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
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
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

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

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
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
      await storage.deleteInventoryItem(req.params.id);
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

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const projectData = insertProjectSchema.partial().parse(req.body);
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

  app.post("/api/quotations", async (req, res) => {
    try {
      console.log("Received quotation data:", JSON.stringify(req.body, null, 2));
      const quotationData = insertQuotationSchema.parse(req.body);
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
      const itemData = insertQuotationItemSchema.parse({
        ...req.body,
        quotationId: req.params.id
      });
      const item = await storage.addQuotationItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding quotation item:", error);
      res.status(400).json({ message: "Failed to add quotation item" });
    }
  });

  app.put("/api/quotations/:id", async (req, res) => {
    try {
      const quotationData = insertQuotationSchema.partial().parse(req.body);
      const quotation = await storage.updateQuotation(req.params.id, quotationData);
      res.json(quotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(400).json({ message: "Failed to update quotation" });
    }
  });

  app.put("/api/quotation-items/:id", async (req, res) => {
    try {
      const itemData = insertQuotationItemSchema.partial().parse(req.body);
      const item = await storage.updateQuotationItem(req.params.id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating quotation item:", error);
      res.status(400).json({ message: "Failed to update quotation item" });
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
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
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

  app.post("/api/invoices", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.post("/api/invoices/:id/items", async (req, res) => {
    try {
      const itemData = insertInvoiceItemSchema.parse({
        ...req.body,
        invoiceId: req.params.id
      });
      const item = await storage.addInvoiceItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding invoice item:", error);
      res.status(400).json({ message: "Failed to add invoice item" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice" });
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
      const orderData = insertPurchaseOrderSchema.parse(req.body);
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
      const orderData = insertPurchaseOrderSchema.partial().parse(req.body);
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
      const orderData = insertSalesOrderSchema.parse(req.body);
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
      const orderData = insertSalesOrderSchema.partial().parse(req.body);
      const order = await storage.updateSalesOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating sales order:", error);
      res.status(400).json({ message: "Failed to update sales order" });
    }
  });

  app.patch("/api/sales-orders/:id", async (req, res) => {
    try {
      const orderData = insertSalesOrderSchema.partial().parse(req.body);
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
      const orderData = insertWorkOrderSchema.parse(req.body);
      const order = await storage.createWorkOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating work order:", error);
      res.status(400).json({ message: "Failed to create work order" });
    }
  });

  app.put("/api/work-orders/:id", async (req, res) => {
    try {
      const orderData = insertWorkOrderSchema.partial().parse(req.body);
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
      const listData = insertPackingListSchema.parse(req.body);
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
      const listData = insertPackingListSchema.partial().parse(req.body);
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
    } catch (error) {
      console.error("Error creating unit of measure:", error);
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
    } catch (error) {
      console.error("Error updating unit of measure:", error);
      res.status(400).json({ message: "Failed to update unit of measure" });
    }
  });

  app.delete("/api/masterdata/units-of-measure/:id", async (req, res) => {
    try {
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
      const layout = await storage.createDocumentLayout(layoutData);
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

  // Add more routes as needed

  const httpServer = createServer(app);
  return httpServer;
}