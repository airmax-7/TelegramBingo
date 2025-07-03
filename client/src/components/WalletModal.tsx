import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, Plus, Minus, Wallet, Trophy, CreditCard, Gamepad2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onDeposit: (amount: number) => void;
}

export default function WalletModal({ isOpen, onClose, user, onDeposit }: WalletModalProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const { toast } = useToast();

  const { data: transactions } = useQuery({
    queryKey: ['/api/users/' + user?.id + '/transactions'],
    enabled: isOpen && !!user?.id,
  });

  // Fetch fresh user data to get current balance
  const { data: userData } = useQuery({
    queryKey: ['/api/user/' + user?.id],
    enabled: isOpen && !!user?.id,
  });

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      onDeposit(amount);
      setDepositAmount('');
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'game_win':
        return <Trophy className="text-green-500 text-xs" />;
      case 'deposit':
        return <Plus className="text-blue-500 text-xs" />;
      case 'game_entry':
        return <Gamepad2 className="text-gray-600 text-xs" />;
      default:
        return <CreditCard className="text-gray-600 text-xs" />;
    }
  };

  const formatTransactionAmount = (type: string, amount: string) => {
    const formattedAmount = `${Math.abs(parseFloat(amount)).toFixed(2)} ETB`;
    return type === 'game_entry' ? `-${formattedAmount}` : `+${formattedAmount}`;
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'game_win':
        return 'text-green-600';
      case 'deposit':
        return 'text-blue-600';
      case 'game_entry':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Calculate totals from transactions
  const calculateTotals = () => {
    if (!transactions?.transactions) {
      return { totalDeposited: 0, totalWon: 0 };
    }

    const completedTransactions = transactions.transactions.filter((t: any) => t.status === 'completed');
    
    const totalDeposited = completedTransactions
      .filter((t: any) => t.type === 'deposit')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    
    const totalWon = completedTransactions
      .filter((t: any) => t.type === 'game_win')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    return { totalDeposited, totalWon };
  };

  const { totalDeposited, totalWon } = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">My Wallet</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-8 h-8 p-0 bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          {/* Balance Display */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white mb-4">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Current Balance</p>
              <p className="text-2xl font-bold">{parseFloat(userData?.user?.balance || user?.balance || '0').toFixed(2)} ETB</p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="text-center">
                  <p className="text-xs opacity-90">Total Deposited</p>
                  <p className="font-bold">{totalDeposited.toFixed(2)} ETB</p>
                </div>
                <div className="text-center">
                  <p className="text-xs opacity-90">Total Won</p>
                  <p className="font-bold">{totalWon.toFixed(2)} ETB</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Deposit Section */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Add Funds</h3>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleDeposit} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </Button>
            </div>
            <div className="flex space-x-2 mt-2">
              {[50, 100, 250, 500].map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount(amount.toString())}
                  className="flex-1"
                >
                  {amount} ETB
                </Button>
              ))}
            </div>
          </div>
          
          {/* Transaction History */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Recent Transactions</h3>
            <div className="space-y-2">
              {transactions?.transactions?.length > 0 ? (
                transactions.transactions.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {transaction.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${getTransactionColor(transaction.type)}`}>
                      {formatTransactionAmount(transaction.type, transaction.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Wallet className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
