'use client'

import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../utils/cn"

export interface EmailValidationResult {
  isValid: boolean
  error: string | null
}

export type TranslationFunction = (key: string) => string

/**
 * Validates an email address
 * 
 * @param email - The email to validate
 * @param t - Optional translation function for error messages
 */
export function validateEmail(
  email: string,
  t?: TranslationFunction
): EmailValidationResult {
  const trimmed = email.trim()
  
  if (!trimmed) {
    return { 
      isValid: false, 
      error: t ? t('validation.emailRequired') : 'Email is required' 
    }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.emailInvalid') : 'Please enter a valid email address' 
    }
  }
  
  return { isValid: true, error: null }
}

export interface EmailInputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "prefix" | "suffix"> {
  /**
   * Whether the input has been touched/interacted with
   */
  touched?: boolean
  /**
   * Error message to display (overrides validation error if provided)
   */
  errorMessage?: string | null
  /**
   * Success message to display when email is valid
   */
  successMessage?: string
  /**
   * RTL support
   */
  isRTL?: boolean
  /**
   * Whether to enable automatic validation
   */
  enableValidation?: boolean
  /**
   * Custom validation function (overrides default if provided)
   */
  onValidate?: (email: string) => EmailValidationResult | null
  /**
   * Translation function for error messages
   */
  t?: TranslationFunction
  /**
   * Debounce delay for showing errors (in milliseconds)
   * Default: 500ms
   */
  errorDebounceDelay?: number
}

const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  (
    {
      className,
      type = "email",
      touched = false,
      errorMessage,
      successMessage,
      isRTL = false,
      disabled,
      value,
      enableValidation = true,
      onValidate,
      errorDebounceDelay = 500,
      t,
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const inputId = React.useId()
    const errorId = `${inputId}-error`
    const successId = `${inputId}-success`
    const [internalTouched, setInternalTouched] = React.useState(false)
    const [validationError, setValidationError] = React.useState<string | null>(null)
    const [showValidation, setShowValidation] = React.useState(false)
    const [showErrors, setShowErrors] = React.useState(false)
    const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const validationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const emailValue = value ? String(value) : ''
    const hasText = emailValue.trim().length > 0
    const isTouched = touched || internalTouched

    // Perform validation (always runs)
    React.useEffect(() => {
      if (enableValidation && isTouched && emailValue) {
        const validationResult = onValidate 
          ? onValidate(emailValue) 
          : validateEmail(emailValue, t)
        
        if (validationResult) {
          setValidationError(validationResult.error)
          // Show validation immediately for success
          if (validationResult.isValid) {
            setShowValidation(true)
          } else {
            // Don't show validation for errors yet (will be handled by debounce)
            setShowValidation(false)
          }
        }
      } else if (!emailValue && isTouched) {
        setValidationError(null)
        setShowValidation(false)
      }
    }, [emailValue, isTouched, enableValidation, onValidate, t])

    // Debounce error display - only show errors after user stops typing
    React.useEffect(() => {
      if (!isTouched || !emailValue.trim()) {
        setShowErrors(false)
        return
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setShowErrors(true)
      }, errorDebounceDelay)

      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    }, [emailValue, isTouched, errorDebounceDelay])

    // Determine error state (only show after delay and if field has value)
    const finalErrorMessage = errorMessage || validationError
    const hasValue = emailValue.trim().length > 0
    const hasError = showErrors && isTouched && hasValue && finalErrorMessage
    const isValid = showValidation && isTouched && !finalErrorMessage && hasValue

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalTouched(true)
      if (onChange) {
        onChange(e)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setInternalTouched(true)
      setShowValidation(true)
      if (onBlur) {
        onBlur(e)
      }
    }

    // Get input styling classes
    const getInputClasses = () => {
      const baseClasses = "rounded-xl placeholder:text-gray-400 transition-colors w-full min-w-0 h-[55px] pl-4 !text-[18px] md:!text-[18px] font-medium outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
      const bgClasses = "bg-gray-50 focus:bg-gray-100"
      const textClasses = "text-gray-700"
      
      return cn(baseClasses, bgClasses, textClasses, className)
    }

    // Get suffix icon (check mark for valid email)
    const getSuffixIcon = () => {
      if (isValid) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 25,
              mass: 0.8
            }}
            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none`}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </motion.div>
        )
      }
      return null
    }

    return (
      <div className="w-full">
        <div className="relative">
          <input
            type={type}
            data-slot="email-input"
            id={inputId}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={
              (hasError && errorId) || (isValid && successId) ? `${errorId} ${successId}` : undefined
            }
            className={getInputClasses()}
            ref={ref}
            disabled={disabled}
            dir="ltr" // Emails are always LTR
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />
          <AnimatePresence>
            {getSuffixIcon()}
          </AnimatePresence>
        </div>

        {/* Message Container */}
        <div className="px-0 pt-1 flex flex-col items-start justify-center gap-1 min-h-[20px]">
          <AnimatePresence mode="wait">
            {/* Error Message */}
            {hasError && finalErrorMessage && (
              <motion.p
                key="error"
                id={errorId}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-red-500 pl-4"
                role="alert"
              >
                {finalErrorMessage}
              </motion.p>
            )}

            {/* Success Message */}
            {isValid && successMessage && (
              <motion.p
                key="success"
                id={successId}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-green-500 pl-4"
              >
                {successMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }
)

EmailInput.displayName = "EmailInput"

export { EmailInput }
