import { z } from "zod";
import { 
  chatSessionResponseSchema, 
  createChatSessionRequestSchema,
  chatSessionListRequestSchema,
  listChatMessagesRequestSchema,
  deleteSessionRequestSchema,
  chatMessageRequestSchema,
  chatMessageNoAuthRequestSchema
} from "./schema";

export const api = {
  chatSession: {
    createNoAuth: {
      method: "POST" as const,
      path: "/api/chat-session/create/noauth/",
      responses: {
        201: chatSessionResponseSchema,
      }
    },
    create: {
      method: "POST" as const,
      path: "/api/chat-session/create/",
      input: createChatSessionRequestSchema,
      responses: {
        200: chatSessionResponseSchema,
      }
    },
    list: {
      method: "POST" as const,
      path: "/api/chat-session/list/",
      input: chatSessionListRequestSchema,
      responses: {
        200: z.array(chatSessionResponseSchema),
      }
    },
    delete: {
      method: "POST" as const,
      path: "/api/chat-session/delete/",
      input: deleteSessionRequestSchema,
      responses: {
        200: z.object({}),
      }
    }
  },
  chatHistory: {
    list: {
      method: "POST" as const,
      path: "/api/chat-history/list/",
      input: listChatMessagesRequestSchema,
      responses: {
        200: z.array(z.any()), // Using any for now to match flexible response
      }
    }
  },
  chat: {
    unauthenticated: {
      method: "POST" as const,
      path: "/api/chat/unauthenticated/",
      input: chatMessageNoAuthRequestSchema,
      responses: {
        200: z.any(), // Stream response
      }
    },
    authenticated: {
      method: "POST" as const,
      path: "/api/chat/authenticated/",
      input: chatMessageRequestSchema,
      responses: {
        200: z.any(), // Stream response
      }
    }
  }
};
