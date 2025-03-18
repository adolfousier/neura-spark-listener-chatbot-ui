
import { useCallback, useMemo } from "react";
import { useChat } from "@/context/ChatContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDate, truncate } from "@/lib/utils";
import { MessageCircle, PlusCircle, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SidebarConversations() {
  const { 
    conversations, 
    currentConversationId, 
    createNewConversation, 
    selectConversation, 
    deleteConversation,
    clearConversations 
  } = useChat();

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }, [conversations]);

  const handleConversationClick = useCallback((id: string) => {
    selectConversation(id);
  }, [selectConversation]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button 
          onClick={() => createNewConversation()} 
          className="w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>
      
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 py-2">
          {sortedConversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant={conversation.id === currentConversationId ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-left font-normal transition-all",
                conversation.id === currentConversationId 
                  ? "bg-secondary" 
                  : "hover:bg-secondary/50"
              )}
              onClick={() => handleConversationClick(conversation.id)}
            >
              <div className="flex items-center w-full">
                <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
                <div className="overflow-hidden flex-1">
                  <div className="truncate">{truncate(conversation.title, 25)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(conversation.updatedAt)}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 mt-auto border-t">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all your conversations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearConversations}>
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
