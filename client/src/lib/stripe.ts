import { loadStripe } from '@stripe/stripe-js';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required environment variable: VITE_STRIPE_PUBLIC_KEY');
}

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export const formatCurrency = (amount: number, currency = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount / 100);
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'succeeded':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'processing':
    case 'requires_action':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'succeeded':
      return 'check-circle';
    case 'failed':
      return 'x-circle';
    case 'processing':
    case 'requires_action':
      return 'clock';
    default:
      return 'help-circle';
  }
};
