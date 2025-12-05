# Psychology Counseling Appointment Platform

## Overview

A web-based psychology counseling appointment system built for a professional counselor to manage client bookings, announcements, and messaging. The platform supports two consultation types (regular and welfare/low-cost) with both online and offline modes. Clients can browse available time slots, fill out comprehensive intake forms, and communicate with the counselor through an integrated messaging system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**UI Component System**: Shadcn UI (New York style) built on Radix UI primitives with Tailwind CSS for styling. The design follows Material Design principles customized for healthcare applications, emphasizing trust, clarity, and accessibility.

**State Management**: TanStack Query (React Query) for server state management with optimistic updates and automatic cache invalidation. No global client state library is used - component-level state with React hooks handles local UI state.

**Routing**: Wouter for lightweight client-side routing with minimal bundle size impact.

**Form Handling**: React Hook Form with Zod schema validation for type-safe form inputs, particularly critical for the detailed intake forms that collect sensitive client information.

**Styling Strategy**: Utility-first approach with Tailwind CSS using CSS custom properties for theming. Supports light/dark mode with localStorage persistence. Design tokens follow an 8px grid system with consistent spacing primitives.

### Backend Architecture

**Runtime**: Node.js with Express.js server framework

**Language**: TypeScript throughout for type safety across the full stack

**API Design**: RESTful JSON API with shared type definitions between client and server. Routes organized by resource (appointments, announcements, messages, conversations).

**Session Management**: Express sessions with potential for PostgreSQL-backed session store (connect-pg-simple) for production persistence.

**Build Process**: Custom build script using esbuild for server bundling with allowlisted dependencies to reduce cold start times. Client built with Vite.

### Data Architecture

**ORM**: Drizzle ORM for type-safe database queries with schema defined in TypeScript

**Database Schema**:
- **Users**: Basic authentication with role-based access (admin/client)
- **Appointments**: Comprehensive booking records including scheduling details, personal info, contact info, counseling history, current situation, and consent agreements
- **Announcements**: Pinnable announcements with timestamp tracking
- **Conversations & Messages**: Thread-based messaging system with read/unread tracking and resolution status

**Data Access Pattern**: Repository pattern implemented through `IStorage` interface in `server/storage.ts` providing abstraction over database operations.

**Schema Validation**: Drizzle-Zod integration generates runtime validators from database schema, ensuring data consistency between database and application layers.

### External Dependencies

**Database**: PostgreSQL (configured via DATABASE_URL environment variable). The application requires a provisioned PostgreSQL database - Drizzle ORM handles migrations and schema management.

**UI Component Libraries**: 
- Radix UI for accessible, unstyled component primitives
- Lucide React for iconography
- date-fns for date formatting with Chinese locale support (zhCN)
- embla-carousel-react for carousel functionality

**Styling Tools**:
- Tailwind CSS for utility-first styling
- class-variance-authority (CVA) for component variant management
- clsx and tailwind-merge for conditional class composition

**Development Tools**:
- Replit-specific plugins for development banner, error overlay, and cartographer integration
- TypeScript with strict mode enabled
- Path aliases configured for clean imports (@/, @shared/, @assets/)

**Notable Third-Party Services**: The package.json indicates dependencies for potential future integrations (Stripe for payments, nodemailer for email, OpenAI/Google Generative AI for AI features) though these are not currently implemented in the codebase.

## Recent Changes

### December 2025 - Full Backend Implementation

**Database Schema** (shared/schema.ts):
- Users table with role-based access (admin/client)
- Appointments table with comprehensive intake form data, conflict detection
- Announcements table with pinning and author tracking
- Conversations and Messages tables for visitor-counselor communication

**API Routes** (server/routes.ts):
- `/api/appointments` - Full CRUD with time slot conflict detection (prevents double-booking by checking both pending and confirmed appointments)
- `/api/appointments/slots/:date` - Returns booked time slots for calendar display
- `/api/announcements` - CRUD operations for counselor announcements
- `/api/conversations` - Create and list visitor conversations
- `/api/conversations/:id/messages` - Send messages in conversation threads

**Frontend Integration**:
- BookingCalendar now fetches real availability from API
- IntakeForm submits to backend with loading states
- AnnouncementList manages announcements via API
- MessageCenter handles conversation creation and messaging

**Key Features**:
- Time slot conflict detection: Both pending and confirmed appointments block slots
- Real-time form validation with Chinese error messages
- Loading states and error handling throughout
- Toast notifications for user feedback