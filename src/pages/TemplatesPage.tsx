
import { Header } from "@/components/Header";
import { TemplateSelector } from "@/components/TemplateSelector";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TemplatesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 container max-w-4xl p-4 md:p-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
        
        <section className="py-8">
          <h1 className="text-3xl font-bold mb-2 text-center">
            Customize Your Experience
          </h1>
          <p className="text-muted-foreground text-center mb-10">
            Choose a template and customize the appearance of your AI assistant
          </p>
          
          <TemplateSelector />
        </section>
      </main>
      
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Button size="sm" variant="outline" asChild>
            <a href="https://github.com/adolfousier/neura-spark-listener-chatbot-ui" target="_blank" rel="noopener noreferrer" className="gap-2">
              ⭐ Star on GitHub
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="https://github.com/adolfousier/neura-spark-listener-chatbot-ui/fork" target="_blank" rel="noopener noreferrer" className="gap-2">
              🍴 Fork The Code
            </a>
          </Button>
        </div>
        <p>v0.4.2 (2025-09-20) Neura Open Source Chatbot UI • Powered by{" "}<a href="https://meetneura.ai" target="_blank" rel="noopener noreferrer">Neura AI</a>
        </p>
      </footer>
    </div>
  );
}
