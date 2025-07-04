import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Plus, Play, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import CreateGameModal from '@/components/CreateGameModal';

interface LobbyProps {
  user: any;
}

export default function Lobby({ user }: LobbyProps) {
  const [, navigate] = useLocation();
  const [joiningGameId, setJoiningGameId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gamesData, isLoading } = useQuery({
    queryKey: ['/api/games', { userId: user?.id }],
    enabled: !!user?.id,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['/api/user', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/user/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['/api/users/' + user?.id + '/transactions'],
    enabled: !!user?.id,
  });

  const createGameMutation = useMutation({
    mutationFn: async (gameData: any) => {
      const response = await apiRequest('POST', '/api/games', gameData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: "Game Created",
        description: "Your game has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const joinGameMutation = useMutation({
    mutationFn: async ({ gameId }: { gameId: number }) => {
      setJoiningGameId(gameId);
      const response = await apiRequest('POST', `/api/games/${gameId}/join`, {
        userId: user.id
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setJoiningGameId(null);
      navigate(`/game/${variables.gameId}`);
    },
    onError: (error: any) => {
      setJoiningGameId(null);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateGame = () => {
    createGameMutation.mutate({
      status: 'waiting',
      entryFee: '2.50',
      prizePool: '0.00',
      maxPlayers: 8
    });
  };

  const handleJoinGame = (gameId: number) => {
    joinGameMutation.mutate({ gameId });
  };

  const addTestPlayerMutation = useMutation({
    mutationFn: async (gameId: number) => {
      const response = await apiRequest('POST', '/api/test/add-player', { gameId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Player Added",
        description: "A test player joined the game. The game should start now!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddTestPlayer = (gameId: number) => {
    addTestPlayerMutation.mutate(gameId);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-gray-600">Loading games...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Game Lobby</h1>
          <p className="text-gray-600">Join an active game or create a new one</p>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-sm opacity-90">Your Balance</p>
                  <p className="text-xl font-bold">{parseFloat(userData?.user?.balance || user?.balance || '0').toFixed(2)} ETB</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchUser()}
                  className="text-white hover:bg-white/20 p-1 h-8 w-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Available Games</p>
                <p className="font-bold">{gamesData?.games?.length || 0}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 pt-3 border-t border-white/20">
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

        {/* Create Game Modal */}
        <CreateGameModal user={user} />

        {/* Active Games */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Games</h2>
          
          {gamesData?.games?.length > 0 ? (
            gamesData.games.map((game: any) => (
              <Card key={game.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">Game #{game.id}</h3>
                      <Badge className={getStatusColor(game.status)}>
                        {game.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-orange-500">
                        <Trophy className="h-4 w-4" />
                        <span className="font-bold">{parseFloat(game.prizePool).toFixed(2)} ETB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">
                        {game.participantCount || 0}/{game.maxPlayers} players
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      Entry: {parseFloat(game.entryFee).toFixed(2)} ETB
                    </span>
                  </div>

                  <Button
                    onClick={() => {
                      if (game.status === 'active' && game.userJoined) {
                        navigate(`/game/${game.id}`);
                      } else if (game.status === 'waiting') {
                        handleJoinGame(game.id);
                      }
                    }}
                    disabled={
                      joiningGameId === game.id ||
                      (game.status === 'active' && !game.userJoined) ||
                      (game.status === 'waiting' && (
                        (game.participantCount >= game.maxPlayers) ||
                        parseFloat(userData?.user?.balance || user?.balance || '0') < parseFloat(game.entryFee)
                      ))
                    }
                    className="w-full"
                    variant={
                      game.status === 'active' && !game.userJoined 
                        ? 'outline' 
                        : game.status === 'waiting' 
                          ? 'default' 
                          : 'default'
                    }
                  >
                    {joiningGameId === game.id ? (
                      'Joining...'
                    ) : game.status === 'waiting' ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Join Game
                      </>
                    ) : game.status === 'active' && game.userJoined ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Enter Game
                      </>
                    ) : game.status === 'active' && !game.userJoined ? (
                      'Game In Progress'
                    ) : (
                      'Game Completed'
                    )}
                  </Button>

                  {parseFloat(userData?.user?.balance || user?.balance || '0') < parseFloat(game.entryFee) && game.status === 'waiting' && (
                    <p className="text-xs text-red-500 mt-2 text-center">
                      Insufficient balance
                    </p>
                  )}
                  
                  {game.status === 'active' && !game.userJoined && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      You haven't joined this game
                    </p>
                  )}
                  
                  {/* Test button to add second player (for testing multiplayer) */}
                  {game.status === 'waiting' && game.participantCount >= 1 && (
                    <Button
                      onClick={() => handleAddTestPlayer(game.id)}
                      disabled={addTestPlayerMutation.isPending}
                      className="w-full mt-2"
                      variant="outline"
                      size="sm"
                    >
                      {addTestPlayerMutation.isPending ? 'Adding Player...' : 'Add Test Player & Start Game'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Games</h3>
                <p className="text-gray-600 mb-4">Be the first to create a new game!</p>
                <Button onClick={handleCreateGame} className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Game
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
