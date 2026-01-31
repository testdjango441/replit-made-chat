import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Paperclip, Loader2, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading,
  onStop,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "inherit";
  };

  return (
    <div className="max-w-3xl mx-auto p-4 relative">
      <div className="relative flex items-end gap-2 bg-background border rounded-xl shadow-lg shadow-black/5 dark:shadow-white/5 p-3 focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary transition-all duration-200">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg"
          disabled={disabled || isLoading}
          type="button"
        >
          <Paperclip className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Tailfin AI..."
          className="min-h-[24px] max-h-[200px] w-full resize-none border-0 bg-transparent p-1.5 focus-visible:ring-0 shadow-none text-base custom-scrollbar"
          rows={1}
          disabled={disabled}
        />

        {isLoading ? (
          <Button
            onClick={onStop}
            size="icon"
            className="shrink-0 rounded-lg h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90"
            type="button"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            size="icon"
            className={cn(
              "shrink-0 rounded-lg h-9 w-9 transition-all duration-200",
              input.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted",
            )}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      <div className="text-center mt-2 text-xs text-muted-foreground">
        Tailfin AI can make mistakes. Consider checking important information.
      </div>
    </div>
  );
}
