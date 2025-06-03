import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  status: text("status").notNull(), // 'waiting', 'active', 'completed'
  gameType: text("game_type").default("standard").notNull(), // 'standard', 'speed', 'jackpot'
  currentNumber: text("current_number"),
  calledNumbers: jsonb("called_numbers").default([]).notNull(),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).notNull(),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).default("0.00").notNull(),
  maxPlayers: integer("max_players").default(8).notNull(),
  winnerId: integer("winner_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const gameParticipants = pgTable("game_participants", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  userId: integer("user_id").notNull().references(() => users.id),
  bingoCard: jsonb("bingo_card").notNull(),
  markedNumbers: jsonb("marked_numbers").default([]).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'game_entry', 'game_win'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  gameId: integer("game_id").references(() => games.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gameParticipants: many(gameParticipants),
  transactions: many(transactions),
  wonGames: many(games),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  participants: many(gameParticipants),
  winner: one(users, {
    fields: [games.winnerId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(games, {
    fields: [gameParticipants.gameId],
    references: [games.id],
  }),
  user: one(users, {
    fields: [gameParticipants.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  game: one(games, {
    fields: [transactions.gameId],
    references: [games.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertGameParticipantSchema = createInsertSchema(gameParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GameParticipant = typeof gameParticipants.$inferSelect;
export type InsertGameParticipant = z.infer<typeof insertGameParticipantSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
