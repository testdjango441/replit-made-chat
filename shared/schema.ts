import { pgTable, text, serial, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password"), // Not used for Replit auth, but kept for schema compatibility if needed
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: text("id").primaryKey(), // Using UUID string as per spec
  userId: integer("user_id").references(() => users.id), // Optional for noauth
  title: text("title").default("New Chat"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  inputFiles: jsonb("input_files").default([]),
  outputFiles: jsonb("output_files").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  id: true,
  userId: true,
  title: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  role: true,
  content: true,
  inputFiles: true,
  outputFiles: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Request/Response schemas matching OpenAPI spec

export const createChatSessionRequestSchema = z.object({
  user_id: z.number().optional(), // Or string if external ID
  user_email: z.string().email().optional(),
});

export const chatSessionResponseSchema = z.object({
  session_id: z.string(),
  user_id: z.string().optional().or(z.number().optional()), // Adjusting for flexibility
  created_at: z.string(),
  title: z.string().optional(),
});

export const chatSessionListRequestSchema = z.object({
  user_id: z.number().or(z.string()),
  page: z.number().default(1),
  page_size: z.number().default(10),
});

export const listChatMessagesRequestSchema = z.object({
  session_id: z.string(),
  user_id: z.number().or(z.string()).optional(),
  page: z.number().default(1),
  page_size: z.number().default(20),
});

export const chatMessageRequestSchema = z.object({
  user_message: z.string(),
  user_email: z.string().email().optional(), // Made optional for unauthenticated
  session_id: z.string(),
  input_files: z.array(z.string()).nullable().optional(),
});

export const chatMessageNoAuthRequestSchema = z.object({
  user_message: z.string(),
  session_id: z.string(),
  input_files: z.array(z.string()).nullable().optional(),
});

export const deleteSessionRequestSchema = z.object({
  session_id: z.string(),
  user_id: z.number().or(z.string()),
});
