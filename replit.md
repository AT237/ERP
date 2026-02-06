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
- **FormToolbar + useFormToolbar**: Standardized toolbar with 6 icon buttons (Save, Add New, Delete, Print, Previous/Next, Export to Excel). The `useFormToolbar` hook auto-wires all functions based on entity type using a central config registry in `client/src/hooks/use-form-toolbar.ts`. All forms use this hook instead of manual actionButtons.
- **PrintLayoutDialog**: When the Print toolbar button is clicked, a dialog shows available layouts filtered by documentType. User selects a layout and the PDF opens in a new tab.
- **Standardized Routing**: Over 22+ form routes with consistent `create/edit` patterns and lazy loading using React Suspense. Generic master data routing for scalability.
- **Helper Functions**: Standardized helper functions (`createFieldRow`, `createFieldsRow`, `createSectionHeaderRow`) for consistent form section configuration.
- **Type Safety**: Extensive use of TypeScript with generic types for robust and maintainable code, especially with **Drizzle ORM** and **Zod** validation.

### Form Toolbar Pattern
**IMPORTANT**: All forms use `useFormToolbar` hook for the standard toolbar:

```typescript
import { useFormToolbar } from "@/hooks/use-form-toolbar";

const toolbar = useFormToolbar({
  entityType: "customer",       // matches key in ENTITY_CONFIGS
  entityId: customerId,         // current record ID (undefined for new)
  onSave: form.handleSubmit(onSubmit),  // form save handler
  onClose: onSave,              // close/navigate back handler
  saveDisabled: mutation.isPending,
  saveLoading: mutation.isPending,
});

// Pass to LayoutForm2:
<LayoutForm2 toolbar={toolbar} ... />
```

**Entity Config Registry** (`use-form-toolbar.ts`): Defines API paths, form types, labels, and feature flags (supportsNavigation, supportsDelete, supportsAddNew) per entity type. Sub-entities like line items have these flags disabled.

**Auto-wired toolbar functions**:
- **Save**: Triggers form submission
- **Add New**: Opens new form tab via `open-form-tab` event
- **Delete**: DELETE API call with confirmation, closes tab on success
- **Print**: Opens PrintLayoutDialog filtered by documentType
- **Previous/Next**: Fetches entity list, navigates to adjacent records
- **Export**: Placeholder (disabled)

### Standard Form Layout Pattern
**IMPORTANT**: LayoutForm2 automatically handles layout distribution:

**Automatic Layout Rules**:
1. **Large fields (textarea, custom) → Right column**: Automatically placed on the right side
2. **Small fields (text, number, select, date, checkbox) → Left column**: Automatically placed on the left side
3. **Consistent spacing**: All forms use `gap-[20px]` between rows and `gap-8` between columns
4. **No manual configuration needed**: Just use `createFieldRow()` for each field

**Standard Field Dimensions**:
- **Input/Select height**: `h-10` = 40px
- **Textarea min-height**: `min-h-[100px]` = 100px (2 × field height + gap = 2 × 40px + 20px)
- **Vertical gap**: `gap-[20px]` = 20px between rows
- **Horizontal gap**: `gap-8` = 32px between columns
- **Label width**: 130px

```typescript
// Standard form sections pattern - just list your fields
const formSections: FormSection2<FormData>[] = [
  {
    id: 'general',
    label: 'General',
    rows: [
      createFieldRow(formFields[0]), // text field → goes left
      createFieldRow(formFields[1]), // select field → goes left
      createFieldRow(formFields[2]), // textarea → automatically goes right
      // ... etc
    ]
  }
];
```

**Manual Two-Column Layout** (optional - for explicit control):
```typescript
rows: [
  {
    type: 'two-column' as const,
    leftColumn: [field1, field2, field3],  // Explicit left column
    rightColumn: [largeField1, largeField2] // Explicit right column
  }
]
```

**Column-First Layout Rule** (STANDARD - applies to ALL forms via LayoutForm2):
Fill the left column completely before using the right column. The grid always shows two columns (right column is empty if not needed).
- **Positions 1-6**: Left column (filled first)
- **Positions 7-12**: Right column (only used when left is full)
- **Textarea fields**: Automatically placed in right column
- **Grid always visible**: Right column stays empty but grid structure remains

Example: Address form with 5 fields → all 5 go in left column, right column empty
```typescript
rows: [
  createFieldRow(field1),  // → position 1 (left)
  createFieldRow(field2),  // → position 2 (left)
  createFieldRow(field3),  // → position 3 (left)
  createFieldRow(field4),  // → position 4 (left)
  createFieldRow(field5),  // → position 5 (left, right column stays empty)
]
```
Reference: `AddressFormLayout.tsx` for column-first implementation.

**Key Rules**:
1. Use `createFieldRow()` for each field - LayoutForm2 handles the rest
2. Fill left column first - only use right column when left is full or for large fields
3. Textareas automatically go to the right column
4. Reference: `InvoiceLineItemFormLayout.tsx`, `InvoiceFormLayout.tsx`, and `AddressFormLayout.tsx` for examples

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