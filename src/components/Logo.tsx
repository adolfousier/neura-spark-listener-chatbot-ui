
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
      <img src="/title-avatar.png" alt="Logo" className="w-full h-full object-cover" />
    </div>
  );
}
