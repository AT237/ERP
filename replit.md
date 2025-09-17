# Overview

This project is a full-stack web application designed as a comprehensive business management system for small to medium businesses. It centralizes the management of inventory, customers, suppliers, projects, quotations, invoices, purchase orders, work orders, and packing lists. Key capabilities include a business analytics dashboard, reporting features, and a robust Text Snippets Management System for reusable content. A core achievement is 100% form consistency across all business forms, ensuring a professional and uniform user experience. The business vision is to provide a single, integrated platform that streamlines operations and enhances productivity for SMEs, offering significant market potential by consolidating disparate business functions into one intuitive system.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## September 17, 2025 - Tab-Based Form System Implementation Complete

Successfully implemented a comprehensive tab-based form system, replacing all dialog/modal forms with a modern tab interface across 22+ form types.

### System Overview

The application has been transformed from a traditional dialog/modal-based form system to a modern tab-based navigation interface. This architectural change provides:

- **Enhanced User Experience**: Full-screen forms with dedicated URLs enable better navigation, bookmarking, and browser history integration
- **Professional Interface**: Tab-based layouts provide clear visual organization and improved workflow efficiency
- **Consistent Architecture**: All forms now follow standardized patterns and routing conventions
- **Scalable Design**: Generic solutions accommodate both specific business forms and configurable master data forms

### Tab System Architecture

#### Core Components

**LayoutForm2** - Main form layout component with:
- Tab-based section navigation with orange-themed active indicators
- Change tracking with visual modified field highlighting
- Professional two-column grid layouts with 130px label columns
- Support for single fields, multi-field rows, and custom components
- Automatic form validation integration with react-hook-form and Zod

**BaseFormLayout** - Foundation layout providing:
- Header info fields for displaying entity status and metadata
- Action button toolbar (Cancel, Save, Delete, etc.)
- Tab content area with orange border connecting to active tab
- Loading states with skeleton UI to prevent layout shifts

**FormTabLayout** - Tab rendering system featuring:
- Orange-themed active tab highlighting
- Scrollable tab bar for forms with many sections
- Seamless content switching with maintained form state
- Consistent spacing and typography across all tabs

**InfoHeaderLayout** - Header information display for:
- Entity numbers (e.g., "Q-2025-001", "DEB-0001")
- Status indicators and metadata
- Quick reference information

#### Routing Structure

**Business Form Routes** (11 Types):
```
/customer-form              # New customer
/customer-form/:id          # Edit customer
/supplier-form              # New supplier  
/supplier-form/:id          # Edit supplier
/quotation-form             # New quotation
/quotation-form/:id         # Edit quotation
/inventory-form             # New inventory item
/inventory-form/:id         # Edit inventory item
/project-form               # New project
/project-form/:id           # Edit project
/work-order-form            # New work order
/work-order-form/:id        # Edit work order
/purchase-order-form        # New purchase order
/purchase-order-form/:id    # Edit purchase order
/packing-list-form          # New packing list
/packing-list-form/:id      # Edit packing list
/invoice-form               # New invoice
/invoice-form/:id           # Edit invoice
/sales-order-form           # New sales order
/sales-order-form/:id       # Edit sales order
/text-snippet-form          # New text snippet
/text-snippet-form/:id      # Edit text snippet
```

**Master Data Form Routes** (6 Types):
```
/masterdata-form/units-of-measure         # Units of measure
/masterdata-form/payment-terms            # Payment terms
/masterdata-form/incoterms                # Incoterms
/masterdata-form/vat-rates                # VAT rates
/masterdata-form/cities                   # Cities
/masterdata-form/statuses                 # Statuses
/masterdata-form/:type/:id                # Edit any master data type
```

**Specialized Routes**:
```
/quotations/:quotationId/items/new        # New line item
/quotations/:quotationId/items/:itemId    # Edit line item
```

### Form Types Coverage

#### Business Forms (11 Types)

**Customer Forms** (`/customer-form`):
- Basic Info: Name, company, contacts
- Address: Billing and shipping addresses with country-based validation
- Business: Payment terms, VAT handling, credit limits
- Notes: Internal remarks and special instructions

**Supplier Forms** (`/supplier-form`):
- Company Info: Legal name, registration details
- Contact: Address, phone, email, contact persons
- Business: Payment terms, account details, categories
- Compliance: Tax information, certifications

**Quotation Forms** (`/quotation-form`):
- Header: Customer, dates, reference numbers, status
- Items: Line items with text snippets integration
- Terms: Payment, delivery, validity conditions
- Notes: Internal and customer-facing notes

**Inventory Forms** (`/inventory-form`):
- Product: Name, description, SKU, categories
- Specifications: Units, dimensions, technical details
- Pricing: Cost, sell prices, supplier information
- Stock: Quantities, locations, reorder levels

**Project Forms** (`/project-form`):
- Overview: Name, description, customer, status
- Timeline: Start date, end date, milestones
- Resources: Team members, budget allocation
- Documentation: Files, notes, progress tracking

**Work Order Forms** (`/work-order-form`):
- Details: Work description, priority, assignment
- Schedule: Due dates, estimated hours
- Materials: Required resources and materials
- Progress: Status updates, completion tracking

**Purchase Order Forms** (`/purchase-order-form`):
- Header: Supplier, dates, reference numbers
- Items: Ordered products with specifications
- Delivery: Shipping address, delivery terms
- Approval: Authorization workflow and status

**Packing List Forms** (`/packing-list-form`):
- Shipment: Tracking, carrier, delivery address
- Contents: Detailed item breakdown with quantities
- Specifications: Weights, dimensions, packaging
- Documentation: Commercial invoice references

**Invoice Forms** (`/invoice-form`):
- Header: Customer, dates, payment terms
- Items: Billable line items with pricing
- Calculations: Subtotals, taxes, discounts
- Payment: Terms, due dates, bank details

**Sales Order Forms** (`/sales-order-form`):
- Customer: Order details and shipping information
- Items: Ordered products with availability
- Fulfillment: Shipping method, delivery dates
- Processing: Order status and tracking

**Text Snippet Forms** (`/text-snippet-form`):
- Content: Multilingual text with rich formatting
- Classification: Categories, tags, usage context
- Versioning: Change tracking and approval workflow
- Integration: Usage in documents and templates

#### Master Data Forms (6 Types)

**Generic Master Data System**: A configuration-driven solution supporting:

**Units of Measure** (`/masterdata-form/units-of-measure`):
- Code, name, description, category (weight, length, volume, area, time, quantity)

**Payment Terms** (`/masterdata-form/payment-terms`):
- Code, name, days, description

**Incoterms** (`/masterdata-form/incoterms`):
- Code, name, description, category (EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF groups)

**VAT Rates** (`/masterdata-form/vat-rates`):
- Code, name, rate percentage, country (NL, DE, BE, FR, GB, US), description

**Cities** (`/masterdata-form/cities`):
- Name, postal code, country, region/state

**Statuses** (`/masterdata-form/statuses`):
- Code, name, category (customer, supplier, project, quotation, invoice, order, general), color, description

#### Quick-Add Integration

All data table pages include "Quick Add" functionality with links to open full tab-based forms:
- **Add Customer**: Opens `/customer-form` in new tab
- **Add Supplier**: Opens `/supplier-form` in new tab  
- **Add Project**: Opens `/project-form` in new tab
- **Add Contact**: Opens customer form with contact focus

### User Guide

#### Navigation Patterns

**Opening Forms**:
1. From data tables: Click "Add New" button or "Edit" action
2. Direct URL navigation: Type form URL directly
3. Quick-add links: "Open full form" from quick-add dialogs

**Tab Navigation**:
1. Click tab headers to switch between form sections
2. Orange highlighting indicates active tab
3. Tab content preserves form state during navigation
4. Scrollable tab bar accommodates forms with many sections

**Form Operations**:
1. **Creating**: Navigate to form URL without ID parameter
2. **Editing**: Navigate to form URL with entity ID parameter
3. **Saving**: Click "Save" button (green highlighting)
4. **Cancelling**: Click "Cancel" button or browser back
5. **Change Tracking**: Modified fields highlighted with orange border

**Data Validation**:
1. Required fields marked with red asterisk (*)
2. Real-time validation with error messages
3. Form submission prevented until all validation passes
4. Dynamic validation for conditional requirements

#### Form Features

**Change Tracking**:
- Modified fields automatically highlighted with orange borders
- Unsaved changes warnings when navigating away
- Visual feedback for all form modifications
- Comparison with original values for accuracy

**Section Organization**:
- Logical grouping of related fields in tabs
- Consistent two-column layouts for professional appearance
- Section headers for visual separation within tabs
- Responsive design adapting to screen sizes

**Integration Features**:
- Auto-population from related entities
- Dropdown selections with search capabilities
- Address validation and formatting
- Country-specific business logic (e.g., VAT requirements)

### Developer Guide

#### Technical Patterns

**Form Implementation Pattern**:
```typescript
// 1. Page component (thin wrapper)
export default function CustomerForm({ onSave, customerId }: Props) {
  return (
    <CustomerFormLayout onSave={onSave} customerId={customerId} />
  );
}

// 2. Layout component (business logic)
export function CustomerFormLayout({ onSave, customerId }: Props) {
  // Form setup with react-hook-form and Zod validation
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: defaultCustomerData
  });

  // Tab state management
  const [activeSection, setActiveSection] = useState("basic");

  // Data fetching and mutations
  const { data: customer, isLoading } = useQuery({
    queryKey: ['/api/customers', customerId],
    enabled: !!customerId
  });

  // Section configuration
  const sections: FormSection2<CustomerFormData>[] = [
    {
      id: "basic",
      label: "Basic Info",
      rows: [
        createFieldRow("name", "text", "Name", true),
        createFieldRow("email", "email", "Email", true)
      ]
    }
  ];

  return (
    <LayoutForm2
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      form={form}
      onSubmit={handleSubmit}
      actionButtons={actionButtons}
      headerFields={headerFields}
      changeTracking={{ enabled: true }}
      originalValues={customer}
    />
  );
}
```

**Routing Configuration**:
```typescript
// App.tsx - Lazy loading with Suspense
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
        <CustomerForm 
          onSave={() => window.history.back()} 
          customerId={params.id} 
        />
      </Suspense>
    );
  }}
</Route>
```

**Master Data Configuration**:
```typescript
// config/masterdata-config.ts
export const MASTERDATA_CONFIG: Record<string, MasterDataConfig> = {
  'units-of-measure': {
    title: "Units of Measure",
    singularTitle: "Unit of Measure",
    endpoint: "units-of-measure",
    schema: insertUnitOfMeasureSchema,
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true }
    ],
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" }
    ]
  }
};
```

#### Form Extension Guidelines

**Adding New Business Forms**:
1. Create form page component in `/pages/entity-form.tsx`
2. Create layout component in `/components/layouts/EntityFormLayout.tsx`
3. Add routes to `App.tsx` for create and edit operations
4. Define Zod schemas in `shared/schema.ts`
5. Implement API endpoints in `server/routes.ts`

**Adding New Master Data Types**:
1. Add configuration to `masterdata-config.ts`
2. Define Zod schema in `shared/schema.ts`
3. Update storage interface in `server/storage.ts`
4. Add API endpoints following REST conventions
5. No additional routing required (uses generic system)

**Form Section Configuration**:
```typescript
const sections: FormSection2<FormData>[] = [
  {
    id: "basic",
    label: "Basic Information",
    rows: [
      createSectionHeaderRow("Contact Details"),
      createFieldRow({
        key: "name",
        label: "Name",
        type: "text",
        validation: { isRequired: true },
        register: form.register("name"),
        testId: "input-name"
      }),
      createFieldsRow([
        { key: "phone", label: "Phone", type: "tel" },
        { key: "email", label: "Email", type: "email" }
      ])
    ]
  }
];
```

#### Testing Conventions

**Data-TestId Patterns**:
- Form tabs: `form-tab-{sectionId}`
- Input fields: `input-{fieldName}`
- Select fields: `select-{fieldName}`
- Buttons: `button-{action}`
- Action buttons: `button-save`, `button-cancel`, `button-delete`

**Form Testing Strategies**:
```typescript
// Test form navigation
await page.click('[data-testid="form-tab-basic"]');
await page.click('[data-testid="form-tab-address"]');

// Test field interactions
await page.fill('[data-testid="input-name"]', 'Test Customer');
await page.selectOption('[data-testid="select-country"]', 'NL');

// Test form submission
await page.click('[data-testid="button-save"]');
```

### Migration Summary

#### What Changed from Dialog System

**Before (Dialog/Modal System)**:
- Forms opened in overlay dialogs
- Limited screen real estate
- No URL-based navigation
- Forms lost state when closed
- Inconsistent layouts across forms
- No browser history integration
- Limited accessibility support

**After (Tab-Based System)**:
- Forms open in dedicated pages with full URLs
- Full-screen layouts with maximum usability
- Browser-native navigation with back/forward support
- Form state preserved during tab navigation
- Consistent LayoutForm2 architecture across all forms
- Complete browser history integration
- Enhanced accessibility with tab navigation

#### Technical Improvements

**Routing Architecture**:
- Added 22+ new form routes with create/edit patterns
- Implemented lazy loading with React Suspense
- Generic master data routing for scalability
- Standardized URL patterns across all forms

**Component Architecture**:
- Centralized form logic in LayoutForm2
- Consistent BaseFormLayout foundation
- Reusable FormTabLayout component
- Standardized InfoHeaderLayout for headers

**Developer Experience**:
- Reduced code duplication through shared components
- Type-safe form configurations with TypeScript generics
- Standardized helper functions for field creation
- Consistent patterns for validation and mutations

**User Experience**:
- Professional tab-based navigation
- Change tracking with visual feedback
- Improved form organization with logical sections
- Better accessibility with keyboard navigation

#### Data Integrity**:
- Enhanced change tracking prevents data loss
- Automatic form validation before submission
- Consistent error handling across all forms
- Cache invalidation patterns for data consistency

### Future Enhancements

**Planned Improvements**:
- Auto-save functionality with periodic form state persistence
- Form templates for common entity configurations
- Advanced validation rules with cross-field dependencies
- Enhanced accessibility features for screen readers
- Mobile-responsive form layouts
- Bulk edit capabilities for multiple entities

**Extension Opportunities**:
- Additional master data types through configuration
- Custom field types for specialized business requirements
- Workflow integration with approval processes
- Form analytics and usage tracking
- Integration with external business systems

This comprehensive tab-based form system provides a scalable, maintainable, and user-friendly foundation for all business form operations, supporting both current requirements and future growth.

## September 17, 2025 - Table Layout Standardization Complete

Successfully standardized all DataTableLayout tables to use consistent, clean layout without problematic border wrappers.

### DataTableLayout System (Standardized):
- **customers.tsx, suppliers.tsx** - Reference standard layout
- **quotations.tsx, inventory.tsx** - Fixed by removing extra border div wrappers
- **text-snippets.tsx, sales-orders.tsx** - Already compliant

### Standard Layout Pattern:
```tsx
return (
  <div className="p-6">
    <DataTableLayout ... />
  </div>
);
```

### Custom Card+Table System (Unchanged):
- **projects.tsx, packing-lists.tsx, invoices.tsx** 
- **purchase-orders.tsx, work-orders.tsx**
- These use their own layout with header images and Card components

### Technical Fixes Applied:
- Removed `LayoutForm2<FormData>` generic syntax to fix JSX parsing errors
- Eliminated problematic double-div border wrappers from quotations and inventory pages
- Achieved visual consistency across all DataTableLayout pages

## September 16, 2025 - LayoutForm2 Standardization Project Complete

Successfully completed comprehensive LayoutForm2 standardization across all business forms, achieving 100% visual and behavioral consistency.

### Converted Forms (19+ total):
**Page-Level Forms:**
- customers.tsx, suppliers.tsx, projects.tsx, quotations.tsx, invoices.tsx
- purchase-orders.tsx, work-orders.tsx, packing-lists.tsx, inventory.tsx
- text-snippets.tsx

**Table Component Forms:**
- LineItemFormLayout.tsx, supplier-table.tsx, contact-persons-table.tsx
- masterdata-table.tsx

**Quick-Add Forms:**
- quick-add-forms.tsx (Customer, Contact, Supplier, Project forms)

**UI Component Forms:**
- address-select-with-add.tsx, country-select-with-add.tsx
- contact-person-select-with-add.tsx

**Layout Components:**
- CustomerTableWithLayout.tsx

### Migration Success:
- All forms now use consistent two-column layouts with orange theming
- Preserved all existing functionality (validations, mutations, complex features)
- Achieved professional business application appearance
- Enhanced developer experience with standardized patterns

# Development Guidelines

## Using LayoutForm2 for New Forms

### Basic Import Pattern:
```typescript
import { LayoutForm2, FormSection2, createFieldRow, createSectionHeaderRow } from "@/components/layouts/LayoutForm2";
```

### Essential Form Setup:
```typescript
const [activeSection, setActiveSection] = useState("basic");
const form = useForm<FormData>({
  resolver: zodResolver(insertSchema),
  defaultValues: defaultFormData
});

const sections: FormSection2<FormData>[] = [
  {
    id: "basic",
    title: "Basic Information", 
    icon: User,
    rows: [
      createSectionHeaderRow("Contact Details"),
      createFieldRow("name", "text", "Name", true),
      createFieldRow("email", "email", "Email", true)
    ]
  }
];
```

### Helper Functions:
- `createFieldRow(field, type, label, required)` - Standard form fields
- `createFieldsRow([field1, field2])` - Multi-column rows  
- `createSectionHeaderRow(title)` - Visual section separators

### Form Validation & Mutations:
```typescript
const mutation = useMutation({
  mutationFn: (data) => apiRequest(`/api/endpoint`, { method: 'POST', body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/endpoint'] });
    toast({ title: "Success!" });
  }
});
```

# System Architecture

## Frontend Architecture
The frontend is built with **React 18** and **TypeScript**, following a component-based architecture. It uses **Wouter** for routing, **shadcn/ui** components with **Radix UI** primitives for UI, and **Tailwind CSS** with CSS custom properties for styling, featuring an orange theme. **React Query** manages server state, and **React Hook Form** with **Zod** validation handles form processing. The standardized **LayoutForm2** component ensures type-safe and consistent form handling across all application forms. **Vite** is used for fast development and optimized builds.

### Reusable Layout System
A comprehensive layout system ensures consistency across data management interfaces:

#### Table Layout Systems
**DataTableLayout System** (Standardized):
- Used by: customers, suppliers, quotations, inventory, text-snippets, sales-orders
- **Standard Pattern**: `<div className="p-6"><DataTableLayout ... /></div>`
- Features: search, filtering, sorting, column management, drag & drop, row selection, CRUD operations
- **Consistency Rule**: No extra border wrappers or nested div containers

**Custom Card+Table System**:
- Used by: projects, packing-lists, invoices, purchase-orders, work-orders  
- Features: Header images, Card components, custom layouts per business context
- Maintained separately for specialized business requirements

#### Form Layout
- **LayoutForm2**: A standardized form layout component applied across all 19+ business forms, guaranteeing visual and behavioral consistency with an orange-themed design, two-column layouts, and change tracking.
- **useDataTable Hook**: Custom hook for managing table state.
- **Type Safety**: Full TypeScript support with generic types is implemented throughout.

### Standardized Styling System
All data tables and forms adhere to a consistent visual design, emphasizing an orange theme for headers, titles, and interactive elements, along with standardized typography, spacing, and required field indicators.

### LayoutForm2 Standardization
The application has achieved 100% form consistency by standardizing all forms using **LayoutForm2**. This means all 19+ unique form layouts were replaced with a single configurable component, resulting in unified developer experience, professional visual consistency, type-safe architecture, enhanced maintainability, and a future-proof design where new forms automatically inherit consistent styling and behavior.

## LayoutForm2 Architecture

The LayoutForm2 component provides a comprehensive form layout system with:
- **Visual Consistency**: Orange-themed headers, professional spacing, two-column grid layouts
- **Change Tracking**: Automatic detection of modified fields with visual indicators
- **Section Management**: Tab-based navigation with active section highlighting  
- **Type Safety**: Full TypeScript support with generic FormData types
- **Helper Functions**: Standardized field creation with createFieldRow, createFieldsRow, createSectionHeaderRow
- **Validation Integration**: Seamless react-hook-form and Zod schema support
- **Custom Components**: Support for complex custom field types via customComponent prop

## Backend Architecture
The backend uses **Node.js with Express.js** in a RESTful API pattern, implemented with TypeScript. It features a middleware-based architecture for request handling, hot reload with `tsx` for development, and `esbuild` for fast production builds.

## Data Storage
**PostgreSQL** is the primary database, managed with **Drizzle ORM** for type-safe operations. **Drizzle Kit** handles schema management and migrations. **Neon Database** provides serverless PostgreSQL hosting. **Drizzle-Zod** is used for runtime type validation, and database sequences generate unique, concurrent numbers for all business entities (e.g., DEB-0001, Q-2025-001).

### Text Snippets Management System
This system uses a hybrid architecture:
- **Text Snippets Library**: A `text_snippets` table stores reusable content with multi-language and category support.
- **Document Snapshots**: Snippet content is snapshotted when used in documents (quotations, invoices) to ensure historical integrity.
- **Usage Tracking**: A `text_snippet_usages` table tracks where snippets are applied.
- **Integration**: Document item tables support various `lineType` values (`standard`, `unique`, `text`, `charges`) and track `sourceSnippetId` and `sourceSnippetVersion`.

# External Dependencies

## Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: TypeScript ORM.
- **Drizzle Kit**: Database migration tool.

## Frontend Libraries
- **React Query**: Server state management.
- **Wouter**: Routing library.
- **shadcn/ui**: UI component library.
- **Radix UI**: Primitive components.
- **React Hook Form**: Form state management.
- **Zod**: Schema validation.
- **Tailwind CSS**: CSS framework.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation.

## Backend Libraries
- **Express.js**: Web application framework.
- **tsx**: TypeScript execution for development.
- **esbuild**: JavaScript bundler.