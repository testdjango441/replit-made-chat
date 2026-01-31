import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useChatSessions, useDeleteSession, useCreateSession } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquarePlus, 
  LogOut, 
  Trash2, 
  MessageSquare, 
  PanelLeftClose, 
  PanelLeft,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ currentSessionId, onSessionSelect, onNewChat, isOpen, toggleSidebar }: SidebarProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { data: sessions, isLoading } = useChatSessions();
  const deleteSession = useDeleteSession();
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      deleteSession.mutate(id);
      if (currentSessionId === id) {
        onNewChat(); // Reset if deleting active
      }
    }
  };

  if (!isOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-4 border-r w-16 bg-muted/30 h-screen">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-4">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand Sidebar</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onNewChat}>
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New Chat</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-40 flex flex-col h-full bg-card border-r w-72 transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
      !isOpen && "-translate-x-full"
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="font-display text-lg">AI Chat</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:block hidden">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          onClick={onNewChat} 
          className="w-full justify-start gap-2 shadow-sm hover:shadow transition-all bg-primary/90 hover:bg-primary"
          size="lg"
        >
          <MessageSquarePlus className="h-5 w-5" />
          New Chat
        </Button>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1 px-3">
        {isAuthenticated ? (
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground px-2 py-2 mb-1 uppercase tracking-wider">
              Recents
            </h3>
            {isLoading ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-9 bg-muted/50 rounded-md animate-pulse" />
                ))}
              </div>
            ) : sessions?.length === 0 ? (
              <div className="text-sm text-muted-foreground px-4 py-8 text-center">
                No history yet.
              </div>
            ) : (
              sessions?.map((session) => (
                <div
                  key={session.session_id}
                  onClick={() => onSessionSelect(session.session_id)}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all border border-transparent",
                    currentSessionId === session.session_id 
                      ? "bg-secondary text-secondary-foreground font-medium shadow-sm border-border/50" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate flex-1">
                    {session.title || "New Chat"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                    onClick={(e) => handleDelete(e, session.session_id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground bg-muted/20 m-2 rounded-xl border border-dashed">
            <p className="mb-3">Sign in to save your chat history and continue conversations later.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/login'}>
              Log In to Save History
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* User Footer */}
      <div className="p-4 border-t bg-muted/10">
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium shadow-md">
              {user?.firstName?.[0] || user?.email?.[0] || <User className="h-4 w-4"/>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log Out</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Button 
            className="w-full" 
            variant="default"
            onClick={() => window.location.href = '/api/login'}
          >
            Log In / Sign Up
          </Button>
        )}
      </div>
    </div>
  );
}
