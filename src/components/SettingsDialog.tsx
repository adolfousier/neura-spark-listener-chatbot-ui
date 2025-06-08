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
                <SelectItem value="neurarouter">Neura Router</SelectItem>
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
                    <SelectItem value="compound-beta">Groq Compound Beta Agentic Model</SelectItem>
                    <SelectItem value="deepseek-r1-distill-llama-70b">Deepseek R1 Distill</SelectItem>
                    <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</SelectItem>
                    <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">LLama 4 Scout</SelectItem>
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                    <SelectItem value="llama-3-8b-fast">Llama 3 8B Fast</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                  </>
                )}
                {/* Add Neura models here */}
                {localSettings.provider === 'neurarouter' && (
                  <>
                    <SelectItem value="gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="openai/o4-mini-2025-04-16">OpenAI o4-mini</SelectItem>                    
                    <SelectItem value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="openrouter/deepseek-r1-0528:free">DeepSeek R1 0528 (SpecDec)</SelectItem>
                    <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</SelectItem>
                    <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">LLama 4 Scout</SelectItem>
                    <SelectItem value="openrouter/nvidia/llama-3.1-nemotron-ultra-253b-v1:free">Nvidia Nemotron Ultra 256b</SelectItem>
                    <SelectItem value="compound-beta">Groq Compound Beta Agentic Model</SelectItem>
                  </>
                )}
                {localSettings.provider === 'claude' && (
                  <>
                    <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                    <SelectItem value="claude-opus-4-20250514">Opus 4</SelectItem>
                    <SelectItem value="claude-3-5-haiku-latest">Haiku 3.5</SelectItem>
                  </>
                )}
                {localSettings.provider === 'openai' && (
                  <>
                    <SelectItem value="o4-mini-2025-04-16">o4 mini</SelectItem>
                    <SelectItem value="o3-2025-04-16">o3</SelectItem>
                    <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                    <SelectItem value="o3-mini-2025-01-31">o3-mini</SelectItem>
                    <SelectItem value="gpt-image-1">GPT-image-1</SelectItem>
                  </>
                )}
                {localSettings.provider === 'openrouter' && (
                  <>
                    <SelectItem value="google/gemini-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="openai/o3-mini-2025-01-31">o3-mini</SelectItem>
                    <SelectItem value="anthropic/claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                    <SelectItem value="meta-llama/llama-3-70b-instruct">Llama 3 70B</SelectItem>
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
                    <SelectItem value="gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>                  
                    <SelectItem value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
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