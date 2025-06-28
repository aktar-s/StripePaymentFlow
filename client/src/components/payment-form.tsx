import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, Info, Lock } from 'lucide-react';
import type { PaymentFormData } from '@/types/stripe';

interface PaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
}

export function PaymentForm({ onPaymentSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 1.00,
    description: 'Test payment',
    customerEmail: '',
  });

  const handleInputChange = (field: keyof PaymentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment Error",
        description: "Stripe has not loaded yet. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (formData.amount < 0.5) {
      toast({
        title: "Invalid Amount",
        description: "Minimum amount is £0.50",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await apiRequest('POST', '/api/create-payment-intent', formData);
      const { clientSecret } = await response.json();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin,
          receipt_email: formData.customerEmail || undefined,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Payment Successful",
          description: `Payment of £${formData.amount.toFixed(2)} processed successfully!`,
        });
        onPaymentSuccess(paymentIntent.id);
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Create New Payment
        </CardTitle>
        <CardDescription>
          Process a payment using Stripe Elements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GBP)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.50"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                className="pl-8"
                placeholder="1.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum amount: £0.50</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Payment description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Customer Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Card Details</Label>
            <div className="p-3 border rounded-md bg-background">
              <PaymentElement />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-1">
                <p className="font-medium">Test Cards (Test Mode Only):</p>
                <p><strong>Success:</strong> 4242 4242 4242 4242</p>
                <p><strong>Decline:</strong> 4000 0000 0000 0002</p>
                <p><strong>3D Secure:</strong> 4000 0025 0000 3155</p>
                <p>Use any future expiry date and any 3-digit CVC</p>
              </div>
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Process Payment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
