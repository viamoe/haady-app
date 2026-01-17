/**
 * HaadyUI FormInput Component
 * 
 * A styled Input component matching the complete profile form styling.
 * Includes validation states with check icon for valid fields.
 */

"use client"

import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { cn } from "../utils/cn"

export interface FormInputProps extends React.ComponentPropsWithoutRef<"input"> {
  error?: boolean
  isValid?: boolean
  isRTL?: boolean
  showValidationIcon?: boolean
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, error, isValid, isRTL = false, showValidationIcon = true, ...props }, ref) => {
    const textAlign = isRTL ? 'text-right' : 'text-left'
    
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          className={cn(
            // Base styling matching form inputs
            "h-[55px] bg-gray-50 focus:bg-gray-100 rounded-xl placeholder:text-gray-400 transition-colors w-full min-w-0 pl-4 !text-[18px] md:!text-[18px] font-medium outline-none text-gray-700",
            textAlign,
            // Border: red on error, none otherwise
            error 
              ? "border border-red-500 focus:border-red-500" 
              : "border-0",
            className
          )}
          {...props}
        />
        {showValidationIcon && isValid && !error && (
          <CheckCircle2 
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-5 h-5 fill-green-500 stroke-green-500 [&>path:last-child]:stroke-white [&>path:last-child]:stroke-2 pointer-events-none",
              isRTL ? "left-3" : "right-3"
            )} 
          />
        )}
      </div>
    )
  }
)

FormInput.displayName = "FormInput"

export { FormInput }
