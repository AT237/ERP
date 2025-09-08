import {
  users, customers, suppliers, inventoryItems, projects, quotations, quotationItems,
  invoices, invoiceItems, purchaseOrders, purchaseOrderItems, workOrders,
  packingLists, packingListItems, userPreferences, customerContacts,
  unitsOfMeasure, paymentTerms, incoterms, vatRates, cities, statuses,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Supplier, type InsertSupplier, type InventoryItem, type InsertInventoryItem,
  type Project, type InsertProject, type Quotation, type InsertQuotation,
  type QuotationItem, type InsertQuotationItem, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem, type WorkOrder, type InsertWorkOrder,
  type PackingList, type InsertPackingList, type PackingListItem, type InsertPackingListItem,
  type UserPreferences, type InsertUserPreferences, type CustomerContact, type InsertCustomerContact,
  type UnitOfMeasure, type InsertUnitOfMeasure, type PaymentTerm, type InsertPaymentTerm,
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

  // Customer methods
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Customer Contact methods
  getCustomerContacts(): Promise<CustomerContact[]>;
  getCustomerContact(id: string): Promise<CustomerContact | undefined>;
  getCustomerContactsByCustomer(customerId: string): Promise<CustomerContact[]>;
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
    // Generate next customer number
    const lastCustomer = await db.select({ customerNumber: customers.customerNumber })
      .from(customers)
      .orderBy(desc(customers.customerNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (lastCustomer.length > 0 && lastCustomer[0].customerNumber) {
      const match = lastCustomer[0].customerNumber.match(/DEB-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    const customerNumber = `DEB-${nextNumber.toString().padStart(5, '0')}`;
    
    const [newCustomer] = await db.insert(customers).values({
      ...customer,
      customerNumber
    }).returning();
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

  async deleteCustomerContact(id: string): Promise<void> {
    await db.delete(customerContacts).where(eq(customerContacts.id, id));
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
    // Generate next supplier number
    const lastSupplier = await db.select({ supplierNumber: suppliers.supplierNumber })
      .from(suppliers)
      .orderBy(desc(suppliers.supplierNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (lastSupplier.length > 0 && lastSupplier[0].supplierNumber) {
      const match = lastSupplier[0].supplierNumber.match(/CRED-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    const supplierNumber = `CRED-${nextNumber.toString().padStart(5, '0')}`;
    
    const [newSupplier] = await db.insert(suppliers).values({
      ...supplier,
      supplierNumber
    }).returning();
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
    // Generate next quotation number with Q-YYYY-NNN format
    const currentYear = quotation.quotationDate ? new Date(quotation.quotationDate).getFullYear() : new Date().getFullYear();
    
    // Get the last quotation for the current year
    const lastQuotation = await db.select({ quotationNumber: quotations.quotationNumber })
      .from(quotations)
      .where(sql`EXTRACT(YEAR FROM ${quotations.quotationDate}) = ${currentYear}`)
      .orderBy(desc(quotations.quotationNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (lastQuotation.length > 0 && lastQuotation[0].quotationNumber) {
      const match = lastQuotation[0].quotationNumber.match(/Q-(\d{4})-(\d{3})/);
      if (match && parseInt(match[1]) === currentYear) {
        nextNumber = parseInt(match[2]) + 1;
      }
    }
    
    const quotationNumber = `Q-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
    
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
      ...quotation,
      quotationNumber,
      quotationDate: quotation.quotationDate ? new Date(quotation.quotationDate) : new Date(),
      validUntil: validUntilDate,
      revisionNumber: quotation.revisionNumber || "V1.0"
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
}

// In-memory storage implementation for when database is not available
class MemoryStorage implements IStorage {
  private users: User[] = [];
  private customers: Customer[] = [];
  private suppliers: Supplier[] = [];
  private inventory: InventoryItem[] = [];
  private projects: Project[] = [];
  private quotations: Quotation[] = [];
  private quotationItems: QuotationItem[] = [];
  private customerContacts: CustomerContact[] = [];
  private userPrefs: UserPreferences[] = [];

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = { ...user, id: `user_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.users.push(newUser);
    return newUser;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    return this.userPrefs.find(p => p.userId === userId);
  }

  async saveUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const existing = this.userPrefs.find(p => p.userId === preferences.userId);
    if (existing) {
      Object.assign(existing, preferences, { updatedAt: new Date() });
      return existing;
    }
    const newPrefs: UserPreferences = { ...preferences, id: `pref_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.userPrefs.push(newPrefs);
    return newPrefs;
  }

  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return this.customers;
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer: Customer = { ...customer, id: `cust_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const existing = this.customers.find(c => c.id === id);
    if (!existing) throw new Error('Customer not found');
    Object.assign(existing, customer, { updatedAt: new Date() });
    return existing;
  }

  async deleteCustomer(id: string): Promise<void> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index > -1) this.customers.splice(index, 1);
  }

  // Customer Contact methods
  async getCustomerContacts(): Promise<CustomerContact[]> {
    return this.customerContacts;
  }

  async getCustomerContact(id: string): Promise<CustomerContact | undefined> {
    return this.customerContacts.find(c => c.id === id);
  }

  async getCustomerContactsByCustomer(customerId: string): Promise<CustomerContact[]> {
    return this.customerContacts.filter(c => c.customerId === customerId);
  }

  async createCustomerContact(contact: InsertCustomerContact): Promise<CustomerContact> {
    const newContact: CustomerContact = { ...contact, id: `contact_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.customerContacts.push(newContact);
    return newContact;
  }

  async updateCustomerContact(id: string, contact: Partial<InsertCustomerContact>): Promise<CustomerContact> {
    const existing = this.customerContacts.find(c => c.id === id);
    if (!existing) throw new Error('Contact not found');
    Object.assign(existing, contact, { updatedAt: new Date() });
    return existing;
  }

  async deleteCustomerContact(id: string): Promise<void> {
    const index = this.customerContacts.findIndex(c => c.id === id);
    if (index > -1) this.customerContacts.splice(index, 1);
  }

  // Supplier methods
  async getSuppliers(): Promise<Supplier[]> {
    return this.suppliers;
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.find(s => s.id === id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const newSupplier: Supplier = { ...supplier, id: `supp_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.suppliers.push(newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const existing = this.suppliers.find(s => s.id === id);
    if (!existing) throw new Error('Supplier not found');
    Object.assign(existing, supplier, { updatedAt: new Date() });
    return existing;
  }

  async deleteSupplier(id: string): Promise<void> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index > -1) this.suppliers.splice(index, 1);
  }

  // Inventory methods
  async getInventoryItems(): Promise<InventoryItem[]> {
    return this.inventory;
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    return this.inventory.find(i => i.id === id);
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const newItem: InventoryItem = { ...item, id: `item_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.inventory.push(newItem);
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const existing = this.inventory.find(i => i.id === id);
    if (!existing) throw new Error('Item not found');
    Object.assign(existing, item, { updatedAt: new Date() });
    return existing;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const index = this.inventory.findIndex(i => i.id === id);
    if (index > -1) this.inventory.splice(index, 1);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return this.inventory.filter(i => i.stockQuantity <= (i.minimumStockLevel || 0));
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return this.projects;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.find(p => p.id === id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const newProject: Project = { ...project, id: `proj_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.projects.push(newProject);
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const existing = this.projects.find(p => p.id === id);
    if (!existing) throw new Error('Project not found');
    Object.assign(existing, project, { updatedAt: new Date() });
    return existing;
  }

  async deleteProject(id: string): Promise<void> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index > -1) this.projects.splice(index, 1);
  }

  // Quotation methods  
  async getQuotations(): Promise<Quotation[]> {
    return this.quotations;
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    return this.quotations.find(q => q.id === id);
  }

  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const newQuotation: Quotation = { ...quotation, id: `quot_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.quotations.push(newQuotation);
    return newQuotation;
  }

  async updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation> {
    const existing = this.quotations.find(q => q.id === id);
    if (!existing) throw new Error('Quotation not found');
    Object.assign(existing, quotation, { updatedAt: new Date() });
    return existing;
  }

  async deleteQuotation(id: string): Promise<void> {
    const index = this.quotations.findIndex(q => q.id === id);
    if (index > -1) this.quotations.splice(index, 1);
  }

  async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
    return this.quotationItems.filter(qi => qi.quotationId === quotationId);
  }

  async addQuotationItem(item: InsertQuotationItem): Promise<QuotationItem> {
    const newItem: QuotationItem = { ...item, id: `qitem_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
    this.quotationItems.push(newItem);
    return newItem;
  }

  async updateQuotationItem(id: string, item: Partial<InsertQuotationItem>): Promise<QuotationItem> {
    const existing = this.quotationItems.find(qi => qi.id === id);
    if (!existing) throw new Error('Quotation item not found');
    Object.assign(existing, item, { updatedAt: new Date() });
    return existing;
  }

  async deleteQuotationItem(id: string): Promise<void> {
    const index = this.quotationItems.findIndex(qi => qi.id === id);
    if (index > -1) this.quotationItems.splice(index, 1);
  }

  // Stub implementations for other methods (returning empty arrays/undefined for now)
  async getInvoices(): Promise<any[]> { return []; }
  async getInvoice(id: string): Promise<any> { return undefined; }
  async createInvoice(invoice: any): Promise<any> { return invoice; }
  async updateInvoice(id: string, invoice: any): Promise<any> { return invoice; }
  async deleteInvoice(id: string): Promise<void> {}
  async getInvoiceItems(invoiceId: string): Promise<any[]> { return []; }
  async addInvoiceItem(item: any): Promise<any> { return item; }
  async updateInvoiceItem(id: string, item: any): Promise<any> { return item; }
  async deleteInvoiceItem(id: string): Promise<void> {}

  async getPurchaseOrders(): Promise<any[]> { return []; }
  async getPurchaseOrder(id: string): Promise<any> { return undefined; }
  async createPurchaseOrder(po: any): Promise<any> { return po; }
  async updatePurchaseOrder(id: string, po: any): Promise<any> { return po; }
  async deletePurchaseOrder(id: string): Promise<void> {}
  async getPurchaseOrderItems(purchaseOrderId: string): Promise<any[]> { return []; }
  async addPurchaseOrderItem(item: any): Promise<any> { return item; }
  async updatePurchaseOrderItem(id: string, item: any): Promise<any> { return item; }
  async deletePurchaseOrderItem(id: string): Promise<void> {}

  async getWorkOrders(): Promise<any[]> { return []; }
  async getWorkOrder(id: string): Promise<any> { return undefined; }
  async createWorkOrder(wo: any): Promise<any> { return wo; }
  async updateWorkOrder(id: string, wo: any): Promise<any> { return wo; }
  async deleteWorkOrder(id: string): Promise<void> {}

  async getPackingLists(): Promise<any[]> { return []; }
  async getPackingList(id: string): Promise<any> { return undefined; }
  async createPackingList(pl: any): Promise<any> { return pl; }
  async updatePackingList(id: string, pl: any): Promise<any> { return pl; }
  async deletePackingList(id: string): Promise<void> {}
  async getPackingListItems(packingListId: string): Promise<any[]> { return []; }
  async addPackingListItem(item: any): Promise<any> { return item; }
  async updatePackingListItem(id: string, item: any): Promise<any> { return item; }
  async deletePackingListItem(id: string): Promise<void> {}

  async getUnitsOfMeasure(): Promise<any[]> { return []; }
  async createUnitOfMeasure(unit: any): Promise<any> { return unit; }
  async updateUnitOfMeasure(id: string, unit: any): Promise<any> { return unit; }
  async deleteUnitOfMeasure(id: string): Promise<void> {}

  async getPaymentTerms(): Promise<any[]> { return []; }
  async createPaymentTerm(term: any): Promise<any> { return term; }
  async updatePaymentTerm(id: string, term: any): Promise<any> { return term; }
  async deletePaymentTerm(id: string): Promise<void> {}

  async getIncoterms(): Promise<any[]> { return []; }
  async createIncoterm(incoterm: any): Promise<any> { return incoterm; }
  async updateIncoterm(id: string, incoterm: any): Promise<any> { return incoterm; }
  async deleteIncoterm(id: string): Promise<void> {}

  async getVatRates(): Promise<any[]> { return []; }
  async createVatRate(rate: any): Promise<any> { return rate; }
  async updateVatRate(id: string, rate: any): Promise<any> { return rate; }
  async deleteVatRate(id: string): Promise<void> {}

  async getCities(): Promise<any[]> { return []; }
  async createCity(city: any): Promise<any> { return city; }
  async updateCity(id: string, city: any): Promise<any> { return city; }
  async deleteCity(id: string): Promise<void> {}

  async getStatuses(): Promise<any[]> { return []; }
  async createStatus(status: any): Promise<any> { return status; }
  async updateStatus(id: string, status: any): Promise<any> { return status; }
  async deleteStatus(id: string): Promise<void> {}

  async getDashboardStats(): Promise<any> {
    return {
      totalCustomers: this.customers.length,
      totalSuppliers: this.suppliers.length,
      totalInventoryItems: this.inventory.length,
      totalProjects: this.projects.length,
      totalQuotations: this.quotations.length,
      lowStockItems: this.inventory.filter(i => i.stockQuantity <= (i.minimumStockLevel || 0)).length
    };
  }
}

// Use in-memory storage when database is not available
export const storage = new MemoryStorage();
