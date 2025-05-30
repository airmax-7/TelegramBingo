import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTelegram } from "@/hooks/useTelegram";
import TelegramAuth from "@/components/TelegramAuth";
import WalletModal from "@/components/WalletModal";
import Lobby from "@/pages/lobby";
import Game from "@/pages/game";
import Deposit from "@/pages/deposit";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Wallet, Users, History, User, Gamepad2 } from "lucide-react";
import { useLocation } from "wouter";

function Router({ user, onShowWallet }: { user: any; onShowWallet: () => void }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/" component={() => <Lobby user={user} />} />
        <Route path="/lobby" component={() => <Lobby user={user} />} />
        <Route path="/game/:id" component={() => <Game user={user} />} />
        <Route path="/deposit" component={() => <Deposit user={user} />} />
        <Route component={NotFound} />
      </Switch>

      {/* Bottom Navigation */}
      {user && !location.startsWith('/game/') && (
        <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-around">
            <Button 
              variant="ghost" 
              className={`flex flex-col items-center space-y-1 py-2 px-3 ${
                location === '/' || location === '/lobby' ? 'text-blue-500' : 'text-gray-400'
              }`}
              onClick={() => window.history.pushState({}, '', '/lobby')}
            >
              <Gamepad2 className="h-5 w-5" />
              <span className="text-xs font-medium">Play</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex flex-col items-center space-y-1 py-2 px-3 text-gray-400 hover:text-gray-600"
              onClick={onShowWallet}
            >
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-medium">Wallet</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex flex-col items-center space-y-1 py-2 px-3 text-gray-400 hover:text-gray-600"
            >
              <History className="h-5 w-5" />
              <span className="text-xs font-medium">History</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex flex-col items-center space-y-1 py-2 px-3 text-gray-400 hover:text-gray-600"
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">Profile</span>
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { isReady } = useTelegram();

  const handleAuthenticated = (authenticatedUser: any) => {
    setUser(authenticatedUser);
  };

  const handleDeposit = (amount: number) => {
    setShowWalletModal(false);
    // Navigate to deposit page
    window.history.pushState({}, '', '/deposit');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        
        {!user && isReady && (
          <TelegramAuth onAuthenticated={handleAuthenticated} />
        )}

        {user && (
          <>
            <Router user={user} onShowWallet={() => setShowWalletModal(true)} />
            
            <WalletModal
              isOpen={showWalletModal}
              onClose={() => setShowWalletModal(false)}
              user={user}
              onDeposit={handleDeposit}
            />
          </>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
