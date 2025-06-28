export interface StripeConfig {
  mode: 'test' | 'live';
  isLiveMode: boolean;
  hasKeys: boolean;
  secretKeyPrefix?: string;
  publicKeyAvailable?: boolean;
  keyDetails?: {
    testKeysAvailable: boolean;
    liveKeysAvailable: boolean;
  };
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
