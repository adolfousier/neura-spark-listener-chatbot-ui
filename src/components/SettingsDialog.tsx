
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
                <SelectItem value="claude">Claude</SelectItem>
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
                    <SelectItem value="deepseek-r1-distill-llama-70b">Deepseek Coder</SelectItem>
                    <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
                    <SelectItem value="llama-3-8b-fast">Llama 3 8B Fast</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                  </>
                )}
                {localSettings.provider === 'claude' && (
                  <>
                    <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                  </>
                )}
                {localSettings.provider === 'openai' && (
                  <>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
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
