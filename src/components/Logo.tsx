import { MapPin } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizes = {
    sm: { icon: 16, padding: "p-1.5", text: "text-base sm:text-lg" },
    md: { icon: 20, padding: "p-2", text: "text-lg sm:text-xl" },
    lg: { icon: 28, padding: "p-2", text: "text-xl sm:text-2xl" },
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
        <div className={`relative bg-primary rounded-lg sm:rounded-xl ${sizes[size].padding} shadow-button`}>
          <MapPin size={sizes[size].icon} className="text-primary-foreground" />
        </div>
      </div>
      {showText && (
        <span className={`font-display font-bold ${sizes[size].text} text-foreground`}>
          WiizeProspect
        </span>
      )}
    </div>
  );
};
