import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";
import { useLocation } from "wouter";
import logoImage from "@assets/ATE solutions AFAS logo verticaal_1756322897372.jpg";

const pageLabels: Record<string, { title: string; description: string }> = {
  "/": { title: "Dashboard", description: "Overview of your business operations" },
  "/dashboard": { title: "Dashboard", description: "Overview of your business operations" },
  "/inventory": { title: "Inventory Management", description: "Manage your stock and inventory items" },
  "/customers": { title: "Customer Management", description: "Manage your customer relationships" },
  "/suppliers": { title: "Supplier Management", description: "Manage your supplier relationships" },
  "/quotations": { title: "Quotations", description: "Create and manage price quotations" },
  "/invoices": { title: "Invoices", description: "Generate and track invoices" },
  "/projects": { title: "Project Management", description: "Track and manage your projects" },
  "/work-orders": { title: "Work Orders", description: "Manage daily work activities" },
  "/purchase-orders": { title: "Purchase Orders", description: "Manage purchase orders and procurement" },
  "/packing-lists": { title: "Packing Lists", description: "Manage shipping and packaging" },
  "/reports": { title: "Reports & Analytics", description: "View business insights and reports" }
};

export default function Header() {
  const [location] = useLocation();
  const pageInfo = pageLabels[location] || { title: "Page", description: "Page description" };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <img 
            src={logoImage} 
            alt="ATE Solutions B.V." 
            className="h-12 w-auto object-contain"
            data-testid="company-logo"
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{pageInfo.title}</h1>
            <p className="text-muted-foreground">{pageInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-new-entry"
          >
            <Plus className="mr-2" size={16} />
            New Entry
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="text-muted-foreground" size={16} />
            </div>
            <span className="text-sm font-medium">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
