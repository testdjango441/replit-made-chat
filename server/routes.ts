import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);

  // Mock AI Stream function
  async function streamAIResponse(res: any, userMessage: string) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const mockTokens = [
      "Hello", "!", " I", " am", " a", " simulated", " AI", " assistant", ".",
      " You", " said", ": ", "\"", ...userMessage.split(" "), "\""
    ];

    // Tool call simulation (randomly)
    if (Math.random() > 0.8) {
        res.write(`event: toolCallStart\ndata: ${JSON.stringify({status: "Checking Database..."})}\n\n`);
        await new Promise(r => setTimeout(r, 1000));
        res.write(`event: toolCallEnd\ndata: ${JSON.stringify({status: "Checking Database Completed!", success: true, tool_result: {found: true}})}\n\n`);
    }

    for (const token of mockTokens) {
      await new Promise(r => setTimeout(r, 100)); // Simulate delay
      const data = JSON.stringify({ chunk: token });
      res.write(`event: chunk\ndata: ${data}\n\n`);
    }

    res.end();
  }

  // --- Session Routes ---

  app.post(api.chatSession.createNoAuth.path, async (req, res) => {
    const id = randomUUID();
    const session = await storage.createChatSession({
      id,
      title: "New Chat",
    });
    res.status(201).json({
      session_id: session.id,
      created_at: session.createdAt?.toISOString() || new Date().toISOString(),
      title: session.title,
    });
  });

  app.post(api.chatSession.create.path, async (req, res) => {
    // If we have an authenticated user in req.user, use it
    let userId: number | undefined;
    if (req.isAuthenticated() && req.user) {
        userId = (req.user as any).id;
    } else {
        // Fallback or error if auth is strictly required by spec logic
        // For now, allow creating generic sessions or error
    }

    const id = randomUUID();
    const session = await storage.createChatSession({
      id,
      userId,
      title: "New Chat",
    });
    res.status(200).json({
      session_id: session.id,
      user_id: userId ? String(userId) : undefined,
      created_at: session.createdAt?.toISOString() || new Date().toISOString(),
      title: session.title,
    });
  });

  app.post(api.chatSession.list.path, async (req, res) => {
    // The spec uses POST for list, and passes user_id in body
    // In a real secure app, we'd use req.user.id
    const { user_id } = req.body;
    // Assuming user_id is passed or we use session auth
    let targetUserId = user_id;
    if (req.isAuthenticated() && req.user) {
        targetUserId = (req.user as any).id;
    }

    if (!targetUserId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const sessions = await storage.getUserChatSessions(Number(targetUserId));
    res.json(sessions.map(s => ({
        session_id: s.id,
        user_id: String(s.userId),
        created_at: s.createdAt?.toISOString(),
        title: s.title
    })));
  });

  app.post(api.chatSession.delete.path, async (req, res) => {
    const { session_id } = req.body;
    await storage.deleteChatSession(session_id);
    res.json({});
  });

  // --- History Route ---

  app.post(api.chatHistory.list.path, async (req, res) => {
    const { session_id } = req.body;
    const messages = await storage.getChatMessages(session_id);
    res.json(messages.map(m => ({
        session_id: m.sessionId,
        message_id: String(m.id),
        role: m.role,
        content: m.content,
        created_at: m.createdAt?.toISOString()
    })));
  });

  // --- Chat Routes ---

  app.post(api.chat.unauthenticated.path, async (req, res) => {
    const { session_id, user_message } = req.body;
    
    // Save user message
    await storage.createChatMessage({
        sessionId: session_id,
        role: "user",
        content: user_message
    });

    // We don't save assistant message here because it's streamed and "generated"
    // In a real app, we might save it after generation or chunk by chunk
    // For this demo, we'll save the "full" simulated response at start for history
    const simulatedResponse = `Hello! I am a simulated AI assistant. You said: "${user_message}"`;
    await storage.createChatMessage({
        sessionId: session_id,
        role: "assistant",
        content: simulatedResponse
    });

    await streamAIResponse(res, user_message);
  });

  app.post(api.chat.authenticated.path, async (req, res) => {
     const { session_id, user_message } = req.body;
    
    // Save user message
    await storage.createChatMessage({
        sessionId: session_id,
        role: "user",
        content: user_message
    });

    // Save assistant message (simulated)
    const simulatedResponse = `Hello! I am a simulated AI assistant. You said: "${user_message}"`;
    await storage.createChatMessage({
        sessionId: session_id,
        role: "assistant",
        content: simulatedResponse
    });

    await streamAIResponse(res, user_message);
  });

  return httpServer;
}
