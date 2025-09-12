import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for system authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  navigationOrder: jsonb("navigation_order"),
  collapsedSections: jsonb("collapsed_sections"),
  lastActiveTab: varchar("last_active_tab", { length: 255 }),
  lastActiveTabType: varchar("last_active_tab_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Countries table for country management with validation rules
export const countries = pgTable("countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // ISO country code (NL, ET, etc.)
  name: text("name").notNull(), // Country name
  requiresBtw: boolean("requires_btw").default(false), // If BTW number is required
  requiresAreaCode: boolean("requires_area_code").default(false), // If area code is required
  createdAt: timestamp("created_at").defaultNow(),
});

// Addresses table for reusable addresses
export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  street: text("street").notNull(),
  houseNumber: text("house_number").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer contacts table for multiple contact persons per customer
export const customerContacts = pgTable("customer_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  email: text("email"),
  phone: text("phone"),
  mobile: jsonb("mobile").$type<string[]>().default(sql`'[]'::jsonb`),
  position: text("position"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerNumber: text("customer_number").notNull().unique(),
  name: text("name").notNull(),
  kvkNummer: text("kvk_nummer"), // Dutch Chamber of Commerce number
  countryCode: text("country_code").references(() => countries.code), // Country code reference
  areaCode: text("area_code"), // Area code for countries that require it
  generalEmail: text("general_email"), // General email address
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  addressId: varchar("address_id").references(() => addresses.id),
  contactPersonEmail: text("contact_person_email"),
  taxId: text("tax_id"),
  bankAccount: text("bank_account"),
  invoiceEmail: text("invoice_email"), // Email for invoices
  invoiceNotes: text("invoice_notes"), // Notes for invoice handling
  language: text("language").default("nl"),
  paymentTerms: integer("payment_terms").default(30),
  status: text("status").default("active"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierNumber: text("supplier_number").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  contactPerson: text("contact_person"),
  taxId: text("tax_id"),
  paymentTerms: integer("payment_terms").default(30),
  status: text("status").default("active"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory items table
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  category: text("category"),
  unit: text("unit").default("pcs"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default('0'),
  margin: decimal("margin", { precision: 5, scale: 2 }).default('0'), // percentage
  image: text("image"), // URL or file path for product image
  currentStock: integer("current_stock").default(0),
  minimumStock: integer("minimum_stock").default(0),
  isComposite: boolean("is_composite").default(false), // true if made from other items
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory components table for composite items
export const inventoryComponents = pgTable("inventory_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentItemId: varchar("parent_item_id").references(() => inventoryItems.id).notNull(),
  componentItemId: varchar("component_item_id").references(() => inventoryItems.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // Amount of component needed
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  customerId: varchar("customer_id").references(() => customers.id),
  status: text("status").default("planning"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationNumber: text("quotation_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  status: text("status").default("draft"),
  quotationDate: timestamp("quotation_date").defaultNow(),
  description: text("description"),
  revisionNumber: text("revision_number").default("V1.0"),
  validUntil: timestamp("valid_until"),
  validityDays: integer("validity_days").default(30),
  isBudgetQuotation: boolean("is_budget_quotation").default(false),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  // Conditions
  incoTerms: text("inco_terms"),
  paymentConditions: text("payment_conditions"),
  deliveryConditions: text("delivery_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quotation items table
export const quotationItems = pgTable("quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").references(() => quotations.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  quotationId: varchar("quotation_id").references(() => quotations.id),
  projectId: varchar("project_id").references(() => projects.id),
  status: text("status").default("pending"),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice items table
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

// Purchase orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: varchar("supplier_id").references(() => suppliers.id).notNull(),
  status: text("status").default("pending"),
  orderDate: timestamp("order_date").defaultNow(),
  expectedDate: timestamp("expected_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase order items table
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: varchar("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

// Work orders table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  projectId: varchar("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to"),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Packing lists table
export const packingLists = pgTable("packing_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packingNumber: text("packing_number").notNull().unique(),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  projectId: varchar("project_id").references(() => projects.id),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  status: text("status").default("pending"),
  shippingAddress: text("shipping_address"),
  shippingMethod: text("shipping_method"),
  trackingNumber: text("tracking_number"),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: text("dimensions"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Packing list items table
export const packingListItems = pgTable("packing_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packingListId: varchar("packing_list_id").references(() => packingLists.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  packedQuantity: integer("packed_quantity").default(0),
});

// Master Data tables
export const unitsOfMeasure = pgTable("units_of_measure", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentTerms = pgTable("payment_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  days: integer("days").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incoterms = pgTable("incoterms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vatRates = pgTable("vat_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  country: text("country").default("NL"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const statuses = pgTable("statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  color: text("color"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const addressesRelations = relations(addresses, ({ many }) => ({
  customers: many(customers),
}));

export const customerContactsRelations = relations(customerContacts, ({ one }) => ({
  customer: one(customers, {
    fields: [customerContacts.customerId],
    references: [customers.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  address: one(addresses, {
    fields: [customers.addressId],
    references: [addresses.id],
  }),
  contacts: many(customerContacts),
  projects: many(projects),
  quotations: many(quotations),
  invoices: many(invoices),
  packingLists: many(packingLists),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  quotationItems: many(quotationItems),
  invoiceItems: many(invoiceItems),
  purchaseOrderItems: many(purchaseOrderItems),
  packingListItems: many(packingListItems),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  quotations: many(quotations),
  invoices: many(invoices),
  workOrders: many(workOrders),
  packingLists: many(packingLists),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  project: one(projects, {
    fields: [quotations.projectId],
    references: [projects.id],
  }),
  items: many(quotationItems),
  invoices: many(invoices),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  item: one(inventoryItems, {
    fields: [quotationItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  quotation: one(quotations, {
    fields: [invoices.quotationId],
    references: [quotations.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  items: many(invoiceItems),
  packingLists: many(packingLists),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  item: one(inventoryItems, {
    fields: [invoiceItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  item: one(inventoryItems, {
    fields: [purchaseOrderItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  project: one(projects, {
    fields: [workOrders.projectId],
    references: [projects.id],
  }),
}));

export const packingListsRelations = relations(packingLists, ({ one, many }) => ({
  customer: one(customers, {
    fields: [packingLists.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [packingLists.invoiceId],
    references: [invoices.id],
  }),
  project: one(projects, {
    fields: [packingLists.projectId],
    references: [projects.id],
  }),
  items: many(packingListItems),
}));

export const packingListItemsRelations = relations(packingListItems, ({ one }) => ({
  packingList: one(packingLists, {
    fields: [packingListItems.packingListId],
    references: [packingLists.id],
  }),
  item: one(inventoryItems, {
    fields: [packingListItems.itemId],
    references: [inventoryItems.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCountrySchema = createInsertSchema(countries).omit({ id: true, createdAt: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true });
export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({ id: true, createdAt: true }).extend({
  mobile: z.array(
    z.string()
      .min(1, "Mobile number is required")
      .regex(/^\+\d{4}\d{6,12}$/, "Mobile number must start with country code (+0031) followed by 6-12 digits")
  ).default([])
});
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, customerNumber: true, createdAt: true, deletedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, supplierNumber: true, createdAt: true, deletedAt: true });
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, createdAt: true }).extend({
  quotationDate: z.string().optional(),
  validUntil: z.string().optional(),
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(), 
  totalAmount: z.string().optional(),
  validityDays: z.number().optional(), // Virtual field for date calculations
});
export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });
export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ id: true, createdAt: true });
export const insertPackingListSchema = createInsertSchema(packingLists).omit({ id: true, createdAt: true });
export const insertPackingListItemSchema = createInsertSchema(packingListItems).omit({ id: true });

// Master Data insert schemas
export const insertUnitOfMeasureSchema = createInsertSchema(unitsOfMeasure).omit({ id: true, createdAt: true });
export const insertPaymentTermSchema = createInsertSchema(paymentTerms).omit({ id: true, createdAt: true });
export const insertIncotermSchema = createInsertSchema(incoterms).omit({ id: true, createdAt: true });
export const insertVatRateSchema = createInsertSchema(vatRates).omit({ id: true, createdAt: true });
export const insertCitySchema = createInsertSchema(cities).omit({ id: true, createdAt: true });
export const insertStatusSchema = createInsertSchema(statuses).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type PackingList = typeof packingLists.$inferSelect;
export type InsertPackingList = z.infer<typeof insertPackingListSchema>;
export type PackingListItem = typeof packingListItems.$inferSelect;
export type InsertPackingListItem = z.infer<typeof insertPackingListItemSchema>;

// Master Data types
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type InsertUnitOfMeasure = z.infer<typeof insertUnitOfMeasureSchema>;
export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type InsertPaymentTerm = z.infer<typeof insertPaymentTermSchema>;
export type Incoterm = typeof incoterms.$inferSelect;
export type InsertIncoterm = z.infer<typeof insertIncotermSchema>;
export type VatRate = typeof vatRates.$inferSelect;
export type InsertVatRate = z.infer<typeof insertVatRateSchema>;
export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type Status = typeof statuses.$inferSelect;
export type InsertStatus = z.infer<typeof insertStatusSchema>;
