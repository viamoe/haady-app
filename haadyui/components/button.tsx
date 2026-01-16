'use client'

import * as React from "react"
import { motion } from "framer-motion"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils/cn"
import { defaultHoverScale, defaultTapScale, defaultSpringConfig } from "../hooks/use-animation"

const buttonVariants = cva(
  "gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative inline-flex items-center cursor-pointer font-medium select-none justify-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap transition-colors duration-150",
  {
    variants: {
      variant: {
        default: "bg-gray-900 text-white hover:bg-gray-800 border-0",
        destructive:
          "bg-destructive text-white hover:opacity-85 border-0 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-0 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:opacity-85 border-0",
        ghost:
          "bg-gray-200 text-gray-900 hover:bg-gray-600 hover:text-white border-0",
        link: "text-primary underline-offset-4 hover:underline border-0",
      },
      size: {
        default: "h-10 px-4 py-1 rounded-full text-sm w-auto",
        sm: "h-8 rounded-full gap-1.5 px-3 text-sm w-auto",
        lg: "h-12 rounded-full px-6 text-base w-auto",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  hoverScale?: number
  tapScale?: number
  disableAnimation?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      hoverScale = defaultHoverScale,
      tapScale = defaultTapScale,
      disableAnimation = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const button = (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )

    if (disableAnimation) {
      return button
    }

    return (
      <motion.div
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: tapScale }}
        transition={defaultSpringConfig}
      >
        {button}
      </motion.div>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
