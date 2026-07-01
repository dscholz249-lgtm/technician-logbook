import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Button variants match the skillcat mobile design system
// (reference/mobile-Figma/Primary Button.png):
//   - default (CTA): orange gradient (bright top → deep bottom), bold white text
//   - secondary: flat dark, muted text — less emphasis
//   - destructive: dark red gradient, white text — irreversible actions
//   - outline / ghost / link: utility variants for admin density
//
// Sizes stay tighter than the mobile spec since admin UI density requires
// more clickable controls per row than a mobile CTA screen. The `cta` size
// matches the mobile spec exactly for the trainee surface (Phase 4).

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Orange gradient CTA matching the Figma "Primary Button" — bright
        // orange at top transitioning to deeper orange at bottom, with a
        // subtle inset highlight to suggest a slight 3D treatment.
        default:
          "text-white bg-gradient-to-b from-skillcat-orange-bright to-skillcat-orange shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-skillcat-orange-bright hover:to-skillcat-orange-bright hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_0_1px_rgba(229,83,31,0.4)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        // Flat dark gray with muted text — used for less-emphasized actions.
        secondary:
          "bg-secondary text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        // Dark red gradient — same gradient treatment as the CTA, mapped to
        // the destructive palette. White text for emphasis.
        destructive:
          "text-white bg-gradient-to-b from-[#3a1410] to-[#2a0c08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:from-[#4a1812] hover:to-[#34100a]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Admin density — compact buttons. Subtly rounded.
        default:
          "h-8 gap-1.5 px-3 rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 rounded-lg has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        // Mobile CTA size matching the Figma spec: tall, full-width-friendly,
        // pronounced rounded corners. Use on the trainee surface (Phase 4).
        cta: "h-13 w-full gap-2 px-6 text-base rounded-xl",
        icon: "size-8 rounded-lg",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
