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
    sm: { icon: "h-10 w-10", text: "text-2xl" },
    md: { icon: "h-12 w-12", text: "text-3xl" },
    lg: { icon: "h-14 w-14", text: "text-4xl" },
  };

  const effectiveSize = sizes[size];
  const mobileEffectiveSize = mobileSize ? sizes[mobileSize] : effectiveSize;

  // If iconOnly, show only the icon
  if (iconOnly) {
    return (
      <div className="flex items-center justify-center">
        <img 
          src={logoIconNew} 
          alt="Wiize" 
          className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} object-contain rounded-lg`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center -space-x-1">
      <img 
        src={logoIconNew} 
        alt="Wiize" 
        className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} object-contain rounded-lg shrink-0`}
      />
      {showText && (
        <>
          {mobileInitialsOnly ? (
            <span 
              className={`hidden md:inline tracking-tight text-foreground ${effectiveSize.text} -ml-1`}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500 }}
            >
              wiize
            </span>
          ) : (
            <span 
              className={`tracking-tight text-foreground ${mobileSize ? `${mobileEffectiveSize.text} md:${effectiveSize.text}` : effectiveSize.text} -ml-1`}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 500 }}
            >
              wiize
            </span>
          )}
        </>
      )}
    </div>
  );
};
