import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from './queryClient';

// Dynamic Stripe instance that changes based on current mode
let stripePromise: Promise<any> | null = null;

export const getStripePromise = async () => {
  try {
    const response = await apiRequest('GET', '/api/stripe-public-key');
    const data = await response.json();
    
    console.log(`🔑 FRONTEND: Using ${data.mode.toUpperCase()} mode key: ${data.publicKey.substring(0, 12)}...`);
    
    // Create new Stripe instance with the current mode's key
    stripePromise = loadStripe(data.publicKey);
    return stripePromise;
  } catch (error) {
    console.error('Failed to get Stripe public key:', error);
    throw new Error('Unable to initialize Stripe. Please check your configuration.');
  }
};

export const formatCurrency = (amount: number, currency = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
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
