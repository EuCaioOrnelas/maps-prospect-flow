import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === "system") return getSystemTheme();
  return theme;
};

export const DashboardThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("dashboard-theme");
      if (stored === "light" || stored === "dark" || stored === "system") return stored;
      return "light";
    } catch {
      return "light";
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    try {
      localStorage.setItem("dashboard-theme", theme);
    } catch {}
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);

    // Apply landing-light to document.body so Radix portals (dialogs, popovers) inherit the theme
    if (resolved === "light") {
      document.body.classList.add("landing-light");
    } else {
      document.body.classList.remove("landing-light");
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    // Add transition class for smooth animation
    document.documentElement.classList.add("theme-transition");
    setThemeState(t);
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 500);
  };

  const toggleTheme = () => {
    document.documentElement.classList.add("theme-transition");
    setThemeState((prev) => {
      const resolved = resolveTheme(prev);
      return resolved === "dark" ? "light" : "dark";
    });
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 500);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      <div className={resolvedTheme === "light" ? "landing-light" : ""}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
