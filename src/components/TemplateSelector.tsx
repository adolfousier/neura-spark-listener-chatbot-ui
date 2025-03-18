
import { useState, useEffect } from "react";
import { useChat } from "@/context/ChatContext";
import { Button } from "@/components/ui/button";
import { Template } from "@/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const templates: Array<{
  id: Template;
  name: string;
  description: string;
  className: string;
}> = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple interface",
    className: "bg-template1 text-template1-foreground border-2",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Bold and colorful experience",
    className: "bg-template2 text-template2-foreground border-2",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Sophisticated and refined design",
    className: "bg-template3 text-template3-foreground border-2",
  },
];

export function TemplateSelector() {
  const { settings, updateTheme } = useChat();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(settings.template);

  // Ensure the selected template is in sync with settings when the component loads
  useEffect(() => {
    setSelectedTemplate(settings.template);
  }, [settings.template]);

  const handleTemplateChange = (template: Template) => {
    setSelectedTemplate(template);
  };

  const applyTemplate = () => {
    updateTheme(selectedTemplate, settings.darkMode);
    console.log("Applied template:", selectedTemplate, "with dark mode:", settings.darkMode);
    
    toast({
      title: "Template Applied",
      description: `The ${selectedTemplate} template has been applied.`,
    });
  };

  return (
    <div className="p-6 animate-scale-in">
      <h2 className="text-2xl font-semibold mb-6 text-center">Choose Your Template</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className={cn(
              "relative rounded-lg transition-all p-4 min-h-[140px] flex flex-col justify-between cursor-pointer border",
              template.className,
              selectedTemplate === template.id && "ring-2 ring-primary"
            )}
            onClick={() => handleTemplateChange(template.id)}
          >
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-lg">{template.name}</h3>
              <p className="text-sm opacity-90 mt-1">{template.description}</p>
            </div>
            
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-1">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="h-3 w-3 rounded-full bg-secondary" />
                <div className="h-3 w-3 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center mt-8">
        <Button 
          onClick={applyTemplate} 
          disabled={selectedTemplate === settings.template}
        >
          Apply Template
        </Button>
      </div>
      
      <div className="flex justify-center mt-4">
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              "h-6 w-6 rounded-full border cursor-pointer",
              "bg-background",
              !settings.darkMode && "ring-1 ring-primary"
            )}
            onClick={() => updateTheme(selectedTemplate, false)}
            aria-label="Light mode"
          />
          <div
            className={cn(
              "h-6 w-6 rounded-full border cursor-pointer",
              "bg-[#16181d]",
              settings.darkMode && "ring-1 ring-primary"
            )}
            onClick={() => updateTheme(selectedTemplate, true)}
            aria-label="Dark mode"
          />
        </div>
      </div>
    </div>
  );
}
