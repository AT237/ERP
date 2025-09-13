# Overview

This is a comprehensive business management system built as a full-stack web application. The system provides tools for managing inventory, customers, suppliers, projects, quotations, invoices, purchase orders, work orders, and packing lists. It includes a dashboard for business analytics and reporting capabilities. The application is designed for small to medium businesses that need to track their operations, inventory, and customer relationships in one centralized platform.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with **React 18** using TypeScript and follows a component-based architecture. Key architectural decisions include:

- **Routing**: Uses Wouter for lightweight client-side routing with declarative route definitions
- **UI Framework**: Implements shadcn/ui components with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS custom properties for theming and consistent design system
- **State Management**: React Query (TanStack Query) for server state management with optimistic updates and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

The frontend follows a modular structure with shared components, page-specific components, and utility functions organized in separate directories.

### Reusable Layout System
A comprehensive layout system has been implemented to ensure consistency across different data management interfaces:

- **DataTableLayout**: A fully-featured table component with search, filtering, sorting, column management, drag & drop reordering, row selection, and dialog support for CRUD operations
- **FormLayout**: A structured form component with section-based organization, multiple field types, automatic error handling, and standardized styling
- **useDataTable Hook**: Custom hook for managing table state including columns, filters, sorting, and row selection
- **Type Safety**: Full TypeScript support with generic types for different data entities

### Standardized Styling System
All data tables now follow a consistent visual design:

- **Orange Theme**: Headers use `bg-orange-50 dark:bg-orange-900/20` with `text-orange-800 dark:text-orange-200` text
- **Orange Title Blocks**: Fixed positioning at 350px from left edge for consistent action menu placement
- **ID Column Helper**: `createIdColumn()` function provides automatic `font-mono text-xs` styling for monospace ID displays
- **Grip Icons**: Standardized size (`h-3 w-3`) and positioning with orange hover states
- **Typography**: Uppercase, font-semibold headers with consistent spacing (`gap-1`, `p-0.5`)

Usage example for new tables:
```typescript
import { DataTableLayout, ColumnConfig, createIdColumn } from '@/components/layouts/DataTableLayout';

const defaultColumns: ColumnConfig[] = [
  createIdColumn('invoiceNumber', 'Invoice ID'), // Automatic monospace styling
  { key: 'name', label: 'Name', visible: true, width: 200, filterable: true, sortable: true },
];
```

This system is used across customer, supplier, inventory, and other data management interfaces to provide a consistent user experience and reduce code duplication.

## Backend Architecture
The backend uses **Node.js with Express.js** in a RESTful API pattern:

- **Framework**: Express.js with TypeScript for type safety
- **API Design**: RESTful endpoints organized by resource (customers, inventory, projects, etc.)
- **Request Handling**: Middleware-based architecture with JSON parsing, CORS handling, and error management
- **Development**: Hot reload with tsx for development efficiency
- **Build Process**: esbuild for fast production builds with ES modules

## Data Storage
The application uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations:

- **ORM**: Drizzle ORM chosen for its TypeScript-first approach and performance
- **Schema Management**: Centralized schema definitions in shared directory for consistency between frontend and backend
- **Migrations**: Drizzle Kit for database migrations and schema updates
- **Connection**: Neon Database serverless PostgreSQL with connection pooling
- **Validation**: Drizzle-Zod integration for runtime type validation
- **Automatic Numbering**: All business entities use database sequences for secure, concurrent number generation

### Database Sequence Standards
All business entities now use database-generated sequences for automatic numbering:

- **Customers**: DEB-0001, DEB-0002, etc. (PostgreSQL sequence)
- **Suppliers**: CRED-001, CRED-002, etc. (PostgreSQL sequence)
- **Quotations**: Q-2025-001, Q-2025-002, etc. (Year-based function)
- **Invoices**: INV-2025-001, INV-2025-002, etc. (Year-based function)
- **Purchase Orders**: PO-2025-001, PO-2025-002, etc. (Year-based function)
- **Work Orders**: WO-2025-001, WO-2025-002, etc. (Year-based function)
- **Packing Lists**: PACK-2025-001, PACK-2025-002, etc. (Year-based function)

This ensures thread-safe, unique numbering without application-level complexity and eliminates race conditions during concurrent operations.

The database schema includes tables for users, customers, suppliers, inventory items, projects, quotations, invoices, purchase orders, work orders, and packing lists with proper relationships and foreign key constraints.

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: TypeScript ORM for database operations
- **Drizzle Kit**: Database migration and schema management tool

### Frontend Libraries
- **React Query**: Server state management and caching
- **Wouter**: Lightweight routing library
- **shadcn/ui**: Pre-built UI component library
- **Radix UI**: Primitive components for accessibility
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities

### Backend Libraries
- **Express.js**: Web application framework
- **tsx**: TypeScript execution for development
- **esbuild**: JavaScript bundler for production builds

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing
- **Replit integrations**: Development environment plugins and error handling