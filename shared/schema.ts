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

// Languages table for language management
export const languages = pgTable("languages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // ISO language code (nl, en, de, etc.)
  name: text("name").notNull(), // Language name (Dutch, English, German, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Addresses table for reusable addresses
export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  street: text("street"),
  location: text("location"),
  houseNumber: text("house_number"),
  postalCode: text("postal_code"),
  city: text("city").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employees table for personal information
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: text("employee_number").notNull().unique().default(sql`CONCAT('EM-', LPAD(nextval('employee_number_seq')::text, 4, '0'))`),
  firstName: text("first_name").notNull(),
  firstInitial: text("first_initial"),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  email: text("email"),
  phone: text("phone"),
  mobile: jsonb("mobile").$type<string[]>().default(sql`'[]'::jsonb`),
  title: text("title"),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerNumber: text("customer_number").notNull().unique().default(sql`CONCAT('DEB-', LPAD(nextval('customer_number_seq')::text, 4, '0'))`),
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
  contactPerson2Email: text("contact_person_2_email"),
  taxId: text("tax_id"),
  bankAccount: text("bank_account"),
  invoiceEmail: text("invoice_email"), // Email for invoices
  invoiceNotes: text("invoice_notes"), // Notes for invoice handling
  memo: text("memo"), // General notes and memo
  languageCode: text("language_code").references(() => languages.code).default("nl"),
  paymentTerms: integer("payment_terms").default(30), // DEPRECATED: use paymentDaysId and paymentScheduleId instead
  paymentDaysId: varchar("payment_days_id").references(() => paymentDays.id),
  paymentScheduleId: varchar("payment_schedule_id").references(() => paymentTerms.id),
  rateId: varchar("rate_id"),
  vatRateId: varchar("vat_rate_id").references(() => vatRates.id),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  status: text("status").default("active"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierNumber: text("supplier_number").notNull().unique().default(sql`CONCAT('CRED-', LPAD(nextval('supplier_number_seq')::text, 3, '0'))`),
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

// Prospects table for potential customers
export const prospects = pgTable("prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectNumber: text("prospect_number").notNull().unique().default(sql`CONCAT('PROS-', LPAD(nextval('prospect_number_seq')::text, 4, '0'))`),
  firstName: text("first_name"),
  lastName: text("last_name"),
  companyName: text("company_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  position: text("position"),
  industry: text("industry"),
  source: text("source"), // How we found them (referral, website, etc.)
  status: text("status").default("new"), // new, contacted, qualified, proposal, negotiation, won, lost
  priority: text("priority").default("medium"), // low, medium, high
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  notes: text("notes"),
  assignedTo: text("assigned_to"), // Sales person assigned
  nextFollowUp: timestamp("next_follow_up"),
  lastContactDate: timestamp("last_contact_date"),
  conversionDate: timestamp("conversion_date"), // When they became a customer
  customerId: varchar("customer_id").references(() => customers.id), // Reference if converted
  addressId: varchar("address_id").references(() => addresses.id),
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
  projectNumber: text("project_number").notNull().unique().default(sql`CONCAT('PR-', LPAD(nextval('project_number_seq')::text, 4, '0'))`),
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
  quotationNumber: text("quotation_number").notNull().unique().default(sql`generate_quotation_number()`),
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
  // Print Settings
  printSortOrder: text("print_sort_order").default("position"), // position, price_high_low, price_low_high, alpha_az, alpha_za, amount_high_low, amount_low_high
  printProjectNo: boolean("print_project_no").default(true),
  printPaymentConditions: boolean("print_payment_conditions").default(true),
  printLanguageCode: text("print_language_code").references(() => languages.code).default("nl"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quotation items table
export const quotationItems = pgTable("quotation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: varchar("quotation_id").references(() => quotations.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id), // Nullable for text lines
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("0"), // 0 for text lines; decimal for e.g. 0.75 hours
  unit: text("unit"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0.00"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).default("0.00"),
  lineType: text("line_type").default("standard"), // 'standard', 'unique', 'text', 'charges'
  position: integer("position").default(0), // Order of items in document
  positionNo: text("position_no"), // Formatted position number (e.g., "010", "020")
  sourceSnippetId: varchar("source_snippet_id").references(() => textSnippets.id), // Link to text snippet
  sourceSnippetVersion: integer("source_snippet_version"), // Version of snippet when used
  // Delivery/sourcing fields
  deliveryDate: timestamp("delivery_date"), // Expected delivery date
  supplierId: varchar("supplier_id").references(() => suppliers.id), // Supplier for this item
  hsCode: text("hs_code"), // Harmonized System code for customs
  countryOfOrigin: text("country_of_origin"), // Country of origin for customs
});

// Quotation requests table
export const quotationRequests = pgTable("quotation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: text("request_number").notNull().unique().default(sql`generate_quotation_request_number()`),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  status: text("status").default("pending"),
  requestDate: timestamp("request_date").defaultNow(),
  dueDate: timestamp("due_date"),
  title: text("title").notNull(),
  description: text("description"),
  requirements: text("requirements"),
  estimatedBudget: decimal("estimated_budget", { precision: 10, scale: 2 }),
  priority: text("priority").default("medium"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique().default(sql`generate_ci_number()`),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  quotationId: varchar("quotation_id").references(() => quotations.id),
  projectId: varchar("project_id").references(() => projects.id),
  description: text("description"),
  paymentDaysId: varchar("payment_days_id").references(() => paymentDays.id),
  status: text("status").default("pending"),
  invoiceDate: timestamp("invoice_date").defaultNow(),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  printSortOrder: text("print_sort_order").default("position"),
  printLanguageCode: text("print_language_code").default("nl"),
  printProjectNo: boolean("print_project_no").default(true),
  printPaymentConditions: boolean("print_payment_conditions").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoice items table
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("0"), // decimal for e.g. 0.75 hours
  unit: text("unit"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0.00"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).default("0.00"),
  lineType: text("line_type").default("standard"),
  position: integer("position").default(0),
  positionNo: text("position_no"),
  workDate: timestamp("work_date"),
  customerRateId: varchar("customer_rate_id"),
  technicianNames: text("technician_names"),
  technicianIds: text("technician_ids"),
  descriptionInternal: text("description_internal"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  sourceSnippetId: varchar("source_snippet_id").references(() => textSnippets.id),
  sourceSnippetVersion: integer("source_snippet_version"),
});

// Proforma invoices table
export const proformaInvoices = pgTable("proforma_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proformaNumber: text("proforma_number").notNull().unique().default(sql`generate_proforma_invoice_number()`),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  quotationId: varchar("quotation_id").references(() => quotations.id),
  projectId: varchar("project_id").references(() => projects.id),
  status: text("status").default("pending"),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase orders table
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique().default(sql`generate_purchase_order_number()`),
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

// Sales orders table
export const salesOrders = pgTable("sales_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  status: text("status").default("pending"),
  orderDate: timestamp("order_date").defaultNow(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales order items table
export const salesOrderItems = pgTable("sales_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesOrderId: varchar("sales_order_id").references(() => salesOrders.id).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id), // Nullable for text lines
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).default("0"), // decimal for e.g. 0.75 hours
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0.00"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).default("0.00"),
  lineType: text("line_type").default("standard"), // 'standard', 'unique', 'text', 'charges'
  position: integer("position").default(0), // Order of items in document
  sourceSnippetId: varchar("source_snippet_id").references(() => textSnippets.id), // Link to text snippet
  sourceSnippetVersion: integer("source_snippet_version"), // Version of snippet when used
});

// Work orders table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique().default(sql`CONCAT('WO-', LPAD(nextval('work_order_number_seq')::text, 4, '0'))`),
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

// Invoice Work Orders junction table (many-to-many: invoice ↔ work orders)
export const invoiceWorkOrders = pgTable("invoice_work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  workOrderId: varchar("work_order_id").references(() => workOrders.id, { onDelete: 'cascade' }).notNull(),
});

export const insertInvoiceWorkOrderSchema = createInsertSchema(invoiceWorkOrders).omit({ id: true });
export type InvoiceWorkOrder = typeof invoiceWorkOrders.$inferSelect;
export type InsertInvoiceWorkOrder = z.infer<typeof insertInvoiceWorkOrderSchema>;

// Packing lists table
export const packingLists = pgTable("packing_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packingNumber: text("packing_number").notNull().unique().default(sql`CONCAT('PL-', LPAD(nextval('packing_list_number_seq')::text, 4, '0'))`),
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

// Payment Days - number of days for payment (0, 7, 30, 60, 90, etc.)
export const paymentDays = pgTable("payment_days", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  days: integer("days").notNull().unique(),
  name_nl: text("name_nl").notNull(),
  name_en: text("name_en").notNull(),
  description_nl: text("description_nl"),
  description_en: text("description_en"),
  reminderEnabled: boolean("reminder_enabled").default(false),
  reminderDays: integer("reminder_days").default(0),
  secondReminderEnabled: boolean("second_reminder_enabled").default(false),
  secondReminderDays: integer("second_reminder_days").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment Schedules - percentage breakdown of payments (100%, 50-30-10-10, etc.)
export const paymentSchedules = pgTable("payment_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // "100", "50_30_10_10"
  name_nl: text("name_nl").notNull(), // "100%", "50-30-10-10"
  name_en: text("name_en").notNull(), // "100%", "50-30-10-10"
  scheduleItems: jsonb("schedule_items").notNull(), // [{"percentage": 50, "moment_nl": "bij order", "moment_en": "by order"}, ...]
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Keep old paymentTerms for backward compatibility (can be removed later)
export const paymentTerms = pgTable("payment_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  days: integer("days").notNull(),
  description: text("description"),
  paymentAtOrder: integer("payment_at_order").default(0),
  paymentAtDelivery: integer("payment_at_delivery").default(0),
  paymentAfterInstallation: integer("payment_after_installation").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerRates = pgTable("customer_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: 'cascade' }),
  rateId: varchar("rate_id").notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const technicians = pgTable("technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ratesAndCharges = pgTable("rates_and_charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
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

// Inventory Categories - master data for product categories
export const inventoryCategories = pgTable("inventory_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({ id: true, createdAt: true });
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;

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

// Text snippets table for reusable text content
export const textSnippets = pgTable("text_snippets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // Short identifier like "WELCOME", "DISCLAIMER"
  title: text("title").notNull(), // Human readable name
  body: text("body").notNull(), // The actual text content
  category: text("category").default("general"), // "header", "footer", "disclaimer", "terms", etc.
  locale: text("locale").default("nl"), // Language code
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Text snippet usage tracking table
export const textSnippetUsages = pgTable("text_snippet_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snippetId: varchar("snippet_id").references(() => textSnippets.id).notNull(),
  docType: text("doc_type").notNull(), // "quotation", "sales_order", "invoice", etc.
  docId: varchar("doc_id").notNull(), // Reference to the document
  docLineId: varchar("doc_line_id").notNull(), // Reference to the specific line item
  versionUsed: integer("version_used").notNull(), // Version of snippet when it was used
  usedAt: timestamp("used_at").defaultNow(),
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

// Images master data table for reusable images in layouts
export const images = pgTable("images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"), // "logo", "product", "signature", etc.
  imageData: text("image_data").notNull(), // Base64 data URI
  width: integer("width"), // Original width in pixels
  height: integer("height"), // Original height in pixels
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pictograms master data table for safety/warning symbols
export const pictograms = pgTable("pictograms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"), // "danger", "warning", "mandatory", "prohibition", "information"
  imageData: text("image_data").notNull(), // Base64 data URI
  width: integer("width"),
  height: integer("height"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company profiles table for our company details (used in print layouts)
export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Company name
  logoUrl: text("logo_url"), // Path to company logo
  street: text("street"), // Street address
  houseNumber: text("house_number"), // House number
  postalCode: text("postal_code"), // Postal code
  city: text("city"), // City
  country: text("country").default("Netherlands"), // Country
  phone: text("phone"), // Phone number
  email: text("email"), // General email
  website: text("website"), // Website URL
  kvkNummer: text("kvk_nummer"), // Dutch Chamber of Commerce number
  btwNummer: text("btw_nummer"), // VAT number
  bankAccount: text("bank_account"), // Bank account (IBAN)
  bankName: text("bank_name"), // Bank name
  isActive: boolean("is_active").default(true), // Only one should be active at a time
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  salesOrders: many(salesOrders),
  packingLists: many(packingLists),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  quotationItems: many(quotationItems),
  invoiceItems: many(invoiceItems),
  purchaseOrderItems: many(purchaseOrderItems),
  salesOrderItems: many(salesOrderItems),
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

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  items: many(salesOrderItems),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  item: one(inventoryItems, {
    fields: [salesOrderItems.itemId],
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

export const textSnippetsRelations = relations(textSnippets, ({ many }) => ({
  usages: many(textSnippetUsages),
  quotationItems: many(quotationItems),
  salesOrderItems: many(salesOrderItems),
  invoiceItems: many(invoiceItems),
}));

export const textSnippetUsagesRelations = relations(textSnippetUsages, ({ one }) => ({
  snippet: one(textSnippets, {
    fields: [textSnippetUsages.snippetId],
    references: [textSnippets.id],
  }),
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
export const insertLanguageSchema = createInsertSchema(languages).omit({ id: true, createdAt: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, employeeNumber: true, createdAt: true }).extend({
  mobile: z.array(
    z.string()
      .min(1, "Mobile number is required")
      .regex(/^\+\d{4}\d{6,12}$/, "Mobile number must start with country code (+0031) followed by 6-12 digits")
  ).default([])
});
export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({ id: true, createdAt: true }).extend({
  mobile: z.array(
    z.string()
      .min(1, "Mobile number is required")
      .regex(/^\+\d{4}\d{6,12}$/, "Mobile number must start with country code (+0031) followed by 6-12 digits")
  ).default([])
});
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, customerNumber: true, createdAt: true, deletedAt: true });
export const insertCustomerRateSchema = createInsertSchema(customerRates).omit({ id: true, createdAt: true });
export const insertTechnicianSchema = createInsertSchema(technicians).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, supplierNumber: true, createdAt: true, deletedAt: true });
export const insertProspectSchema = createInsertSchema(prospects).omit({ id: true, prospectNumber: true, createdAt: true, deletedAt: true }).extend({
  nextFollowUp: z.string().optional(),
  lastContactDate: z.string().optional(),
  conversionDate: z.string().optional(),
  estimatedValue: z.string().optional()
});
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, projectNumber: true, createdAt: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, createdAt: true }).extend({
  quotationDate: z.string().optional(),
  validUntil: z.string().optional(),
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(), 
  totalAmount: z.string().optional(),
  validityDays: z.number().optional(), // Virtual field for date calculations
});
export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true });
export const insertQuotationRequestSchema = createInsertSchema(quotationRequests).omit({ id: true, createdAt: true }).extend({
  requestDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedBudget: z.string().optional()
});
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertProformaInvoiceSchema = createInsertSchema(proformaInvoices).omit({ id: true, createdAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });
export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({ id: true, createdAt: true });
export const insertSalesOrderItemSchema = createInsertSchema(salesOrderItems).omit({ id: true });
export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ id: true, createdAt: true });
export const insertPackingListSchema = createInsertSchema(packingLists).omit({ id: true, createdAt: true });
export const insertPackingListItemSchema = createInsertSchema(packingListItems).omit({ id: true });

// Master Data insert schemas
export const insertUnitOfMeasureSchema = createInsertSchema(unitsOfMeasure).omit({ id: true, createdAt: true });
export const insertPaymentDaySchema = createInsertSchema(paymentDays).omit({ id: true, createdAt: true });
export const insertPaymentScheduleSchema = createInsertSchema(paymentSchedules).omit({ id: true, createdAt: true });
export const insertPaymentTermSchema = createInsertSchema(paymentTerms).omit({ id: true, createdAt: true });
export const insertRateAndChargeSchema = createInsertSchema(ratesAndCharges).omit({ id: true, createdAt: true }).extend({
  rate: z.union([z.string(), z.number()]).transform(val => String(val)),
});
export const insertIncotermSchema = createInsertSchema(incoterms).omit({ id: true, createdAt: true });
export const insertVatRateSchema = createInsertSchema(vatRates).omit({ id: true, createdAt: true }).extend({
  rate: z.union([z.string(), z.number()]).transform(val => String(val)),
});
export const insertCitySchema = createInsertSchema(cities).omit({ id: true, createdAt: true });
export const insertStatusSchema = createInsertSchema(statuses).omit({ id: true, createdAt: true });
export const insertImageSchema = createInsertSchema(images).omit({ id: true, createdAt: true });
export const insertPictogramSchema = createInsertSchema(pictograms).omit({ id: true, createdAt: true });
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({ id: true, createdAt: true, updatedAt: true });

// Text Snippets insert schemas
export const insertTextSnippetSchema = createInsertSchema(textSnippets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTextSnippetUsageSchema = createInsertSchema(textSnippetUsages).omit({ id: true, usedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Language = typeof languages.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type Customer = typeof customers.$inferSelect;
export type CustomerRate = typeof customerRates.$inferSelect;
export type InsertCustomerRate = z.infer<typeof insertCustomerRateSchema>;
export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationRequest = typeof quotationRequests.$inferSelect;
export type InsertQuotationRequest = z.infer<typeof insertQuotationRequestSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type ProformaInvoice = typeof proformaInvoices.$inferSelect;
export type InsertProformaInvoice = z.infer<typeof insertProformaInvoiceSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = z.infer<typeof insertSalesOrderItemSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type PackingList = typeof packingLists.$inferSelect;
export type InsertPackingList = z.infer<typeof insertPackingListSchema>;
export type PackingListItem = typeof packingListItems.$inferSelect;
export type InsertPackingListItem = z.infer<typeof insertPackingListItemSchema>;

// Master Data types
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type InsertUnitOfMeasure = z.infer<typeof insertUnitOfMeasureSchema>;
export type PaymentDay = typeof paymentDays.$inferSelect;
export type InsertPaymentDay = z.infer<typeof insertPaymentDaySchema>;
export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type InsertPaymentSchedule = z.infer<typeof insertPaymentScheduleSchema>;
export type PaymentTerm = typeof paymentTerms.$inferSelect;
export type InsertPaymentTerm = z.infer<typeof insertPaymentTermSchema>;
export type RateAndCharge = typeof ratesAndCharges.$inferSelect;
export type InsertRateAndCharge = z.infer<typeof insertRateAndChargeSchema>;
export type Incoterm = typeof incoterms.$inferSelect;
export type InsertIncoterm = z.infer<typeof insertIncotermSchema>;
export type VatRate = typeof vatRates.$inferSelect;
export type InsertVatRate = z.infer<typeof insertVatRateSchema>;
export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type Status = typeof statuses.$inferSelect;
export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Pictogram = typeof pictograms.$inferSelect;
export type InsertPictogram = z.infer<typeof insertPictogramSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;

// Text Snippets types
export type TextSnippet = typeof textSnippets.$inferSelect;
export type InsertTextSnippet = z.infer<typeof insertTextSnippetSchema>;
export type TextSnippetUsage = typeof textSnippetUsages.$inferSelect;
export type InsertTextSnippetUsage = z.infer<typeof insertTextSnippetUsageSchema>;

// ===================================
// LAYOUT MANAGEMENT SYSTEM
// ===================================

// Document Layouts - Main layout configuration per document type
export const documentLayouts = pgTable("document_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutNumber: text("layout_number"),
  documentType: text("document_type").notNull(), // 'quotation', 'invoice', 'packing_list', 'work_order', etc.
  name: text("name").notNull(), // e.g., "Standard Quotation Layout", "Invoice - Landscape"
  pageFormat: text("page_format").notNull().default("A4"), // 'A4', 'Letter', etc.
  orientation: text("orientation").notNull().default("portrait"), // 'portrait' or 'landscape'
  isDefault: boolean("is_default").default(false), // Default layout for this document type
  allowedTables: jsonb("allowed_tables").$type<string[]>().default(sql`'[]'::jsonb`), // Tables/databases accessible for data fields (e.g., ['quotations', 'customers', 'projects'])
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Layout Blocks - Reusable block library (header, footer, totals, etc.)
export const layoutBlocks = pgTable("layout_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockType: text("block_type").notNull(), // 'company_header', 'page_footer', 'line_items_table', 'totals_summary', etc.
  label: text("label").notNull(), // Display name for the block
  defaultConfig: jsonb("default_config").$type<Record<string, any>>().default(sql`'{}'::jsonb`), // Default configuration
  compatibleDocumentTypes: jsonb("compatible_document_types").$type<string[]>().default(sql`'[]'::jsonb`), // Which document types can use this block
  createdAt: timestamp("created_at").defaultNow(),
});

// Type definitions for Section Configuration
export type SectionPrintRules = {
  firstPage?: boolean; // Print only on first page
  lastPage?: boolean; // Print only on last page
  oddPages?: boolean; // Print only on odd pages
  evenPages?: boolean; // Print only on even pages
  pageRange?: { from: number; to: number }; // Print on specific page range
  everyPage?: boolean; // Print on every page (default)
};

export type SectionDimensions = {
  height: number; // Height in pixels
  minHeight?: number; // Minimum height
  maxHeight?: number; // Maximum height
  unit?: 'px' | 'mm' | '%'; // Unit of measurement
};

export type SectionStyle = {
  backgroundColor?: string; // Background color
  borderColor?: string; // Border color
  borderWidth?: number; // Border width in pixels
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'; // Border style
  padding?: { top: number; right: number; bottom: number; left: number }; // Padding
  margin?: { top: number; right: number; bottom: number; left: number }; // Margin
};

export type SectionConfig = {
  printRules?: SectionPrintRules;
  dimensions?: SectionDimensions;
  style?: SectionStyle;
  canGrow?: boolean; // Section height can increase when content grows
  canShrink?: boolean; // Section height can decrease when there's whitespace
  blocks?: any[]; // Blocks within this section
  layoutGrid?: {
    rows: number; // Number of horizontal divisions
    gutter: number; // Space between rows in pixels
    snap: boolean; // Whether to snap blocks to grid
  };
  metadata?: {
    savedAsTemplate?: boolean; // Is this section saved as a reusable template
    templateId?: string; // Reference to layout_blocks if saved as template
    createdFromBlockId?: string; // If created from a template
  };
};

// Layout Sections - Sections within a layout (header, body, footer, tables)
export const layoutSections = pgTable("layout_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutId: varchar("layout_id").references(() => documentLayouts.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(), // Display name for the section
  sectionType: text("section_type").notNull(), // 'header', 'footer', 'body', 'table', 'custom'
  position: integer("position").notNull(), // Vertical position/order in layout
  allowMultiple: boolean("allow_multiple").default(false), // Can this section appear multiple times
  config: jsonb("config").$type<SectionConfig>().default(sql`'{}'::jsonb`), // Section-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
});

// Layout Elements - Individual elements within sections (fields, blocks, etc.)
export const layoutElements = pgTable("layout_elements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").references(() => layoutSections.id, { onDelete: "cascade" }).notNull(),
  elementType: text("element_type").notNull(), // 'field', 'block', 'table'
  fieldKey: text("field_key"), // For element_type='field': which data field to display
  blockId: varchar("block_id").references(() => layoutBlocks.id), // For element_type='block': which block to use
  xPosition: decimal("x_position", { precision: 10, scale: 2 }).notNull(), // X coordinate (mm)
  yPosition: decimal("y_position", { precision: 10, scale: 2 }).notNull(), // Y coordinate (mm)
  width: decimal("width", { precision: 10, scale: 2 }), // Width (mm)
  height: decimal("height", { precision: 10, scale: 2 }), // Height (mm)
  style: jsonb("style").$type<Record<string, any>>().default(sql`'{}'::jsonb`), // Font, color, alignment, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Layout Fields - Available fields per document type
export const documentLayoutFields = pgTable("document_layout_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: text("document_type").notNull(), // 'quotation', 'invoice', etc.
  fieldKey: text("field_key").notNull(), // e.g., 'quotationNumber', 'customerName', 'totalAmount'
  label: text("label").notNull(), // Display label
  dataType: text("data_type").notNull(), // 'text', 'number', 'date', 'currency'
  category: text("category"), // Group fields: 'header', 'customer', 'items', 'totals', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas and types for Layout Management
export const insertDocumentLayoutSchema = createInsertSchema(documentLayouts).omit({
  id: true,
  layoutNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLayoutBlockSchema = createInsertSchema(layoutBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertLayoutSectionSchema = createInsertSchema(layoutSections).omit({
  id: true,
  createdAt: true,
});

export const insertLayoutElementSchema = createInsertSchema(layoutElements).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentLayoutFieldSchema = createInsertSchema(documentLayoutFields).omit({
  id: true,
  createdAt: true,
});

// Section Templates - Saved section configurations for reuse
export const sectionTemplates = pgTable("section_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sectionType: text("section_type").default('general'),
  config: jsonb("config").$type<SectionConfig>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSectionTemplateSchema = createInsertSchema(sectionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sectionType: true,
});

// Types for Layout Management
export type DocumentLayout = typeof documentLayouts.$inferSelect;

// Development Futures / Feature Wishes
export const devFutures = pgTable("dev_futures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  priority: text("priority").default("medium"),
  status: text("status").default("wish"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDevFutureSchema = createInsertSchema(devFutures).omit({ id: true, createdAt: true });
export type InsertDevFuture = z.infer<typeof insertDevFutureSchema>;
export type DevFuture = typeof devFutures.$inferSelect;

export type InsertDocumentLayout = z.infer<typeof insertDocumentLayoutSchema>;
export type LayoutBlock = typeof layoutBlocks.$inferSelect;
export type InsertLayoutBlock = z.infer<typeof insertLayoutBlockSchema>;
export type LayoutSection = typeof layoutSections.$inferSelect;
export type InsertLayoutSection = z.infer<typeof insertLayoutSectionSchema>;
export type LayoutElement = typeof layoutElements.$inferSelect;
export type InsertLayoutElement = z.infer<typeof insertLayoutElementSchema>;
export type DocumentLayoutField = typeof documentLayoutFields.$inferSelect;
export type InsertDocumentLayoutField = z.infer<typeof insertDocumentLayoutFieldSchema>;
export type SectionTemplate = typeof sectionTemplates.$inferSelect;
export type InsertSectionTemplate = z.infer<typeof insertSectionTemplateSchema>;
