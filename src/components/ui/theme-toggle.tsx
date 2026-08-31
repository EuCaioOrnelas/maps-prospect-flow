import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sun, Moon, Palette } from "lucide-react";

type ThemeType = "light" | "dark";

interface ThemeOption {
  value: ThemeType;
  label: string;
  description: string;
  icon: React.ElementType;
  preview: {
    bg: string;
    sidebar: string;
    card: string;
    text: string;
    accent: string;
  };
}

const themes: ThemeOption[] = [
  {
    value: "light",
    label: "Claro",
    description: "Interface com fundo branco",
    icon: Sun,
    preview: {
      bg: "bg-white",
      sidebar: "bg-[hsl(210,20%,97%)]",
      card: "bg-[hsl(210,20%,98%)]",
      text: "bg-[hsl(220,25%,14%)]",
      accent: "bg-[hsl(158,72%,32%)]",
    },
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Interface com fundo escuro",
    icon: Moon,
    preview: {
      bg: "bg-[hsl(220,20%,7%)]",
      sidebar: "bg-[hsl(220,18%,6%)]",
      card: "bg-[hsl(220,18%,9%)]",
      text: "bg-[hsl(210,40%,90%)]",
      accent: "bg-[hsl(158,72%,38%)]",
    },
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Aparência
        </CardTitle>
        <CardDescription className="text-xs">
          Escolha o tema da interface do dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((themeOption) => {
            const isSelected = theme === themeOption.value;
            const Icon = themeOption.icon;

            return (
              <button
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                className={cn(
                  "relative rounded-xl border-2 p-1 transition-all duration-200 text-left group",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/40 hover:border-border hover:bg-accent/40"
                )}
              >
                {/* Mini preview */}
                <div className={cn("rounded-lg overflow-hidden h-20 relative", themeOption.preview.bg)}>
                  {/* Mini sidebar */}
                  <div className={cn("absolute left-0 top-0 bottom-0 w-5 rounded-l-lg", themeOption.preview.sidebar)} />
                  {/* Mini header */}
                  <div className={cn("absolute top-0 left-5 right-0 h-3", themeOption.preview.card)} />
                  {/* Mini cards */}
                  <div className="absolute top-5 left-7 right-2 space-y-1.5">
                    <div className={cn("h-2 w-12 rounded-sm opacity-70", themeOption.preview.text)} />
                    <div className="flex gap-1">
                      <div className={cn("h-6 flex-1 rounded", themeOption.preview.card)} />
                      <div className={cn("h-6 flex-1 rounded", themeOption.preview.card)} />
                    </div>
                    <div className={cn("h-2 w-6 rounded-sm", themeOption.preview.accent)} />
                  </div>
                </div>

                {/* Label */}
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={cn(isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
                      {themeOption.label}
                    </span>
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="theme-check"
                      className="h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
