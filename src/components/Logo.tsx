import logoIconNew from "@/assets/logo-icon-new.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  mobileSize?: "sm" | "md" | "lg";
  mobileInitialsOnly?: boolean;
  variant?: "dark" | "light";
  iconOnly?: boolean;
}

export const Logo = ({ 
  size = "md", 
  showText = true, 
  mobileSize, 
  mobileInitialsOnly = false,
  variant = "dark",
  iconOnly = false
}: LogoProps) => {
  const sizes = {
    sm: { icon: "h-8 w-8", text: "text-xl" },
    md: { icon: "h-10 w-10", text: "text-[1.7rem]" },
    lg: { icon: "h-12 w-12", text: "text-3xl" },
  };

  const effectiveSize = sizes[size];
  const mobileEffectiveSize = mobileSize ? sizes[mobileSize] : effectiveSize;

  // If iconOnly, show only the icon
  if (iconOnly) {
    return (
      <div className="flex items-center justify-center group">
        <img 
          src={logoIconNew} 
          alt="Wiize" 
          className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} object-contain rounded-lg transition-all duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_hsl(158,72%,38%,0.6)]`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-0 group">
      <img 
        src={logoIconNew} 
        alt="Wiize" 
        className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} object-contain rounded-lg shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_hsl(158,72%,38%,0.6)]`}
      />
      {showText && (
        <>
          {mobileInitialsOnly ? (
            <span 
              className={`hidden md:inline tracking-tight text-foreground ${effectiveSize.text} flex items-center`}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500, lineHeight: 1 }}
            >
              wiize
            </span>
          ) : (
            <span 
              className={`tracking-tight text-foreground ${mobileSize ? `${mobileEffectiveSize.text} md:${effectiveSize.text}` : effectiveSize.text} flex items-center`}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500, lineHeight: 1 }}
            >
              wiize
            </span>
          )}
        </>
      )}
    </div>
  );
};
