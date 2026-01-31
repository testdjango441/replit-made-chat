import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ApiSpecViewer } from "@/components/ApiSpecViewer";
import {
  useChatStream,
  useCreateSession,
  useChatHistory,
} from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // No redirect for unauthenticated users; allow chat as guest

  const {
    messages,
    isLoading: isChatLoading,
    sendMessage,
    stopGeneration,
    addUserMessage,
    setHistory,
    clearMessages,
  } = useChatStream();

  const createSession = useCreateSession();
  const { data: history, isLoading: isHistoryLoading } =
    useChatHistory(sessionId);

  // Load history when session changes
  useEffect(() => {
    if (history && Array.isArray(history)) {
      if (history.length > 0 || messages.length === 0) {
        setHistory(history);
      }
    } else if (sessionId === null) {
      setHistory([]);
    }
  }, [history, sessionId]);

  const handleNewChat = () => {
    setSessionId(null);
    setHistory([]);
  };

  const handleSessionSelect = (id: string) => {
    setSessionId(id);
    setHistory([]);
    // History will be loaded via effect
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleSend = async (text: string) => {
    console.log("handleSend called with text:", text);
    try {
      let currentSessionId = sessionId;
      console.log(currentSessionId, "curerent seeesion");
      // Optimistically add user message
      addUserMessage(text);

      // If no session, create one first
      if (!currentSessionId) {
        console.log("No session, creating new one...");
        try {
          // Create session title from first 50 characters of message
          const sessionTitle = text.substring(0, 50) + (text.length > 50 ? "..." : "");

          // createSession.mutateAsync(title) checks localStorage for user
          const session = await createSession.mutateAsync(sessionTitle);
          currentSessionId = session.session_id;
          setSessionId(currentSessionId);
          console.log("Session created:", currentSessionId);
        } catch (error) {
          console.error("Failed to create session", error);
          return;
        }
      }

      // Always pass latest user to sendMessage
      console.log("Calling sendMessage with:", text, currentSessionId);
      await sendMessage(text, currentSessionId!);
      console.log("sendMessage completed");
    } catch (error) {
      console.error("Error in handleSend:", error);
    }
  };

  // if (isLoading) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <Loader2 className="h-6 w-6 animate-spin" />
  //     </div>
  //   );
  // }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        currentSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        clearMessages={clearMessages}
      />

      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="ml-2 font-semibold">Tailfin AI</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">
                Welcome to Tailfin AI
              </h2>
              <p className="text-muted-foreground max-w-md">
                I'm here to help you with questions, analysis, code, and more.
                Start a new conversation to begin.
              </p>
            </div>
          ) : (
            <div className="flex flex-col pb-4">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                  isThinking={msg.isThinking}
                  toolEvents={msg.toolEvents}
                />
              ))}
              <div className="h-4" /> {/* Spacer */}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-gradient-to-t from-background via-background to-transparent pt-10">
          <form onSubmit={(e) => e.preventDefault()}>
            <ChatInput
              onSend={handleSend}
              isLoading={isChatLoading}
              onStop={stopGeneration}
            />
          </form>
        </div>
      </main>
    </div>
  );
}
