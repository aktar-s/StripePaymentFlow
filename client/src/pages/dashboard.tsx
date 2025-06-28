import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentForm } from '@/components/payment-form';
import { TransactionHistory } from '@/components/transaction-history';
import { RefundManagement } from '@/components/refund-management';
import { stripePromise } from '@/lib/stripe';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, List, RotateCcw } from 'lucide-react';
import type { StripeConfig } from '@/types/stripe';

export default function Dashboard() {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<string>('');
  const [activeTab, setActiveTab] = useState('payment');

  const { data: stripeConfig } = useQuery<StripeConfig>({
    queryKey: ['/api/stripe-status'],
  });

  // Create a new payment intent when the component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest('POST', '/api/create-payment-intent', {
          amount: 1.00,
          description: 'Default payment',
          customerEmail: '',
        });
        const { clientSecret } = await response.json();
        setClientSecret(clientSecret);
      } catch (error) {
        console.error('Error creating initial payment intent:', error);
      }
    };

    createPaymentIntent();
  }, []);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    // Switch to transactions tab to show the successful payment
    setActiveTab('transactions');
  };

  const handleRefundClick = (paymentIntentId: string) => {
    setSelectedPaymentForRefund(paymentIntentId);
    setActiveTab('refunds');
  };

  const stripeOptions = {
    clientSecret,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Payment Flow Stripe</h1>
              <Badge variant="secondary" className="ml-3">
                v1.0
              </Badge>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Mode:</span>
                <Select defaultValue={stripeConfig?.isLiveMode ? 'live' : 'test'} disabled>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test Mode</SelectItem>
                    <SelectItem value="live">Live Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div 
                className={`w-2 h-2 rounded-full animate-pulse ${
                  stripeConfig?.hasKeys ? 'bg-green-400' : 'bg-red-400'
                }`} 
                title={stripeConfig?.hasKeys ? 'Connected to Stripe' : 'Stripe not configured'}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Create Payment
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Manage Refunds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payment Form */}
              {clientSecret && (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <PaymentForm onPaymentSuccess={handlePaymentSuccess} />
                </Elements>
              )}

              {/* Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment in progress</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionHistory onRefundClick={handleRefundClick} />
          </TabsContent>

          <TabsContent value="refunds">
            <RefundManagement selectedPaymentIntentId={selectedPaymentForRefund} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
