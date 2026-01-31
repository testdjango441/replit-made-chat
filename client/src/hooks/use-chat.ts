import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type ChatSession, type ChatMessage } from "@shared/schema";
import { useRef, useState } from "react";
import { useAuth } from "./use-auth";

// Hook for fetching chat sessions list
export function useChatSessions() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [api.chatSession.list.path, user?.id],
    queryFn: async () => {
      const res = await fetch(api.chatSession.list.path, {
        method: api.chatSession.list.method,
        headers: { "Content-Type": "application/json" },
        // If not logged in, we might rely on client-stored ID or session cookie, 
        // but for list we generally expect a user. 
        // We'll pass user_id if available or a placeholder if backend handles it via cookie.
        body: JSON.stringify({ 
          user_id: user?.id || 0, // 0 or specific logic for guest if backend supports
          page: 1, 
          page_size: 50 
        }), 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return api.chatSession.list.responses[200].parse(await res.json());
    },
    enabled: !!user, // Only fetch list if user is logged in
  });
}

// Hook for creating a new session
export function useCreateSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (user) {
        // Authenticated creation
        const res = await fetch(api.chatSession.create.path, {
          method: api.chatSession.create.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: parseInt(user.id), user_email: user.email }),
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to create session");
        return api.chatSession.create.responses[200].parse(await res.json());
      } else {
        // No-auth creation
        const res = await fetch(api.chatSession.createNoAuth.path, {
          method: api.chatSession.createNoAuth.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to create guest session");
        return api.chatSession.createNoAuth.responses[201].parse(await res.json());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chatSession.list.path] });
    }
  });
}

// Hook for fetching messages for a specific session
export function useChatHistory(sessionId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [api.chatHistory.list.path, sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const res = await fetch(api.chatHistory.list.path, {
        method: api.chatHistory.list.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_id: sessionId,
          user_id: user?.id ? parseInt(user.id) : undefined,
          page: 1,
          page_size: 100
        }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      return await res.json(); // Schema returns any[] for now
    },
    enabled: !!sessionId,
  });
}

// Hook for deleting a session
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(api.chatSession.delete.path, {
        method: api.chatSession.delete.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_id: sessionId,
          user_id: user?.id ? parseInt(user.id) : 0 
        }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chatSession.list.path] });
    }
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
    setMessages(prev => [...prev, { role: "user", content, created_at: new Date().toISOString() }]);
  };

  const setHistory = (history: any[]) => {
    // Reverse if needed based on API order, assuming API returns newest first? 
    // Usually chat APIs return oldest first or we sort. Let's assume consistent order.
    // If api returns list, we just set it.
    // Ensure we don't overwrite if we have active state, but usually we load history on session switch.
    setMessages(history);
  };

  const sendMessage = async (message: string, sessionId: string) => {
    setIsLoading(true);
    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);
    
    abortControllerRef.current = new AbortController();

    try {
      const endpoint = user 
        ? api.chat.authenticated.path 
        : api.chat.unauthenticated.path;
      
      const payload = user 
        ? { user_message: message, session_id: sessionId, user_email: user.email }
        : { user_message: message, session_id: sessionId };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
        credentials: "include"
      });

      if (!response.ok) throw new Error("Stream connection failed");
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
            // Check for event type if present (e.g., "event: chunk")
            // The provided spec implies JSON lines or SSE format. 
            // "yield {'event': 'chunk', 'data': json.dumps({'chunk': token})}" implies SSE format
            // SSE format:
            // event: chunk
            // data: {"chunk": "Hello"}
            
            // We need a simple parser for this custom stream format or standard SSE
            // Let's assume standard SSE structure in the text stream
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              
              // Handle data based on previous event or structure
              // But strictly SSE usually sends event line then data line
              // If the backend yields raw JSON objects per line, we parse that.
              // If it yields "event: ... \n data: ...", we need state machine.
              
              // Simplified handling assuming the line is the data payload or we check `event` separately
              if (data.chunk) {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last.role === "assistant" && last.isStreaming) {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: last.content + data.chunk }
                    ];
                  }
                  return prev;
                });
              }
            } 
            // Handle raw JSON if backend sends just JSON lines
            else if (line.startsWith("{")) {
               const data = JSON.parse(line);
               if (data.event === "chunk" && data.data) {
                 const innerData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                 const token = innerData.chunk;
                 setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last.role === "assistant" && last.isStreaming) {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: last.content + token }
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
      if (error.name !== 'AbortError') {
        console.error("Stream error:", error);
        setMessages(prev => [...prev, { role: "system", content: "Error: Failed to generate response." }]);
      }
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.isStreaming) {
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

  return { messages, isLoading, sendMessage, stopGeneration, addUserMessage, setHistory };
}
