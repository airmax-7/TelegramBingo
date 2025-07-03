import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';

interface PaymentCodeDisplayProps {
  paymentCode: string;
  amount: number;
  transactionId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const PaymentCodeDisplay = ({ paymentCode, amount, transactionId, onCancel, onSuccess }: PaymentCodeDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Payment code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-green-600">Payment Code Generated</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Amount: {amount} ETB</p>
          <p className="text-sm text-gray-600 mb-4">
            Please make your payment offline and use this 6-digit code as reference:
          </p>
          
          <div className="flex items-center justify-center space-x-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <span className="text-3xl font-bold text-blue-600 tracking-wider">{paymentCode}</span>
            <Button 
              onClick={copyToClipboard}
              variant="outline" 
              size="sm"
              className="ml-2"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Payment Instructions:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Contact our payment agent</li>
            <li>• Provide the 6-digit code: <strong>{paymentCode}</strong></li>
            <li>• Make payment of <strong>{amount} ETB</strong></li>
            <li>• Your balance will be updated once verified</li>
          </ul>
        </div>

        <div className="flex space-x-2">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={onSuccess} className="flex-1">
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface DepositFormProps {
  user: any;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const DepositForm = ({ user, amount, onSuccess, onCancel }: DepositFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/create-payment-code", {
        amount,
        userId: user.id
      });
      
      const data = await response.json();
      setPaymentData(data);
      
      toast({
        title: "Payment Code Generated",
        description: "Please follow the instructions to complete your payment",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate payment code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentData) {
    return (
      <PaymentCodeDisplay
        paymentCode={paymentData.paymentCode}
        amount={amount}
        transactionId={paymentData.transactionId}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Deposit Amount</span>
          <span className="text-lg font-bold text-blue-600">{amount} ETB</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Offline Payment Process</h4>
        <p className="text-sm text-yellow-700">
          We will generate a unique 6-digit payment code. Use this code when making your offline payment 
          to ensure your account is credited correctly.
        </p>
      </div>

      <div className="flex space-x-2">
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Generating..." : "Generate Payment Code"}
        </Button>
      </div>
    </form>
  );
};

interface DepositProps {
  user: any;
}

export default function Deposit({ user }: DepositProps) {
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState(100);
  const [showForm, setShowForm] = useState(false);

  const predefinedAmounts = [50, 100, 250, 500, 1000];

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount);
  };

  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setAmount(value);
  };

  const handleSuccess = () => {
    navigate('/lobby');
  };

  const handleCancel = () => {
    if (showForm) {
      setShowForm(false);
    } else {
      navigate('/lobby');
    }
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <DepositForm
          user={user}
          amount={amount}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            onClick={() => navigate('/lobby')} 
            variant="ghost" 
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Add Funds</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Amount (ETB)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {predefinedAmounts.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant={amount === presetAmount ? "default" : "outline"}
                  onClick={() => handleAmountSelect(presetAmount)}
                  className="h-12"
                >
                  {presetAmount} ETB
                </Button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter custom amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount in ETB"
                value={amount || ''}
                onChange={handleCustomAmount}
                min="10"
                max="10000"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">You will deposit:</span>
                <span className="text-lg font-bold text-blue-600">{amount} ETB</span>
              </div>
            </div>

            <Button
              onClick={() => setShowForm(true)}
              className="w-full"
              disabled={amount < 10}
            >
              Continue to Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}