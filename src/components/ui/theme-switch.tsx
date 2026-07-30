import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const ThemeSwitch = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("relative inline-flex items-center", className)} {...props}>
      <Switch
        checked={isDark}
        onCheckedChange={() => toggleTheme()}
        className={cn(
          "relative h-8 w-[68px] rounded-hover transition-all duration-300",
          isDark
            ? "bg-[hsl(220,18%,12%)] border border-[hsl(220,14%,20%)]"
            : "bg-[hsl(220,16%,28%)] border border-[hsl(220,12%,80%)]",
          "[&>span]:h-7 [&>span]:w-7 [&>span]:rounded-sm [&>span]:shadow-md [&>span]:z-10",

          "[&>span]:transition-all [&>span]:duration-300",
          "data-[state=unchecked]:[&>span]:translate-x-0.5",
          "data-[state=checked]:[&>span]:translate-x-[36px]",
          isDark
            ? "[&>span]:bg-[hsl(220,18%,18%)] [&>span]:border [&>span]:border-[hsl(220,14%,24%)]"
            : "[&>span]:bg-white [&>span]:border [&>span]:border-[hsl(220,12%,80%)]",
          isDark
            ? "hover:bg-[hsl(220,18%,14%)]"
            : "hover:bg-[hsl(220,16%,32%)]"
        )}
      />

      {/* Sun icon - left side (visible when light) */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none z-20">
        <SunIcon
          size={14}
          className={cn(
            "transition-opacity duration-300",
            isDark ? "opacity-100 text-white" : "opacity-100 text-[hsl(45,93%,47%)]"
          )}
        />
      </div>

      {/* Moon icon - right side (visible when dark) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none z-20">
        <MoonIcon
          size={14}
          className={cn(
            "transition-opacity duration-300",
            isDark ? "opacity-100 text-[hsl(210,40%,80%)]" : "opacity-40 text-[hsl(220,12%,70%)]"
          )}
        />
      </div>
    </div>
  );
};

export default ThemeSwitch;
