import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { List, Download, Eye, RotateCcw, Calendar, CreditCard, User, FileText } from 'lucide-react';
import { formatCurrency, getStatusColor, getStatusIcon } from '@/lib/stripe';
import { apiRequest } from '@/lib/queryClient';
import type { Payment } from '@shared/schema';

interface TransactionHistoryProps {
  onRefundClick: (paymentIntentId: string) => void;
}

export function TransactionHistory({ onRefundClick }: TransactionHistoryProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const { data: payments, isLoading, error } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });

  const handleViewPayment = async (payment: Payment) => {
    setSelectedPayment(payment);
    setIsLoadingDetails(true);
    
    try {
      const response = await apiRequest('GET', `/api/payment-status/${payment.paymentIntentId}`);
      const details = await response.json();
      setPaymentDetails(details);
    } catch (error) {
      console.error('Error loading payment details:', error);
      setPaymentDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2">Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">Error loading transactions</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              View and manage all payment transactions
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!payments || payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium font-mono text-sm">
                          {payment.paymentIntentId}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.description || 'No description'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {payment.customerEmail || 'No email'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {payment.status === 'succeeded' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRefundClick(payment.paymentIntentId)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Refund
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="text-muted-foreground cursor-not-allowed"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Refund
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => handleViewPayment(payment)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payment Details</DialogTitle>
                              <DialogDescription>
                                Complete information for payment {payment.paymentIntentId}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {isLoadingDetails ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                <span className="ml-2">Loading payment details...</span>
                              </div>
                            ) : paymentDetails ? (
                              <div className="space-y-6">
                                {/* Payment Overview */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <CreditCard className="h-4 w-4" />
                                      Payment Information
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                      <div><strong>Amount:</strong> {formatCurrency(payment.amount)}</div>
                                      <div><strong>Status:</strong> <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge></div>
                                      <div><strong>Currency:</strong> {payment.currency.toUpperCase()}</div>
                                      <div><strong>Payment ID:</strong> <code className="text-xs">{payment.paymentIntentId}</code></div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Customer Information
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                      <div><strong>Email:</strong> {payment.customerEmail || 'Not provided'}</div>
                                      <div><strong>Payment Method:</strong> {paymentDetails.paymentIntent?.charges?.data?.[0]?.payment_method_details?.card?.brand || 'N/A'}</div>
                                      <div><strong>Last 4 Digits:</strong> {paymentDetails.paymentIntent?.charges?.data?.[0]?.payment_method_details?.card?.last4 || 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Transaction Details */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Transaction Details
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><strong>Created:</strong> {formatDate(payment.createdAt)}</div>
                                    <div><strong>Mode:</strong> {payment.isLiveMode ? 'Live' : 'Test'}</div>
                                    <div><strong>Description:</strong> {payment.description || 'No description'}</div>
                                  </div>
                                </div>

                                {/* Stripe Details */}
                                {paymentDetails.paymentIntent && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Stripe Details
                                    </h4>
                                    <div className="bg-muted p-3 rounded text-xs font-mono">
                                      <pre>{JSON.stringify(paymentDetails.paymentIntent, null, 2)}</pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-destructive">Failed to load payment details</p>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
