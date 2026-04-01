import { useEffect, type ReactNode } from "react";

/**
 * Wraps external/public pages with the landing-light theme.
 * Internal (protected/dashboard) pages keep the default dark theme.
 */
const LightThemeWrapper = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    document.documentElement.classList.add("landing-light");
    document.body.classList.add("landing-light");

    return () => {
      document.documentElement.classList.remove("landing-light");
      document.body.classList.remove("landing-light");
    };
  }, []);

  return <div className="landing-light min-h-screen bg-background text-foreground">{children}</div>;
};

export default LightThemeWrapper;
