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
    sm: { icon: "h-8", text: "text-lg" },
    md: { icon: "h-10", text: "text-xl" },
    lg: { icon: "h-12", text: "text-2xl" },
  };

  const effectiveSize = sizes[size];
  const mobileEffectiveSize = mobileSize ? sizes[mobileSize] : effectiveSize;

  // If iconOnly, show only the icon
  if (iconOnly) {
    return (
      <div className="flex items-center">
        <img 
          src={logoIconNew} 
          alt="Wiize" 
          className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} w-auto rounded-lg`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <img 
        src={logoIconNew} 
        alt="Wiize" 
        className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} w-auto rounded-lg`}
      />
      {showText && (
        <>
          {mobileInitialsOnly ? (
            <span className={`hidden md:inline font-normal tracking-tight text-foreground ${effectiveSize.text}`}>
              wiize
            </span>
          ) : (
            <span className={`font-normal tracking-tight text-foreground ${mobileSize ? `${mobileEffectiveSize.text} md:${effectiveSize.text}` : effectiveSize.text}`}>
              wiize
            </span>
          )}
        </>
      )}
    </div>
  );
};
