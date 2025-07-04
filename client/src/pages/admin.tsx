import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Search, DollarSign, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AdminProps {
  user: any;
}

export default function Admin({ user }: AdminProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is already an admin
  const { data: userData } = useQuery({
    queryKey: ['/api/user/' + user?.id],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (userData?.user?.isAdmin) {
      setIsLoggedIn(true);
      setCurrentAdmin(userData.user);
    }
  }, [userData]);

  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/admin/login', {
        username,
        password
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsLoggedIn(true);
      setCurrentAdmin(data.adminUser);
      setLoginUsername('');
      setLoginPassword('');
      toast({
        title: "Login Successful",
        description: "Welcome to the admin panel!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Fetch pending transactions
  const { data: pendingTransactions, isLoading } = useQuery({
    queryKey: ['/api/admin/pending-transactions'],
    enabled: isLoggedIn,
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
      // Also invalidate user transactions to update Recent Transactions list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    },
  });

  // Quick verify from list mutation
  const quickVerifyMutation = useMutation({
    mutationFn: async ({ code, txId }: { code: string; txId: number }) => {
      const response = await apiRequest('POST', '/api/admin/verify-payment', {
        paymentCode: code,
        transactionId: txId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Verified",
        description: "Payment verified successfully from list.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-transactions'] });
      // Also invalidate user transactions to update Recent Transactions list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
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

  const handleQuickVerify = (transaction: any) => {
    quickVerifyMutation.mutate({ 
      code: transaction.paymentCode, 
      txId: transaction.id 
    });
  };

  // Pagination helpers
  const getPaginatedTransactions = () => {
    if (!pendingTransactions?.transactions) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return pendingTransactions.transactions.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    if (!pendingTransactions?.transactions) return 0;
    return Math.ceil(pendingTransactions.transactions.length / itemsPerPage);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(getTotalPages(), prev + 1));
  };

  const handleLogin = () => {
    if (!loginUsername || !loginPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username: loginUsername, password: loginPassword });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentAdmin(null);
    toast({
      title: "Logged Out",
      description: "You have been logged out of the admin panel.",
    });
  };

  const handleBecomeAdmin = () => {
    // For testing purposes - switch to admin user
    const adminUser = {
      id: 18,
      username: 'admin_demo',
      telegramId: '1748959676943',
      isAdmin: true,
      balance: '0.00'
    };
    
    localStorage.setItem('telegram-bingo-user', JSON.stringify(adminUser));
    window.location.reload();
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleLogin}
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 text-center mb-2">Testing only:</p>
              <Button 
                onClick={handleBecomeAdmin} 
                variant="outline"
                className="w-full"
              >
                Use Demo Admin (ID: 18)
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              <p>Default credentials: admin / admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Welcome, {currentAdmin?.username || 'Admin'}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Logout
          </Button>
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
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pendingTransactions.transactions.length)} of {pendingTransactions.transactions.length} transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {getTotalPages()}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextPage}
                      disabled={currentPage === getTotalPages()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {getPaginatedTransactions().map((transaction: any) => (
                    <div key={transaction.id} className="border rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
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
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleQuickVerify(transaction)}
                            disabled={quickVerifyMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {quickVerifyMutation.isPending ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verify
                              </>
                            )}
                          </Button>
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
                
                {getTotalPages() > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600 px-4">
                        Page {currentPage} of {getTotalPages()}
                      </span>
                      <Button 
                        variant="outline" 
                        onClick={handleNextPage}
                        disabled={currentPage === getTotalPages()}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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