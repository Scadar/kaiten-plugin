import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full border border-border bg-input transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        /** 28 px — matches JetBrains default input height */
        default: "h-7 rounded-md px-2.5 py-1 text-[length:var(--ide-font-size-sm)] file:text-[length:var(--ide-font-size-sm)]",
        /** 24 px — compact, aligns with Button xs/sm in the same row */
        sm:      "h-6 rounded-md px-2 py-0.5 text-[length:var(--ide-font-size-xs)] file:text-[length:var(--ide-font-size-xs)]",
        lg:      "h-9 rounded-md px-3 py-2 text-[length:var(--ide-font-size)] file:text-[length:var(--ide-font-size)]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
