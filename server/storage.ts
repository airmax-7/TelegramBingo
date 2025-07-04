import { 
  users, games, gameParticipants, transactions,
  type User, type InsertUser, type Game, type InsertGame,
  type GameParticipant, type InsertGameParticipant,
  type Transaction, type InsertTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, amount: string): Promise<User>;
  verifyUser(userId: number): Promise<User>;

  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getActiveGames(): Promise<Game[]>;
  updateGameStatus(gameId: number, status: string): Promise<Game>;
  updateGameCurrentNumber(gameId: number, number: string, calledNumbers: string[]): Promise<Game>;
  updateGamePrizePool(gameId: number, prizePool: string): Promise<Game>;
  setGameWinner(gameId: number, winnerId: number): Promise<Game>;

  // Game participant operations
  joinGame(participant: InsertGameParticipant): Promise<GameParticipant>;
  getGameParticipants(gameId: number): Promise<GameParticipant[]>;
  updateParticipantMarkedNumbers(participantId: number, markedNumbers: number[]): Promise<GameParticipant>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  updateTransactionStatus(transactionId: number, status: string): Promise<Transaction>;
  
  // Admin operations
  getPendingTransactions(): Promise<Transaction[]>;
  verifyPaymentByCode(paymentCode: string, transactionId: number): Promise<Transaction>;
  getAdminByCredentials(username: string, password: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserBalance(userId: number, amount: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ balance: amount })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async verifyUser(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db
      .insert(games)
      .values(insertGame)
      .returning();
    return game;
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async getActiveGames(): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(sql`${games.status} IN ('waiting', 'active')`)
      .orderBy(desc(games.createdAt));
  }

  async updateGameStatus(gameId: number, status: string): Promise<Game> {
    const updateData: any = { status };
    if (status === 'active') {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [game] = await db
      .update(games)
      .set(updateData)
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async updateGameCurrentNumber(gameId: number, number: string, calledNumbers: string[]): Promise<Game> {
    const [game] = await db
      .update(games)
      .set({
        currentNumber: number,
        calledNumbers: calledNumbers
      })
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async updateGamePrizePool(gameId: number, prizePool: string): Promise<Game> {
    const [game] = await db
      .update(games)
      .set({ prizePool })
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async setGameWinner(gameId: number, winnerId: number): Promise<Game> {
    const [game] = await db
      .update(games)
      .set({ winnerId, status: 'completed', completedAt: new Date() })
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async joinGame(participant: InsertGameParticipant): Promise<GameParticipant> {
    const [gameParticipant] = await db
      .insert(gameParticipants)
      .values(participant)
      .returning();
    return gameParticipant;
  }

  async getGameParticipants(gameId: number): Promise<GameParticipant[]> {
    return await db
      .select()
      .from(gameParticipants)
      .where(eq(gameParticipants.gameId, gameId));
  }

  async updateParticipantMarkedNumbers(participantId: number, markedNumbers: number[]): Promise<GameParticipant> {
    const [participant] = await db
      .update(gameParticipants)
      .set({ markedNumbers })
      .where(eq(gameParticipants.id, participantId))
      .returning();
    return participant;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [trans] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return trans;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(10);
  }

  async updateTransactionStatus(transactionId: number, status: string): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, transactionId))
      .returning();
    return transaction;
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.status, 'pending'))
      .orderBy(transactions.createdAt);
  }

  async verifyPaymentByCode(paymentCode: string, transactionId: number): Promise<Transaction> {
    // First, find the transaction with the matching code and ID
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.paymentCode, paymentCode),
          eq(transactions.status, 'pending')
        )
      );

    if (!transaction) {
      throw new Error('Transaction not found or already verified');
    }

    // Update transaction status to completed
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ status: 'completed' })
      .where(eq(transactions.id, transactionId))
      .returning();

    // Update user balance
    await this.updateUserBalance(transaction.userId, transaction.amount);

    return updatedTransaction;
  }

  async getAdminByCredentials(username: string, password: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.adminUsername, username),
        eq(users.adminPassword, password),
        eq(users.isAdmin, true)
      ));
    return user;
  }
}

export const storage = new DatabaseStorage();
