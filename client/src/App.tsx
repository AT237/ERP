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
