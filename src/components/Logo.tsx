import logoVerde from "@/assets/logo-verde.png";
import logoBranca from "@/assets/logo-branca.png";
import logoIcon from "@/assets/logo-icon.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  mobileSize?: "sm" | "md" | "lg";
  mobileInitialsOnly?: boolean;
  variant?: "dark" | "light"; // dark = use white logo for dark backgrounds, light = use green logo for light backgrounds
  iconOnly?: boolean; // Show only the icon (for collapsed sidebar)
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
    sm: { height: "h-8", mobileHeight: "h-7" },
    md: { height: "h-10", mobileHeight: "h-8" },
    lg: { height: "h-12", mobileHeight: "h-10" },
  };

  const effectiveSize = sizes[size];
  const mobileEffectiveSize = mobileSize ? sizes[mobileSize] : effectiveSize;

  // Choose the appropriate logo based on variant
  const logoSrc = variant === "dark" ? logoBranca : logoVerde;

  // If iconOnly, show only the icon version
  if (iconOnly) {
    return (
      <div className="flex items-center">
        <img 
          src={logoIcon} 
          alt="Wiize" 
          className={`${mobileSize ? `${mobileEffectiveSize.mobileHeight} md:${effectiveSize.height}` : effectiveSize.height} w-auto`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {showText ? (
        <>
          {mobileInitialsOnly ? (
            <>
              {/* Mobile: show icon only */}
              <img 
                src={logoIcon} 
                alt="Wiize" 
                className={`${mobileEffectiveSize.mobileHeight} w-auto md:hidden`}
              />
              {/* Desktop: show full logo */}
              <img 
                src={logoSrc} 
                alt="WiizeProspect" 
                className={`hidden md:block ${effectiveSize.height} w-auto`}
              />
            </>
          ) : (
            <img 
              src={logoSrc} 
              alt="WiizeProspect" 
              className={`${mobileSize ? `${mobileEffectiveSize.mobileHeight} md:${effectiveSize.height}` : effectiveSize.height} w-auto`}
            />
          )}
        </>
      ) : (
        <img 
          src={logoIcon} 
          alt="Wiize" 
          className={`${mobileSize ? `${mobileEffectiveSize.mobileHeight} md:${effectiveSize.height}` : effectiveSize.height} w-auto`}
        />
      )}
    </div>
  );
};
