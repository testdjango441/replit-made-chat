import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useAuth } from "./use-auth";

const backendUrl = "http://localhost:8000";

// Test function to check CORS
export const testCors = async () => {
  try {
    const response = await fetch(
      `${backendUrl}/api/chat-session/create/noauth/`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3001",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,accept",
        },
      },
    );
    console.log("CORS test response:", response.status, response.headers);
    return response;
  } catch (error) {
    console.error("CORS test error:", error);
    return error;
  }
};

// Test function to check backend connectivity
export const testBackendConnection = async () => {
  try {
    console.log("Testing backend connection...");
    const response = await fetch(`${backendUrl}/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    console.log(
      "Backend connection test:",
      response.status,
      response.statusText,
    );
    const text = await response.text();
    console.log("Response:", text);
    return { status: response.status, text };
  } catch (error) {
    console.error("Backend connection test error:", error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

// Test the specific API endpoint
export const testApiEndpoint = async () => {
  try {
    console.log(
      "Testing API endpoint:",
      `${backendUrl}/api/chat-session/create/noauth/`,
    );
    const response = await fetch(
      `${backendUrl}/api/chat-session/create/noauth/`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      },
    );
    console.log("API endpoint test:", response.status, response.statusText);
    const text = await response.text();
    console.log("Response body:", text.substring(0, 200));
    return {
      status: response.status,
      statusText: response.statusText,
      body: text,
    };
  } catch (error) {
    console.error("API endpoint test error:", error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

// Test the authenticated chat endpoint
export const testAuthenticatedChat = async (
  sessionId: string,
  userEmail: string,
) => {
  try {
    console.log("Testing authenticated chat endpoint");
    const endpoint = `${backendUrl}/api/chat/authenticated/`;
    const payload = {
      user_message: "Test message",
      session_id: sessionId,
      user_email: userEmail,
    };
    const headers = getHeaders(true, true);

    console.log("Auth chat test:", { endpoint, payload, headers });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log("Auth chat response:", response.status, response.statusText);
    const text = await response.text();
    console.log("Response body:", text.substring(0, 200));

    return {
      status: response.status,
      statusText: response.statusText,
      body: text,
    };
  } catch (error) {
    console.error("Auth chat test error:", error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

type ChatSession = {
  user_email: string;
  created_at: string;
  session_id: string;
  title: string;
};

type ToolCall = {
  id: string;
  name: string;
  args: Record<string, any>;
};

type HumanMessageData = {
  id?: string;
  type: "human";
  content: string;
  input_files: string[];
};

type AiMessageData = {
  id?: string;
  type: "ai";
  content?: string;
  tool_calls: ToolCall[];
  output_files: string[];
};

type ToolMessageData = {
  id?: string;
  type: "tool";
  content?: string;
  artifact?: Record<string, any>;
  tool_call_id?: string;
};

type ChatMessageResponse = {
  session_id: string;
  created_at: string;
  data: (HumanMessageData | AiMessageData | ToolMessageData)[];
};

// Helper function to get headers with auth token
const getHeaders = (contentType = true, includeAuth = true) => {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = "application/json";
  }
  headers["Accept"] = "application/json";

  if (includeAuth) {
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

// Helper function to get fetch options
const getFetchOptions = (
  method = "POST",
  headers: Record<string, string>,
  body?: string,
  signal?: AbortSignal,
) => {
  const options: RequestInit = {
    method,
    headers,
    credentials: "omit" as RequestCredentials,
  };

  if (body) {
    options.body = body;
  }

  if (signal) {
    options.signal = signal;
  }

  return options;
};

// Hook for fetching chat sessions list
export function useChatSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chatSessions", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const res = await fetch(
        `${backendUrl}/api/chat-session/list/`,
        getFetchOptions(
          "POST",
          getHeaders(true, true),
          JSON.stringify({ user_email: user.email }),
        ),
      );
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!user?.email,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

// Hook for creating a new session
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string = "New Chat") => {
      let user: any = null;
      try {
        const stored = localStorage.getItem("user");
        if (stored) user = JSON.parse(stored);
      } catch (e) {
        user = null;
      }

      if (user) {
        console.log("Creating session (authenticated):", user.email);
        const res = await fetch(
          `${backendUrl}/api/chat-session/create/`,
          getFetchOptions(
            "POST",
            getHeaders(true, true),
            JSON.stringify({ user_email: user.email, title }),
          ),
        );
        if (!res.ok) throw new Error("Failed to create session");
        return res.json();
      } else {
        console.log("Creating session (unauthenticated)");
        const res = await fetch(
          `${backendUrl}/api/chat-session/create/noauth/`,
          getFetchOptions("POST", getHeaders(false, false), JSON.stringify({ title })),
        );
        if (!res.ok) throw new Error("Failed to create guest session");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    },
  });
}

// Hook for fetching messages for a specific session
export function useChatHistory(sessionId?: string | null) {
  const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem("user");

  return useQuery({
    queryKey: ["chatHistory", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const res = await fetch(
        `${backendUrl}/api/chat-history/list/`,
        getFetchOptions(
          "POST",
          getHeaders(true, true),
          JSON.stringify({ session_id: sessionId, limit: 100 }),
        ),
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      
      // Transform the new format to flat messages for UI
      const flatMessages: any[] = [];
      
      for (const item of data) {
        const messageData = typeof item.data === 'string' 
          ? JSON.parse(item.data) 
          : item.data;
        
        for (const msg of messageData) {
          if (msg.type === "human") {
            flatMessages.push({
              role: "user",
              content: msg.content,
              input_files: msg.input_files || [],
              created_at: item.created_at,
            });
          } else if (msg.type === "ai") {
            flatMessages.push({
              role: "assistant",
              content: msg.content || "",
              tool_calls: msg.tool_calls || [],
              output_files: msg.output_files || [],
              created_at: item.created_at,
            });
          }
          // Tool messages are embedded in AI messages, so we don't need to show them separately
        }
      }
      
      return flatMessages;
    },
    enabled: !!sessionId && isAuthenticated,
  });
}

// Hook for deleting a session
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(
        `${backendUrl}/api/chat-session/delete/`,
        getFetchOptions(
          "POST",
          getHeaders(true, true),
          JSON.stringify({
            user_email: user?.email || "",
            session_id: sessionId,
          }),
        ),
      );
      if (!res.ok) throw new Error("Failed to delete session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatSessions"] });
    },
  });
}

// Custom hook for handling chat streaming
export function useChatStream() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const addUserMessage = (content: string, input_files?: string[], fileMetadata?: Array<{s3_uri: string, filename: string}>) => {
    setMessages((prev) => [
      ...prev,
      { 
        role: "user", 
        content, 
        input_files: input_files || [],
        fileMetadata: fileMetadata || [],
        created_at: new Date().toISOString() 
      },
    ]);
  };

  const setHistory = (history: any[]) => {
    setMessages(history);
  };

  const sendMessage = async (message: string, sessionId: string, input_files?: string[], fileMetadata?: Array<{s3_uri: string, filename: string}>) => {
    setIsLoading(true);

    // Add placeholder assistant message with "Thinking..." immediately
    const placeholderId = `assistant_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        role: "assistant",
        content: "",
        isStreaming: true,
        isThinking: true,
        toolEvents: [],
        toolCalls: [], // For completed tool calls
        output_files: [],
        currentTurn: 0,
      },
    ]);

    abortControllerRef.current = new AbortController();

    // Check localStorage for user
    let user: any = null;
    try {
      const stored = localStorage.getItem("user");
      if (stored) user = JSON.parse(stored);
    } catch (e) {
      user = null;
    }

    try {
      const endpoint = user
        ? `${backendUrl}/api/chat/authenticated/`
        : `${backendUrl}/api/chat/unauthenticated/`;

      const payload = user
        ? {
            user_message: message,
            session_id: sessionId,
            user_email: user.email,
            ...(input_files ? { input_files } : {}),
          }
        : {
            user_message: message,
            session_id: sessionId,
            ...(input_files ? { input_files } : {}),
          };

      console.log("Chat request:", {
        endpoint,
        isAuthenticated: !!user,
        payload,
      });

      const response = await fetch(
        endpoint,
        getFetchOptions(
          "POST",
          getHeaders(true, !!user),
          JSON.stringify(payload),
          abortControllerRef.current.signal,
        ),
      );

      console.log("Chat response status:", response.status, response.statusText);

      if (!response.ok)
        throw new Error(
          `Stream connection failed: ${response.status} ${response.statusText}`,
        );
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let currentToolEventIndex: number | null = null;
      let hasReceivedFirstChunk = false;
      let allToolCalls: ToolCall[] = []; // Track completed tool calls across turns

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.substring(6).trim();
            console.log("📌 Event received:", currentEvent);
          } else if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.substring(5).trim();
            if (!dataStr) continue;

            try {
              // Handle chunk events
              if (currentEvent === "chunk") {
                const data = JSON.parse(dataStr);
                const token = data.chunk;

                if (!hasReceivedFirstChunk) {
                  console.log("✅ First chunk received, replacing thinking state");
                  setMessages((prev) => {
                    return prev.map((msg) => {
                      if (msg.id === placeholderId && msg.role === "assistant") {
                        return {
                          ...msg,
                          content: token,
                          isThinking: false,
                          isStreaming: true,
                        };
                      }
                      return msg;
                    });
                  });
                  setIsLoading(false);
                  hasReceivedFirstChunk = true;
                } else {
                  setMessages((prev) => {
                    return prev.map((msg) => {
                      if (msg.id === placeholderId && msg.role === "assistant") {
                        return { ...msg, content: msg.content + token };
                      }
                      return msg;
                    });
                  });
                }
              }
              // Handle toolCallStart events
              else if (currentEvent === "toolCallStart") {
                const data = JSON.parse(dataStr);
                console.log("🔧 Tool call started:", data);

                setMessages((prev) => {
                  return prev.map((msg) => {
                    if (msg.id === placeholderId && msg.role === "assistant") {
                      const newToolEvents = [
                        ...(msg.toolEvents || []),
                        {
                          status: data.status || "Tool call started...",
                          isLoading: true,
                          success: false,
                          tool: data.tool || "",
                          tool_result: {},
                        },
                      ];
                      currentToolEventIndex = newToolEvents.length - 1;
                      console.log("🔧 Adding tool event:", newToolEvents);
                      return { ...msg, toolEvents: newToolEvents };
                    }
                    return msg;
                  });
                });
              }
              // Handle toolCallEnd events
              else if (currentEvent === "toolCallEnd") {
                const data = JSON.parse(dataStr);
                console.log("✅ Tool call ended:", data);

                setMessages((prev) => {
                  return prev.map((msg) => {
                    if (msg.id === placeholderId && msg.role === "assistant") {
                      const toolEvents = [...(msg.toolEvents || [])];
                      if (currentToolEventIndex !== null && toolEvents[currentToolEventIndex]) {
                        toolEvents[currentToolEventIndex] = {
                          status: data.status || "Tool call ended.",
                          isLoading: false,
                          success: data.success !== undefined ? data.success : false,
                          tool: data.tool || "",
                          tool_result: data.tool_result || {},
                        };
                        console.log("✅ Updated tool event:", toolEvents[currentToolEventIndex]);
                      }
                      return { ...msg, toolEvents };
                    }
                    return msg;
                  });
                });
                currentToolEventIndex = null;
              }
              // Handle start event
              else if (currentEvent === "start") {
                console.log("🚀 Stream started");
              }
              // Handle end event
              else if (currentEvent === "end") {
                console.log("🏁 Stream ended");
              }
              // Handle warning event
              else if (currentEvent === "warning") {
                const data = JSON.parse(dataStr);
                console.log("⚠️ Warning:", data);
              }
              // Handle error event
              else if (currentEvent === "error") {
                const data = JSON.parse(dataStr);
                console.error("❌ Error:", data);
                throw new Error(data.error || "Stream error");
              }
            } catch (e) {
              console.error("❌ Error parsing SSE data:", e, "Data:", dataStr);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== placeholderId).concat([
            { role: "system", content: `Error: ${error.message || "Failed to generate response."}` },
          ])
        );
      }
    } finally {
      setIsLoading(false);
      // Mark streaming as complete
      setMessages((prev) => {
        console.log("🏁 Final messages:", prev);
        return prev.map((msg) => {
          if (msg.id === placeholderId) {
            return { ...msg, isStreaming: false, isThinking: false };
          }
          return msg;
        });
      });
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const clearMessages = () => setMessages([]);

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    addUserMessage,
    setHistory,
    clearMessages,
  };
}