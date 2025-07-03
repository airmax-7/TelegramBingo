import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Search, DollarSign, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AdminProps {
  user: any;
}

export default function Admin({ user }: AdminProps) {
  const [paymentCode, setPaymentCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending transactions
  const { data: pendingTransactions, isLoading } = useQuery({
    queryKey: ['/api/admin/pending-transactions'],
    enabled: user?.isAdmin === true,
  });

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ code, txId }: { code: string; txId: string }) => {
      const response = await apiRequest('POST', '/api/admin/verify-payment', {
        paymentCode: code,
        transactionId: parseInt(txId)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Verified",
        description: "Payment has been successfully verified and user balance updated.",
      });
      setPaymentCode('');
      setTransactionId('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  const handleVerifyPayment = () => {
    if (!paymentCode || !transactionId) {
      toast({
        title: "Missing Information",
        description: "Please enter both payment code and transaction ID",
        variant: "destructive",
      });
      return;
    }

    if (paymentCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Payment code must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    verifyPaymentMutation.mutate({ code: paymentCode, txId: transactionId });
  };

  if (user?.isAdmin !== true) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Verify offline payments and manage transactions</p>
        </div>

        {/* Payment Verification Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Verify Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentCode">Payment Code (6 digits)</Label>
                <Input
                  id="paymentCode"
                  type="text"
                  placeholder="123456"
                  value={paymentCode}
                  onChange={(e) => setPaymentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID</Label>
                <Input
                  id="transactionId"
                  type="number"
                  placeholder="Enter transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleVerifyPayment}
              disabled={verifyPaymentMutation.isPending}
              className="w-full"
            >
              {verifyPaymentMutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify Payment
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pending Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-2" />
                <p className="text-gray-500">Loading pending transactions...</p>
              </div>
            ) : pendingTransactions?.transactions?.length > 0 ? (
              <div className="space-y-4">
                {pendingTransactions.transactions.map((transaction: any) => (
                  <div key={transaction.id} className="border rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div>
                        <p className="text-sm text-gray-500">Transaction ID</p>
                        <p className="font-mono font-bold">{transaction.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Payment Code</p>
                        <p className="font-mono font-bold text-blue-600">{transaction.paymentCode}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-bold text-green-600">{parseFloat(transaction.amount).toFixed(2)} ETB</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          User ID: {transaction.userId}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(transaction.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <p className="text-gray-500">No pending transactions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Verify Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">1</span>
                <p>User makes an offline payment using their bank/mobile money with the provided payment code</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">2</span>
                <p>User provides you with their payment code and transaction ID</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">3</span>
                <p>Enter both the payment code and transaction ID above to verify the payment</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">4</span>
                <p>Once verified, the user's balance will be automatically updated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}