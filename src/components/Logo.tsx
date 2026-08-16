import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoIconNew from "@/assets/logo-icon-new.png";
import logoWordmark from "@/assets/logo-wordmark.png";
import logoWordmarkWhite from "@/assets/logo-wordmark-white.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  mobileSize?: "sm" | "md" | "lg";
  mobileInitialsOnly?: boolean;
  variant?: "dark" | "light";
  iconOnly?: boolean;
  asLink?: boolean;
}

export const Logo = ({ 
  size = "md", 
  showText = true, 
  mobileSize, 
  mobileInitialsOnly = false,
  variant = "dark",
  iconOnly = false,
  asLink = true
}: LogoProps) => {
  const { user } = useAuth();
  
  const sizes = {
    sm: { icon: "h-10 w-10", text: "text-2xl" },
    md: { icon: "h-12 w-12", text: "text-3xl" },
    lg: { icon: "h-14 w-14", text: "text-4xl" },
  };

  const effectiveSize = sizes[size];
  const mobileEffectiveSize = mobileSize ? sizes[mobileSize] : effectiveSize;

  // Determine destination based on auth status
  const destination = user ? "/dashboard" : "/";

  const logoContent = (
    <div className="flex items-center justify-center gap-0 group">
      <img 
        src={logoIconNew} 
        alt="Wiize" 
        className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} object-contain rounded-lg shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_hsl(158,72%,38%,0.6)]`}
      />
      {showText && !iconOnly && (
        <span className={`${mobileInitialsOnly ? "hidden md:flex" : "flex"} items-center ml-1.5`}>
          <img
            src={logoWordmark}
            alt="Wiize"
            className={`${wordmarkHeight} w-auto object-contain dark:hidden`}
          />
          <img
            src={logoWordmarkWhite}
            alt="Wiize"
            className={`${wordmarkHeight} w-auto object-contain hidden dark:block`}
          />
        </span>
      )}
    </div>
  );

  // If iconOnly, show only the icon
  if (iconOnly) {
    const iconContent = (
      <div className="flex items-center justify-center group">
        <img 
          src={logoIconNew} 
          alt="Wiize" 
          className={`${mobileSize ? `${mobileEffectiveSize.icon} md:${effectiveSize.icon}` : effectiveSize.icon} object-contain rounded-lg transition-all duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_hsl(158,72%,38%,0.6)]`}
        />
      </div>
    );

    if (asLink) {
      return <Link to={destination}>{iconContent}</Link>;
    }
    return iconContent;
  }

  if (asLink) {
    return <Link to={destination}>{logoContent}</Link>;
  }
  
  return logoContent;
};
