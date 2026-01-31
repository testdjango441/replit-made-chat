import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useAuth } from "./use-auth";

const backendUrl = "https://b2966c6366f4.ngrok-free.app";

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

type ChatMessage = {
  session_id: string;
  created_at: string;
  message_id: string;
  role: "user" | "assistant";
  content: string;
  input_files?: string[];
  output_files?: string[];
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (user) {
        const res = await fetch(
          `${backendUrl}/api/chat-session/create/`,
          getFetchOptions(
            "POST",
            getHeaders(true, true),
            JSON.stringify({ user_email: user.email, title: "New Chat" }),
          ),
        );
        if (!res.ok) throw new Error("Failed to create session");
        return res.json();
      } else {
        const res = await fetch(
          `${backendUrl}/api/chat-session/create/noauth/`,
          getFetchOptions("POST", getHeaders(false, false)),
        );
        if (!res.ok) throw new Error("Failed to create guest session");
        return res.json();
      }
    },
  });
}

// Hook for fetching messages for a specific session
export function useChatHistory(sessionId?: string | null) {
  const { user } = useAuth();

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
      return res.json();
    },
    enabled: !!sessionId && !!user, // Only fetch for authenticated users
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

  // Helper to add a user message locally immediately
  const addUserMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content, created_at: new Date().toISOString() },
    ]);
  };

  const setHistory = (history: any[]) => {
    setMessages(history);
  };

  const sendMessage = async (message: string, sessionId: string) => {
    setIsLoading(true);
    // Add placeholder for assistant response
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      const endpoint = user
        ? `${backendUrl}/api/chat/authenticated/`
        : `${backendUrl}/api/chat/unauthenticated/`;

      const payload = user
        ? {
            user_message: message,
            session_id: sessionId,
            user_email: user.email,
          }
        : { user_message: message, session_id: sessionId };

      console.log("Chat request:", {
        endpoint,
        isAuthenticated: !!user,
        payload,
        headers: getHeaders(true, !!user),
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

      console.log(
        "Chat response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok)
        throw new Error(
          `Stream connection failed: ${response.status} ${response.statusText}`,
        );
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line

        for (const line of lines) {
          if (line.trim() === "") continue;

          try {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.chunk) {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (
                    last &&
                    (last.role || "-") === "assistant" &&
                    last.isStreaming
                  ) {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: last.content + data.chunk },
                    ];
                  }
                  return prev;
                });
              }
            } else if (line.startsWith("{")) {
              const data = JSON.parse(line);
              if (data.event === "chunk" && data.data) {
                const innerData =
                  typeof data.data === "string"
                    ? JSON.parse(data.data)
                    : data.data;
                const token = innerData.chunk;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (
                    last &&
                    (last.role || "-") === "assistant" &&
                    last.isStreaming
                  ) {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: last.content + token },
                    ];
                  }
                  return prev;
                });
              }
            }
          } catch (e) {
            console.error("Error parsing stream chunk", e);
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "Error: Failed to generate response." },
        ]);
      }
    } finally {
      setIsLoading(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
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

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    addUserMessage,
    setHistory,
  };
}
