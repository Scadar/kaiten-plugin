import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { badgeVariants } from "@/components/ui/badge"

import { cn } from "@/lib/utils"
import {VariantProps} from "class-variance-authority";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full overflow-hidden rounded-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

const AvatarBadge = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>
>(({ className, variant, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            // Base badge styles for avatar
            "absolute bottom-0 right-0 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-background",
            // Use colors from Badge, but remove extra padding and fonts
            badgeVariants({ variant }),
            "p-0 min-h-0 min-w-0 shadow-none", // reset extra
            className
        )}
        {...props}
    />
))
AvatarBadge.displayName = "AvatarBadge"

export { Avatar, AvatarImage, AvatarFallback, AvatarBadge }
