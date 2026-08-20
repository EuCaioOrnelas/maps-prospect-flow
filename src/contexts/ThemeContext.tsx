import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, ReactNode } from "react";
import { isPublicDemoPath } from "@/lib/publicDemo";

type Theme = "dark" | "light";
type ResolvedTheme = Theme;

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const applyDashboardTheme = (theme: ResolvedTheme) => {
  if (typeof document === "undefined") return;

  const useLightTheme = theme === "light";
  const themeTargets = [document.documentElement, document.body];

  themeTargets.forEach((target) => {
    if (!target) return;
    target.classList.toggle("landing-light", useLightTheme);
    target.classList.toggle("dark", !useLightTheme);
    target.style.colorScheme = useLightTheme ? "light" : "dark";
    // Limpa o background inline aplicado pelo bootstrap do index.html
    target.style.backgroundColor = "";
  });
};


export const DashboardThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      if (isPublicDemoPath()) return "light";
      const stored = localStorage.getItem("dashboard-theme");
      return stored === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (isPublicDemoPath()) return;
      localStorage.setItem("dashboard-theme", theme);
    } catch {}
  }, [theme]);


  useLayoutEffect(() => {
    applyDashboardTheme(theme);
  }, [theme]);

  // Re-apply theme after mount to override any LightThemeWrapper cleanup
  useEffect(() => {
    const timer = setTimeout(() => applyDashboardTheme(theme), 50);
    return () => clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("theme-transition");
      }
    };
  }, []);

  const startThemeTransition = () => {
    if (typeof document === "undefined") return;

    document.documentElement.classList.add("theme-transition");

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
      transitionTimeoutRef.current = null;
    }, 220);
  };

  const setTheme = (nextTheme: Theme) => {
    if (nextTheme === theme) return;
    startThemeTransition();
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    startThemeTransition();
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
