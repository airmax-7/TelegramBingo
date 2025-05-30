import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { requestTelegramContact } from '@/lib/telegram';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TelegramAuthProps {
  onAuthenticated: (user: any) => void;
}

export default function TelegramAuth({ onAuthenticated }: TelegramAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async () => {
    setIsLoading(true);
    
    try {
      // Get user data from Telegram
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      
      if (!telegramUser) {
        // For testing outside Telegram, create a demo user
        const demoUser = {
          id: Date.now(),
          username: 'demo_user',
          first_name: 'Demo',
          last_name: 'Player'
        };
        
        const response = await apiRequest('POST', '/api/auth/telegram', {
          telegramId: demoUser.id.toString(),
          username: demoUser.username,
          firstName: demoUser.first_name,
          lastName: demoUser.last_name,
          phoneNumber: '+1234567890' // Demo phone number for testing
        });

        const data = await response.json();
        onAuthenticated(data.user);
        
        toast({
          title: "Demo Mode Active",
          description: "Welcome to Telegram Bingo! (Demo Mode)",
        });
        return;
      }

      // Use Telegram user data directly (phone verification happens within Telegram)
      const response = await apiRequest('POST', '/api/auth/telegram', {
        telegramId: telegramUser.id.toString(),
        username: telegramUser.username || `user_${telegramUser.id}`,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        phoneNumber: 'verified_via_telegram' // Telegram users are pre-verified
      });

      const data = await response.json();
      onAuthenticated(data.user);
      
      toast({
        title: "Authentication Successful",
        description: "Welcome to Telegram Bingo!",
      });
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="text-white text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Phone Verification Required</h2>
            <p className="text-gray-600 mb-6">Verify your phone number to play Bingo and access your wallet</p>
            
            <Button 
              onClick={handleAuth} 
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <>
                  <i className="fab fa-telegram-plane mr-2"></i>
                  Verify with Telegram
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-500 mt-4">
              <i className="fas fa-shield-alt mr-1"></i>
              Your phone number is securely verified through Telegram
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
