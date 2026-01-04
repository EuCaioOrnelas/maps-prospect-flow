import { MapPin } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  mobileSize?: "sm" | "md" | "lg";
  mobileInitialsOnly?: boolean;
}

export const Logo = ({ size = "md", showText = true, mobileSize, mobileInitialsOnly = false }: LogoProps) => {
  const sizes = {
    sm: { icon: 20, text: "text-lg", iconClass: "w-5 h-5", padding: "p-1.5" },
    md: { icon: 28, text: "text-2xl", iconClass: "w-7 h-7", padding: "p-2" },
    lg: { icon: 36, text: "text-3xl", iconClass: "w-9 h-9", padding: "p-2" },
  };

  const effectiveSize = sizes[size];
  const mobileEffectiveSize = mobileSize ? sizes[mobileSize] : effectiveSize;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
        <div className={`relative bg-primary rounded-xl shadow-button ${mobileSize ? mobileEffectiveSize.padding : effectiveSize.padding} md:${effectiveSize.padding}`}>
          <MapPin 
            className={`text-primary-foreground ${mobileSize ? `${mobileEffectiveSize.iconClass} md:${effectiveSize.iconClass}` : effectiveSize.iconClass}`}
          />
        </div>
      </div>
      {showText && (
        <>
          {mobileInitialsOnly ? (
            <>
              <span className={`font-display font-bold ${mobileEffectiveSize.text} text-foreground md:hidden`}>
                WP
              </span>
              <span className={`font-display font-bold ${effectiveSize.text} text-foreground hidden md:inline`}>
                WiizeProspect
              </span>
            </>
          ) : (
            <span className={`font-display font-bold ${mobileSize ? `${mobileEffectiveSize.text} md:${effectiveSize.text}` : effectiveSize.text} text-foreground`}>
              WiizeProspect
            </span>
          )}
        </>
      )}
    </div>
  );
};
