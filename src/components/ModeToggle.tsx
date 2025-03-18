
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";

export function ModeToggle() {
  const { settings, updateTheme } = useChat();
  const { toast } = useToast();
  
  const toggleDarkMode = () => {
    const newDarkMode = !settings.darkMode;
    // Explicitly pass the current template to ensure it is maintained
    updateTheme(settings.template, newDarkMode);
    
    toast({
      title: newDarkMode ? "Dark Mode Enabled" : "Light Mode Enabled",
      description: `Theme has been updated.`,
    });
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      aria-label="Toggle dark mode"
    >
      {settings.darkMode ? (
        <Moon className="h-5 w-5 transition-all" />
      ) : (
        <Sun className="h-5 w-5 transition-all" />
      )}
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}
