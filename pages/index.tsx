import { useState, useEffect, useRef } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && shouldScrollRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Detect if user scrolls up manually
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldScrollRef.current = isNearBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Load history when session changes
  useEffect(() => {
    if (history && Array.isArray(history)) {
      console.log("📚 Loading chat history:", history);
      if (history.length > 0 || messages.length === 0) {
        setHistory(history);
        // Scroll to bottom when history loads
        shouldScrollRef.current = true;
      }
    } else if (sessionId === null) {
      setHistory([]);
    }
  }, [history, sessionId]);

  const handleNewChat = () => {
    console.log("🆕 Starting new chat");
    setSessionId(null);
    clearMessages();
  };

  const handleSessionSelect = (id: string) => {
    console.log("📂 Selecting session:", id);
    setSessionId(id);
    clearMessages();
    // History will be loaded via effect
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleSend = async (text: string, input_files?: string[], fileMetadata?: Array<{s3_uri: string, filename: string}>) => {
    console.log("📤 handleSend called with text:", text, "files:", input_files, "metadata:", fileMetadata);
    try {
      let currentSessionId = sessionId;
      console.log("Current session ID:", currentSessionId);
      
      // Optimistically add user message with file metadata
      addUserMessage(text, input_files, fileMetadata);
      
      // Enable auto-scroll for new messages
      shouldScrollRef.current = true;

      // If no session, create one first
      if (!currentSessionId) {
        console.log("📝 No session, creating new one...");
        try {
          // Create session title from first 50 characters of message
          const sessionTitle = text.substring(0, 50) + (text.length > 50 ? "..." : "");
          
          const session = await createSession.mutateAsync(sessionTitle);
          currentSessionId = session.session_id;
          setSessionId(currentSessionId);
          console.log("✅ Session created:", currentSessionId);
        } catch (error) {
          console.error("❌ Failed to create session", error);
          return;
        }
      }

      console.log("🚀 Calling sendMessage with session:", currentSessionId);
      await sendMessage(text, currentSessionId!, input_files, fileMetadata);
      console.log("✅ sendMessage completed");
    } catch (error) {
      console.error("❌ Error in handleSend:", error);
    }
  };

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
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar flex flex-col"
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">
                Welcome to Tailfin AI
              </h2>
              <p className="text-muted-foreground max-w-md">
                {user 
                  ? `Hey ${user.name || user.email}! I'm here to help you with questions, analysis, code, and more.`
                  : "I'm here to help you with questions, analysis, code, and more. You're chatting as a guest - sign in to save your conversations."
                }
              </p>
            </div>
          ) : (
            <div className="flex flex-col pb-4">
              {messages.map((msg, i) => {
                console.log("Rendering message:", i, msg);
                return (
                  <ChatMessage
                    key={msg.id || i}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={msg.isStreaming}
                    isThinking={msg.isThinking}
                    toolEvents={msg.toolEvents}
                    toolCalls={msg.tool_calls} // Pass tool_calls from history
                    input_files={msg.input_files} // Pass input files
                    output_files={msg.output_files} // Pass output files
                    fileMetadata={msg.fileMetadata} // Pass file metadata
                  />
                );
              })}
              <div ref={messagesEndRef} className="h-4" /> {/* Scroll anchor */}
            </div>
          )}
          
          {/* Loading indicator for history */}
          {isHistoryLoading && messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading conversation...</span>
              </div>
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