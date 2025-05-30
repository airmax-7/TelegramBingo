import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertUserSchema, insertGameSchema, insertTransactionSchema } from "@shared/schema";
import { generateBingoCard, checkWinCondition } from "../client/src/lib/gameLogic";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

interface GameRoom {
  gameId: number;
  players: Set<WebSocket>;
}

const gameRooms = new Map<number, GameRoom>();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Telegram auth endpoint
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegramId, username, firstName, lastName, phoneNumber } = req.body;
      
      if (!telegramId || !phoneNumber) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        user = await storage.createUser({
          telegramId,
          username: username || `user_${telegramId}`,
          firstName,
          lastName,
          phoneNumber,
          balance: "0.00",
          isVerified: true // Verified through Telegram
        });
      }

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ message: "Authentication failed: " + error.message });
    }
  });

  // Get user profile
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching user: " + error.message });
    }
  });

  // Create payment intent for deposit
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, userId } = req.body;
      
      if (!amount || !userId) {
        return res.status(400).json({ message: "Missing amount or userId" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: userId.toString(),
          type: 'deposit'
        }
      });

      // Create pending transaction
      await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: amount.toString(),
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Test payment completion endpoint (for demo purposes)
  app.post("/api/complete-test-payment", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "Missing userId" });
      }

      // Get the most recent pending transaction for this user
      const transactions = await storage.getUserTransactions(userId);
      const pendingTransaction = transactions.find(t => t.status === 'pending' && t.type === 'deposit');
      
      if (!pendingTransaction) {
        return res.status(404).json({ message: "No pending deposit transaction found" });
      }

      // Update user balance
      const user = await storage.getUser(userId);
      if (user) {
        const depositAmount = parseFloat(pendingTransaction.amount);
        const newBalance = (parseFloat(user.balance) + depositAmount).toString();
        await storage.updateUserBalance(userId, newBalance);

        // Update transaction status
        await storage.updateTransactionStatus(pendingTransaction.id, 'completed');
        
        res.json({ 
          success: true, 
          newBalance,
          message: "Test payment completed successfully"
        });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Test payment error: " + error.message });
    }
  });

  // Stripe webhook for payment completion
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const event = req.body;

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const userId = parseInt(paymentIntent.metadata.userId);
        const amount = (paymentIntent.amount / 100).toString();

        // Update user balance
        const user = await storage.getUser(userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(amount)).toString();
          await storage.updateUserBalance(userId, newBalance);

          // Update transaction status
          const transactions = await storage.getUserTransactions(userId);
          const pendingTransaction = transactions.find(t => 
            t.stripePaymentIntentId === paymentIntent.id && t.status === 'pending'
          );
          
          if (pendingTransaction) {
            await storage.updateTransactionStatus(pendingTransaction.id, 'completed');
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      res.status(500).json({ message: "Webhook error: " + error.message });
    }
  });

  // Get active games
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getActiveGames();
      
      // Get participant count for each game
      const gamesWithCounts = await Promise.all(
        games.map(async (game) => {
          const participants = await storage.getGameParticipants(game.id);
          return {
            ...game,
            participantCount: participants.length
          };
        })
      );

      res.json({ games: gamesWithCounts });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching games: " + error.message });
    }
  });

  // Create new game
  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.json({ game });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating game: " + error.message });
    }
  });

  // Join game
  app.post("/api/games/:id/join", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { userId } = req.body;

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.status !== 'waiting') {
        return res.status(400).json({ message: "Game is not accepting players" });
      }

      const participants = await storage.getGameParticipants(gameId);
      if (participants.length >= game.maxPlayers) {
        return res.status(400).json({ message: "Game is full" });
      }

      // Check if user already joined
      const existingParticipant = participants.find(p => p.userId === userId);
      if (existingParticipant) {
        return res.status(400).json({ message: "User already joined this game" });
      }

      // Check user balance
      const user = await storage.getUser(userId);
      if (!user || parseFloat(user.balance) < parseFloat(game.entryFee)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct entry fee
      const newBalance = (parseFloat(user.balance) - parseFloat(game.entryFee)).toString();
      await storage.updateUserBalance(userId, newBalance);

      // Create transaction
      await storage.createTransaction({
        userId,
        type: 'game_entry',
        amount: `-${game.entryFee}`,
        status: 'completed',
        gameId
      });

      // Generate bingo card
      const bingoCard = generateBingoCard();

      // Join game
      const participant = await storage.joinGame({
        gameId,
        userId,
        bingoCard,
        markedNumbers: []
      });

      // Update prize pool
      const newPrizePool = (parseFloat(game.prizePool) + parseFloat(game.entryFee)).toString();
      
      // Start game if enough players
      const updatedParticipants = await storage.getGameParticipants(gameId);
      if (updatedParticipants.length >= 2) { // Minimum players to start
        await storage.updateGameStatus(gameId, 'active');
        
        // Broadcast game start
        const room = gameRooms.get(gameId);
        if (room) {
          broadcastToRoom(room, {
            type: 'game_started',
            gameId
          });
        }
      }

      res.json({ participant });
    } catch (error: any) {
      res.status(500).json({ message: "Error joining game: " + error.message });
    }
  });

  // Get game details
  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.getGame(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const participants = await storage.getGameParticipants(gameId);
      
      res.json({ 
        game: {
          ...game,
          participants
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching game: " + error.message });
    }
  });

  // Get user transactions
  app.get("/api/users/:id/transactions", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const transactions = await storage.getUserTransactions(userId);
      res.json({ transactions });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching transactions: " + error.message });
    }
  });

  // Test endpoint to simulate a second player joining (for testing multiplayer)
  app.post("/api/test/add-player", async (req, res) => {
    try {
      const { gameId } = req.body;
      
      // Create a test user with sufficient balance
      const testUser = await storage.createUser({
        telegramId: `test-${Date.now()}`,
        firstName: "Test",
        lastName: "Player",
        username: `testplayer${Date.now()}`,
        phoneNumber: "+1234567890",
        balance: "10.00",
        isVerified: true
      });

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Deduct entry fee
      const newBalance = (parseFloat(testUser.balance) - parseFloat(game.entryFee)).toString();
      await storage.updateUserBalance(testUser.id, newBalance);

      // Generate bingo card
      const bingoCard = generateBingoCard();

      // Join game
      const participant = await storage.joinGame({
        gameId,
        userId: testUser.id,
        bingoCard,
        markedNumbers: []
      });

      // Check if game should start
      const participants = await storage.getGameParticipants(gameId);
      if (participants.length >= 2) {
        await storage.updateGameStatus(gameId, 'active');
        
        // Broadcast game start
        const room = gameRooms.get(gameId);
        if (room) {
          broadcastToRoom(room, {
            type: 'game_started',
            gameId
          });
        }
      }

      res.json({ 
        success: true, 
        testUser: { id: testUser.id, username: testUser.username },
        participant,
        playersCount: participants.length
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error adding test player: " + error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentGameId: number | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'join_room':
            currentGameId = data.gameId;
            
            if (!gameRooms.has(currentGameId)) {
              gameRooms.set(currentGameId, {
                gameId: currentGameId,
                players: new Set()
              });
            }

            const room = gameRooms.get(currentGameId)!;
            room.players.add(ws);
            
            broadcastToRoom(room, {
              type: 'player_joined',
              gameId: currentGameId,
              playerCount: room.players.size
            });
            break;

          case 'mark_number':
            if (currentGameId) {
              const { participantId, markedNumbers } = data;
              await storage.updateParticipantMarkedNumbers(participantId, markedNumbers);
              
              // Check for win condition
              const participant = await storage.getGameParticipants(currentGameId);
              const player = participant.find(p => p.id === participantId);
              
              if (player && checkWinCondition(player.bingoCard as number[][], markedNumbers)) {
                const game = await storage.setGameWinner(currentGameId, player.userId);
                
                // Award prize
                const user = await storage.getUser(player.userId);
                if (user) {
                  const newBalance = (parseFloat(user.balance) + parseFloat(game.prizePool)).toString();
                  await storage.updateUserBalance(player.userId, newBalance);
                  
                  await storage.createTransaction({
                    userId: player.userId,
                    type: 'game_win',
                    amount: game.prizePool,
                    status: 'completed',
                    gameId: currentGameId
                  });
                }

                const room = gameRooms.get(currentGameId);
                if (room) {
                  broadcastToRoom(room, {
                    type: 'game_won',
                    gameId: currentGameId,
                    winnerId: player.userId,
                    prizeAmount: game.prizePool
                  });
                }
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (currentGameId) {
        const room = gameRooms.get(currentGameId);
        if (room) {
          room.players.delete(ws);
          if (room.players.size === 0) {
            gameRooms.delete(currentGameId);
          }
        }
      }
    });
  });

  function broadcastToRoom(room: GameRoom, message: any) {
    const messageStr = JSON.stringify(message);
    room.players.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  // Game number calling simulation (for demo purposes)
  setInterval(async () => {
    for (const [gameId, room] of gameRooms) {
      const game = await storage.getGame(gameId);
      if (game && game.status === 'active') {
        const calledNumbers = (game.calledNumbers as string[]) || [];
        
        // Generate next number
        const availableNumbers = [];
        for (let i = 1; i <= 75; i++) {
          const letter = i <= 15 ? 'B' : i <= 30 ? 'I' : i <= 45 ? 'N' : i <= 60 ? 'G' : 'O';
          const numberStr = `${letter}-${i}`;
          if (!calledNumbers.includes(numberStr)) {
            availableNumbers.push(numberStr);
          }
        }

        if (availableNumbers.length > 0) {
          const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
          const newCalledNumbers = [...calledNumbers, nextNumber];
          
          await storage.updateGameCurrentNumber(gameId, nextNumber, newCalledNumbers);
          
          broadcastToRoom(room, {
            type: 'number_called',
            gameId,
            number: nextNumber,
            calledNumbers: newCalledNumbers
          });
        }
      }
    }
  }, 5000); // Call number every 5 seconds

  return httpServer;
}

function broadcastToRoom(room: GameRoom, message: any) {
  const messageStr = JSON.stringify(message);
  room.players.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}
