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
- **DataTableLayout Standardization**: All data tables adhere to a standard, clean layout. See "Design System Table Style" section below for full specification.
- **Custom Card+Table System**: Specialized layouts for `projects`, `packing-lists`, `invoices`, `purchase-orders`, and `work-orders` with header images and custom card components.
- **Proforma Invoices**: Full CRUD with `proforma_invoices` and `proforma_invoice_items` tables (mirroring regular invoices). Supports line items with direct-input, VAT calculations, print settings, incoterms, payment days, document images, and duplicate functionality. Number format: `PFI-YYYY-NNN`. Sidebar navigation under "Proforma Invoices". Form type: `proforma-invoice`, entity toolbar registered in `use-form-toolbar.ts`. Transport tab includes: Incoterm, Port of Loading/Discharge, Country of Origin (select), Country of Supply (select), Gross Weight, Payment Terms (CAD/LC), Final Destination, Mode of Shipment, Place of Consignment, Freight Info. Algemeen tab includes: Delivery Time, Validity, Signoff Name. All new transport/shipping fields available in layout designer for print templates with `{{proformaInvoice.fieldName}}` placeholders. Country names resolved via `countryOfOriginName` and `countryOfSupplyName`.
- **Countries Masterdata**: Central `countries` table with code/name/requiresBtw/requiresAreaCode. CRUD via `/api/countries` and `/api/masterdata/countries`. Sidebar entry under Master Data. Used for country-of-origin selection in all line item forms (PFI, Invoice, Quotation, WorkOrder, PackingList, Inventory) and Cities masterdata. Country select shows `CODE - Name` format.
- **Safe Delete Pattern**: Consistent deletion behavior across the application using `useEntityDelete` hook and `SafeDeleteDialog`, eliminating `window.confirm()` calls. Backend usage checks prevent deletion of key entities if in use.
- **Print Sort Order**: Quotations and invoices support configurable item sort order for printing (e.g., `position`, `price_high_low`, `alpha_az`).
- **Line Item Images**: Each quotation/invoice line item has an optional `lineImage` field (base64 stored). Images can be uploaded manually or auto-populated from inventory items. A `printLineImages` boolean on quotations/invoices controls whether images appear in print output. The setting is available under "Afdrukinstellingen" (Print Settings) tab.
- **Document Images (Afbeeldingen tab)**: Quotations and invoices have an "Afbeeldingen" tab for uploading general project/document images. Uses `document_images` table (id, documentType, documentId, imageData base64, fileName, description, position). Reusable `DocumentImagesPanel` component handles upload, display grid, inline description editing, and deletion. API: `GET/POST /api/document-images`, `PUT/DELETE /api/document-images/:id`. Server-side validates document type and image size (max ~5MB).
- **Work Order Line Items**: Work orders include a `work_order_items` table with structure identical to `invoice_items`.
- **Shared Line Item Types**: `shared/line-item-types.ts` is the single source of truth for line item types (`standard`, `unique`, `text`, `charges`), integrated across relevant forms.
- **Status Colors**: All list pages (invoices, quotations, work orders, projects) use colored status badges with consistent color coding (green=active/completed, orange=draft/planning, blue=sent/in-progress, red=overdue/rejected, gray=cancelled).
- **Ctrl+S Save**: All LayoutForm2-based forms support Ctrl+S (Cmd+S on Mac) keyboard shortcut to save, using the toolbar's onSave handler when available.
- **INCOTERM on Invoice**: Invoices have an `incoterm_id` field referencing the incoterms master data table.
- **DebugPanel**: Only rendered in development mode (`import.meta.env.DEV`), hidden in production builds.
- **MasterData isActive Default**: New master data entries default `isActive` to `true` (Ja).
- **Brands (Merken)**: Central `brands` table with code/name/description/isActive. CRUD via `/api/masterdata/brands`. Inventory form uses `EntitySelect` for brand selection (stores brand code). Migrated from free-text to master data. Auto-migration on startup creates table and converts existing inventory brand names to codes.
- **Customer Multi-Address**: Customers can have multiple linked addresses via `customer_addresses` junction table. "Adressen" tab in CustomerFormLayout allows adding/removing/setting default addresses. Packing list shipping address field becomes a dropdown of linked customer addresses when available, with fallback to manual text entry.
- **Filter Persistence**: Table filters are persisted to localStorage per table via `table-filters-${tableKey}`. Filters are automatically restored when revisiting a table.
- **Admin Employee**: EM-0001 is reserved for the Admin system account (created at startup via `ensureAdminEmployee`). Existing employees are shifted up by 1 in a transaction if Admin doesn't exist yet.
- **Contracts Module**: Under Reports in sidebar. `contracts` + `contract_items` tables. Contract header: number, customer, date, valid-until, status, description, notes. Contract body: ordered rows with types (heading, text, table, image), hierarchical numbering (auto-nummering), indent levels (0-3). Right-side placeholder panel for inserting `{{klant.naam}}`, `{{bedrijf.kvk}}`, etc. into text content. Batch save for items via `PUT /api/contracts/:id/items/batch`. Form type: `contract`, registered in `use-form-toolbar.ts`.

### Technical Implementations
- **LayoutForm2**: A central, configurable React component ensuring visual consistency, change tracking, tab-based sections, type safety, and validation for all business forms.
- **FormToolbar + useFormToolbar**: Standardized toolbar with Save, Add New, Delete, Print, Previous/Next, Export buttons, auto-wired via `useFormToolbar` hook and an entity configuration registry. Supports `convertOptions` prop for "Omzetten naar" dropdown (used on quotations to convert to CI/PFI/VO).
- **Quotation Conversion**: Quotations can be converted to Invoice (CI), Proforma Invoice (PFI), or Sales Order (VO) via toolbar dropdown. Backend endpoints: `POST /api/quotations/:id/convert-to-invoice`, `convert-to-proforma-invoice`, `convert-to-sales-order`. Copies all header data, line items (with custom prices), print settings, and document images. Opens the new document form automatically after conversion.
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
- **Comprehensive Form Coverage**: Supports 11 business forms and 7 master data forms (including Brands).
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

## Design System Table Style
All tables use the `DataTableLayout` component (`client/src/components/layouts/DataTableLayout.tsx`).

### Table Structure
- Layout: `tableLayout: 'fixed'`, width = sum of visible column widths + 48px (checkbox)
- Container: `rounded-lg overflow-x-auto border-0`

### Header
- Background: `bg-orange-50` / `dark:bg-orange-900/20`
- Checkbox column: 48px fixed, `border-r border-orange-200/50`
- Column labels: `uppercase font-bold text-xs text-orange-600`, `whitespace-nowrap truncate`
- Sort icons: `text-orange-500`, inactive `opacity-30`
- Filter button: `h-4 w-4`, Filter icon `size=10 text-orange-500`

### Rows
- Height: 32px fixed (`height/minHeight/maxHeight`)
- Font: `text-sm font-normal font-sans`, cells `text-xs`
- Even: `bg-white` / `dark:bg-gray-950`
- Odd: `bg-white` / `dark:bg-gray-900/50`
- Hover: `hover:bg-orange-100` / `dark:hover:bg-orange-800/30`
- Selected: `bg-orange-50` / `dark:bg-orange-900/20`
- Editing: `bg-orange-50 ring-1 ring-orange-300`
- Direct input row: `bg-green-50/80 border-2 border-green-400/50`

### Column Resize
- Handle: `absolute top-0 bottom-0 right-0 w-3 cursor-col-resize z-20`
- Visual bar: `w-[2px] bg-orange-300/60`, hover `bg-orange-500`, active `bg-orange-600`
- Min width: 50px, max auto-resize: 400px
- Double-click: auto-fit to content

### Toolbar
- Active toggle: `bg-orange-500 text-white hover:bg-orange-600`
- Search: `text-xs h-8`, icon `text-orange-400`
- Filter pills: `bg-orange-100/80 text-orange-700 rounded-full`
- Results count: `text-xs text-orange-500`