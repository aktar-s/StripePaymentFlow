# Payment Flow Stripe - System Architecture Documentation

## System Overview

Payment Flow Stripe is a comprehensive web application for managing Stripe payments and refunds with full control over Test/Live mode switching. The system provides complete transaction lifecycle management including payment processing, refund handling, webhook integration, and persistent data storage.

### Core Capabilities
- **Dual Mode Operation**: Seamless switching between Stripe Test and Live modes
- **Payment Processing**: Complete payment intent creation and confirmation
- **Refund Management**: Full and partial refunds with reason tracking
- **Transaction History**: Comprehensive history with persistent storage
- **Historical Data Sync**: Retrieval of existing Stripe transaction data
- **Real-time Updates**: Live status synchronization via webhooks

## Technical Architecture

### Stack Components
```
Frontend: React 18 + TypeScript + Vite
Backend: Express.js + Node.js + TypeScript
Database: File-based persistent storage (JSON)
Payment Gateway: Stripe API v2024-06-20
UI Framework: shadcn/ui + Radix UI + Tailwind CSS
State Management: TanStack Query (React Query)
Build Tools: Vite (frontend) + ESBuild (backend)
```

### Project Structure
```
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── payment-form.tsx      # Payment processing form
│   │   │   ├── transaction-history.tsx # Payment history display
│   │   │   ├── refund-management.tsx   # Refund interface
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── pages/           # Application pages
│   │   │   └── dashboard.tsx # Main application interface
│   │   ├── lib/            # Utility functions
│   │   │   ├── queryClient.ts # API request handling
│   │   │   └── stripe.ts     # Stripe utilities
│   │   └── types/          # TypeScript definitions
│   │       └── stripe.ts    # Stripe-related types
├── server/                   # Express.js backend
│   ├── index.ts             # Application entry point
│   ├── routes.ts            # API endpoint definitions
│   ├── storage.ts           # Data persistence layer
│   └── vite.ts              # Development server integration
├── shared/                   # Shared type definitions
│   └── schema.ts            # Database schema and types
└── storage-data.json        # Persistent data file
```

## Data Architecture

### Database Schema
The application uses a file-based storage system with three primary entities:

#### Payments Table
```typescript
interface Payment {
  id: number;
  paymentIntentId: string;      // Stripe payment intent ID
  amount: number;               // Amount in currency units (£1.00 = 1)
  currency: string;             // Currency code (default: 'gbp')
  status: string;               // Stripe payment status
  description: string | null;   // Payment description
  customerEmail: string | null; // Customer email address
  cardLast4: string | null;     // Last 4 digits of card
  paymentMethodType: string | null; // Payment method type
  stripeFee: number | null;     // Stripe processing fee
  isLiveMode: boolean;          // Test or Live mode indicator
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last update timestamp
}
```

#### Refunds Table
```typescript
interface Refund {
  id: number;
  paymentId: number;            // Foreign key to payments
  paymentIntentId: string;      // Stripe payment intent ID
  refundId: string;             // Stripe refund ID
  amount: number;               // Refund amount
  currency: string;             // Currency code
  status: string;               // Refund status
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
  notes: string | null;         // Additional notes
  isLiveMode: boolean;          // Test or Live mode indicator
  createdAt: Date;             // Creation timestamp
  updatedAt: Date;             // Last update timestamp
}
```

#### Webhook Events Table
```typescript
interface WebhookEvent {
  id: number;
  eventId: string;              // Stripe event ID
  eventType: string;            // Event type (payment_intent.succeeded, etc.)
  processed: boolean;           // Processing status
  isLiveMode: boolean;          // Test or Live mode indicator
  createdAt: Date;             // Creation timestamp
}
```

## API Architecture

### Core Endpoints

#### Stripe Configuration
- `GET /api/stripe-status` - Get current mode and configuration status
- `GET /api/stripe-public-key` - Retrieve public key for current mode
- `POST /api/switch-mode` - Switch between Test/Live modes

#### Payment Management
- `POST /api/create-payment-intent` - Create new payment intent
- `GET /api/payment-status/:paymentIntentId` - Get payment status
- `POST /api/update-payment-status` - Update payment after confirmation
- `GET /api/payments` - List all payments

#### Refund Management
- `POST /api/create-refund` - Create new refund
- `GET /api/refunds/:paymentIntentId` - Get refunds for payment
- `GET /api/refunds` - List all refunds

#### Data Synchronization
- `POST /api/sync-stripe-history` - Sync historical data from Stripe
- `DELETE /api/clear-test-payments` - Clear incomplete test payments

#### Webhook Integration
- `POST /api/stripe-webhook` - Handle Stripe webhook events

## Frontend Architecture

### Component Hierarchy
```
Dashboard (Main Page)
├── Header (Mode Toggle + Sync Button)
├── Tabs Container
│   ├── Payment Tab
│   │   └── PaymentFormWrapper
│   │       ├── PaymentSetupForm (Initial form)
│   │       └── PaymentForm (Stripe Elements)
│   ├── Transactions Tab
│   │   └── TransactionHistory
│   │       ├── Payment List
│   │       ├── Status Badges
│   │       └── Action Buttons
│   └── Refunds Tab
│       └── RefundManagement
│           ├── Refund Form
│           └── Refund History
```

### State Management
- **Server State**: TanStack Query for API data caching and synchronization
- **Local State**: React useState for form data and UI state
- **Global State**: React Context for Stripe configuration

### Key Features Implementation

#### Mode Switching
```typescript
// Secure mode switching with validation
const switchModeMutation = useMutation({
  mutationFn: async (mode: 'test' | 'live') => {
    const response = await apiRequest('POST', '/api/switch-mode', { mode });
    return response.json();
  },
  onSuccess: (data) => {
    // Invalidate caches and update UI
    queryClient.invalidateQueries({ queryKey: ['/api/stripe-status'] });
    // Show success notification
  }
});
```

#### Historical Data Sync
```typescript
// Retrieve and store historical Stripe data
const syncHistoryMutation = useMutation({
  mutationFn: async () => {
    const response = await apiRequest('POST', '/api/sync-stripe-history');
    return response.json();
  },
  onSuccess: (data) => {
    // Update transaction lists
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/refunds'] });
  }
});
```

## Security Architecture

### API Key Management
- **Environment Variables**: Secure storage of Stripe keys
- **Key Validation**: Backend validation of key format and permissions
- **Mode Isolation**: Strict separation between Test and Live operations

### Data Protection
- **No Sensitive Storage**: No credit card data stored locally
- **Stripe Tokenization**: All payment methods handled by Stripe
- **Webhook Verification**: Stripe signature validation for webhooks

## Deployment Architecture

### Development Environment
```
Frontend: Vite dev server (port 3000, proxied through 5000)
Backend: Express server (port 5000)
Database: Local JSON file (storage-data.json)
```

### Production Environment
```
Frontend: Static build served by Express
Backend: Single Node.js process
Database: Persistent JSON file
Deployment: Replit platform with automatic scaling
```

### Build Process
1. **Frontend Build**: `vite build` creates optimized static assets
2. **Backend Bundle**: ESBuild compiles TypeScript to JavaScript
3. **Single Process**: Express serves both API and static files
4. **Data Persistence**: JSON file ensures data survives deployments

## Integration Points

### Stripe API Integration
- **Payment Intents API**: For payment processing
- **Refunds API**: For refund management
- **Webhooks**: Real-time event notifications
- **API Versioning**: Uses Stripe API version 2024-06-20

### External Dependencies
- **Stripe SDK**: Official Stripe Node.js library
- **React Stripe.js**: Official React Stripe integration
- **TanStack Query**: Server state management
- **Radix UI**: Accessible component primitives

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Automatic route-based splitting via Vite
- **Query Caching**: Intelligent caching with TanStack Query
- **Component Optimization**: React.memo for expensive components

### Backend Optimization
- **File-based Storage**: Fast local JSON operations
- **API Response Caching**: HTTP 304 responses for unchanged data
- **Minimal Dependencies**: Lightweight Express setup

## Monitoring & Logging

### Application Logging
```typescript
// Structured logging throughout the application
console.log(`🔄 SWITCHING TO ${mode.toUpperCase()} MODE`);
console.log(`📦 Synced payment: ${pi.id} - ${amount} ${currency}`);
console.log(`✅ Sync complete: ${syncedPayments} payments, ${syncedRefunds} refunds`);
```

### Error Handling
- **Frontend**: Toast notifications for user feedback
- **Backend**: Structured error responses with proper HTTP codes
- **Stripe**: Comprehensive error handling for API failures

## Scalability Considerations

### Current Limitations
- **File Storage**: Single JSON file limits concurrent access
- **Memory Usage**: All data loaded into memory on startup
- **Single Instance**: No horizontal scaling support

### Future Enhancements
- **Database Migration**: Move to PostgreSQL or similar
- **Cache Layer**: Redis for session and temporary data
- **Load Balancing**: Multiple instance support
- **Monitoring**: Application performance monitoring

## Development Workflow

### Local Development
1. **Environment Setup**: Copy `.env.example` to `.env`
2. **Install Dependencies**: `npm install`
3. **Start Development**: `npm run dev`
4. **Access Application**: `http://localhost:5000`

### Testing Strategy
- **Manual Testing**: Comprehensive payment flow testing
- **Stripe Test Cards**: Using official Stripe test card numbers
- **Mode Switching**: Verification of Test/Live mode isolation
- **Historical Sync**: Validation of data retrieval accuracy

---

*Documentation last updated: June 28, 2025*
*Application version: 1.0*