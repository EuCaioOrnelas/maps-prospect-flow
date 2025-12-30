import { MapPin } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizes = {
    sm: { icon: 20, text: "text-lg" },
    md: { icon: 28, text: "text-2xl" },
    lg: { icon: 36, text: "text-3xl" },
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
        <div className="relative bg-primary rounded-xl p-2 shadow-button">
          <MapPin size={sizes[size].icon} className="text-primary-foreground" />
        </div>
      </div>
      {showText && (
        <span className={`font-display font-bold ${sizes[size].text} text-foreground`}>
          Prospex
        </span>
      )}
    </div>
  );
};
