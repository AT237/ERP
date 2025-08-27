import {
  users, customers, suppliers, inventoryItems, projects, quotations, quotationItems,
  invoices, invoiceItems, purchaseOrders, purchaseOrderItems, workOrders,
  packingLists, packingListItems, userPreferences,
  type User, type InsertUser, type Customer, type InsertCustomer,
  type Supplier, type InsertSupplier, type InventoryItem, type InsertInventoryItem,
  type Project, type InsertProject, type Quotation, type InsertQuotation,
  type QuotationItem, type InsertQuotationItem, type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem, type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem, type WorkOrder, type InsertWorkOrder,
  type PackingList, type InsertPackingList, type PackingListItem, type InsertPackingListItem,
  type UserPreferences, type InsertUserPreferences
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
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Supplier methods
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
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
    const [newQuotation] = await db.insert(quotations).values(quotation).returning();
    return newQuotation;
  }

  async updateQuotation(id: string, quotation: Partial<InsertQuotation>): Promise<Quotation> {
    const [updatedQuotation] = await db.update(quotations).set(quotation).where(eq(quotations.id, id)).returning();
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
}

export const storage = new DatabaseStorage();
