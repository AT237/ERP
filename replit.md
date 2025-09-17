# Overview

This project is a full-stack web application designed as a comprehensive business management system for small to medium businesses. It centralizes the management of inventory, customers, suppliers, projects, quotations, invoices, purchase orders, work orders, and packing lists. Key capabilities include a business analytics dashboard, reporting features, and a robust Text Snippets Management System for reusable content. A core achievement is 100% form consistency across all business forms, ensuring a professional and uniform user experience. The business vision is to provide a single, integrated platform that streamlines operations and enhances productivity for SMEs, offering significant market potential by consolidating disparate business functions into one intuitive system.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

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