import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ModeToggle } from "./ModeToggle";
import { SettingsDialog } from "./SettingsDialog";
import { useChat } from "@/context/ChatContext";
import { Button } from "@/components/ui/button";
import { Home, PlusCircle, Search, Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { createNewConversation, settings, toggleWebSearch } = useChat();
  const location = useLocation();
  
  return (
    <header className={cn(
      "flex items-center justify-between p-4 border-b backdrop-blur-sm bg-background/80 sticky top-0 z-10",
      className
    )}>
      <div className="flex items-center space-x-2">
        <Logo />
        <h1 className="text-xl font-semibold tracking-tight">NEURA AI ASSISTANT</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        {location.pathname !== "/" && (
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Go to homepage"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link to="/">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex"
          onClick={() => createNewConversation()}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Chat
        </Button>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleWebSearch}
                aria-label="Toggle web search"
                className={settings.webSearchEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"}
              >
                <Globe className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{settings.webSearchEnabled ? "Disable web search" : "Enable web search"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <ModeToggle />
        <SettingsDialog />
      </div>
    </header>
  );
}
