import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { RotateCcw } from 'lucide-react';
import { formatCurrency, getStatusColor } from '@/lib/stripe';
import type { RefundFormData } from '@/types/stripe';
import type { Refund } from '@shared/schema';

interface RefundManagementProps {
  selectedPaymentIntentId?: string;
}

export function RefundManagement({ selectedPaymentIntentId }: RefundManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<RefundFormData>({
    paymentIntentId: selectedPaymentIntentId || '',
    reason: 'requested_by_customer',
  });

  // Update form when selectedPaymentIntentId changes
  useEffect(() => {
    if (selectedPaymentIntentId) {
      setFormData(prev => ({
        ...prev,
        paymentIntentId: selectedPaymentIntentId
      }));
    }
  }, [selectedPaymentIntentId]);

  const { data: refunds, isLoading } = useQuery<Refund[]>({
    queryKey: ['/api/refunds'],
  });

  const refundMutation = useMutation({
    mutationFn: (data: RefundFormData) =>
      apiRequest('POST', '/api/create-refund', data),
    onSuccess: () => {
      toast({
        title: "Refund Processed",
        description: "Refund has been successfully processed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refunds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setFormData({
        paymentIntentId: '',
        reason: 'requested_by_customer',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof RefundFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentIntentId) {
      toast({
        title: "Payment ID Required",
        description: "Please enter a Payment Intent ID",
        variant: "destructive",
      });
      return;
    }

    refundMutation.mutate(formData);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Refund Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Create Refund
          </CardTitle>
          <CardDescription>
            Process full or partial refunds for successful payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="payment-id">Payment ID</Label>
              <Input
                id="payment-id"
                value={formData.paymentIntentId}
                onChange={(e) => handleInputChange('paymentIntentId', e.target.value)}
                placeholder="pi_1234567890"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the Payment Intent ID to refund
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount (GBP)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">£</span>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('amount', value ? parseFloat(value) : undefined);
                  }}
                  className="pl-8"
                  placeholder="Leave empty for full refund"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for full refund
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Refund Reason</Label>
              <Select 
                value={formData.reason} 
                onValueChange={(value) => handleInputChange('reason', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                  <SelectItem value="duplicate">Duplicate payment</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-notes">Notes (Optional)</Label>
              <Textarea
                id="refund-notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about this refund..."
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={refundMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {refundMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing Refund...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Process Refund
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Refunds */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Refunds</CardTitle>
          <CardDescription>
            View recent refund transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="ml-2">Loading refunds...</span>
            </div>
          ) : !refunds || refunds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No refunds processed yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {refunds.slice(0, 5).map((refund) => (
                <div key={refund.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium font-mono text-sm">{refund.refundId}</h3>
                      <p className="text-sm text-muted-foreground">
                        Payment: {refund.paymentIntentId}
                      </p>
                    </div>
                    <Badge className={getStatusColor(refund.status)}>
                      {refund.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Amount: <strong>{formatCurrency(refund.amount)}</strong>
                      {refund.amount < 100 && ' (Partial)'}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(refund.createdAt)}
                    </span>
                  </div>
                  {refund.notes && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      {refund.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
