import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";
  
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
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                code: ({node, className, children, ...props}) => {
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
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 align-middle ml-1 bg-primary animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
