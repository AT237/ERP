# Overview

This project is a full-stack web application designed as a comprehensive business management system for small to medium businesses. It centralizes the management of inventory, customers, suppliers, projects, quotations, invoices, purchase orders, work orders, and packing lists. Key capabilities include a business analytics dashboard, reporting features, and a robust Text Snippets Management System for reusable content. A core achievement is 100% form consistency across all business forms, ensuring a professional and uniform user experience. The business vision is to provide a single, integrated platform that streamlines operations and enhances productivity for SMEs, offering significant market potential by consolidating disparate business functions into one intuitive system.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with **React 18** and **TypeScript**, following a component-based architecture. It uses **Wouter** for routing, **shadcn/ui** components with **Radix UI** primitives for UI, and **Tailwind CSS** with CSS custom properties for styling, featuring an orange theme. **React Query** manages server state, and **React Hook Form** with **Zod** validation handles form processing. The standardized **LayoutForm2** component ensures type-safe and consistent form handling across all application forms. **Vite** is used for fast development and optimized builds.

### UI/UX Decisions
- **Orange Theme**: Consistent orange theme for headers, titles, and interactive elements.
- **Form Consistency**: 100% form consistency achieved through the **LayoutForm2** component, ensuring unified visual and behavioral patterns across all forms.
- **Tab-Based Forms**: All forms utilize a modern tab-based navigation interface for enhanced user experience, dedicated URLs, and browser history integration, replacing previous dialog/modal systems.
- **Two-Column Layouts**: Professional two-column grid layouts with 130px label columns for all forms.
- **Change Tracking**: Modified fields are highlighted with an orange border.
- **DataTableLayout Standardization**: All data tables (`customers`, `suppliers`, `quotations`, `inventory`, `text-snippets`, `sales-orders`) adhere to a standard, clean layout without problematic border wrappers.
- **Custom Card+Table System**: Specialized layouts for `projects`, `packing-lists`, `invoices`, `purchase-orders`, and `work-orders` which include header images and custom card components.

### Table Styling Standards
Use the helper functions from `DataTableLayout.tsx` for consistent column styling:

| Column Type | Helper Function | Styling | Default Width |
|-------------|-----------------|---------|---------------|
| Position/Line No. | `createPositionColumn()` | `font-mono text-xs` | 70px |
| ID/Code | `createIdColumn()` | `font-mono text-xs` | 120px |
| Currency | `createCurrencyColumn()` | Right-aligned, € prefix | 120px |
| Numeric | `createNumericColumn()` | Right-aligned | 100px |

**Column Order Convention**: checkbox → position → ID → description → numeric values → actions

**Usage Example**:
```typescript
import { createPositionColumn, createIdColumn, createCurrencyColumn } from '@/components/layouts/DataTableLayout';

const columns = [
  createPositionColumn(),           // Pos. column (010, 020, etc.)
  createIdColumn('id', 'Line ID'),  // ID column
  { key: 'description', label: 'Description', ... },
  createCurrencyColumn('unitPrice', 'Unit Price'),
  createCurrencyColumn('lineTotal', 'Line Total'),
];
```

### Technical Implementations
- **LayoutForm2**: A central, configurable React component that provides visual consistency, change tracking, tab-based section management, type safety, and seamless validation integration for all business forms.
- **Standardized Routing**: Over 22+ form routes with consistent `create/edit` patterns and lazy loading using React Suspense. Generic master data routing for scalability.
- **Helper Functions**: Standardized helper functions (`createFieldRow`, `createFieldsRow`, `createSectionHeaderRow`) for consistent form section configuration.
- **Type Safety**: Extensive use of TypeScript with generic types for robust and maintainable code, especially with **Drizzle ORM** and **Zod** validation.

### Standard Form Layout Pattern
**IMPORTANT**: All forms must follow this standard layout pattern for consistent spacing:

```typescript
// Standard form sections pattern - use createFieldRow for each field
const formSections: FormSection2<FormData>[] = [
  {
    id: 'general',
    label: 'General',
    rows: [
      createFieldRow(formFields[0]), // Each field on its own row
      createFieldRow(formFields[1]),
      createFieldRow(formFields[2]),
      // ... etc
    ]
  }
];
```

**Key Rules**:
1. Use `createFieldRow()` for each individual field - this gives proper spacing
2. LayoutForm2 automatically arranges fields in a 2-column grid with `gap-[20px]` spacing
3. Reference: `LineItemFormLayout.tsx` (quotation line items) is the standard template
4. All invoice, quotation, and line item forms must follow this pattern

### Feature Specifications
- **Comprehensive Form Coverage**: Supports 11 business forms (Customer, Supplier, Quotation, Inventory, Project, Work Order, Purchase Order, Packing List, Invoice, Sales Order, Text Snippet) and 6 master data forms (Units of Measure, Payment Terms, Incoterms, VAT Rates, Cities, Statuses).
- **Quick-Add Functionality**: "Quick Add" links on data table pages to open full tab-based forms for new entries.
- **Real-time Validation**: Integrated with `react-hook-form` and `Zod` for real-time form validation.

## Backend Architecture
The backend uses **Node.js with Express.js** in a RESTful API pattern, implemented with TypeScript. It features a middleware-based architecture for request handling, hot reload with `tsx` for development, and `esbuild` for fast production builds.

## Data Storage
**PostgreSQL** is the primary database, managed with **Drizzle ORM** for type-safe operations. **Drizzle Kit** handles schema management and migrations. **Neon Database** provides serverless PostgreSQL hosting. **Drizzle-Zod** is used for runtime type validation, and database sequences generate unique, concurrent numbers for all business entities (e.g., DEB-0001, Q-2025-001).

### Text Snippets Management System
- **Text Snippets Library**: Stores reusable content with multi-language and category support in a `text_snippets` table.
- **Document Snapshots**: Snippet content is snapshotted when used in documents to ensure historical integrity.
- **Usage Tracking**: A `text_snippet_usages` table tracks snippet applications.
- **Integration**: Document item tables support various `lineType` values (`standard`, `unique`, `text`, `charges`) and track `sourceSnippetId` and `sourceSnippetVersion`.

## Layout Designer System
A comprehensive document layout management system for creating customizable templates (quotations, invoices, packing lists) with a section-first workflow and visual designer interface.

### Key Features
- **Section-Based Workflow**: Create named sections with print rules (first page, odd pages, even pages), dimensions, and styling before adding blocks
- **Block Types**: 
  - Basic Elements: Text, Image, Data Field (database-driven)
  - Document Blocks: Company Header, Date Block, Document Title, Page Number
  - Structured: Line Items Table, Totals Summary, Footer Block
- **Data Field Integration**: Select allowed database tables per layout; Data Field blocks can reference specific fields from quotations, customers, projects, etc.
- **Visual Designer**: Drag & drop interface with section stacking, grid alignment, and real-time preview
- **Database Architecture**: 5-table system (`document_layouts`, `layout_sections`, `layout_blocks`, `layout_elements`, `document_layout_fields`)

### Design References
- **BoldReports-inspired interface**: See `attached_assets/image_1761509060465.png` for professional report designer reference showing component library, properties panel, table configuration, formula editor, and design analyzer

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
- **Vite**: Frontend build tool.

## Backend Libraries
- **Express.js**: Web application framework.
- **tsx**: TypeScript execution for development.
- **esbuild**: JavaScript bundler.