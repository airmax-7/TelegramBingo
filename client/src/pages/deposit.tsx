import { useState, useEffect } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface DepositFormProps {
  user: any;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const DepositForm = ({ user, amount, onSuccess, onCancel }: DepositFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/lobby`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: `$${amount.toFixed(2)} has been added to your wallet!`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Deposit Amount</span>
          <span className="text-lg font-bold text-blue-600">${amount.toFixed(2)}</span>
        </div>
      </div>
      
      <PaymentElement />
      
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1 bg-blue-500 hover:bg-blue-600"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              <span>Processing...</span>
            </div>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
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
  const [clientSecret, setClientSecret] = useState("");
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();

  const predefinedAmounts = [10, 25, 50, 100];

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setAmount(numValue);
    }
  };

  const handleProceedToPayment = async () => {
    if (amount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Minimum deposit amount is $1.00",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount,
        userId: user.id
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPayment(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/lobby');
  };

  const handleCancel = () => {
    if (showPayment) {
      setShowPayment(false);
      setClientSecret('');
    } else {
      navigate('/lobby');
    }
  };

  if (showPayment && clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
            <p className="text-gray-600">Add funds to your Bingo wallet</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <DepositForm 
                  user={user}
                  amount={amount}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleCancel}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/lobby')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
          <p className="text-gray-600">Choose an amount to deposit</p>
        </div>

        {/* Current Balance */}
        <Card className="mb-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Current Balance</p>
            <p className="text-2xl font-bold">${parseFloat(user?.balance || '0').toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Predefined Amounts */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Quick Select</h3>
                <div className="grid grid-cols-2 gap-3">
                  {predefinedAmounts.map(amt => (
                    <Button
                      key={amt}
                      variant={amount === amt && !customAmount ? "default" : "outline"}
                      onClick={() => handleAmountSelect(amt)}
                      className="py-3"
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Custom Amount</h3>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmount(e.target.value)}
                    className="pl-8"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Selected Amount Display */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Selected Amount</span>
                  <span className="text-lg font-bold text-blue-600">${amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Proceed Button */}
              <Button
                onClick={handleProceedToPayment}
                disabled={amount < 1}
                className="w-full bg-blue-500 hover:bg-blue-600 py-3"
              >
                Proceed to Payment
              </Button>

              <div className="text-xs text-gray-500 text-center">
                <p>Secure payment powered by Stripe</p>
                <p>Funds will be available immediately after successful payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
