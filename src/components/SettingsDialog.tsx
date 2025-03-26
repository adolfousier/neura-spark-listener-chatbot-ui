import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/context/ChatContext";
import { Provider, Template } from "@/types";
import { getTemplateClass } from "@/lib/utils";

export function SettingsDialog() {
  const { settings, setSettings, updateTheme } = useChat();
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState({ ...settings });
  
  const handleSave = () => {
    setSettings(localSettings);
    updateTheme(localSettings.template, localSettings.darkMode);
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Assistant Settings</DialogTitle>
          <DialogDescription>
            Configure your AI assistant preferences
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="provider" className="text-right">
              Provider
            </Label>
            <Select
              value={localSettings.provider}
              onValueChange={(value: Provider) =>
                setLocalSettings({ ...localSettings, provider: value })
              }
            >
              <SelectTrigger id="provider" className="col-span-3">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="groq">Groq</SelectItem>
                <SelectItem value="neura">Neura Router</SelectItem>
                <SelectItem value="openrouter">Open Router</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="flowise">Flowise</SelectItem>
                <SelectItem value="claude">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model
            </Label>
            <Select
              value={localSettings.model}
              onValueChange={(value: string) =>
                setLocalSettings({ ...localSettings, model: value })
              }
            >
              <SelectTrigger id="model" className="col-span-3">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {localSettings.provider === 'groq' && (
                  <>
                    <SelectItem value="deepseek-r1-distill-llama-70b">Deepseek R1 Distill</SelectItem>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                    <SelectItem value="llama-3-8b-fast">Llama 3 8B Fast</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                  </>
                )}
                {/* Add Neura models here */}
                {localSettings.provider === 'neura' && (
                  <>
                    <SelectItem value="allam-2-7b">Allam 2.7B</SelectItem>
                    <SelectItem value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill Llama 70B</SelectItem>
                    <SelectItem value="deepseek-r1-distill-llama-70b-specdec">DeepSeek R1 Distill Llama 70B (SpecDec)</SelectItem>
                    <SelectItem value="deepseek-r1-distill-qwen-32b">DeepSeek R1 Distill Qwen 32B</SelectItem>
                    <SelectItem value="gemma2-9b-it">Gemini 2.0 Flash</SelectItem>
                    <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                    <SelectItem value="llama-3.3-70b-specdec">Llama 3.3 70B SpecDec</SelectItem>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</SelectItem>
                  </>
                )}
                {localSettings.provider === 'claude' && (
                  <>
                    <SelectItem value="claude-3-5-opus-latest">Claude 3.5 Opus</SelectItem>
                    <SelectItem value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</SelectItem>
                    <SelectItem value="claude-3-5-haiku-latest">Claude 3.5 Haiku</SelectItem>
                  </>
                )}
                {localSettings.provider === 'openai' && (
                  <>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </>
                )}
                {localSettings.provider === 'openrouter' && (
                  <>
                    <SelectItem value="openai/o3-mini">OpenAI o3-mini</SelectItem>
                    <SelectItem value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</SelectItem>
                    <SelectItem value="meta-llama/llama-3-70b-instruct">Llama 3 70B</SelectItem>
                    <SelectItem value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</SelectItem>
                    <SelectItem value="mistralai/mistral-large-2411">Mistral Large 2411</SelectItem>
                  </>
                )}
                {localSettings.provider === 'flowise' && (
                  <>
                    <SelectItem value="default">Default Chatflow</SelectItem>
                  </>
                )}
                {localSettings.provider === 'google' && (
                  <>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                    <SelectItem value="code-gecko">Code Gecko</SelectItem>
                    <SelectItem value="imagen-3.0-generate-001">Imagen 3.0 (Image Generation)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="temperature" className="text-right">
              Temperature: {localSettings.temperature.toFixed(1)}
            </Label>
            <div className="col-span-3">
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                defaultValue={[localSettings.temperature]}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, temperature: value[0] })
                }
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="streaming" className="text-right">
              Streaming
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="streaming"
                checked={localSettings.streamEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, streamEnabled: checked })
                }
              />
              <Label htmlFor="streaming">
                {localSettings.streamEnabled ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="template" className="text-right">
              Template
            </Label>
            <Select
              value={localSettings.template}
              onValueChange={(value: Template) =>
                setLocalSettings({ ...localSettings, template: value })
              }
            >
              <SelectTrigger id="template" className="col-span-3">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="vibrant">Vibrant</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dark-mode" className="text-right">
              Dark Mode
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="dark-mode"
                checked={localSettings.darkMode}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, darkMode: checked })
                }
              />
              <Label htmlFor="dark-mode">
                {localSettings.darkMode ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="context-window" className="text-right">
              Context Window
            </Label>
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Slider
                  id="context-window"
                  min={1}
                  max={10}
                  step={1}
                  defaultValue={[localSettings.contextWindowSize]}
                  onValueChange={(value) =>
                    setLocalSettings({ ...localSettings, contextWindowSize: value[0] })
                  }
                />
                <span className="w-8 text-center">{localSettings.contextWindowSize}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Number of message pairs to include in context
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="system-prompt" className="text-right pt-2">
              System Prompt
            </Label>
            <div className="col-span-3">
              <Textarea
                id="system-prompt"
                placeholder="Enter a system prompt for the AI..."
                className="min-h-[100px] resize-y"
                value={localSettings.systemPrompt}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, systemPrompt: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Define instructions for the AI to follow in all conversations
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={() => setLocalSettings({...settings})}
          >
            Reset
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
