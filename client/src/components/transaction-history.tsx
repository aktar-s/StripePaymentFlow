import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { List, Download, Eye, RotateCcw } from 'lucide-react';
import { formatCurrency, getStatusColor, getStatusIcon } from '@/lib/stripe';
import type { Payment } from '@shared/schema';

interface TransactionHistoryProps {
  onRefundClick: (paymentIntentId: string) => void;
}

export function TransactionHistory({ onRefundClick }: TransactionHistoryProps) {
  const { data: payments, isLoading, error } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });

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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
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
