# Stripe Payments & Refunds Workflow - Replit Project Prompt

## Project Overview
Create a comprehensive web application for testing Stripe payments and refunds that works in both sandbox (test) and live modes. The application should demonstrate the complete payment lifecycle including creating payments, handling different payment statuses, processing refunds, and managing webhooks.

## Core Requirements

### 1. Environment Setup
- Create a Node.js/Express application with a clean, modern frontend
- Support for both test and live Stripe API keys via environment variables
- Proper error handling and logging throughout
- Rate limiting and security best practices

### 2. Payment Processing Features
- **Payment Intent Creation**: Create PaymentIntents with configurable amounts and currencies
- **Payment Methods**: Support for credit/debit cards (primary focus)
- **Payment Confirmation**: Handle payment confirmations with proper client-side integration
- **3D Secure Support**: Handle additional authentication flows when required
- **Payment Status Tracking**: Real-time status updates for payment flows

### 3. Refund Management Features
- **Full Refunds**: Complete refund of successful payments
- **Partial Refunds**: Ability to refund specific amounts
- **Refund Reasons**: Support for different refund reasons (duplicate, fraudulent, requested_by_customer)
- **Refund Status Tracking**: Monitor refund processing status
- **Multiple Partial Refunds**: Support for multiple partial refunds until fully refunded

### 4. User Interface Requirements
- **Payment Form**: Clean, responsive payment form using Stripe Elements
- **Dashboard**: Admin interface showing:
  - Recent payments with status indicators
  - Payment details (amount, currency, status, payment method)
  - Refund history and status
  - Test/Live mode toggle
- **Transaction History**: Searchable list of all transactions
- **Refund Interface**: Easy-to-use refund creation with amount and reason selection

### 5. Webhook Integration
- **Webhook Endpoint**: Secure endpoint to receive Stripe webhook events
- **Event Handling**: Process key events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.requires_action`
  - `refund.created`
  - `refund.updated`
- **Webhook Verification**: Proper signature verification for security
- **Event Logging**: Log webhook events for debugging

## Technical Implementation Details

### Backend Structure (Node.js/Express)
```javascript
// Required dependencies to install
const express = require('express');
const stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
```

### Key API Endpoints to Implement

#### Payment Endpoints
- `POST /api/create-payment-intent` - Create new PaymentIntent
- `POST /api/confirm-payment` - Confirm payment (if needed)
- `GET /api/payment-status/:id` - Check payment status
- `GET /api/payments` - List payments with pagination

#### Refund Endpoints
- `POST /api/create-refund` - Create refund for payment
- `GET /api/refunds/:payment_id` - Get refunds for specific payment
- `GET /api/refunds` - List all refunds

#### Webhook Endpoints
- `POST /webhook` - Stripe webhook receiver

### Frontend Structure
- **Modern HTML5/CSS3/JavaScript** (or React if preferred)
- **Stripe Elements** integration for secure payment forms
- **Responsive design** that works on mobile and desktop
- **Real-time status updates** using polling or WebSockets

### Environment Variables Required
```bash
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_SECRET_KEY_LIVE=sk_live_...

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NODE_ENV=development
PORT=3000
MODE=test  # or 'live'
```

## Specific Stripe API Implementation Details

### Payment Intent Creation
```javascript
// Example structure for PaymentIntent creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount, // in smallest currency unit (cents)
  currency: 'usd',
  metadata: {
    order_id: 'order_123',
    customer_email: 'customer@example.com'
  },
  description: 'Test payment for course demo'
});
```

### Refund Creation
```javascript
// Refund using PaymentIntent ID (recommended)
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount, // optional for partial refunds
  reason: 'requested_by_customer', // or 'duplicate', 'fraudulent'
  metadata: {
    refund_reason: 'Customer requested refund',
    processed_by: 'admin_user'
  }
});
```

## Testing Scenarios to Include

### Test Mode Features
- **Test Card Numbers**: Include common test cards (4242424242424242, etc.)
- **Failed Payment Testing**: Cards that simulate declines
- **3D Secure Testing**: Cards that require authentication
- **Refund Testing**: Test both successful and failed refund scenarios

### Error Handling Test Cases
- Invalid card numbers
- Insufficient funds
- Expired cards
- CVC failures
- Network timeouts
- Webhook signature verification failures

## Security Requirements
- **API Key Security**: Never expose secret keys in frontend code
- **HTTPS Only**: Enforce HTTPS in production
- **Webhook Verification**: Always verify webhook signatures
- **Input Validation**: Validate all input parameters
- **Rate Limiting**: Implement rate limiting on sensitive endpoints
- **CORS Configuration**: Proper CORS setup for frontend integration

## Documentation Requirements
- **README**: Setup instructions for both test and live modes
- **API Documentation**: Clear documentation of all endpoints
- **Testing Guide**: How to test different payment scenarios
- **Deployment Guide**: Instructions for production deployment
- **Webhook Setup**: How to configure webhooks in Stripe Dashboard

## Advanced Features (Optional)
- **Customer Management**: Create and manage Stripe customers
- **Payment Methods Storage**: Save payment methods for future use
- **Subscription Support**: Basic subscription creation and management
- **Multi-currency Support**: Handle different currencies
- **Receipt Generation**: Generate payment receipts
- **Export Functionality**: Export transaction data to CSV

## File Structure Suggestion
```
stripe-payments-app/
├── package.json
├── .env.example
├── server.js
├── routes/
│   ├── payments.js
│   ├── refunds.js
│   └── webhooks.js
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── css/style.css
│   └── js/
│       ├── payments.js
│       └── dashboard.js
├── utils/
│   ├── stripe-config.js
│   └── validation.js
└── logs/
    └── webhook-events.log
```

## Success Criteria
The application should demonstrate:
1. ✅ Successful payment processing in test mode
2. ✅ Successful refund processing (full and partial)
3. ✅ Proper error handling for failed transactions
4. ✅ Working webhook integration with event logging
5. ✅ Clean, intuitive user interface
6. ✅ Easy mode switching between test and live
7. ✅ Comprehensive logging and debugging capabilities
8. ✅ Ready for production deployment with live API keys

## Getting Started Instructions
1. Set up Stripe account and get test API keys
2. Install dependencies and configure environment variables
3. Test basic payment flow with test card numbers
4. Set up webhook endpoint and test event handling
5. Test refund functionality
6. Deploy to production environment with live keys

This prompt should generate a robust, production-ready Stripe integration suitable for learning and real-world application testing.