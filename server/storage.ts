import {
  users, customers, suppliers, inventoryItems, projects, quotations, quotationItems,
  invoices, invoiceItems, purchaseOrders, purchaseOrderItems, salesOrders, salesOrderItems, workOrders,
  packingLists, packingListItems, userPreferences, customerContacts, addresses, countries,
  unitsOfMeasure, paymentTerms, incoterms, vatRates, cities, statuses,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Supplier, type InsertSupplier, type InventoryItem, type InsertInventoryItem,
  type Project, type InsertProject, type Quotation, type InsertQuotation,
  type QuotationItem, type InsertQuotationItem, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem, type SalesOrder, type InsertSalesOrder,
  type SalesOrderItem, type InsertSalesOrderItem, type WorkOrder, type InsertWorkOrder,
  type PackingList, type InsertPackingList, type PackingListItem, type InsertPackingListItem,
  type UserPreferences, type InsertUserPreferences, type CustomerContact, type InsertCustomerContact,
  type Address, type InsertAddress, type Country, type InsertCountry, type UnitOfMeasure, type InsertUnitOfMeasure, type PaymentTerm, type InsertPaymentTerm,
  type Incoterm, type InsertIncoterm, type VatRate, type InsertVatRate,
  type City, type InsertCity, type Status, type InsertStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Country methods
  getCountries(): Promise<Country[]>;
  getCountry(id: string): Promise<Country | undefined>;
  getCountryByCode(code: string): Promise<Country | undefined>;
  searchCountries(query: string): Promise<Country[]>;
  createCountry(country: InsertCountry): Promise<Country>;
  updateCountry(id: string, country: Partial<InsertCountry>): Promise<Country>;
  deleteCountry(id: string): Promise<void>;

  // Customer methods
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Address methods
  getAddresses(): Promise<Address[]>;
  getAddress(id: string): Promise<Address | undefined>;
  searchAddresses(query: string): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address>;
  deleteAddress(id: string): Promise<void>;

  // Customer Contact methods
  getCustomerContacts(): Promise<CustomerContact[]>;
  getCustomerContact(id: string): Promise<CustomerContact | undefined>;
  getCustomerContactsByCustomer(customerId: string): Promise<CustomerContact[]>;
  searchCustomerContacts(query: string, customerId?: string): Promise<CustomerContact[]>;
  createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact>;
  updateCustomerContact(id: string, contact: Partial<InsertCustomerContact>): Promise<CustomerContact>;
  deleteCustomerContact(id: string): Promise<void>;

  // Supplier methods
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;

  // Inventory methods
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: string): Promise<void>;
  getLowStockItems(): Promise<InventoryItem[]>;

  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Quotation methods
  getQuotations(): Promise<Quotation[]>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation>;
  deleteQuotation(id: string): Promise<void>;
  getQuotationItems(quotationId: string): Promise<QuotationItem[]>;
  addQuotationItem(item: InsertQuotationItem): Promise<QuotationItem>;
  updateQuotationItem(id: string, item: Partial<InsertQuotationItem>): Promise<QuotationItem>;
  deleteQuotationItem(id: string): Promise<void>;

  // Invoice methods
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  addInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem>;
  deleteInvoiceItem(id: string): Promise<void>;

  // Purchase Order methods
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
  getPurchaseOrderItems(orderId: string): Promise<PurchaseOrderItem[]>;
  addPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: string, item: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem>;
  deletePurchaseOrderItem(id: string): Promise<void>;

  // Sales Order methods
  getSalesOrders(): Promise<SalesOrder[]>;
  getSalesOrder(id: string): Promise<SalesOrder | undefined>;
  createSalesOrder(order: InsertSalesOrder): Promise<SalesOrder>;
  updateSalesOrder(id: string, order: Partial<InsertSalesOrder>): Promise<SalesOrder>;
  deleteSalesOrder(id: string): Promise<void>;
  getSalesOrderItems(orderId: string): Promise<SalesOrderItem[]>;
  addSalesOrderItem(item: InsertSalesOrderItem): Promise<SalesOrderItem>;
  updateSalesOrderItem(id: string, item: Partial<InsertSalesOrderItem>): Promise<SalesOrderItem>;
  deleteSalesOrderItem(id: string): Promise<void>;

  // Work Order methods
  getWorkOrders(): Promise<WorkOrder[]>;
  getWorkOrder(id: string): Promise<WorkOrder | undefined>;
  createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, order: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;

  // Packing List methods
  getPackingLists(): Promise<PackingList[]>;
  getPackingList(id: string): Promise<PackingList | undefined>;
  createPackingList(list: InsertPackingList): Promise<PackingList>;
  updatePackingList(id: string, list: Partial<InsertPackingList>): Promise<PackingList>;
  deletePackingList(id: string): Promise<void>;
  getPackingListItems(listId: string): Promise<PackingListItem[]>;
  addPackingListItem(item: InsertPackingListItem): Promise<PackingListItem>;
  updatePackingListItem(id: string, item: Partial<InsertPackingListItem>): Promise<PackingListItem>;
  deletePackingListItem(id: string): Promise<void>;

  // Dashboard methods
  getDashboardStats(): Promise<{
    totalRevenue: number;
    activeProjects: number;
    stockItems: number;
    pendingOrders: number;
    lowStockCount: number;
    outOfStockCount: number;
  }>;

  // Master Data methods
  getUnitsOfMeasure(): Promise<UnitOfMeasure[]>;
  createUnitOfMeasure(uom: InsertUnitOfMeasure): Promise<UnitOfMeasure>;
  updateUnitOfMeasure(id: string, uom: Partial<InsertUnitOfMeasure>): Promise<UnitOfMeasure>;
  deleteUnitOfMeasure(id: string): Promise<void>;

  getPaymentTerms(): Promise<PaymentTerm[]>;
  createPaymentTerm(term: InsertPaymentTerm): Promise<PaymentTerm>;
  updatePaymentTerm(id: string, term: Partial<InsertPaymentTerm>): Promise<PaymentTerm>;
  deletePaymentTerm(id: string): Promise<void>;

  getIncoterms(): Promise<Incoterm[]>;
  createIncoterm(incoterm: InsertIncoterm): Promise<Incoterm>;
  updateIncoterm(id: string, incoterm: Partial<InsertIncoterm>): Promise<Incoterm>;
  deleteIncoterm(id: string): Promise<void>;

  getVatRates(): Promise<VatRate[]>;
  createVatRate(rate: InsertVatRate): Promise<VatRate>;
  updateVatRate(id: string, rate: Partial<InsertVatRate>): Promise<VatRate>;
  deleteVatRate(id: string): Promise<void>;

  getCities(): Promise<City[]>;
  createCity(city: InsertCity): Promise<City>;
  updateCity(id: string, city: Partial<InsertCity>): Promise<City>;
  deleteCity(id: string): Promise<void>;

  getStatuses(): Promise<Status[]>;
  createStatus(status: InsertStatus): Promise<Status>;
  updateStatus(id: string, status: Partial<InsertStatus>): Promise<Status>;
  deleteStatus(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences || undefined;
  }

  async saveUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, preferences.userId!));
    
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          navigationOrder: preferences.navigationOrder,
          collapsedSections: preferences.collapsedSections,
          updatedAt: sql`NOW()`
        })
        .where(eq(userPreferences.userId, preferences.userId!))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPreferences).values(preferences).returning();
      return created;
    }
  }

  // Country methods
  async getCountries(): Promise<Country[]> {
    return await db.select().from(countries).orderBy(countries.name);
  }

  async getCountry(id: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country || undefined;
  }

  async getCountryByCode(code: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.code, code));
    return country || undefined;
  }

  async createCountry(country: InsertCountry): Promise<Country> {
    const [newCountry] = await db.insert(countries).values(country).returning();
    return newCountry;
  }

  async updateCountry(id: string, country: Partial<InsertCountry>): Promise<Country> {
    const [updatedCountry] = await db.update(countries).set(country).where(eq(countries.id, id)).returning();
    return updatedCountry;
  }

  async deleteCountry(id: string): Promise<void> {
    await db.delete(countries).where(eq(countries.id, id));
  }

  async searchCountries(query: string): Promise<Country[]> {
    return await db.select().from(countries)
      .where(or(
        ilike(countries.name, `%${query}%`),
        ilike(countries.code, `%${query}%`)
      ))
      .orderBy(countries.name);
  }

  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(sql`deleted_at IS NULL`)
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    // Customer number is now automatically generated by the database
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    // Soft delete - set deletedAt timestamp
    await db.update(customers)
      .set({ deletedAt: sql`NOW()` })
      .where(eq(customers.id, id));
  }

  // Customer Contact methods
  async getCustomerContacts(): Promise<CustomerContact[]> {
    return await db.select().from(customerContacts).orderBy(desc(customerContacts.createdAt));
  }

  async getCustomerContact(id: string): Promise<CustomerContact | undefined> {
    const [contact] = await db.select().from(customerContacts).where(eq(customerContacts.id, id));
    return contact || undefined;
  }

  async getCustomerContactsByCustomer(customerId: string): Promise<CustomerContact[]> {
    return await db.select().from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(desc(customerContacts.isPrimary), desc(customerContacts.createdAt));
  }

  async createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact> {
    const [newContact] = await db.insert(customerContacts).values(contact).returning();
    return newContact;
  }

  async updateCustomerContact(id: string, contact: Partial<InsertCustomerContact>): Promise<CustomerContact> {
    const [updatedContact] = await db.update(customerContacts).set(contact).where(eq(customerContacts.id, id)).returning();
    return updatedContact;
  }

  async searchCustomerContacts(query: string, customerId?: string): Promise<CustomerContact[]> {
    let whereCondition = or(
      ilike(customerContacts.firstName, `%${query}%`),
      ilike(customerContacts.lastName, `%${query}%`),
      ilike(customerContacts.email, `%${query}%`),
      ilike(customerContacts.position, `%${query}%`)
    );

    if (customerId) {
      whereCondition = and(eq(customerContacts.customerId, customerId), whereCondition);
    }

    return await db.select().from(customerContacts)
      .where(whereCondition)
      .orderBy(desc(customerContacts.isPrimary), desc(customerContacts.createdAt));
  }

  async deleteCustomerContact(id: string): Promise<void> {
    await db.delete(customerContacts).where(eq(customerContacts.id, id));
  }

  // Address methods
  async getAddresses(): Promise<Address[]> {
    return await db.select().from(addresses).orderBy(desc(addresses.createdAt));
  }

  async getAddress(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async searchAddresses(query: string): Promise<Address[]> {
    return await db.select().from(addresses)
      .where(or(
        ilike(addresses.street, `%${query}%`),
        ilike(addresses.houseNumber, `%${query}%`),
        ilike(addresses.postalCode, `%${query}%`),
        ilike(addresses.city, `%${query}%`),
        ilike(addresses.country, `%${query}%`)
      ))
      .orderBy(desc(addresses.createdAt));
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const [newAddress] = await db.insert(addresses).values(address).returning();
    return newAddress;
  }

  async updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address> {
    const [updatedAddress] = await db.update(addresses).set(address).where(eq(addresses.id, id)).returning();
    return updatedAddress;
  }

  async deleteAddress(id: string): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  // Supplier methods
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers)
      .where(sql`deleted_at IS NULL`)
      .orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    // Supplier number is now automatically generated by the database
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    // Soft delete - set deletedAt timestamp
    await db.update(suppliers)
      .set({ deletedAt: sql`NOW()` })
      .where(eq(suppliers.id, id));
  }

  // Inventory methods
  async getInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db.update(inventoryItems).set(item).where(eq(inventoryItems.id, id)).returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems)
      .where(sql`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`);
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Quotation methods
  async getQuotations(): Promise<Quotation[]> {
    return await db.select().from(quotations).orderBy(desc(quotations.createdAt));
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation || undefined;
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    // Quotation number is now automatically generated by the database
    
    // Set validity to 30 days from quotation date if not provided
    let validUntilDate: Date | undefined;
    if (quotation.validUntil) {
      validUntilDate = new Date(quotation.validUntil);
    } else if (quotation.quotationDate) {
      const quoteDate = new Date(quotation.quotationDate);
      quoteDate.setDate(quoteDate.getDate() + 30);
      validUntilDate = quoteDate;
    }
    
    const [newQuotation] = await db.insert(quotations).values({
      customerId: quotation.customerId,
      projectId: quotation.projectId,
      status: quotation.status || "draft",
      quotationDate: quotation.quotationDate ? new Date(quotation.quotationDate) : new Date(),
      description: quotation.description,
      revisionNumber: quotation.revisionNumber || "V1.0",
      validUntil: validUntilDate,
      validityDays: quotation.validityDays || 30,
      isBudgetQuotation: quotation.isBudgetQuotation || false,
      subtotal: quotation.subtotal || "0",
      taxAmount: quotation.taxAmount || "0",
      totalAmount: quotation.totalAmount || "0",
      notes: quotation.notes,
      incoTerms: quotation.incoTerms,
      paymentConditions: quotation.paymentConditions,
      deliveryConditions: quotation.deliveryConditions
    }).returning();
    return newQuotation;
  }

  async updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation> {
    const updateData: any = { ...quotation };
    
    if (updateData.quotationDate && typeof updateData.quotationDate === 'string') {
      updateData.quotationDate = new Date(updateData.quotationDate);
    }
    if (updateData.validUntil && typeof updateData.validUntil === 'string') {
      updateData.validUntil = new Date(updateData.validUntil);
    }
    const [updatedQuotation] = await db.update(quotations).set(updateData).where(eq(quotations.id, id)).returning();
    return updatedQuotation;
  }

  async deleteQuotation(id: string): Promise<void> {
    await db.delete(quotations).where(eq(quotations.id, id));
  }

  async getQuotationDetails(id: string): Promise<{
    quotation: Quotation,
    items: QuotationItem[],
    customer: { id: string; name: string; email?: string; phone?: string; city?: string }
  } | undefined> {
    // Get quotation with customer and address info in one query
    const [quotationWithCustomer] = await db
      .select({
        // Quotation fields
        id: quotations.id,
        quotationNumber: quotations.quotationNumber,
        customerId: quotations.customerId,
        projectId: quotations.projectId,
        status: quotations.status,
        quotationDate: quotations.quotationDate,
        description: quotations.description,
        revisionNumber: quotations.revisionNumber,
        validUntil: quotations.validUntil,
        validityDays: quotations.validityDays,
        isBudgetQuotation: quotations.isBudgetQuotation,
        subtotal: quotations.subtotal,
        taxAmount: quotations.taxAmount,
        totalAmount: quotations.totalAmount,
        notes: quotations.notes,
        incoTerms: quotations.incoTerms,
        paymentConditions: quotations.paymentConditions,
        deliveryConditions: quotations.deliveryConditions,
        createdAt: quotations.createdAt,
        // Customer fields
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        // Address fields
        addressCity: addresses.city,
      })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(addresses, eq(customers.addressId, addresses.id))
      .where(eq(quotations.id, id));

    if (!quotationWithCustomer) return undefined;

    // Get quotation items
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, id));

    // Structure the response
    const quotation: Quotation = {
      id: quotationWithCustomer.id,
      quotationNumber: quotationWithCustomer.quotationNumber,
      customerId: quotationWithCustomer.customerId,
      projectId: quotationWithCustomer.projectId,
      status: quotationWithCustomer.status,
      quotationDate: quotationWithCustomer.quotationDate,
      description: quotationWithCustomer.description,
      revisionNumber: quotationWithCustomer.revisionNumber,
      validUntil: quotationWithCustomer.validUntil,
      validityDays: quotationWithCustomer.validityDays,
      isBudgetQuotation: quotationWithCustomer.isBudgetQuotation,
      subtotal: quotationWithCustomer.subtotal,
      taxAmount: quotationWithCustomer.taxAmount,
      totalAmount: quotationWithCustomer.totalAmount,
      notes: quotationWithCustomer.notes,
      incoTerms: quotationWithCustomer.incoTerms,
      paymentConditions: quotationWithCustomer.paymentConditions,
      deliveryConditions: quotationWithCustomer.deliveryConditions,
      createdAt: quotationWithCustomer.createdAt,
    };

    const customer = {
      id: quotationWithCustomer.customerId!,
      name: quotationWithCustomer.customerName!,
      email: quotationWithCustomer.customerEmail || undefined,
      phone: quotationWithCustomer.customerPhone || undefined,
      city: quotationWithCustomer.addressCity || undefined,
    };

    return { quotation, items, customer };
  }

  async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
    return await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  }

  async addQuotationItem(item: InsertQuotationItem): Promise<QuotationItem> {
    const [newItem] = await db.insert(quotationItems).values(item).returning();
    return newItem;
  }

  async updateQuotationItem(id: string, item: Partial<InsertQuotationItem>): Promise<QuotationItem> {
    const [updatedItem] = await db.update(quotationItems).set(item).where(eq(quotationItems.id, id)).returning();
    return updatedItem;
  }

  async deleteQuotationItem(id: string): Promise<void> {
    await db.delete(quotationItems).where(eq(quotationItems.id, id));
  }

  // Invoice methods
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db.update(invoices).set(invoice).where(eq(invoices.id, id)).returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async addInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem> {
    const [updatedItem] = await db.update(invoiceItems).set(item).where(eq(invoiceItems.id, id)).returning();
    return updatedItem;
  }

  async deleteInvoiceItem(id: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  // Purchase Order methods
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return order || undefined;
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [newOrder] = await db.insert(purchaseOrders).values(order).returning();
    return newOrder;
  }

  async updatePurchaseOrder(id: string, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    const [updatedOrder] = await db.update(purchaseOrders).set(order).where(eq(purchaseOrders.id, id)).returning();
    return updatedOrder;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async getPurchaseOrderItems(orderId: string): Promise<PurchaseOrderItem[]> {
    return await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, orderId));
  }

  async addPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [newItem] = await db.insert(purchaseOrderItems).values(item).returning();
    return newItem;
  }

  async updatePurchaseOrderItem(id: string, item: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem> {
    const [updatedItem] = await db.update(purchaseOrderItems).set(item).where(eq(purchaseOrderItems.id, id)).returning();
    return updatedItem;
  }

  async deletePurchaseOrderItem(id: string): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
  }

  // Sales Order methods
  async getSalesOrders(): Promise<SalesOrder[]> {
    return await db.select().from(salesOrders).orderBy(desc(salesOrders.createdAt));
  }

  async getSalesOrder(id: string): Promise<SalesOrder | undefined> {
    const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, id));
    return order || undefined;
  }

  async createSalesOrder(order: InsertSalesOrder): Promise<SalesOrder> {
    const [newOrder] = await db.insert(salesOrders).values(order).returning();
    return newOrder;
  }

  async updateSalesOrder(id: string, order: Partial<InsertSalesOrder>): Promise<SalesOrder> {
    const [updatedOrder] = await db.update(salesOrders).set(order).where(eq(salesOrders.id, id)).returning();
    return updatedOrder;
  }

  async deleteSalesOrder(id: string): Promise<void> {
    await db.delete(salesOrders).where(eq(salesOrders.id, id));
  }

  async getSalesOrderItems(orderId: string): Promise<SalesOrderItem[]> {
    return await db.select().from(salesOrderItems).where(eq(salesOrderItems.salesOrderId, orderId));
  }

  async addSalesOrderItem(item: InsertSalesOrderItem): Promise<SalesOrderItem> {
    const [newItem] = await db.insert(salesOrderItems).values(item).returning();
    return newItem;
  }

  async updateSalesOrderItem(id: string, item: Partial<InsertSalesOrderItem>): Promise<SalesOrderItem> {
    const [updatedItem] = await db.update(salesOrderItems).set(item).where(eq(salesOrderItems.id, id)).returning();
    return updatedItem;
  }

  async deleteSalesOrderItem(id: string): Promise<void> {
    await db.delete(salesOrderItems).where(eq(salesOrderItems.id, id));
  }

  // Work Order methods
  async getWorkOrders(): Promise<WorkOrder[]> {
    return await db.select().from(workOrders).orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrder(id: string): Promise<WorkOrder | undefined> {
    const [order] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return order || undefined;
  }

  async createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
    const [newOrder] = await db.insert(workOrders).values(order).returning();
    return newOrder;
  }

  async updateWorkOrder(id: string, order: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const [updatedOrder] = await db.update(workOrders).set(order).where(eq(workOrders.id, id)).returning();
    return updatedOrder;
  }

  async deleteWorkOrder(id: string): Promise<void> {
    await db.delete(workOrders).where(eq(workOrders.id, id));
  }

  // Packing List methods
  async getPackingLists(): Promise<PackingList[]> {
    return await db.select().from(packingLists).orderBy(desc(packingLists.createdAt));
  }

  async getPackingList(id: string): Promise<PackingList | undefined> {
    const [list] = await db.select().from(packingLists).where(eq(packingLists.id, id));
    return list || undefined;
  }

  async createPackingList(list: InsertPackingList): Promise<PackingList> {
    const [newList] = await db.insert(packingLists).values(list).returning();
    return newList;
  }

  async updatePackingList(id: string, list: Partial<InsertPackingList>): Promise<PackingList> {
    const [updatedList] = await db.update(packingLists).set(list).where(eq(packingLists.id, id)).returning();
    return updatedList;
  }

  async deletePackingList(id: string): Promise<void> {
    await db.delete(packingLists).where(eq(packingLists.id, id));
  }

  async getPackingListItems(listId: string): Promise<PackingListItem[]> {
    return await db.select().from(packingListItems).where(eq(packingListItems.packingListId, listId));
  }

  async addPackingListItem(item: InsertPackingListItem): Promise<PackingListItem> {
    const [newItem] = await db.insert(packingListItems).values(item).returning();
    return newItem;
  }

  async updatePackingListItem(id: string, item: Partial<InsertPackingListItem>): Promise<PackingListItem> {
    const [updatedItem] = await db.update(packingListItems).set(item).where(eq(packingListItems.id, id)).returning();
    return updatedItem;
  }

  async deletePackingListItem(id: string): Promise<void> {
    await db.delete(packingListItems).where(eq(packingListItems.id, id));
  }

  // Dashboard methods
  async getDashboardStats(): Promise<{
    totalRevenue: number;
    activeProjects: number;
    stockItems: number;
    pendingOrders: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const [
      revenueResult,
      activeProjectsResult,
      stockItemsResult,
      pendingOrdersResult,
      lowStockResult,
      outOfStockResult
    ] = await Promise.all([
      db.select({ 
        total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` 
      }).from(invoices).where(eq(invoices.status, 'paid')),
      
      db.select({ 
        count: sql<number>`COUNT(*)` 
      }).from(projects).where(or(eq(projects.status, 'in-progress'), eq(projects.status, 'planning'))),
      
      db.select({ 
        count: sql<number>`COUNT(*)` 
      }).from(inventoryItems),
      
      db.select({ 
        count: sql<number>`COUNT(*)` 
      }).from(purchaseOrders).where(eq(purchaseOrders.status, 'pending')),
      
      db.select({ 
        count: sql<number>`COUNT(*)` 
      }).from(inventoryItems).where(sql`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock} AND ${inventoryItems.currentStock} > 0`),
      
      db.select({ 
        count: sql<number>`COUNT(*)` 
      }).from(inventoryItems).where(eq(inventoryItems.currentStock, 0))
    ]);

    return {
      totalRevenue: Number(revenueResult[0]?.total || 0),
      activeProjects: Number(activeProjectsResult[0]?.count || 0),
      stockItems: Number(stockItemsResult[0]?.count || 0),
      pendingOrders: Number(pendingOrdersResult[0]?.count || 0),
      lowStockCount: Number(lowStockResult[0]?.count || 0),
      outOfStockCount: Number(outOfStockResult[0]?.count || 0),
    };
  }

  // Master Data methods implementation
  async getUnitsOfMeasure(): Promise<UnitOfMeasure[]> {
    return await db.select().from(unitsOfMeasure).where(eq(unitsOfMeasure.isActive, true)).orderBy(unitsOfMeasure.name);
  }

  async createUnitOfMeasure(uom: InsertUnitOfMeasure): Promise<UnitOfMeasure> {
    const [newUom] = await db.insert(unitsOfMeasure).values(uom).returning();
    return newUom;
  }

  async updateUnitOfMeasure(id: string, uom: Partial<InsertUnitOfMeasure>): Promise<UnitOfMeasure> {
    const [updatedUom] = await db.update(unitsOfMeasure).set(uom).where(eq(unitsOfMeasure.id, id)).returning();
    return updatedUom;
  }

  async deleteUnitOfMeasure(id: string): Promise<void> {
    await db.update(unitsOfMeasure).set({ isActive: false }).where(eq(unitsOfMeasure.id, id));
  }

  async getPaymentTerms(): Promise<PaymentTerm[]> {
    return await db.select().from(paymentTerms).where(eq(paymentTerms.isActive, true)).orderBy(paymentTerms.days);
  }

  async createPaymentTerm(term: InsertPaymentTerm): Promise<PaymentTerm> {
    const [newTerm] = await db.insert(paymentTerms).values(term).returning();
    return newTerm;
  }

  async updatePaymentTerm(id: string, term: Partial<InsertPaymentTerm>): Promise<PaymentTerm> {
    const [updatedTerm] = await db.update(paymentTerms).set(term).where(eq(paymentTerms.id, id)).returning();
    return updatedTerm;
  }

  async deletePaymentTerm(id: string): Promise<void> {
    await db.update(paymentTerms).set({ isActive: false }).where(eq(paymentTerms.id, id));
  }

  async getIncoterms(): Promise<Incoterm[]> {
    return await db.select().from(incoterms).where(eq(incoterms.isActive, true)).orderBy(incoterms.code);
  }

  async createIncoterm(incoterm: InsertIncoterm): Promise<Incoterm> {
    const [newIncoterm] = await db.insert(incoterms).values(incoterm).returning();
    return newIncoterm;
  }

  async updateIncoterm(id: string, incoterm: Partial<InsertIncoterm>): Promise<Incoterm> {
    const [updatedIncoterm] = await db.update(incoterms).set(incoterm).where(eq(incoterms.id, id)).returning();
    return updatedIncoterm;
  }

  async deleteIncoterm(id: string): Promise<void> {
    await db.update(incoterms).set({ isActive: false }).where(eq(incoterms.id, id));
  }

  async getVatRates(): Promise<VatRate[]> {
    return await db.select().from(vatRates).where(eq(vatRates.isActive, true)).orderBy(vatRates.rate);
  }

  async createVatRate(rate: InsertVatRate): Promise<VatRate> {
    const [newRate] = await db.insert(vatRates).values(rate).returning();
    return newRate;
  }

  async updateVatRate(id: string, rate: Partial<InsertVatRate>): Promise<VatRate> {
    const [updatedRate] = await db.update(vatRates).set(rate).where(eq(vatRates.id, id)).returning();
    return updatedRate;
  }

  async deleteVatRate(id: string): Promise<void> {
    await db.update(vatRates).set({ isActive: false }).where(eq(vatRates.id, id));
  }

  async getCities(): Promise<City[]> {
    return await db.select().from(cities).where(eq(cities.isActive, true)).orderBy(cities.name);
  }

  async createCity(city: InsertCity): Promise<City> {
    const [newCity] = await db.insert(cities).values(city).returning();
    return newCity;
  }

  async updateCity(id: string, city: Partial<InsertCity>): Promise<City> {
    const [updatedCity] = await db.update(cities).set(city).where(eq(cities.id, id)).returning();
    return updatedCity;
  }

  async deleteCity(id: string): Promise<void> {
    await db.update(cities).set({ isActive: false }).where(eq(cities.id, id));
  }

  async getStatuses(): Promise<Status[]> {
    return await db.select().from(statuses).where(eq(statuses.isActive, true)).orderBy(statuses.category, statuses.name);
  }

  async createStatus(status: InsertStatus): Promise<Status> {
    const [newStatus] = await db.insert(statuses).values(status).returning();
    return newStatus;
  }

  async updateStatus(id: string, status: Partial<InsertStatus>): Promise<Status> {
    const [updatedStatus] = await db.update(statuses).set(status).where(eq(statuses.id, id)).returning();
    return updatedStatus;
  }

  async deleteStatus(id: string): Promise<void> {
    await db.update(statuses).set({ isActive: false }).where(eq(statuses.id, id));
  }

  // Initialize basic country data
  async initializeCountries(): Promise<void> {
    try {
      // Check if countries already exist
      const existingCountries = await this.getCountries();
      if (existingCountries.length > 0) {
        return; // Countries already initialized
      }

      // Add basic country data
      const basicCountries = [
        {
          code: "NL",
          name: "Netherlands",
          requiresBtw: true,
          requiresAreaCode: false
        },
        {
          code: "ET",
          name: "Ethiopia", 
          requiresBtw: false,
          requiresAreaCode: true
        }
      ];

      for (const country of basicCountries) {
        await this.createCountry(country);
      }

      console.log('Basic country data initialized successfully');
    } catch (error) {
      console.error('Error initializing country data:', error);
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize basic data when storage is created
storage.initializeCountries();
