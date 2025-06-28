# Payment Flow Stripe

A comprehensive Stripe payment processing application with full control over Test/Live mode switching, transaction management, and historical data synchronization.

## Features

- 🔄 **Dual Mode Operation**: Seamless switching between Stripe Test and Live modes
- 💳 **Payment Processing**: Complete payment intent creation and confirmation with Stripe Elements
- 💰 **Refund Management**: Full and partial refunds with reason tracking
- 📊 **Transaction History**: Comprehensive payment and refund history with persistent storage
- 🔄 **Historical Sync**: Retrieve existing transaction data from Stripe
- 🎯 **Real-time Updates**: Live status synchronization via webhooks
- 🛡️ **Security**: No sensitive data storage, all payment processing handled by Stripe

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **UI Framework**: shadcn/ui + Radix UI + Tailwind CSS
- **State Management**: TanStack Query
- **Payment Processing**: Stripe API v2024-06-20
- **Data Storage**: File-based persistent storage

## Quick Start

### Prerequisites

- Node.js 18+ 
- Stripe account with API keys
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/payment-flow-stripe.git
cd payment-flow-stripe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Add your Stripe API keys to `.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_STRIPE_LIVE_PUBLIC_KEY=pk_live_...
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5000](http://localhost:5000) in your browser

## Usage

### Payment Processing
1. Navigate to the "Payment" tab
2. Fill out the payment form with amount and details
3. Click "Create Payment" to generate a payment intent
4. Complete payment using Stripe Elements (test card: 4242 4242 4242 4242)

### Mode Switching
- Use the mode toggle in the header to switch between Test and Live modes
- Live mode displays warning indicators for safety
- All operations are isolated between modes

### Historical Data Sync
- Click "Sync History" button to retrieve existing transactions from Stripe
- Works for both Test and Live modes
- Populates local database with complete transaction history

### Refund Management
1. Go to the "Refunds" tab
2. Select a payment to refund
3. Choose full or partial refund amount
4. Add reason and notes
5. Process refund through Stripe

## API Endpoints

### Core Operations
- `POST /api/create-payment-intent` - Create new payment intent
- `POST /api/create-refund` - Process refund
- `POST /api/switch-mode` - Switch between Test/Live modes
- `POST /api/sync-stripe-history` - Sync historical data from Stripe

### Data Access
- `GET /api/payments` - List all payments
- `GET /api/refunds` - List all refunds
- `GET /api/stripe-status` - Get current mode and configuration
- `GET /api/stripe-public-key` - Get public key for current mode

## Configuration

### Stripe Setup
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Add keys to environment variables
4. Configure webhook endpoints if needed

### Environment Variables
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...           # Test mode secret key
STRIPE_LIVE_SECRET_KEY=sk_live_...      # Live mode secret key
VITE_STRIPE_PUBLIC_KEY=pk_test_...      # Test mode public key
VITE_STRIPE_LIVE_PUBLIC_KEY=pk_live_... # Live mode public key

# Application Configuration
NODE_ENV=development                     # Environment mode
PORT=5000                               # Server port (optional)
```

## Architecture

The application follows a modern full-stack architecture:

- **Frontend**: React SPA with TypeScript and Vite for fast development
- **Backend**: Express.js API server with comprehensive Stripe integration
- **Storage**: File-based JSON storage with automatic persistence
- **Security**: No sensitive data storage, Stripe handles all payment processing

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Development

### Project Structure
```
├── client/              # React frontend
│   ├── src/components/  # Reusable components
│   ├── src/pages/      # Application pages
│   └── src/lib/        # Utilities and helpers
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Data persistence
│   └── index.ts        # Server entry point
├── shared/             # Shared types and schemas
└── docs/              # Documentation
```

### Available Scripts
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run db:push     # Update database schema
```

### Development Workflow
1. Make changes to frontend or backend code
2. Hot reload automatically updates the application
3. Test with Stripe test cards
4. Switch modes to test both Test and Live functionality
5. Use historical sync to verify data handling

## Testing

### Test Cards
Use these Stripe test cards for development:
- **Successful payment**: 4242 4242 4242 4242
- **Declined payment**: 4000 0000 0000 0002
- **Authentication required**: 4000 0025 0000 3155

### Testing Checklist
- [ ] Payment processing in Test mode
- [ ] Payment processing in Live mode (small amounts)
- [ ] Refund processing
- [ ] Mode switching
- [ ] Historical data sync
- [ ] Transaction history display

## Deployment

### Replit Deployment
1. Fork or import this repository to Replit
2. Set environment variables in Replit Secrets
3. Click "Run" to start the application
4. Use Replit's deployment feature for production

### Manual Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Start the server: `npm start`
4. Configure reverse proxy if needed

## Security Considerations

- All payment processing is handled by Stripe - no sensitive card data is stored
- API keys are stored as environment variables
- Test and Live modes are strictly isolated
- Webhook signature verification implemented
- Input validation and sanitization throughout

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly with both Test and Live modes
5. Submit a pull request

## Support

- **Documentation**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Development Log**: [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/payment-flow-stripe/issues)
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Changelog

### v1.0.0 (June 28, 2025)
- Initial release with complete payment and refund functionality
- Dual mode operation (Test/Live)
- Historical data synchronization
- Persistent storage implementation
- Comprehensive transaction management

---

**Note**: This application handles real money transactions in Live mode. Always test thoroughly in Test mode before processing live payments.