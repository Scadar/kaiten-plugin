import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[length:var(--ide-font-size-sm)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-foreground/[0.07] hover:text-foreground",
        secondary:
          "bg-foreground/[0.08] text-foreground hover:bg-foreground/[0.13]",
        ghost:   "hover:bg-accent hover:text-accent-foreground",
        link:    "text-primary underline-offset-4 hover:underline",
        /** Toolbar active state: subtle primary tint, no border */
        active:  "bg-primary/[0.12] text-primary hover:bg-primary/[0.18]",
      },
      size: {
        /** 28 px — matches JetBrains default button height */
        default:  "h-7 px-3 py-1 [&_svg]:size-4",
        /** 24 px — compact, same row as size-sm inputs */
        sm:       "h-6 rounded-md px-2.5 text-[length:var(--ide-font-size-xs)] [&_svg]:size-3.5",
        /** 22 px — compact toolbar/inline size */
        xs:       "h-[22px] rounded-md px-2 text-[length:var(--ide-font-size-xs)] [&_svg]:size-3",
        lg:       "h-9 rounded-md px-6 [&_svg]:size-4",
        icon:     "h-7 w-7 [&_svg]:size-4",
        "icon-sm":"h-6 w-6 [&_svg]:size-3.5",
        "icon-xs":"h-5 w-5 [&_svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
