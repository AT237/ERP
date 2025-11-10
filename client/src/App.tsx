import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { DebugPanel } from "@/components/DebugPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Inventory from "@/pages/inventory";
import Suppliers from "@/pages/suppliers";
import ContactPersons from "@/pages/contact-persons";
import Addresses from "@/pages/addresses";
import Prospects from "@/pages/prospects";
import Quotations from "@/pages/quotations";
import Invoices from "@/pages/invoices";
import Projects from "@/pages/projects";
import WorkOrders from "@/pages/work-orders";
import PurchaseOrders from "@/pages/purchase-orders";
import SalesOrders from "@/pages/sales-orders";
import PackingLists from "@/pages/packing-lists";
import Reports from "@/pages/reports";
import TextSnippets from "@/pages/text-snippets";
import LayoutDesigner from "@/pages/layout-designer";
import Layout from "@/components/layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/contact-persons" component={ContactPersons} />
        <Route path="/addresses" component={Addresses} />
        <Route path="/prospects" component={Prospects} />
        <Route path="/quotations" component={() => <Quotations />} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/projects" component={Projects} />
        <Route path="/work-orders" component={WorkOrders} />
        <Route path="/purchase-orders" component={PurchaseOrders} />
        <Route path="/sales-orders" component={() => <SalesOrders />} />
        <Route path="/packing-lists" component={PackingLists} />
        <Route path="/reports" component={Reports} />
        <Route path="/text-snippets" component={TextSnippets} />
        <Route path="/layout-designer" component={LayoutDesigner} />
        
        {/* Master Data Routes */}
        <Route path="/master-data/images" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Images</h2>
              <p className="text-muted-foreground">Images management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/uom" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Units of Measure</h2>
              <p className="text-muted-foreground">Units of Measure management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/payment-terms" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Payment Terms</h2>
              <p className="text-muted-foreground">Payment Terms management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/incoterms" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Incoterms</h2>
              <p className="text-muted-foreground">Incoterms management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/vat" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">VAT Rates</h2>
              <p className="text-muted-foreground">VAT Rates management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/cities" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Cities</h2>
              <p className="text-muted-foreground">Cities management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/statuses" component={() => (
          <div className="p-6">
            <div className="bg-gray-100 border border-border rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Statuses</h2>
              <p className="text-muted-foreground">Statuses management will be implemented here.</p>
            </div>
          </div>
        )} />
        <Route path="/master-data/company-details" component={() => {
          const CompanyDetailsPage = React.lazy(() => import('./pages/company-details.tsx'));
          return (
            <Suspense fallback={<div></div>}>
              <CompanyDetailsPage />
            </Suspense>
          );
        }} />
        
        <Route path="/quotation-form" component={() => {
          const QuotationForm = React.lazy(() => import('./pages/quotation-form'));
          return (
            <Suspense fallback={<div></div>}>
              <QuotationForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/quotation-form/:id">
          {(params) => {
            const QuotationForm = React.lazy(() => import('./pages/quotation-form'));
            return (
              <Suspense fallback={<div></div>}>
                <QuotationForm onSave={() => window.history.back()} quotationId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/customer-form" component={() => {
          const CustomerForm = React.lazy(() => import('./pages/customer-form'));
          return (
            <Suspense fallback={<div></div>}>
              <CustomerForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/customer-form/:id">
          {(params) => {
            const CustomerForm = React.lazy(() => import('./pages/customer-form'));
            return (
              <Suspense fallback={<div></div>}>
                <CustomerForm onSave={() => window.history.back()} customerId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/quotations/:quotationId/items/new">
          {(params) => {
            const LineItemForm = React.lazy(() => import('./pages/line-item-form'));
            return (
              <Suspense fallback={<div></div>}>
                <LineItemForm onSave={() => window.history.back()} quotationId={params.quotationId} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/quotations/:quotationId/items/:itemId">
          {(params) => {
            const LineItemForm = React.lazy(() => import('./pages/line-item-form'));
            return (
              <Suspense fallback={<div></div>}>
                <LineItemForm onSave={() => window.history.back()} quotationId={params.quotationId} itemId={params.itemId} />
              </Suspense>
            );
          }}
        </Route>
        
        {/* Additional Form Routes for Tab System */}
        <Route path="/supplier-form" component={() => {
          const SupplierForm = React.lazy(() => import('./pages/supplier-form'));
          return (
            <Suspense fallback={<div></div>}>
              <SupplierForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/supplier-form/:id">
          {(params) => {
            const SupplierForm = React.lazy(() => import('./pages/supplier-form'));
            return (
              <Suspense fallback={<div></div>}>
                <SupplierForm onSave={() => window.history.back()} supplierId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/contact-person-form" component={() => {
          const ContactPersonForm = React.lazy(() => import('./pages/contact-person-form'));
          return (
            <Suspense fallback={<div></div>}>
              <ContactPersonForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/contact-person-form/:id">
          {(params) => {
            const ContactPersonForm = React.lazy(() => import('./pages/contact-person-form'));
            return (
              <Suspense fallback={<div></div>}>
                <ContactPersonForm onSave={() => window.history.back()} contactPersonId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/inventory-form" component={() => {
          const InventoryForm = React.lazy(() => import('./pages/inventory-form'));
          return (
            <Suspense fallback={<div></div>}>
              <InventoryForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/inventory-form/:id">
          {(params) => {
            const InventoryForm = React.lazy(() => import('./pages/inventory-form'));
            return (
              <Suspense fallback={<div></div>}>
                <InventoryForm onSave={() => window.history.back()} inventoryId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/project-form" component={() => {
          const ProjectForm = React.lazy(() => import('./pages/project-form'));
          return (
            <Suspense fallback={<div></div>}>
              <ProjectForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/project-form/:id">
          {(params) => {
            const ProjectForm = React.lazy(() => import('./pages/project-form'));
            return (
              <Suspense fallback={<div></div>}>
                <ProjectForm onSave={() => window.history.back()} projectId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/work-order-form" component={() => {
          const WorkOrderForm = React.lazy(() => import('./pages/work-order-form'));
          return (
            <Suspense fallback={<div></div>}>
              <WorkOrderForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/work-order-form/:id">
          {(params) => {
            const WorkOrderForm = React.lazy(() => import('./pages/work-order-form'));
            return (
              <Suspense fallback={<div></div>}>
                <WorkOrderForm onSave={() => window.history.back()} workOrderId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/purchase-order-form" component={() => {
          const PurchaseOrderForm = React.lazy(() => import('./pages/purchase-order-form'));
          return (
            <Suspense fallback={<div></div>}>
              <PurchaseOrderForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/purchase-order-form/:id">
          {(params) => {
            const PurchaseOrderForm = React.lazy(() => import('./pages/purchase-order-form'));
            return (
              <Suspense fallback={<div></div>}>
                <PurchaseOrderForm onSave={() => window.history.back()} purchaseOrderId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/text-snippet-form" component={() => {
          const TextSnippetForm = React.lazy(() => import('./pages/text-snippet-form'));
          return (
            <Suspense fallback={<div></div>}>
              <TextSnippetForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/text-snippet-form/:id">
          {(params) => {
            const TextSnippetForm = React.lazy(() => import('./pages/text-snippet-form'));
            return (
              <Suspense fallback={<div></div>}>
                <TextSnippetForm onSave={() => window.history.back()} textSnippetId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/sales-order-form" component={() => {
          const SalesOrderForm = React.lazy(() => import('./pages/sales-order-form'));
          return (
            <Suspense fallback={<div></div>}>
              <SalesOrderForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/sales-order-form/:id">
          {(params) => {
            const SalesOrderForm = React.lazy(() => import('./pages/sales-order-form'));
            return (
              <Suspense fallback={<div></div>}>
                <SalesOrderForm onSave={() => window.history.back()} salesOrderId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/packing-list-form" component={() => {
          const PackingListForm = React.lazy(() => import('./pages/packing-list-form'));
          return (
            <Suspense fallback={<div></div>}>
              <PackingListForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/packing-list-form/:id">
          {(params) => {
            const PackingListForm = React.lazy(() => import('./pages/packing-list-form'));
            return (
              <Suspense fallback={<div></div>}>
                <PackingListForm onSave={() => window.history.back()} packingListId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/invoice-form" component={() => {
          const InvoiceForm = React.lazy(() => import('./pages/invoice-form'));
          return (
            <Suspense fallback={<div></div>}>
              <InvoiceForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/invoice-form/:id">
          {(params) => {
            const InvoiceForm = React.lazy(() => import('./pages/invoice-form'));
            return (
              <Suspense fallback={<div></div>}>
                <InvoiceForm onSave={() => window.history.back()} invoiceId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        {/* Text snippet form routes commented out - form file doesn't exist yet
        <Route path="/text-snippet-form" component={() => {
          const TextSnippetForm = React.lazy(() => import('./pages/text-snippet-form'));
          return (
            <Suspense fallback={<div></div>}>
              <TextSnippetForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/text-snippet-form/:id">
          {(params) => {
            const TextSnippetForm = React.lazy(() => import('./pages/text-snippet-form'));
            return (
              <Suspense fallback={<div></div>}>
                <TextSnippetForm onSave={() => window.history.back()} textSnippetId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        */}
        
        {/* Master Data Form Routes */}
        <Route path="/masterdata-form/:type">
          {(params) => {
            const MasterDataForm = React.lazy(() => import('./pages/masterdata-form'));
            return (
              <Suspense fallback={<div></div>}>
                <MasterDataForm 
                  type={params.type} 
                  onSave={() => window.history.back()} 
                />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/masterdata-form/:type/:id">
          {(params) => {
            const MasterDataForm = React.lazy(() => import('./pages/masterdata-form'));
            return (
              <Suspense fallback={<div></div>}>
                <MasterDataForm 
                  type={params.type} 
                  id={params.id}
                  onSave={() => window.history.back()} 
                />
              </Suspense>
            );
          }}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
      <DebugPanel />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
