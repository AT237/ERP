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
import Quotations from "@/pages/quotations";
import Invoices from "@/pages/invoices";
import Projects from "@/pages/projects";
import WorkOrders from "@/pages/work-orders";
import PurchaseOrders from "@/pages/purchase-orders";
import SalesOrders from "@/pages/sales-orders";
import PackingLists from "@/pages/packing-lists";
import Reports from "@/pages/reports";
import TextSnippets from "@/pages/text-snippets";
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
        <Route path="/contacts" component={ContactPersons} />
        <Route path="/quotations" component={() => <Quotations />} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/projects" component={Projects} />
        <Route path="/work-orders" component={WorkOrders} />
        <Route path="/purchase-orders" component={PurchaseOrders} />
        <Route path="/sales-orders" component={() => <SalesOrders />} />
        <Route path="/packing-lists" component={PackingLists} />
        <Route path="/reports" component={Reports} />
        <Route path="/text-snippets" component={TextSnippets} />
        <Route path="/quotation-form" component={() => {
          const QuotationForm = React.lazy(() => import('./pages/quotation-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <QuotationForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/quotation-form/:id">
          {(params) => {
            const QuotationForm = React.lazy(() => import('./pages/quotation-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <QuotationForm onSave={() => window.history.back()} quotationId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/customer-form" component={() => {
          const CustomerForm = React.lazy(() => import('./pages/customer-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <CustomerForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/customer-form/:id">
          {(params) => {
            const CustomerForm = React.lazy(() => import('./pages/customer-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <CustomerForm onSave={() => window.history.back()} customerId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/quotations/:quotationId/items/new">
          {(params) => {
            const LineItemForm = React.lazy(() => import('./pages/line-item-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <LineItemForm onSave={() => window.history.back()} quotationId={params.quotationId} />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/quotations/:quotationId/items/:itemId">
          {(params) => {
            const LineItemForm = React.lazy(() => import('./pages/line-item-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <LineItemForm onSave={() => window.history.back()} quotationId={params.quotationId} itemId={params.itemId} />
              </Suspense>
            );
          }}
        </Route>
        
        {/* Additional Form Routes for Tab System */}
        <Route path="/supplier-form" component={() => {
          const SupplierForm = React.lazy(() => import('./pages/supplier-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <SupplierForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/supplier-form/:id">
          {(params) => {
            const SupplierForm = React.lazy(() => import('./pages/supplier-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <SupplierForm onSave={() => window.history.back()} supplierId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/inventory-form" component={() => {
          const InventoryForm = React.lazy(() => import('./pages/inventory-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <InventoryForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/inventory-form/:id">
          {(params) => {
            const InventoryForm = React.lazy(() => import('./pages/inventory-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <InventoryForm onSave={() => window.history.back()} inventoryId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/project-form" component={() => {
          const ProjectForm = React.lazy(() => import('./pages/project-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <ProjectForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/project-form/:id">
          {(params) => {
            const ProjectForm = React.lazy(() => import('./pages/project-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <ProjectForm onSave={() => window.history.back()} projectId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/work-order-form" component={() => {
          const WorkOrderForm = React.lazy(() => import('./pages/work-order-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <WorkOrderForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/work-order-form/:id">
          {(params) => {
            const WorkOrderForm = React.lazy(() => import('./pages/work-order-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <WorkOrderForm onSave={() => window.history.back()} workOrderId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        <Route path="/purchase-order-form" component={() => {
          const PurchaseOrderForm = React.lazy(() => import('./pages/purchase-order-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <PurchaseOrderForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/purchase-order-form/:id">
          {(params) => {
            const PurchaseOrderForm = React.lazy(() => import('./pages/purchase-order-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <PurchaseOrderForm onSave={() => window.history.back()} purchaseOrderId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        {/* Sales order form routes commented out - form files don't exist yet
        <Route path="/sales-order-form" component={() => {
          const SalesOrderForm = React.lazy(() => import('./pages/sales-order-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <SalesOrderForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/sales-order-form/:id">
          {(params) => {
            const SalesOrderForm = React.lazy(() => import('./pages/sales-order-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <SalesOrderForm onSave={() => window.history.back()} salesOrderId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        */}
        
        <Route path="/packing-list-form" component={() => {
          const PackingListForm = React.lazy(() => import('./pages/packing-list-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <PackingListForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/packing-list-form/:id">
          {(params) => {
            const PackingListForm = React.lazy(() => import('./pages/packing-list-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <PackingListForm onSave={() => window.history.back()} packingListId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        
        {/* Invoice form routes commented out - form file doesn't exist yet
        <Route path="/invoice-form" component={() => {
          const InvoiceForm = React.lazy(() => import('./pages/invoice-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <InvoiceForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/invoice-form/:id">
          {(params) => {
            const InvoiceForm = React.lazy(() => import('./pages/invoice-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <InvoiceForm onSave={() => window.history.back()} invoiceId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        */}
        
        {/* Text snippet form routes commented out - form file doesn't exist yet
        <Route path="/text-snippet-form" component={() => {
          const TextSnippetForm = React.lazy(() => import('./pages/text-snippet-form'));
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <TextSnippetForm onSave={() => window.history.back()} />
            </Suspense>
          );
        }} />
        <Route path="/text-snippet-form/:id">
          {(params) => {
            const TextSnippetForm = React.lazy(() => import('./pages/text-snippet-form'));
            return (
              <Suspense fallback={<div>Loading...</div>}>
                <TextSnippetForm onSave={() => window.history.back()} textSnippetId={params.id} />
              </Suspense>
            );
          }}
        </Route>
        */}
        
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
