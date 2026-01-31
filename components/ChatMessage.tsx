import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ToolEvent {
  status: string;
  isLoading?: boolean;
  success?: boolean;
  tool_result?: any;
}

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content?: string;
  isStreaming?: boolean;
  isThinking?: boolean; // Add this
  toolEvents?: ToolEvent[];
}

export function ChatMessage({ role, content, isStreaming, isThinking, toolEvents }: ChatMessageProps) {
  const isUser = role === "user";
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  // Debug logging
  console.log("ChatMessage render:", { role, content: content?.substring(0, 50), toolEvents });

  const toggleToolExpand = (index: number) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group w-full text-foreground border-b border-black/5 dark:border-white/5 last:border-0",
        isUser ? "bg-background" : "bg-muted/30"
      )}
    >
      <div className="max-w-3xl mx-auto p-4 md:py-6 flex gap-4 md:gap-6">
        <div className={cn(
          "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 shadow-sm mt-1",
          isUser
            ? "bg-secondary"
            : "bg-primary text-primary-foreground"
        )}>
          {isUser ? <User className="w-5 h-5 opacity-70" /> : <Bot className="w-5 h-5" />}
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="font-semibold text-sm mb-1 opacity-90">
            {isUser ? "You" : "Tailfin AI"}
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 break-words">
            {isThinking ? (
              // Show "Thinking..." when waiting for first chunk
              <div className="flex items-center gap-2 py-2 text-muted-foreground">
                <span className="text-sm italic">Thinking...</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : (
              <>
                {/* Inline Tool Events - Display after content */}
                {toolEvents && toolEvents.length > 0 && !isThinking && (
                  <div className="mt-4 space-y-2">
                    {toolEvents.map((toolEvent, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden text-black"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors",
                            toolEvent.isLoading
                              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-200"
                              : toolEvent.success
                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200"
                                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200",
                            toolEvent.tool_result && Object.keys(toolEvent.tool_result).length > 0 && "cursor-pointer"
                          )}
                          onClick={() => {
                            if (toolEvent.tool_result && Object.keys(toolEvent.tool_result).length > 0) {
                              toggleToolExpand(index);
                            }
                          }}
                        >
                          {/* Status Icon */}
                          <div className="shrink-0">
                            {toolEvent.isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : toolEvent.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Status Text */}
                          <div className="flex-1 font-medium">
                            {toolEvent.status}
                          </div>

                          {/* Expand/Collapse Icon */}
                          {toolEvent.tool_result && Object.keys(toolEvent.tool_result).length > 0 && (
                            <div className="shrink-0">
                              {expandedTools.has(index) ? (
                                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Tool Result */}
                        <AnimatePresence>
                          {expandedTools.has(index) && toolEvent.tool_result && Object.keys(toolEvent.tool_result).length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(toolEvent.tool_result, null, 2)}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: ({ node, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '')
                      return !className?.includes('language-') ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {content || ""}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 align-middle ml-1 bg-primary animate-pulse" />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}