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