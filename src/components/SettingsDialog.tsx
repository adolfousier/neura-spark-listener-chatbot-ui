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
import { getTemplateClass, getDefaultSettings, getDefaultArenaSettings } from "@/lib/utils"; // Import helper functions
import { useEffect } from "react"; 
import { Provider, Template, Settings as SettingsType } from '@/types';

export function SettingsDialog({ arenaMode }: { arenaMode: boolean }) {
  // getDefaultSettings and getDefaultArenaSettings are now imported directly
  const { settings, setSettings, updateTheme } = useChat(); 
  const [open, setOpen] = useState(false);

  // Initialize localSettings based on arenaMode and ensure deep copy
  const [localSettings, setLocalSettings] = useState<SettingsType>(() => {
    if (arenaMode) {
      const defaultArena = getDefaultArenaSettings();
      const defaultSingle = getDefaultSettings(); // For common settings fallback
      return {
        ...defaultArena, // Start with default arena settings
        ...settings,     // Override with current global settings
        // Ensure arena-specific fields are properly initialized or taken from global if they exist
        providerA: settings.providerA || defaultArena.providerA,
        modelA: settings.modelA || defaultArena.modelA,
        temperatureA: settings.temperatureA !== undefined ? settings.temperatureA : defaultArena.temperatureA,
        providerB: settings.providerB || defaultArena.providerB,
        modelB: settings.modelB || defaultArena.modelB,
        temperatureB: settings.temperatureB !== undefined ? settings.temperatureB : defaultArena.temperatureB,
        // Preserve common settings from global settings if they exist, otherwise from default single settings
        systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
        streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
        template: settings.template || defaultSingle.template,
        darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
        contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
      };
    } else {
      const defaultSingle = getDefaultSettings();
      return {
        ...defaultSingle, // Start with default single settings
        ...settings,      // Override with current global settings
        // Ensure single-mode fields are properly initialized or taken from global
        provider: settings.provider || defaultSingle.provider,
        model: settings.model || defaultSingle.model,
        temperature: settings.temperature !== undefined ? settings.temperature : defaultSingle.temperature,
        // Preserve other settings from global settings
        systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
        streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
        template: settings.template || defaultSingle.template,
        darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
        contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
      };
    }
  });

  // Effect to reset localSettings when arenaMode prop changes, dialog opens, or global settings change
  useEffect(() => {
    if (open) {
      if (arenaMode) {
        // Start with all default single settings, then overlay arena defaults, then global settings
        setLocalSettings({
          ...getDefaultSettings(),      // Base with all common and single-mode defaults
          ...getDefaultArenaSettings(), // Overlay with arena-specific defaults
          ...settings,                // Override with current global settings (which might include arena or single specifics)
          // Explicitly ensure arena-specific fields from global or arena defaults if not in settings
          providerA: settings.providerA || getDefaultArenaSettings().providerA,
          modelA: settings.modelA || getDefaultArenaSettings().modelA,
          temperatureA: settings.temperatureA !== undefined ? settings.temperatureA : getDefaultArenaSettings().temperatureA,
          providerB: settings.providerB || getDefaultArenaSettings().providerB,
          modelB: settings.modelB || getDefaultArenaSettings().modelB,
          temperatureB: settings.temperatureB !== undefined ? settings.temperatureB : getDefaultArenaSettings().temperatureB,
        });
      } else {
        // Start with all default single settings, then overlay global settings
        setLocalSettings({
          ...getDefaultSettings(), // Base with all common and single-mode defaults
          ...settings,           // Override with current global settings
          // Explicitly ensure single-mode specific fields from global or single defaults if not in settings
          provider: settings.provider || getDefaultSettings().provider,
          model: settings.model || getDefaultSettings().model,
          temperature: settings.temperature !== undefined ? settings.temperature : getDefaultSettings().temperature,
        });
      }
    }
  }, [arenaMode, open, settings]); // Removed getDefaultSettings, getDefaultArenaSettings from deps as they are stable
  
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
          {arenaMode ? (
            <>
              {/* Model A Settings */}
              <h4 className="col-span-4 font-semibold text-center">Model A Settings</h4>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="providerA" className="text-right">
                  Provider A
                </Label>
                <Select
                  value={localSettings.providerA}
                  onValueChange={(value: Provider) =>
                    setLocalSettings({ ...localSettings, providerA: value, modelA: '' }) // Reset model when provider changes
                  }
                >
                  <SelectTrigger id="providerA" className="col-span-3">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modelA" className="text-right">
                  Model A
                </Label>
                <Select
                  value={localSettings.modelA}
                  onValueChange={(value: string) =>
                    setLocalSettings({ ...localSettings, modelA: value })
                  }
                  disabled={!localSettings.providerA}
                >
                  <SelectTrigger id="modelA" className="col-span-3">
                    <SelectValue placeholder="Select model A" />
                  </SelectTrigger>
                  <SelectContent>
                    {localSettings.providerA === 'groq' && (
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
                    {localSettings.providerA === 'neurarouter' && (
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
                    {localSettings.providerA === 'claude' && (
                      <>
                        <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                        <SelectItem value="claude-opus-4-20250514">Opus 4</SelectItem>
                        <SelectItem value="claude-3-5-haiku-latest">Haiku 3.5</SelectItem>
                      </>
                    )}
                    {localSettings.providerA === 'openai' && (
                      <>
                        <SelectItem value="o4-mini-2025-04-16">o4 mini</SelectItem>
                        <SelectItem value="o3-2025-04-16">o3</SelectItem>
                        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                        <SelectItem value="o3-mini-2025-01-31">o3-mini</SelectItem>
                        <SelectItem value="gpt-image-1">GPT-image-1</SelectItem>
                      </>
                    )}
                    {localSettings.providerA === 'openrouter' && (
                      <>
                        <SelectItem value="google/gemini-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="openai/o3-mini-2025-01-31">o3-mini</SelectItem>
                        <SelectItem value="anthropic/claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                        <SelectItem value="meta-llama/llama-3-70b-instruct">Llama 3 70B</SelectItem>
                        <SelectItem value="mistralai/mistral-large-2411">Mistral Large 2411</SelectItem>
                      </>
                    )}
                    {localSettings.providerA === 'flowise' && (
                      <>
                        <SelectItem value="default">Default Chatflow</SelectItem>
                      </>
                    )}
                    {localSettings.providerA === 'google' && (
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
                <Label htmlFor="temperatureA" className="text-right">
                  Temp A: {localSettings.temperatureA?.toFixed(1)}
                </Label>
                <div className="col-span-3">
                  <Slider
                    id="temperatureA"
                    min={0}
                    max={1}
                    step={0.1}
                    defaultValue={[localSettings.temperatureA || 0.7]}
                    onValueChange={(value) =>
                      setLocalSettings({ ...localSettings, temperatureA: value[0] })
                    }
                  />
                </div>
              </div>

              {/* Model B Settings */}
              <h4 className="col-span-4 font-semibold text-center pt-4">Model B Settings</h4>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="providerB" className="text-right">
                  Provider B
                </Label>
                <Select
                  value={localSettings.providerB}
                  onValueChange={(value: Provider) =>
                    setLocalSettings({ ...localSettings, providerB: value, modelB: '' }) // Reset model when provider changes
                  }
                >
                  <SelectTrigger id="providerB" className="col-span-3">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modelB" className="text-right">
                  Model B
                </Label>
                <Select
                  value={localSettings.modelB}
                  onValueChange={(value: string) =>
                    setLocalSettings({ ...localSettings, modelB: value })
                  }
                  disabled={!localSettings.providerB}
                >
                  <SelectTrigger id="modelB" className="col-span-3">
                    <SelectValue placeholder="Select model B" />
                  </SelectTrigger>
                  <SelectContent>
                    {localSettings.providerB === 'groq' && (
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
                    {localSettings.providerB === 'neurarouter' && (
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
                    {localSettings.providerB === 'claude' && (
                      <>
                        <SelectItem value="claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                        <SelectItem value="claude-opus-4-20250514">Opus 4</SelectItem>
                        <SelectItem value="claude-3-5-haiku-latest">Haiku 3.5</SelectItem>
                      </>
                    )}
                    {localSettings.providerB === 'openai' && (
                      <>
                        <SelectItem value="o4-mini-2025-04-16">o4 mini</SelectItem>
                        <SelectItem value="o3-2025-04-16">o3</SelectItem>
                        <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                        <SelectItem value="o3-mini-2025-01-31">o3-mini</SelectItem>
                        <SelectItem value="gpt-image-1">GPT-image-1</SelectItem>
                      </>
                    )}
                    {localSettings.providerB === 'openrouter' && (
                      <>
                        <SelectItem value="google/gemini-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="openai/o3-mini-2025-01-31">o3-mini</SelectItem>
                        <SelectItem value="anthropic/claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                        <SelectItem value="meta-llama/llama-3-70b-instruct">Llama 3 70B</SelectItem>
                        <SelectItem value="mistralai/mistral-large-2411">Mistral Large 2411</SelectItem>
                      </>
                    )}
                    {localSettings.providerB === 'flowise' && (
                      <>
                        <SelectItem value="default">Default Chatflow</SelectItem>
                      </>
                    )}
                    {localSettings.providerB === 'google' && (
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
                <Label htmlFor="temperatureB" className="text-right">
                  Temp B: {localSettings.temperatureB?.toFixed(1)}
                </Label>
                <div className="col-span-3">
                  <Slider
                    id="temperatureB"
                    min={0}
                    max={1}
                    step={0.1}
                    defaultValue={[localSettings.temperatureB || 0.7]}
                    onValueChange={(value) =>
                      setLocalSettings({ ...localSettings, temperatureB: value[0] })
                    }
                  />
                </div>
              </div>
              <hr className="col-span-4 my-4" />
            </>
          ) : (
            <>
              {/* Single Model Settings - This is the section that should be displayed when not in arena mode */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="provider" className="text-right">
                  Provider
                </Label>
                <Select
                  value={localSettings.provider} // Use localSettings.provider
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
                <Label htmlFor="model" className="text-right">
                  Model
                </Label>
                <Select
                  value={localSettings.model} // Use localSettings.model
                  onValueChange={(value: string) =>
                    setLocalSettings({ ...localSettings, model: value })
                  }
                  disabled={!localSettings.provider} // Ensure this uses localSettings.provider
                >
                  <SelectTrigger id="model" className="col-span-3">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                  {localSettings.provider === 'neurarouter' && (
                      <>
                        <SelectItem value="google/gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="openai/o4-mini-2025-04-16">OpenAI o4-mini</SelectItem>                    
                        <SelectItem value="google/gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash</SelectItem>
                        <SelectItem value="openai/gpt-image-1">GPT-image-1</SelectItem>
                        <SelectItem value="google/imagen-4.0-generate-preview-05-20">Imagen 4.0 (Image Generation)</SelectItem>
                        <SelectItem value="google/imagen-4.0-ultra-generate-exp-05-20">Imagen 4.0 Ultra(Image Generation)</SelectItem>
                        <SelectItem value="openrouter/deepseek-r1-0528:free">DeepSeek R1 0528 (SpecDec)</SelectItem>
                        <SelectItem value="groq/meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</SelectItem>
                        <SelectItem value="groq/meta-llama/llama-4-scout-17b-16e-instruct">LLama 4 Scout</SelectItem>
                        <SelectItem value="openrouter/nvidia/llama-3.1-nemotron-ultra-253b-v1:free">Nvidia Nemotron Ultra 256b</SelectItem>
                        <SelectItem value="anthropic/claude-sonnet-4-20250514">Sonnet 4</SelectItem>
                        <SelectItem value="anthropic/claude-opus-4-20250514">Opus 4</SelectItem>
                        <SelectItem value="anthropic/claude-3-5-haiku-latest">Haiku 3.5</SelectItem>
                        <SelectItem value="groq/compound-beta">Groq Compound Beta Agentic Model</SelectItem>
                      </>
                    )}
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
                        <SelectItem value="imagen-4.0-generate-preview-05-20">Imagen 4.0 (Image Generation)</SelectItem>
                        <SelectItem value="imagen-4.0-ultra-generate-exp-05-20">Imagen 4.0 Ultra(Image Generation)</SelectItem>
                        <SelectItem value="code-gecko">Code Gecko</SelectItem>
                      </>
                    )}
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
                    defaultValue={[localSettings.temperature !== undefined ? localSettings.temperature : 0.7]} 
                    onValueChange={(value) =>
                      setLocalSettings({ ...localSettings, temperature: value[0] })
                    }
                  />
                </div>
              </div>
            </>
          )}
          
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
            onClick={() => {
              if (arenaMode) {
                const defaultSingle = getDefaultSettings();
                const defaultArena = getDefaultArenaSettings();
                setLocalSettings({
                  ...defaultSingle, // Start with all default single/common settings
                  ...defaultArena,  // Add/override with arena specific settings
                  // Override common settings with global settings if they exist, falling back to defaults
                  systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
                  streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
                  template: settings.template || defaultSingle.template,
                  darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
                  contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
                  reasoningFormat: settings.reasoningFormat || defaultSingle.reasoningFormat,
                  webSearchEnabled: settings.webSearchEnabled !== undefined ? settings.webSearchEnabled : defaultSingle.webSearchEnabled,
                  audioResponseEnabled: settings.audioResponseEnabled !== undefined ? settings.audioResponseEnabled : defaultSingle.audioResponseEnabled,
                  // Ensure arena specific fields are explicitly from defaultArena
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
                  // Apply global settings for common fields, then single defaults for specific fields
                  systemPrompt: settings.systemPrompt !== undefined ? settings.systemPrompt : defaultSingle.systemPrompt,
                  streamEnabled: settings.streamEnabled !== undefined ? settings.streamEnabled : defaultSingle.streamEnabled,
                  template: settings.template || defaultSingle.template,
                  darkMode: settings.darkMode !== undefined ? settings.darkMode : defaultSingle.darkMode,
                  contextWindowSize: settings.contextWindowSize || defaultSingle.contextWindowSize,
                  reasoningFormat: settings.reasoningFormat || defaultSingle.reasoningFormat,
                  webSearchEnabled: settings.webSearchEnabled !== undefined ? settings.webSearchEnabled : defaultSingle.webSearchEnabled,
                  audioResponseEnabled: settings.audioResponseEnabled !== undefined ? settings.audioResponseEnabled : defaultSingle.audioResponseEnabled,
                  // Single specific fields from single defaults
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