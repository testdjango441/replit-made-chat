import { useState, useRef, useEffect } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, Paperclip, Loader2, StopCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, input_files?: string[]) => void;
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
  const {
    uploading,
    uploadedFiles,
    error: uploadError,
    uploadFile,
    removeFile,
    resetFiles,
  } = useFileUpload();
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
    const input_files = uploadedFiles.map((f) => f.s3_uri);
    onSend(input, input_files.length > 0 ? input_files : undefined);
    setInput("");
    resetFiles();
    if (textareaRef.current) textareaRef.current.style.height = "inherit";
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadFile(file);
      } catch {}
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-3xl mx-auto p-4 relative">
      {/* Uploaded files pills - now above the input */}
      {uploadedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploadedFiles.map((file) => (
            <Badge
              key={file.s3_uri}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1.5 py-1.5 px-3"
            >
              <span className="truncate max-w-[200px] text-sm">
                {file.filename}
              </span>
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => removeFile(file.s3_uri)}
                tabIndex={-1}
                aria-label={`Remove ${file.filename}`}
                style={{ background: "none", border: "none", padding: 0 }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-background border rounded-xl shadow-lg shadow-black/5 dark:shadow-white/5 p-3 focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-primary transition-all duration-200">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg"
          disabled={disabled || isLoading || uploading}
          type="button"
          onClick={handleFileButtonClick}
        >
          <Paperclip className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={disabled || isLoading || uploading}
        />

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
                : "bg-muted text-muted-foreground hover:bg-muted"
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
      {uploadError && (
        <div className="text-center mt-2 text-xs text-destructive">
          {uploadError}
        </div>
      )}
      <div className="text-center mt-2 text-xs text-muted-foreground">
        Tailfin AI can make mistakes. Consider checking important information.
      </div>
    </div>
  );
}