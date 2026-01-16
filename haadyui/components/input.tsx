'use client'

import * as React from "react"
import { cn } from "../utils/cn"

export interface InputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "prefix" | "suffix"> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  error?: boolean
  errorMessage?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefix, suffix, error, errorMessage, ...props }, ref) => {
    const inputId = React.useId()
    const errorId = `${inputId}-error`

    const inputElement = (
      <input
        type={type}
        data-slot="input"
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error && errorMessage ? errorId : undefined}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-11 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "border-0 focus:border-0 focus-visible:border-0 focus:outline-none focus-visible:outline-none",
          error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          prefix && "pl-10",
          suffix && "pr-10",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (prefix || suffix) {
      return (
        <div className="relative w-full">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {prefix}
            </div>
          )}
          {inputElement}
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {suffix}
            </div>
          )}
          {error && errorMessage && (
            <p id={errorId} className="mt-1 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )
    }

    return (
      <>
        {inputElement}
        {error && errorMessage && (
          <p id={errorId} className="mt-1 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </>
    )
  }
)

Input.displayName = "Input"

export { Input }
