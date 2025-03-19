
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { TemplateSelector } from "@/components/TemplateSelector";
import { Button } from "@/components/ui/button";
import { useChat } from "@/context/ChatContext";
import { ArrowRight, Bot, Settings, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Index() {
  const { createNewConversation, settings } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    // Force render with the current theme settings
    document.documentElement.classList.toggle('dark', settings.darkMode);
    document.documentElement.classList.add(`template-${settings.template}`);
  }, [settings.darkMode, settings.template]);

  const startNewChat = () => {
    const conversationId = createNewConversation();
    navigate(`/chat`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container max-w-7xl p-4 md:p-8">
        <section className="py-12 md:py-20 text-center">
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Bot className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            NEURA AI ASSISTANT
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            A powerful AI assistant with multiple provider support and customizable templates
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={startNewChat} className="gap-2">
              Start Chatting <ArrowRight className="h-4 w-4" />
            </Button>
            
            <Button size="lg" variant="outline" asChild>
              <Link to="/templates" className="gap-2">
                Customize <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
        
        <section className="py-8 md:py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard 
              icon={<Bot className="h-8 w-8" />}
              title="Multiple AI Providers"
              description="Seamlessly switch between Groq, Claude, and OpenAI models"
            />
            <FeatureCard 
              icon={<Sparkles className="h-8 w-8" />}
              title="Beautiful Templates"
              description="Choose from three modern, responsive design templates"
            />
            <FeatureCard 
              icon={<Settings className="h-8 w-8" />}
              title="Full Customization"
              description="Adjust model parameters, enable streaming, and set your preferences"
            />
          </div>
        </section>
        
        <section className="py-12 md:py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Style</h2>
          <TemplateSelector />
        </section>
      </main>
      
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Neura Spark Listener Open-Source Chatbot • Powered by{" "}<a href="https://meetneura.ai" target="_blank" rel="noopener noreferrer">Neura AI</a>
        </p>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className={cn(
      "rounded-lg p-6 transition-all animate-fade-in",
      "border bg-card text-card-foreground"
    )}>
      <div className="mb-4 rounded-full w-12 h-12 flex items-center justify-center bg-primary/10">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
