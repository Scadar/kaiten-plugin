import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Typography variants matching JetBrains New UI type scale.
 *
 * All font sizes use CSS custom properties set from the IDE's UIManager,
 * so the plugin feels native regardless of the user's font settings.
 *
 * Variants:
 *  - heading   — bold section title (e.g. tool window header)
 *  - subheading — semibold subsection
 *  - body      — default body text
 *  - secondary — secondary/supporting text (smaller, dimmed)
 *  - dimmed    — muted helper text (timestamps, hints)
 *  - overline  — uppercase label (section dividers, group headings)
 *  - code      — monospace (IDs, code snippets, hashes)
 */
const typographyVariants = cva("", {
  variants: {
    variant: {
      heading:
        "text-[length:var(--ide-font-size)] font-bold leading-snug tracking-tight",
      subheading:
        "text-[length:var(--ide-font-size)] font-semibold leading-snug",
      body:
        "text-[length:var(--ide-font-size)] leading-normal",
      secondary:
        "text-[length:var(--ide-font-size-sm)] leading-normal text-muted-foreground",
      dimmed:
        "text-[length:var(--ide-font-size-xs)] leading-normal text-muted-foreground",
      overline:
        "text-[length:var(--ide-font-size-xs)] font-semibold uppercase tracking-wider text-muted-foreground",
      code:
        "font-mono text-[length:var(--ide-font-size-sm)] text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "body",
  },
})

type TypographyVariant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>

const defaultElementMap: Record<TypographyVariant, React.ElementType> = {
  heading: "h3",
  subheading: "h4",
  body: "p",
  secondary: "span",
  dimmed: "span",
  overline: "span",
  code: "code",
}

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant = "body", as, ...props }, ref) => {
    const Comp = as ?? defaultElementMap[variant as TypographyVariant] ?? "span"
    return (
      <Comp
        ref={ref}
        className={cn(typographyVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
Typography.displayName = "Typography"

export { Typography, Typography as Text, typographyVariants }
