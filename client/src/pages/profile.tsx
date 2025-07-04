import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar,
  Phone,
  Mail,
  Star,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useLocation } from 'wouter';

interface ProfileProps {
  user: any;
}

export default function Profile({ user }: ProfileProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile data
  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['/api/user', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/user/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
  });

  // Fetch user transactions for statistics
  const { data: transactions } = useQuery({
    queryKey: ['/api/users/' + user?.id + '/transactions'],
    enabled: !!user?.id,
  });

  // Refresh user data mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      await refetchUser();
      queryClient.invalidateQueries({ queryKey: ['/api/users/' + user?.id + '/transactions'] });
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile data has been refreshed",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Could not refresh profile data",
        variant: "destructive",
      });
    },
  });

  // Calculate user statistics
  const calculateStats = () => {
    if (!transactions?.transactions) {
      return {
        totalGamesPlayed: 0,
        totalWins: 0,
        totalDeposited: 0,
        totalWon: 0,
        winRate: 0,
        averageWinAmount: 0
      };
    }

    const completedTransactions = transactions.transactions.filter((t: any) => t.status === 'completed');
    
    const gameEntries = completedTransactions.filter((t: any) => t.type === 'game_entry');
    const gameWins = completedTransactions.filter((t: any) => t.type === 'game_win');
    const deposits = completedTransactions.filter((t: any) => t.type === 'deposit');

    const totalGamesPlayed = gameEntries.length;
    const totalWins = gameWins.length;
    const totalDeposited = deposits.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const totalWon = gameWins.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    const winRate = totalGamesPlayed > 0 ? (totalWins / totalGamesPlayed) * 100 : 0;
    const averageWinAmount = totalWins > 0 ? totalWon / totalWins : 0;

    return {
      totalGamesPlayed,
      totalWins,
      totalDeposited,
      totalWon,
      winRate,
      averageWinAmount
    };
  };

  const stats = calculateStats();
  const currentUser = userData?.user || user;

  const getInitials = (firstName?: string, lastName?: string, username?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-600">Manage your account and view statistics</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser?.profileImageUrl} alt={currentUser?.username} />
                <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-600">
                  {getInitials(currentUser?.firstName, currentUser?.lastName, currentUser?.username)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentUser?.firstName && currentUser?.lastName 
                      ? `${currentUser.firstName} ${currentUser.lastName}`
                      : currentUser?.username || 'Bingo Player'
                    }
                  </h2>
                  <p className="text-gray-600">@{currentUser?.username}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Badge variant={currentUser?.isVerified ? 'default' : 'secondary'} className="flex items-center space-x-1">
                    {currentUser?.isVerified ? (
                      <>
                        <Phone className="h-3 w-3" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <>
                        <Phone className="h-3 w-3" />
                        <span>Unverified</span>
                      </>
                    )}
                  </Badge>
                  
                  <div className="bg-green-100 px-3 py-1 rounded-full">
                    <span className="text-green-600 font-bold text-sm">
                      {parseFloat(currentUser?.balance || '0').toFixed(2)} ETB
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {currentUser?.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{currentUser.email}</span>
                    </div>
                  )}
                  
                  {currentUser?.phoneNumber && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{currentUser.phoneNumber}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(currentUser?.createdAt || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Games Played */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Games Played</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalGamesPlayed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Games Won */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Games Won</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalWins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Win Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.winRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Deposited</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalDeposited.toFixed(2)} ETB</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Won</p>
                <p className="text-xl font-bold text-green-600">{stats.totalWon.toFixed(2)} ETB</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Average Win</p>
                <p className="text-xl font-bold text-purple-600">{stats.averageWinAmount.toFixed(2)} ETB</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                <p className={`text-xl font-bold ${(stats.totalWon - stats.totalDeposited) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(stats.totalWon - stats.totalDeposited).toFixed(2)} ETB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.totalGamesPlayed >= 1 && (
                <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-2xl mb-1">🎮</div>
                  <p className="text-xs font-medium text-yellow-700">First Game</p>
                </div>
              )}
              
              {stats.totalWins >= 1 && (
                <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl mb-1">🏆</div>
                  <p className="text-xs font-medium text-green-700">First Win</p>
                </div>
              )}
              
              {stats.totalGamesPlayed >= 10 && (
                <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl mb-1">🎯</div>
                  <p className="text-xs font-medium text-blue-700">Veteran Player</p>
                </div>
              )}
              
              {stats.winRate >= 50 && stats.totalGamesPlayed >= 5 && (
                <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-2xl mb-1">⭐</div>
                  <p className="text-xs font-medium text-purple-700">Win Master</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate('/lobby')}
            className="flex-1"
          >
            Back to Lobby
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/deposit')}
            className="flex-1"
          >
            Add Funds
          </Button>
        </div>
      </div>
    </div>
  );
}