import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Wrench, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

interface ToolEvent {
  status: string;
  isLoading?: boolean;
  success?: boolean;
  tool?: string;
  tool_result?: any;
}

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content?: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  toolEvents?: ToolEvent[];
  toolCalls?: ToolCall[]; // For completed tool calls from history
  input_files?: string[]; // S3 URIs for user uploads
  output_files?: string[]; // S3 URIs for assistant outputs
  fileMetadata?: Array<{s3_uri: string, filename: string}>; // Optional metadata with filenames
}

// Helper function to extract filename from S3 URI
const extractFilenameFromS3Uri = (s3Uri: string): string => {
  try {
    // S3 URI format: s3://bucket-name/path/to/filename.ext
    const parts = s3Uri.split('/');
    return parts[parts.length - 1] || s3Uri;
  } catch {
    return s3Uri;
  }
};

// Helper function to get filename either from metadata or S3 URI
const getFilename = (s3Uri: string, fileMetadata?: Array<{s3_uri: string, filename: string}>): string => {
  if (fileMetadata) {
    const meta = fileMetadata.find(f => f.s3_uri === s3Uri);
    if (meta) return meta.filename;
  }
  return extractFilenameFromS3Uri(s3Uri);
};

export function ChatMessage({ 
  role, 
  content, 
  isStreaming, 
  isThinking, 
  toolEvents,
  toolCalls,
  input_files,
  output_files,
  fileMetadata
}: ChatMessageProps) {
  const isUser = role === "user";
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  // Debug logging
  console.log("ChatMessage render:", { 
    role, 
    content: content?.substring(0, 50), 
    toolEvents,
    toolCalls,
    input_files,
    output_files 
  });

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

  const toggleResultExpand = (index: number) => {
    setExpandedResults(prev => {
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
            {isUser ? "You" : "Assistant"}
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 break-words">
            {isThinking ? (
              <div className="flex items-center gap-2 py-2 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">Thinking...</span>
              </div>
            ) : (
              <>
                {/* Input Files (User Uploads) */}
                {input_files && input_files.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2 not-prose">
                    {input_files.map((s3Uri, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-200"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="text-sm">{getFilename(s3Uri, fileMetadata)}</span>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Output Files (Assistant Generated) */}
                {output_files && output_files.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2 not-prose">
                    {output_files.map((s3Uri, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1.5 py-1.5 px-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="text-sm">{getFilename(s3Uri, fileMetadata)}</span>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tool Calls from History (Completed) */}
                {toolCalls && toolCalls.length > 0 && (
                  <div className="mb-4 space-y-2 not-prose">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3 h-3" />
                      Tools Used
                    </div>
                    {toolCalls.map((toolCall, index) => (
                      <motion.div
                        key={toolCall.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors",
                            "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50 text-purple-800 dark:text-purple-200",
                            Object.keys(toolCall.args).length > 0 && "cursor-pointer"
                          )}
                          onClick={() => {
                            if (Object.keys(toolCall.args).length > 0) {
                              toggleToolExpand(index);
                            }
                          }}
                        >
                          {/* Tool Icon */}
                          <div className="shrink-0">
                            <Wrench className="w-3.5 h-3.5" />
                          </div>

                          {/* Tool Name */}
                          <div className="flex-1">
                            <span className="font-medium">{toolCall.name}</span>
                          </div>

                          {/* Expand/Collapse Icon */}
                          {Object.keys(toolCall.args).length > 0 && (
                            <div className="shrink-0">
                              {expandedTools.has(index) ? (
                                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Tool Arguments */}
                        <AnimatePresence>
                          {expandedTools.has(index) && Object.keys(toolCall.args).length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
                                <div className="text-xs font-medium text-muted-foreground mb-1.5">Arguments:</div>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-foreground">
                                  {JSON.stringify(toolCall.args, null, 2)}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Real-time Tool Events (Streaming) */}
                {toolEvents && toolEvents.length > 0 && (
                  <div className="mb-4 space-y-2 not-prose">
                    {toolEvents.map((toolEvent, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
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
                              toggleResultExpand(index);
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

                          {/* Status Text with Tool Name */}
                          <div className="flex-1">
                            <div className="font-medium">{toolEvent.status}</div>
                            {toolEvent.tool && (
                              <div className="text-xs opacity-70 mt-0.5">
                                {toolEvent.tool}
                              </div>
                            )}
                          </div>

                          {/* Expand/Collapse Icon */}
                          {toolEvent.tool_result && Object.keys(toolEvent.tool_result).length > 0 && (
                            <div className="shrink-0">
                              {expandedResults.has(index) ? (
                                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Tool Result */}
                        <AnimatePresence>
                          {expandedResults.has(index) && toolEvent.tool_result && Object.keys(toolEvent.tool_result).length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
                                <div className="text-xs font-medium text-muted-foreground mb-1.5">Result:</div>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-foreground">
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

                {/* Markdown Content */}
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