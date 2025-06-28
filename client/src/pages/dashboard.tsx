import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentFormWrapper } from '@/components/payment-form';
import { TransactionHistory } from '@/components/transaction-history';
import { RefundManagement } from '@/components/refund-management';
import { CreditCard, List, RotateCcw, Shield, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { StripeConfig } from '@/types/stripe';

export default function Dashboard() {
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<string>('');
  const [activeTab, setActiveTab] = useState('payment');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stripeConfig, refetch: refetchConfig } = useQuery<any>({
    queryKey: ['/api/stripe-status'],
  });

  const switchModeMutation = useMutation({
    mutationFn: async (mode: 'test' | 'live') => {
      const response = await apiRequest('POST', '/api/switch-mode', { mode });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `Switched to ${data.mode.toUpperCase()} Mode`,
        description: `Now using ${data.mode} Stripe keys for all operations`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/refunds'] });
    },
    onError: (error: any) => {
      toast({
        title: "Mode Switch Failed",
        description: error.message || "Unable to switch Stripe mode",
        variant: "destructive",
      });
    },
  });

  const syncHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sync-stripe-history');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/refunds'] });
      toast({
        title: "History Synced",
        description: `Retrieved ${data.syncedPayments} payments and ${data.syncedRefunds} refunds from Stripe`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Unable to sync historical data",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSuccess = (paymentIntentId: string) => {
    // Switch to transactions tab to show the successful payment
    setActiveTab('transactions');
  };

  const handleRefundClick = (paymentIntentId: string) => {
    setSelectedPaymentForRefund(paymentIntentId);
    setActiveTab('refunds');
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
                <Select 
                  value={stripeConfig?.mode || 'test'} 
                  onValueChange={(value: 'test' | 'live') => switchModeMutation.mutate(value)}
                  disabled={switchModeMutation.isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test Mode</SelectItem>
                    <SelectItem value="live">Live Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status Indicators */}
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    stripeConfig?.hasKeys ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  title={stripeConfig?.hasKeys ? 'Connected to Stripe' : 'Stripe not configured'}
                />
                <span className="text-xs text-gray-500">
                  {stripeConfig?.secretKeyPrefix}...
                </span>
              </div>

              {/* Live Mode Warning */}
              {stripeConfig?.isLiveMode && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  LIVE MODE
                </Badge>
              )}
              
              {!stripeConfig?.isLiveMode && (
                <Badge variant="secondary">
                  <Shield className="h-3 w-3 mr-1" />
                  TEST MODE
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Status and Key Information */}
        {stripeConfig && (
          <div className="mb-6 space-y-4">
            <Alert className={stripeConfig.isLiveMode ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">
                    Current Mode: {stripeConfig.mode.toUpperCase()}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Secret Key: {stripeConfig.secretKeyPrefix}...</div>
                    <div>Test Keys Available: {stripeConfig.keyDetails?.testKeysAvailable ? '✓' : '✗'}</div>
                    <div>Live Keys Available: {stripeConfig.keyDetails?.liveKeysAvailable ? '✓' : '✗'}</div>
                  </div>
                  {stripeConfig.isLiveMode && (
                    <div className="text-red-600 font-medium text-sm mt-2">
                      ⚠️ LIVE MODE ACTIVE: Real money transactions will be processed
                    </div>
                  )}
                  {!stripeConfig.isLiveMode && (
                    <div className="text-blue-600 text-sm mt-2">
                      🛡️ Test mode: Safe for testing with test cards
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

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
              <PaymentFormWrapper onPaymentSuccess={handlePaymentSuccess} />

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
