# Overview

This project is a full-stack web application serving as a comprehensive business management system for small to medium businesses. It centralizes the management of inventory, customers, suppliers, projects, quotations, invoices, purchase orders, work orders, and packing lists. Key capabilities include business analytics, reporting, a robust Text Snippets Management System for reusable content, and a PDF Database for archiving printed documents with user consent. The system achieves 100% form consistency across all business forms, ensuring a professional and uniform user experience. The business vision is to provide a single, integrated platform to streamline operations and enhance SME productivity.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React 18 and TypeScript, using Wouter for routing, shadcn/ui components with Radix UI primitives, and Tailwind CSS for styling with an orange theme. React Query manages server state, and React Hook Form with Zod validation handles form processing. A standardized LayoutForm2 component ensures type-safe and consistent form handling. Vite is used for development and builds.

### UI/UX Decisions
- **Orange Theme**: Consistent orange theme for headers and interactive elements.
- **Form Consistency**: Achieved via the LayoutForm2 component, providing unified visual and behavioral patterns.
- **Tab-Based Forms**: All forms use modern tab-based navigation with dedicated URLs and browser history integration.
- **Two-Column Layouts**: Professional two-column grid layouts with 130px label columns for all forms.
- **Change Tracking**: Modified fields are highlighted with an orange border.
- **DataTableLayout Standardization**: All data tables adhere to a standard, clean layout.
- **Custom Card+Table System**: Specialized layouts for `projects`, `packing-lists`, `invoices`, `purchase-orders`, and `work-orders` with header images and custom card components.
- **Safe Delete Pattern**: Consistent deletion behavior across the application using `useEntityDelete` hook and `SafeDeleteDialog`, eliminating `window.confirm()` calls. Backend usage checks prevent deletion of key entities if in use.
- **Print Sort Order**: Quotations and invoices support configurable item sort order for printing (e.g., `position`, `price_high_low`, `alpha_az`).
- **Work Order Line Items**: Work orders include a `work_order_items` table with structure identical to `invoice_items`.
- **Shared Line Item Types**: `shared/line-item-types.ts` is the single source of truth for line item types (`standard`, `unique`, `text`, `charges`), integrated across relevant forms.

### Technical Implementations
- **LayoutForm2**: A central, configurable React component ensuring visual consistency, change tracking, tab-based sections, type safety, and validation for all business forms.
- **FormToolbar + useFormToolbar**: Standardized toolbar with Save, Add New, Delete, Print, Previous/Next, Export buttons, auto-wired via `useFormToolbar` hook and an entity configuration registry.
- **PrintLayoutDialog**: Handles selection and display of document layouts for printing.
- **Standardized Routing**: Consistent `create/edit` patterns and lazy loading for over 22 form routes.
- **Helper Functions**: Standardized functions (`createFieldRow`, `createFieldsRow`, `createSectionHeaderRow`) for consistent form section configuration.
- **Type Safety**: Extensive TypeScript usage with generic types, Drizzle ORM, and Zod validation.

### Standard Form Layout Pattern
LayoutForm2 automatically distributes fields into a two-column grid:
- Large fields (textarea, custom) go to the right column.
- Small fields (text, number, select, date, checkbox) go to the left column.
- Consistent `gap-[20px]` between rows and `gap-8` between columns.
- Standard field dimensions: Input/Select height `h-10`, Textarea `min-h-[100px]`, Label width 130px.
- The left column is filled completely before using the right column, which remains empty if not needed.
- Manual two-column layout is available for explicit control.

### Feature Specifications
- **Comprehensive Form Coverage**: Supports 11 business forms and 6 master data forms.
- **Quick-Add Functionality**: "Quick Add" links on data table pages to open full tab-based forms.
- **Real-time Validation**: Integrated with `react-hook-form` and `Zod`.

## Backend Architecture
The backend uses Node.js with Express.js in a RESTful API pattern, implemented with TypeScript. It features a middleware-based architecture, hot reload with `tsx` for development, and `esbuild` for production builds.

## Data Storage
PostgreSQL is the primary database, managed with Drizzle ORM for type-safe operations, and Drizzle Kit for schema management and migrations. Neon Database provides serverless PostgreSQL hosting. Drizzle-Zod is used for runtime type validation, and database sequences generate unique, concurrent numbers for business entities.

### Text Snippets Management System
A `text_snippets` table stores reusable content with multi-language and category support. Snippet content is snapshotted when used in documents for historical integrity, and a `text_snippet_usages` table tracks applications. Document item tables support various `lineType` values and track `sourceSnippetId` and `sourceSnippetVersion`.

## Layout Designer System
A comprehensive document layout management system for creating customizable templates (quotations, invoices, packing lists) with a section-first workflow and visual designer interface.
### Key Features
- **Section-Based Workflow**: Create named sections with print rules, dimensions, and styling.
- **Block Types**: Includes Basic Elements (Text, Image, Data Field), Document Blocks (Company Header, Date Block, Document Title, Page Number), and Structured Blocks (Line Items Table, Totals Summary, Footer Block).
- **Data Field Integration**: Data Field blocks can reference specific fields from selected database tables.
- **Visual Designer**: Drag & drop interface with section stacking, grid alignment, and real-time preview.
- **Database Architecture**: A 5-table system (`document_layouts`, `layout_sections`, `layout_blocks`, `layout_elements`, `document_layout_fields`) underpins the system.

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