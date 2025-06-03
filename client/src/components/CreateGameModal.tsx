import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trophy, Users, DollarSign } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CreateGameModalProps {
  user: any;
}

export default function CreateGameModal({ user }: CreateGameModalProps) {
  const [open, setOpen] = useState(false);
  const [entryFee, setEntryFee] = useState('2.50');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [gameType, setGameType] = useState('standard');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGameMutation = useMutation({
    mutationFn: async (gameData: any) => {
      const response = await apiRequest('POST', '/api/games', gameData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Created",
        description: "Your game has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateGame = () => {
    const fee = parseFloat(entryFee);
    const players = parseInt(maxPlayers);

    if (fee < 0.25 || fee > 25.00) {
      toast({
        title: "Invalid Entry Fee",
        description: "Entry fee must be between $0.25 and $25.00",
        variant: "destructive",
      });
      return;
    }

    if (players < 2 || players > 20) {
      toast({
        title: "Invalid Player Count",
        description: "Player count must be between 2 and 20",
        variant: "destructive",
      });
      return;
    }

    createGameMutation.mutate({
      status: 'waiting',
      entryFee: fee.toFixed(2),
      prizePool: '0.00',
      maxPlayers: players,
      gameType
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full mb-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Create New Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Create New Bingo Game</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Game Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="gameType">Game Type</Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger>
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Bingo (5x5)</SelectItem>
                <SelectItem value="speed">Speed Bingo (Fast)</SelectItem>
                <SelectItem value="jackpot">Jackpot Game</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entry Fee */}
          <div className="space-y-2">
            <Label htmlFor="entryFee">Entry Fee ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="entryFee"
                type="number"
                step="0.25"
                min="0.25"
                max="25.00"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="pl-10"
                placeholder="2.50"
              />
            </div>
            <p className="text-xs text-gray-500">Minimum $0.25, Maximum $25.00</p>
          </div>

          {/* Max Players */}
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Maximum Players</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="maxPlayers"
                type="number"
                min="2"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                className="pl-10"
                placeholder="8"
              />
            </div>
            <p className="text-xs text-gray-500">2-20 players allowed</p>
          </div>

          {/* Prize Preview */}
          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <div className="text-sm">
                  <span className="font-medium text-yellow-800">Estimated Prize:</span>
                  <span className="ml-1 text-yellow-700">
                    ${(parseFloat(entryFee || '0') * parseInt(maxPlayers || '0') * 0.9).toFixed(2)}
                  </span>
                  <span className="text-xs text-yellow-600 ml-1">(90% of total entry fees)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGame}
              disabled={createGameMutation.isPending}
              className="flex-1"
            >
              {createGameMutation.isPending ? 'Creating...' : 'Create Game'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}