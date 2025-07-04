import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertGameSchema, insertTransactionSchema } from "@shared/schema";
import { generateBingoCard, checkWinCondition } from "../client/src/lib/gameLogic";

// Generate 6-digit payment code
function generatePaymentCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface GameRoom {
  gameId: number;
  players: Set<WebSocket>;
  numberCallInterval?: NodeJS.Timeout;
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

  // Create offline payment code for deposit
  app.post("/api/create-payment-code", async (req, res) => {
    try {
      const { amount, userId } = req.body;
      
      if (!amount || !userId) {
        return res.status(400).json({ message: "Missing amount or userId" });
      }

      const paymentCode = generatePaymentCode();

      // Create pending transaction with payment code
      const transaction = await storage.createTransaction({
        userId,
        type: 'deposit',
        amount: amount.toString(),
        status: 'pending',
        paymentCode
      });

      res.json({ 
        paymentCode,
        transactionId: transaction.id,
        amount: amount.toString(),
        currency: 'ETB',
        instructions: 'Please make your payment offline and provide this 6-digit code as reference.'
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment code: " + error.message });
    }
  });

  // Verify offline payment using code
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { paymentCode, transactionId } = req.body;
      
      if (!paymentCode || !transactionId) {
        return res.status(400).json({ message: "Missing payment code or transaction ID" });
      }

      // Find transaction by payment code and ID
      const transactions = await storage.getUserTransactions(transactionId);
      const transaction = transactions.find(t => 
        t.paymentCode === paymentCode && 
        t.id === transactionId && 
        t.status === 'pending'
      );

      if (!transaction) {
        return res.status(404).json({ message: "Invalid payment code or transaction not found" });
      }

      // Update transaction status to completed
      await storage.updateTransactionStatus(transaction.id, 'completed');
      
      // Update user balance
      const user = await storage.getUser(transaction.userId);
      if (user) {
        const newBalance = (parseFloat(user.balance) + parseFloat(transaction.amount)).toString();
        await storage.updateUserBalance(transaction.userId, newBalance);
      }

      res.json({ 
        success: true, 
        message: "Payment verified and balance updated",
        newBalance: user ? (parseFloat(user.balance) + parseFloat(transaction.amount)).toString() : "0"
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error verifying payment: " + error.message });
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

  // Get active games with user participation info
  app.get("/api/games", async (req, res) => {
    try {
      const { userId } = req.query;
      const games = await storage.getActiveGames();
      
      // Get participant count and user participation for each game
      const gamesWithCounts = await Promise.all(
        games.map(async (game) => {
          const participants = await storage.getGameParticipants(game.id);
          const userParticipant = userId ? participants.find(p => p.userId === parseInt(userId as string)) : null;
          
          return {
            ...game,
            participantCount: participants.length,
            userJoined: !!userParticipant
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
      await storage.updateGamePrizePool(gameId, newPrizePool);
      
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

  // Admin routes
  app.get("/api/admin/pending-transactions", async (req, res) => {
    try {
      const transactions = await storage.getPendingTransactions();
      res.json({ transactions });
    } catch (error: any) {
      console.error("Error fetching pending transactions:", error);
      res.status(500).json({ message: "Failed to fetch pending transactions" });
    }
  });

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Find admin user by username and password
      const adminUser = await storage.getAdminByCredentials(username, password);
      
      if (!adminUser) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        success: true,
        message: "Login successful",
        adminUser: {
          id: adminUser.id,
          username: adminUser.adminUsername,
          isAdmin: adminUser.isAdmin
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: "Login error: " + error.message });
    }
  });

  app.post("/api/admin/verify-payment", async (req, res) => {
    try {
      const { paymentCode, transactionId } = req.body;
      
      if (!paymentCode || !transactionId) {
        return res.status(400).json({ message: "Payment code and transaction ID are required" });
      }

      const transaction = await storage.verifyPaymentByCode(paymentCode, transactionId);
      res.json({ 
        message: "Payment verified successfully",
        transaction 
      });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(400).json({ message: error.message || "Failed to verify payment" });
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
          const numberStr = `${letter}${i}`;
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
