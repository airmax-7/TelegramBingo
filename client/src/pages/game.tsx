import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trophy, Check, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import BingoCard from '@/components/BingoCard';
import { checkWinCondition } from '@/lib/gameLogic';

interface GameProps {
  user: any;
}

export default function Game({ user }: GameProps) {
  const { id } = useParams();
  const gameId = parseInt(id as string);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<string>('');
  const [calledNumbers, setCalledNumbers] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winAmount, setWinAmount] = useState<string>('0');

  const { data: gameData, isLoading } = useQuery({
    queryKey: ['/api/games/' + gameId],
    enabled: !!gameId,
  });

  const { isConnected, lastMessage, sendMessage } = useWebSocket(gameId);

  const userParticipant = gameData?.game?.participants?.find(
    (p: any) => p.userId === user?.id
  );

  useEffect(() => {
    if (gameData?.game) {
      setGameStatus(gameData.game.status);
      setPlayerCount(gameData.game.participants?.length || 0);
      setCurrentNumber(gameData.game.currentNumber || '');
      setCalledNumbers(gameData.game.calledNumbers || []);
    }
  }, [gameData]);

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'player_joined':
          setPlayerCount(lastMessage.playerCount);
          break;
        case 'game_started':
          setGameStatus('active');
          toast({
            title: "Game Started!",
            description: "The game has begun. Good luck!",
          });
          break;
        case 'number_called':
          setCurrentNumber(lastMessage.number);
          setCalledNumbers(lastMessage.calledNumbers);
          break;
        case 'game_won':
          if (lastMessage.winnerId === user?.id) {
            setWinAmount(lastMessage.prizeAmount);
            setShowWinModal(true);
          } else {
            toast({
              title: "Game Over",
              description: "Another player won this round!",
            });
          }
          setGameStatus('completed');
          break;
      }
    }
  }, [lastMessage, user?.id, toast]);

  const handleNumberMark = (numbers: number[]) => {
    setMarkedNumbers(numbers);
    
    if (userParticipant && isConnected) {
      sendMessage({
        type: 'mark_number',
        participantId: userParticipant.id,
        markedNumbers: numbers
      });
    }
  };

  const handleCallBingo = () => {
    if (userParticipant && checkWinCondition(userParticipant.bingoCard, markedNumbers)) {
      toast({
        title: "Checking Win...",
        description: "Verifying your BINGO!",
      });
    } else {
      toast({
        title: "Not a winning pattern",
        description: "Keep playing - you don't have BINGO yet!",
        variant: "destructive",
      });
    }
  };

  const formatCalledNumber = (num: string) => {
    return num;
  };

  const getRecentNumbers = () => {
    return calledNumbers.slice(-5).reverse();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameData?.game || !userParticipant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Game Not Found</h2>
            <p className="text-gray-600 mb-4">This game doesn't exist or you're not a participant.</p>
            <Button onClick={() => navigate('/lobby')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/lobby')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-bold text-gray-900">Game #{gameId}</h1>
              <p className="text-xs text-gray-500">
                {gameStatus === 'waiting' ? 'Waiting for players' : 
                 gameStatus === 'active' ? 'Game in progress' : 'Game completed'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 px-3 py-1 rounded-full">
              <span className="text-green-600 font-bold text-sm">
                ${parseFloat(user?.balance || '0').toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Game Status Bar */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="font-bold text-lg">
                  {currentNumber || '--'}
                </span>
              </div>
              <div>
                <p className="font-medium">
                  {gameStatus === 'waiting' ? 'Waiting to Start' : 
                   gameStatus === 'active' ? 'Current Number' : 'Game Ended'}
                </p>
                <p className="text-xs opacity-90">
                  {gameStatus === 'active' ? 'Game in progress' : 
                   gameStatus === 'waiting' ? `${playerCount} players joined` : 'Final results'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 mb-1">
                <Users className="h-4 w-4" />
                <span className="font-bold">{playerCount}</span>
                <span className="text-xs opacity-90">players</span>
              </div>
              <div className="flex items-center space-x-1">
                <Trophy className="h-4 w-4 text-orange-300" />
                <span className="font-bold text-orange-300">
                  ${parseFloat(gameData.game.prizePool).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 pb-20">
        {/* Called Numbers Display */}
        {gameStatus === 'active' && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recently Called</h3>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {getRecentNumbers().map((number, index) => (
                <div
                  key={number}
                  className={`min-w-[2.5rem] h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {number}
                </div>
              ))}
              {getRecentNumbers().length === 0 && (
                <div className="min-w-[2.5rem] h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-xs">--</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bingo Card */}
        <div className="mb-4">
          <BingoCard
            card={userParticipant.bingoCard}
            markedNumbers={markedNumbers}
            onNumberMark={handleNumberMark}
            calledNumbers={calledNumbers}
            canCallBingo={gameStatus === 'active'}
            onCallBingo={handleCallBingo}
          />
        </div>

        {/* Waiting Message */}
        {gameStatus === 'waiting' && (
          <Card className="mb-4">
            <CardContent className="p-4 text-center">
              <div className="animate-pulse mb-2">⏳</div>
              <h3 className="font-medium text-gray-900 mb-2">Waiting for More Players</h3>
              <p className="text-sm text-gray-600">
                Game will start when more players join.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Players List */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Players ({playerCount})
          </h3>
          <div className="space-y-2">
            {gameData.game.participants?.map((participant: any, index: number) => (
              <div key={participant.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    ['bg-gradient-to-r from-blue-500 to-purple-500',
                     'bg-gradient-to-r from-green-500 to-teal-500',
                     'bg-gradient-to-r from-red-500 to-pink-500',
                     'bg-gradient-to-r from-yellow-500 to-orange-500'][index % 4]
                  }`}>
                    <span className="text-white text-xs font-bold">
                      {participant.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {participant.user?.username || `Player ${participant.userId}`}
                      {participant.userId === user?.id && ' (You)'}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-gray-500">Verified</span>
                    </div>
                  </div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-500 mb-2">BINGO!</h2>
              <p className="text-gray-600 mb-4">Congratulations! You won this round!</p>
              
              <div className="bg-green-100 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Prize Amount</p>
                <p className="text-2xl font-bold text-green-500">
                  ${parseFloat(winAmount).toFixed(2)}
                </p>
              </div>
              
              <Button 
                onClick={() => {
                  setShowWinModal(false);
                  navigate('/lobby');
                }}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                Continue Playing
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
