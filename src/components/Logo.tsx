
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("relative rounded-full overflow-hidden", sizeClasses[size], className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-80 rounded-full" />
      <div className="absolute inset-0 bg-background/5 backdrop-blur-sm rounded-full" />
      <div className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-xl">N</div>
    </div>
  );
}
