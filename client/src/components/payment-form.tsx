import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getStripePromise } from '@/lib/stripe';
import { CreditCard, Info, Lock } from 'lucide-react';
import type { PaymentFormData } from '@/types/stripe';

interface PaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
}

function PaymentForm({ onPaymentSuccess }: PaymentFormProps) {
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

      // Submit the elements to validate before confirming payment
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: "Payment Error",
          description: submitError.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

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
        // Update payment status in database
        try {
          await apiRequest('POST', '/api/update-payment-status', {
            paymentIntentId: paymentIntent.id
          });
        } catch (updateError) {
          console.error('Error updating payment status:', updateError);
        }

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

// Payment form that only creates payment intents when user submits
function PaymentSetupForm({ onPaymentSuccess }: PaymentFormProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 1.00,
    description: 'Test payment',
    customerEmail: '',
  });

  const handleInputChange = (field: keyof PaymentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount < 0.5) {
      toast({
        title: "Invalid Amount",
        description: "Minimum amount is £0.50",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiRequest('POST', '/api/create-payment-intent', formData);
      const { clientSecret } = await response.json();
      
      // Redirect to payment form with client secret
      window.location.hash = `#payment-${clientSecret}`;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
          Set up a payment amount and proceed to secure checkout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreatePayment} className="space-y-6">
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
            <Label htmlFor="email">Customer Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <Button
            type="submit"
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating Payment...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Create Payment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Wrapper that shows either setup form or payment form based on URL
export function PaymentFormWrapper({ onPaymentSuccess }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    // Initialize Stripe promise when component mounts
    getStripePromise().then(setStripePromise);

    // Check if we have a client secret in the URL hash
    const hash = window.location.hash;
    if (hash.startsWith('#payment-')) {
      const secret = hash.replace('#payment-', '');
      setClientSecret(secret);
    }

    // Listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash;
      if (newHash.startsWith('#payment-')) {
        const secret = newHash.replace('#payment-', '');
        setClientSecret(secret);
      } else {
        setClientSecret('');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    // Clear the hash and return to setup form
    window.location.hash = '';
    setClientSecret('');
    onPaymentSuccess(paymentIntentId);
  };

  if (!clientSecret) {
    return <PaymentSetupForm onPaymentSuccess={onPaymentSuccess} />;
  }

  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2">Loading Stripe...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button 
          onClick={() => {
            window.location.hash = '';
            setClientSecret('');
          }}
          className="text-primary hover:underline"
        >
          ← Back to setup
        </button>
      </div>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentForm onPaymentSuccess={handlePaymentSuccess} />
      </Elements>
    </div>
  );
}
