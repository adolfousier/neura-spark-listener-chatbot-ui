import { useState } from "react";
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
import { Settings } from 'lucide-react'; 
import { getTemplateClass, getDefaultSettings, getDefaultArenaSettings, cn } from "@/lib/utils";
import { useEffect } from "react"; 
import { Provider, Template, Settings as SettingsType } from '@/types';

export function SettingsDialog({ arenaMode }: { arenaMode: boolean }) {
  const { settings, setSettings, updateTheme } = useChat(); 
  const [open, setOpen] = useState(false);

  // Initialize localSettings based on arenaMode and ensure deep copy
  const [localSettings, setLocalSettings] = useState<SettingsType>(() => {
    if (arenaMode) {
      const defaultArena = getDefaultArenaSettings();
      const defaultSingle = getDefaultSettings();
      return {
        ...defaultArena,
        ...settings,
        providerA: settings.providerA || defaultArena.providerA,
        modelA: settings.modelA || defaultArena.modelA,
        temperatureA: settings.temperatureA !== undefined ? settings.temperatureA : defaultArena.temperatureA,
        providerB: settings.providerB || defaultArena.providerB,
        modelB: settings.modelB || defaultArena.modelB,
        temperatureB: settings.temperatureB !== undefined ? settings.temperatureB : defaultArena.temperatureB,
        // Preserve shared settings from the main context if they exist, otherwise use defaults
        systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
        streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
        template: settings.template || defaultSingle.template,
        darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
        contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
      };
    } else {
      const defaultSingle = getDefaultSettings();
      return {
        ...defaultSingle,
        ...settings,
        provider: settings.provider || defaultSingle.provider,
        model: settings.model || defaultSingle.model,
        temperature: settings.temperature !== undefined ? settings.temperature : defaultSingle.temperature,
        systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
        streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
        template: settings.template || defaultSingle.template,
        darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
        contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
      };
    }
  });

  useEffect(() => {
    if (open) {
      // When dialog opens, re-initialize localSettings based on current global settings
      if (arenaMode) {
        const defaultArena = getDefaultArenaSettings();
        const defaultSingle = getDefaultSettings();
        setLocalSettings({
          ...defaultArena, // Start with arena defaults
          ...settings,    // Overlay current global settings (which might include some arena or single chat settings)
          // Explicitly set arena-specific fields, falling back to defaults if not in global settings
          providerA: settings.providerA || defaultArena.providerA,
          modelA: settings.modelA || defaultArena.modelA,
          temperatureA: settings.temperatureA !== undefined ? settings.temperatureA : defaultArena.temperatureA,
          providerB: settings.providerB || defaultArena.providerB,
          modelB: settings.modelB || defaultArena.modelB,
          temperatureB: settings.temperatureB !== undefined ? settings.temperatureB : defaultArena.temperatureB,
          // Preserve shared settings
          systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
          streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
          template: settings.template || defaultSingle.template,
          darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
          contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
        });
      } else {
        const defaultSingle = getDefaultSettings();
        setLocalSettings({
          ...defaultSingle, // Start with single chat defaults
          ...settings,     // Overlay current global settings
          // Explicitly set single-chat specific fields, falling back to defaults
          provider: settings.provider || defaultSingle.provider,
          model: settings.model || defaultSingle.model,
          temperature: settings.temperature !== undefined ? settings.temperature : defaultSingle.temperature,
          systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
          streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
          template: settings.template || defaultSingle.template,
          darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
          contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
        });
      }
    }
  }, [open, arenaMode, settings]); // Rerun when dialog opens, arenaMode changes, or global settings change

  const handleSave = () => {
    setSettings(localSettings);
    if (localSettings.darkMode !== settings.darkMode || localSettings.template !== settings.template) {
      updateTheme(localSettings.template, localSettings.darkMode);
    }
    setOpen(false); // Close the dialog
  };

  const renderModelOptions = (provider: Provider) => {
    switch (provider) {
      case 'neurarouter':
        return (
          <>
            <SelectItem value="google/gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>                    
            <SelectItem value="google/gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</SelectItem>
            <SelectItem value="openai/o4-mini-2025-04-16">OpenAI o4-mini</SelectItem>
            <SelectItem value="openai/gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
            <SelectItem value="openai/gpt-image-1">GPT-image-1</SelectItem>
            <SelectItem value="google/imagen-4.0-generate-preview-05-20">Imagen 4.0 (Image Generation)</SelectItem>
            <SelectItem value="google/imagen-4.0-ultra-generate-exp-05-20">Imagen 4.0 Ultra(Image Generation)</SelectItem>
            <SelectItem value="openrouter/deepseek-r1-0528:free">DeepSeek R1 0528</SelectItem>
            <SelectItem value="openrouter/nvidia/llama-3.1-nemotron-ultra-253b-v1:free">Nvidia Nemotron Ultra 256b</SelectItem>
            <SelectItem value="groq/meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</SelectItem>
            <SelectItem value="groq/meta-llama/llama-4-scout-17b-16e-instruct">LLama 4 Scout</SelectItem>
            <SelectItem value="groq/compound-beta">Groq Compound Beta Agentic Model</SelectItem>
            <SelectItem value="anthropic/claude-sonnet-4-20250514">Sonnet 4</SelectItem>
            <SelectItem value="anthropic/claude-opus-4-20250514">Opus 4</SelectItem>
            <SelectItem value="anthropic/claude-3-7-sonnet-latest">Sonnet 3.7</SelectItem>
            <SelectItem value="anthropic/claude-3-7-opus-latest">Opus 3.7</SelectItem>
            <SelectItem value="anthropic/claude-3-5-haiku-latest">Haiku 3.5</SelectItem>
          </>
        );
      case 'groq':
        return (
          <>
            <SelectItem value="compound-beta">Groq Compound Beta Agentic Model</SelectItem>
            <SelectItem value="deepseek-r1-distill-llama-70b">Deepseek R1 Distill</SelectItem>
            <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</SelectItem>
            <SelectItem value="meta-llama/llama-4-scout-17b-16e-instruct">LLama 4 Scout</SelectItem>
            <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
            <SelectItem value="llama-3-8b-fast">Llama 3 8B Fast</SelectItem>
            <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
          </>
        );
      case 'anthropic':
        return (
          <>
            <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
            <SelectItem value="claude-opus-4-20250514">Opus 4</SelectItem>
            <SelectItem value="claude-3-7-sonnet-latest">Sonnet 3.7</SelectItem>
            <SelectItem value="claude-3-7-opus-latest">Opus 3.7</SelectItem>
            <SelectItem value="claude-3-5-haiku-latest">Haiku 3.5</SelectItem>
          </>
        );
      case 'openai':
        return (
          <>
            <SelectItem value="o4-mini-2025-04-16">o4 mini</SelectItem>
            <SelectItem value="o3-2025-04-16">o3</SelectItem>
            <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
            <SelectItem value="o3-mini-2025-01-31">o3-mini</SelectItem>
            <SelectItem value="gpt-image-1">GPT-image-1</SelectItem>
          </>
        );
      case 'openrouter':
        return (
          <>
            <SelectItem value="google/gemini-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
            <SelectItem value="openai/o3-mini-2025-01-31">o3-mini</SelectItem>
            <SelectItem value="anthropic/claude-sonnet-4-20250514">Sonnet 4</SelectItem>
            <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</SelectItem>
            <SelectItem value="mistralai/mistral-large-2411">Mistral Large 2411</SelectItem>
          </>
        );
      case 'flowise':
        return <SelectItem value="default">Default Chatflow</SelectItem>;
      case 'google':
        return (
          <>
            <SelectItem value="gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
            <SelectItem value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</SelectItem>
            <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
            <SelectItem value="code-gecko">Code Gecko</SelectItem>
            <SelectItem value="imagen-3.0-generate-001">Imagen 3.0 (Image Generation)</SelectItem>
          </>
        );
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[500px]",
        arenaMode && "sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      )}>
        <DialogHeader>
          <DialogTitle>AI Assistant Settings</DialogTitle>
          <DialogDescription>
            Configure your AI assistant preferences
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {arenaMode ? (
            <div className="space-y-6">
              {/* Arena Mode: Two Column Layout for Models */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Model A Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="text-lg font-semibold text-center mb-4">Model A</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="providerA" className="text-sm font-medium">Provider</Label>
                      <Select
                        value={localSettings.providerA}
                        onValueChange={(value: Provider) =>
                          setLocalSettings({ ...localSettings, providerA: value, modelA: '' })
                        }
                      >
                        <SelectTrigger id="providerA" className="mt-1">
                          <SelectValue placeholder="Select provider A" />
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

                    <div>
                      <Label htmlFor="modelA" className="text-sm font-medium">Model</Label>
                      <Select
                        value={localSettings.modelA}
                        onValueChange={(value: string) =>
                          setLocalSettings({ ...localSettings, modelA: value })
                        }
                        disabled={!localSettings.providerA}
                      >
                        <SelectTrigger id="modelA" className="mt-1">
                          <SelectValue placeholder="Select model A" />
                        </SelectTrigger>
                        <SelectContent>
                          {renderModelOptions(localSettings.providerA)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="temperatureA" className="text-sm font-medium">
                        Temperature: {localSettings.temperatureA?.toFixed(1)}
                      </Label>
                      <Slider
                        id="temperatureA"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[localSettings.temperatureA || 0.7]}
                        onValueChange={(value) =>
                          setLocalSettings({ ...localSettings, temperatureA: value[0] })
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Model B Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="text-lg font-semibold text-center mb-4">Model B</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="providerB" className="text-sm font-medium">Provider</Label>
                      <Select
                        value={localSettings.providerB}
                        onValueChange={(value: Provider) =>
                          setLocalSettings({ ...localSettings, providerB: value, modelB: '' })
                        }
                      >
                        <SelectTrigger id="providerB" className="mt-1">
                          <SelectValue placeholder="Select provider B" />
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

                    <div>
                      <Label htmlFor="modelB" className="text-sm font-medium">Model</Label>
                      <Select
                        value={localSettings.modelB}
                        onValueChange={(value: string) =>
                          setLocalSettings({ ...localSettings, modelB: value })
                        }
                        disabled={!localSettings.providerB}
                      >
                        <SelectTrigger id="modelB" className="mt-1">
                          <SelectValue placeholder="Select model B" />
                        </SelectTrigger>
                        <SelectContent>
                          {renderModelOptions(localSettings.providerB)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="temperatureB" className="text-sm font-medium">
                        Temperature: {localSettings.temperatureB?.toFixed(1)}
                      </Label>
                      <Slider
                        id="temperatureB"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[localSettings.temperatureB || 0.7]}
                        onValueChange={(value) =>
                          setLocalSettings({ ...localSettings, temperatureB: value[0] })
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Settings Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Common Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="streaming" className="text-sm font-medium">Streaming</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="streaming"
                        checked={localSettings.streamEnabled}
                        onCheckedChange={(checked) =>
                          setLocalSettings({ ...localSettings, streamEnabled: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {localSettings.streamEnabled ? "On" : "Off"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode" className="text-sm font-medium">Dark Mode</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dark-mode"
                        checked={localSettings.darkMode}
                        onCheckedChange={(checked) =>
                          setLocalSettings({ ...localSettings, darkMode: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {localSettings.darkMode ? "On" : "Off"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="template" className="text-sm font-medium">Template</Label>
                    <Select
                      value={localSettings.template}
                      onValueChange={(value: Template) =>
                        setLocalSettings({ ...localSettings, template: value })
                      }
                    >
                      <SelectTrigger id="template" className="mt-1">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="vibrant">Vibrant</SelectItem>
                        <SelectItem value="elegant">Elegant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="context-window" className="text-sm font-medium">
                      Context Window: {localSettings.contextWindowSize}
                    </Label>
                    <Slider
                      id="context-window"
                      min={1}
                      max={10}
                      step={1}
                      value={[localSettings.contextWindowSize]}
                      onValueChange={(value) =>
                        setLocalSettings({ ...localSettings, contextWindowSize: value[0] })
                      }
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of message pairs to include in context
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="system-prompt" className="text-sm font-medium">System Prompt</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="Enter a system prompt for the AI..."
                    className="min-h-[100px] resize-y mt-1"
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
          ) : (
            <>
              {/* Single Model Settings - Original layout */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="provider" className="text-right">Provider</Label>
                <Select
                  value={localSettings.provider}
                  onValueChange={(value: Provider) =>
                    setLocalSettings({ ...localSettings, provider: value, model: '' }) 
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
                <Label htmlFor="model" className="text-right">Model</Label>
                <Select
                  value={localSettings.model}
                  onValueChange={(value: string) =>
                    setLocalSettings({ ...localSettings, model: value })
                  }
                  disabled={!localSettings.provider}
                >
                  <SelectTrigger id="model" className="col-span-3">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderModelOptions(localSettings.provider)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="temperature" className="text-right">
                  Temperature: {localSettings.temperature?.toFixed(1)} 
                </Label>
                <div className="col-span-3">
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[localSettings.temperature !== undefined ? localSettings.temperature : 0.7]} 
                    onValueChange={(value) =>
                      setLocalSettings({ ...localSettings, temperature: value[0] })
                    }
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="streaming" className="text-right">Streaming</Label>
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
                <Label htmlFor="template" className="text-right">Template</Label>
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
                <Label htmlFor="dark-mode" className="text-right">Dark Mode</Label>
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
                <Label htmlFor="context-window" className="text-right">Context Window</Label>
                <div className="col-span-3">
                  <div className="flex items-center space-x-2">
                    <Slider
                      id="context-window"
                      min={1}
                      max={10}
                      step={1}
                      value={[localSettings.contextWindowSize]}
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
                <Label htmlFor="system-prompt" className="text-right pt-2">System Prompt</Label>
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
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={() => {
              if (arenaMode) {
                const defaultSingle = getDefaultSettings();
                const defaultArena = getDefaultArenaSettings();
                setLocalSettings({
                  ...defaultSingle,
                  ...defaultArena,
                  systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
                  streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
                  template: settings.template || defaultSingle.template,
                  darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
                  contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
                  providerA: defaultArena.providerA,
                  modelA: defaultArena.modelA,
                  temperatureA: defaultArena.temperatureA,
                  providerB: defaultArena.providerB,
                  modelB: defaultArena.modelB,
                  temperatureB: defaultArena.temperatureB,
                });
              } else {
                const defaultSingle = getDefaultSettings();
                setLocalSettings({
                  ...defaultSingle,
                  systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
                  streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
                  template: settings.template || defaultSingle.template,
                  darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
                  contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
                  provider: defaultSingle.provider,
                  model: defaultSingle.model,
                  temperature: defaultSingle.temperature,
                });
              }
            }}
          >
            Reset
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}