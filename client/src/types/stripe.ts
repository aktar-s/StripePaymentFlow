export interface StripeConfig {
  isLiveMode: boolean;
  hasKeys: boolean;
}

export interface PaymentFormData {
  amount: number;
  description: string;
  customerEmail: string;
}

export interface RefundFormData {
  paymentIntentId: string;
  amount?: number;
  reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
  notes?: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  cardLast4?: string;
  createdAt: string;
}
