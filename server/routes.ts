import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertCustomerSchema, insertSupplierSchema, insertInventoryItemSchema,
  insertProjectSchema, insertQuotationSchema, insertQuotationItemSchema,
  insertInvoiceSchema, insertInvoiceItemSchema, insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema, insertWorkOrderSchema, insertPackingListSchema,
  insertPackingListItemSchema, insertUserPreferencesSchema, insertCustomerContactSchema,
  insertAddressSchema, insertUnitOfMeasureSchema, insertPaymentTermSchema, insertIncotermSchema,
  insertVatRateSchema, insertCitySchema, insertStatusSchema
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

  // Database status endpoint
  app.get('/api/database/status', async (req: Request, res: Response) => {
    try {
      const status = await checkDatabaseStatus();
      res.json({ connected: status });
    } catch (error) {
      res.status(500).json({ connected: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Add more routes as needed

  const httpServer = createServer(app);
  return httpServer;
}