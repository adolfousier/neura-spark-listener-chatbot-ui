import { useChat } from "@/context/ChatContext";
import { Template } from "@/types";

type ThemeInfo = {
  template: Template;
  darkMode: boolean;
};

/**
 * Custom hook to access the current theme information from the ChatContext
 * @returns Object containing the current template and darkMode state
 */
export function useTheme(): ThemeInfo {
  const { settings } = useChat();
  
  return {
    template: settings.template,
    darkMode: settings.darkMode
  };
}