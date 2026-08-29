import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — soft rounded, tactile active press, focus ring with offset for
  // visibility on any surface, slight scale on click for material feel.
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary = neutral (near-black) — the x.ai pattern, color is reserved
        // for status. Use variant="brand" for places that should carry Kivvi
        // identity (logo, hero CTA).
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground hover:bg-brand/90",
        secondary: "border border-border-default bg-card text-foreground hover:bg-accent-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border-default bg-card text-foreground hover:bg-accent-muted",
        ghost: "text-foreground hover:bg-accent-muted",
        link: "text-foreground underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        // Tightened sizes — denser, x.ai-style. Default drops from h-10 to h-9.
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
