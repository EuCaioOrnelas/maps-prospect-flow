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

  const [transitionTarget, setTransitionTarget] = useState<Theme | null>(null);
  const themeApplyTimeoutRef = useRef<number | null>(null);
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
      if (themeApplyTimeoutRef.current) {
        window.clearTimeout(themeApplyTimeoutRef.current);
      }
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("theme-transition");
      }
    };
  }, []);

  const changeTheme = (nextTheme: Theme) => {
    if (typeof document === "undefined") return;

    if (themeApplyTimeoutRef.current) window.clearTimeout(themeApplyTimeoutRef.current);
    if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);

    setTransitionTarget(nextTheme);
    document.documentElement.classList.add("theme-transition");

    themeApplyTimeoutRef.current = window.setTimeout(() => {
      setThemeState(nextTheme);
      themeApplyTimeoutRef.current = null;
    }, 140);

    transitionTimeoutRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
      setTransitionTarget(null);
      transitionTimeoutRef.current = null;
    }, 520);
  };

  const setTheme = (nextTheme: Theme) => {
    if (nextTheme === theme) return;
    changeTheme(nextTheme);
  };

  const toggleTheme = () => {
    changeTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, toggleTheme }}>
      {children}
      {transitionTarget && (
        <div
          className="theme-change-screen"
          data-target-theme={transitionTarget}
          role="status"
          aria-label={`Aplicando tema ${transitionTarget === "light" ? "claro" : "escuro"}`}
        >
          <span className="theme-change-spinner" aria-hidden="true" />
        </div>
      )}
    </ThemeContext.Provider>
  );
};
