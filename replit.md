# Stripe Payments & Refunds Application

## Overview

This is a comprehensive web application for testing Stripe payments and refunds, supporting both sandbox (test) and live modes. The application demonstrates the complete payment lifecycle including payment processing, refund management, and webhook integration with real-time status tracking.

## System Architecture

The application follows a monorepo structure with a React frontend and Express.js backend:

- **Frontend**: React 18 with TypeScript, using Vite for development
- **Backend**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Payment Processing**: Stripe API integration
- **UI Components**: shadcn/ui with Radix UI primitives and Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state

## Key Components

### Frontend Architecture
- **React Router**: Uses `wouter` for client-side routing
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Fetch API with custom wrapper for API requests

### Backend Architecture
- **API Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL
- **Payment Gateway**: Stripe SDK for payment processing
- **Session Management**: Express sessions with PostgreSQL store
- **Error Handling**: Centralized error middleware

### Database Schema
The application uses three main tables:
- **Payments**: Stores payment intent data, amounts, status, and customer information
- **Refunds**: Tracks refund requests linked to payments with reasons and status
- **Webhook Events**: Logs Stripe webhook events for audit and processing

### Key Features
- **Payment Processing**: Create and confirm payment intents with Stripe Elements
- **Refund Management**: Full and partial refunds with reason tracking
- **Transaction History**: Searchable payment and refund history
- **Webhook Integration**: Secure webhook endpoint for Stripe events
- **Real-time Updates**: Live status updates via React Query

## Data Flow

1. **Payment Creation**: Frontend creates payment intent via backend API
2. **Payment Processing**: Stripe Elements handles secure card input and confirmation
3. **Webhook Processing**: Stripe webhooks update payment status in database
4. **Refund Processing**: Admin interface allows creating refunds through Stripe API
5. **Status Synchronization**: Webhook events keep local database in sync with Stripe

## External Dependencies

### Core Dependencies
- **Stripe**: Payment processing and webhook handling
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **React Query**: Server state management and caching

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **React Hook Form**: Form state management

### Development Tools
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Type safety across the stack
- **ESBuild**: Backend bundling for production

## Deployment Strategy

The application is configured for deployment on Replit with:
- **Development**: Vite dev server with HMR and Express backend
- **Production**: Static frontend build served by Express
- **Database**: Neon PostgreSQL with connection pooling
- **Environment Variables**: Stripe keys and database URL configuration

### Build Process
1. Frontend builds to `dist/public` using Vite
2. Backend bundles to `dist/index.js` using ESBuild
3. Single Node.js process serves both static files and API

### Database Migration
- Schema defined in `shared/schema.ts`
- Migrations generated in `migrations/` directory
- Database push command: `npm run db:push`

## Changelog
- June 28, 2025: Successfully built and deployed complete Stripe payment and refund system
  - Fixed Stripe Elements integration with proper clientSecret initialization
  - Tested successful payment processing with test cards
  - Implemented transaction history and refund management
  - Application ready for live deployment with real Stripe keys

## User Preferences

Preferred communication style: Simple, everyday language.

## Testing Notes

✓ Successfully completed full payment and refund testing cycle:
- Test card 4242 4242 4242 4242 confirmed working
- Fixed payment status sync bug between Stripe and database
- Payment intents properly show "succeeded" status after confirmation
- Transaction history displays payments correctly with enabled refund buttons
- Refund functionality tested and working (refund ID: re_3Rf3n7PIHGk3WzGe1hhuDMWk)
- Full payment lifecycle verified in sandbox environment

## Production Readiness

Application is ready for live deployment with:
1. Live Stripe API keys (replace test keys with live keys)
2. Real payment processing capability
3. Complete refund management system
4. Proper status tracking and transaction history

## Issue Resolution

**June 28, 2025 - Fixed Automatic Payment Creation Bug:**
- User reported unexpected test payments appearing automatically
- Root cause: Payment intents were being created on component load instead of user action
- Solution: Implemented two-step payment process (setup form → secure checkout)
- Result: Payments now only created when user explicitly clicks "Create Payment"
- Cleared unwanted test payments from transaction history

**June 28, 2025 - Implemented Complete Mode Toggle System:**
- User required full control and transparency over Test/Live mode switching
- Built dynamic mode switching with backend validation and frontend controls
- Added comprehensive logging and status indicators showing which keys are active
- Implemented safety features: defaults to test mode, clear live mode warnings
- System now provides complete transparency and control over Stripe key usage

## Project Status: COMPLETE ✓

The application now provides:
- Safe, controlled switching between Test and Live Stripe modes
- Complete transparency about which keys are being used
- Real-time status updates and clear visual indicators
- Comprehensive logging for debugging and verification