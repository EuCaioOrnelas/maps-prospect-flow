import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85 shadow-[0_4px_16px_hsl(160_84%_39%_/_0.35)] hover:shadow-[0_6px_24px_hsl(160_84%_39%_/_0.45)] hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/85 shadow-sm hover:shadow-md",
        outline: "border-2 border-border bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-muted hover:border-muted-foreground/20",
        ghost: "text-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        hero: "bg-primary text-primary-foreground font-semibold shadow-[0_4px_20px_hsl(160_84%_39%_/_0.4)] hover:shadow-[0_8px_30px_hsl(160_84%_39%_/_0.5)] hover:-translate-y-1 hover:bg-primary/85 transition-all duration-300",
        "hero-outline": "border-2 border-primary bg-transparent text-foreground font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-300",
        glass: "backdrop-blur-xl bg-card/90 border border-border text-foreground shadow-sm hover:bg-card hover:shadow-md transition-all duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
