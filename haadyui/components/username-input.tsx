'use client'

import * as React from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../utils/cn"

export interface UsernameValidationResult {
  isValid: boolean
  error: string | null
}

export type TranslationFunction = (key: string) => string

/**
 * Reserved words that cannot be used as usernames
 * Includes system routes and common reserved terms to prevent URL conflicts
 */
export const RESERVED_USERNAMES = [
  // System routes
  'home', 'login', 'logout', 'signup', 'signin', 'signout',
  'register', 'auth', 'callback', 'verify', 'verify-email', 'verify-email-otp',
  'complete-profile', 'personality-traits', 'favorite-brands', 'favorite-colors',
  'create-account', 'forgot-password', 'reset-password', 'phone',
  'profile', 'settings', 'account', 'dashboard', 'notifications',
  'messages', 'inbox', 'search', 'explore', 'discover',
  'wishlist', 'gifts', 'my-gifts', 'orders', 'checkout', 'cart',
  
  // API and system
  'api', 'admin', 'administrator', 'support', 'haady',
  'www', 'mail', 'email', 'root', 'system', 'test', 'testing',
  'null', 'undefined', 'true', 'false',
  
  // Common pages
  'about', 'contact', 'help', 'faq', 'terms', 'privacy', 'legal',
  'blog', 'news', 'press', 'careers', 'jobs',
  
  // Reserved for future use
  'store', 'stores', 'shop', 'shops', 'business', 'merchant', 'merchants',
  'seller', 'sellers', 'buyer', 'buyers', 'user', 'users',
  'gift', 'send', 'receive', 'payments', 'billing', 'subscription',
  'premium', 'pro', 'plus', 'vip', 'official', 'verified',
]

/**
 * Validates a username according to standard rules:
 * - Length: 4–12 characters
 * - Allowed: a–z, 0–9, underscore _, period .
 * - No spaces
 * - Must start with a letter
 * - Must end with letter/number
 * - No consecutive separators (.., __, ._, _.)
 * - Not all numbers
 * - Not a reserved word
 * 
 * @param username - The username to validate
 * @param t - Optional translation function for error messages
 */
export function validateUsername(
  username: string,
  t?: TranslationFunction
): UsernameValidationResult {
  const trimmed = username.trim()
  
  if (!trimmed) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameRequired') : 'Username is required' 
    }
  }
  
  // Check for spaces
  if (/\s/.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameNoSpaces') : 'Username cannot contain spaces' 
    }
  }
  
  // Minimum length
  if (trimmed.length < 4) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameMinLength') : 'Username must be at least 4 characters' 
    }
  }
  
  // Maximum length
  if (trimmed.length > 12) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameMaxLength') : 'Username must be 12 characters or less' 
    }
  }
  
  // Must start with a letter
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameStartWithLetter') : 'Username must start with a letter' 
    }
  }
  
  // Must end with a letter or number
  if (!/[a-zA-Z0-9]$/.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameEndWithLetter') : 'Username must end with a letter or number' 
    }
  }
  
  // Only letters, numbers, underscores, and periods
  if (!/^[a-zA-Z0-9_.]+$/.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameInvalidChars') : 'Username can only contain letters, numbers, underscores, and periods' 
    }
  }
  
  // No consecutive separators (.., __, ._, _.)
  if (/[._]{2,}|\._|_\./.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameConsecutiveSeparators') : 'Username cannot have consecutive separators (.., __, ._, _.)' 
    }
  }
  
  // Not all numbers
  if (/^\d+$/.test(trimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameNotAllNumbers') : 'Username cannot be all numbers' 
    }
  }
  
  // Check reserved words (case-insensitive)
  const lowerTrimmed = trimmed.toLowerCase()
  if (RESERVED_USERNAMES.includes(lowerTrimmed)) {
    return { 
      isValid: false, 
      error: t ? t('validation.usernameReserved') : 'This username is reserved and cannot be used' 
    }
  }
  
  return { isValid: true, error: null }
}

/**
 * Generates username suggestions based on the input username
 * @param username - The base username to generate suggestions from
 * @param maxSuggestions - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggested usernames
 */
export function suggestUsernames(username: string, maxSuggestions: number = 5): string[] {
  const trimmed = username.trim().toLowerCase()
  const suggestions: string[] = []
  const seen = new Set<string>()

  // Helper to add unique suggestions
  const addSuggestion = (suggestion: string) => {
    const clean = suggestion.toLowerCase().trim()
    // Ensure it meets minimum length requirement
    if (clean.length >= 4 && clean.length <= 12 && !seen.has(clean)) {
      // Validate it matches username rules
      if (/^[a-zA-Z]/.test(clean) && /[a-zA-Z0-9]$/.test(clean) && /^[a-zA-Z0-9_.]+$/.test(clean) && !/[._]{2,}|\._|_\./.test(clean) && !/^\d+$/.test(clean) && !RESERVED_USERNAMES.includes(clean)) {
        suggestions.push(clean)
        seen.add(clean)
      }
    }
  }

  // If input is too short, pad it (ensure it starts with a letter)
  if (trimmed.length < 4) {
    // If it doesn't start with a letter, prepend 'a'
    const base = /^[a-zA-Z]/.test(trimmed) ? trimmed : `a${trimmed}`
    const padded = base.padEnd(4, '1')
    if (padded !== trimmed) addSuggestion(padded)
  }

  // Original (if valid)
  if (trimmed.length >= 4 && trimmed.length <= 12) {
    addSuggestion(trimmed)
  }

  // Add numbers (1-9)
  for (let i = 1; i <= 9 && suggestions.length < maxSuggestions; i++) {
    addSuggestion(`${trimmed}${i}`)
  }

  // Add underscore with numbers
  for (let i = 1; i <= 3 && suggestions.length < maxSuggestions; i++) {
    addSuggestion(`${trimmed}_${i}`)
  }

  // Add period with numbers
  for (let i = 1; i <= 3 && suggestions.length < maxSuggestions; i++) {
    addSuggestion(`${trimmed}.${i}`)
  }

  // Shortened versions (if long enough)
  if (trimmed.length > 6) {
    addSuggestion(trimmed.substring(0, trimmed.length - 1))
    addSuggestion(trimmed.substring(0, trimmed.length - 2))
  }

  // Add letter prefix with numbers (to ensure it starts with a letter)
  const firstLetter = trimmed.charAt(0)
  if (/^[a-zA-Z]/.test(firstLetter)) {
    for (let i = 1; i <= 3 && suggestions.length < maxSuggestions; i++) {
      addSuggestion(`${firstLetter}${i}${trimmed.substring(1)}`)
    }
  }

  // Add common suffixes
  const suffixes = ['x', 'xx', '2024', '2025']
  for (const suffix of suffixes) {
    if (suggestions.length >= maxSuggestions) break
    addSuggestion(`${trimmed}${suffix}`)
  }

  return suggestions.slice(0, maxSuggestions)
}

export interface UsernameInputProps extends Omit<React.ComponentProps<"input">, "prefix" | "suffix"> {
  /**
   * Whether the username is currently being checked for availability
   */
  isChecking?: boolean
  /**
   * Whether the username is available (true), unavailable (false), or unknown (null)
   */
  isAvailable?: boolean | null
  /**
   * Whether the input has been touched/interacted with
   */
  touched?: boolean
  /**
   * Error message to display (overrides validation error if provided)
   */
  errorMessage?: string | null
  /**
   * Success message to display when username is valid
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
  onValidate?: (username: string) => UsernameValidationResult | null
  /**
   * Translation function for error messages
   */
  t?: TranslationFunction
}

const UsernameInput = React.forwardRef<HTMLInputElement, UsernameInputProps>(
  (
    {
      className,
      type = "text",
      isChecking = false,
      isAvailable = null,
      touched = false,
      errorMessage,
      successMessage,
      isRTL = false,
      disabled,
      value,
      enableValidation = true,
      onValidate,
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
    const [showSpinner, setShowSpinner] = React.useState(false)
    const [showValidation, setShowValidation] = React.useState(false)
    const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const validationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const usernameValue = value ? String(value) : ''
    const hasText = usernameValue.trim().length > 0
    const isTouched = touched || internalTouched

    // Perform validation (always runs, but results are delayed)
    React.useEffect(() => {
      if (enableValidation && isTouched && usernameValue) {
        const validationResult = onValidate 
          ? onValidate(usernameValue) 
          : validateUsername(usernameValue, t)
        
        if (validationResult) {
          setValidationError(validationResult.error)
        } else {
          setValidationError(null)
        }
      } else if (!usernameValue && isTouched) {
        setValidationError(null)
      }
    }, [usernameValue, isTouched, enableValidation, onValidate, t])

    // Determine error state (only show after delay)
    const finalErrorMessage = errorMessage || validationError
    const hasError = showValidation && isTouched && (finalErrorMessage || isAvailable === false)
    const isValid = showValidation && isTouched && !finalErrorMessage && isAvailable === true
    

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e)
      }
      if (!internalTouched) {
        setInternalTouched(true)
      }
      
      // Hide spinner and validation when user starts typing
      setShowSpinner(false)
      setShowValidation(false)
      
      // Clear previous timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
      
      // Show spinner after 250ms, validation after 500ms of no typing
      if (e.target.value.trim().length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          setShowSpinner(true)
        }, 250)
        
        validationTimeoutRef.current = setTimeout(() => {
          setShowValidation(true)
        }, 500)
      } else {
        setShowSpinner(false)
        setShowValidation(false)
      }
    }
    
    // Cleanup timeouts on unmount
    React.useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current)
        }
      }
    }, [])
    
    // Hide spinner when isChecking becomes false or validation completes
    React.useEffect(() => {
      if (!isChecking || hasError || isValid) {
        setShowSpinner(false)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    }, [isChecking, hasError, isValid])
    
    // Show validation immediately when external errorMessage or isAvailable changes
    React.useEffect(() => {
      if (errorMessage !== undefined || isAvailable !== null) {
        setShowValidation(true)
        // Hide spinner immediately when availability is determined
        if (isAvailable !== null) {
          setShowSpinner(false)
        }
      }
    }, [errorMessage, isAvailable])
    
    // Show validation immediately on blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (onBlur) {
        onBlur(e)
      }
      setInternalTouched(true)
      setShowValidation(true) // Show validation immediately on blur
    }

    // No border or focus ring
    const getStateClasses = () => {
      return "border-0 focus:border-0 focus-visible:border-0 focus:outline-none focus-visible:outline-none"
    }

    // Get suffix icon based on state
    const getSuffixIcon = () => {
      // Priority 1: Show check icon when username is available (even if still checking)
      if (isAvailable === true && isTouched && !finalErrorMessage) {
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 flex items-center justify-center`}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </motion.div>
        )
      }
      // Priority 2: Show spinner when checking OR when user stopped typing (with delay)
      if (isChecking || (showSpinner && hasText && !hasError && !isValid)) {
        return (
          <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 flex items-center justify-center`}>
            <div className={cn(
              "animate-spin rounded-full border-2 border-current border-t-transparent",
              hasError ? "h-5 w-5 text-red-400" :
              isValid ? "h-5 w-5 text-green-400" :
              "h-5 w-5 text-gray-400"
            )} />
          </div>
        )
      }
      // Priority 3: Show check icon when valid (fallback)
      if (isValid) {
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 flex items-center justify-center`}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </motion.div>
        )
      }
      // Priority 4: Show error icon
      if (hasError) {
        return (
          <XCircle className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-red-500`} />
        )
      }
      return null
    }

    const suffixIcon = getSuffixIcon()
    const hasSuffix = suffixIcon !== null

    return (
      <div className="space-y-2">
        <div className={cn(
          "relative w-full rounded-xl transition-colors flex flex-col h-fit",
          hasError ? "bg-red-50" : 
          isValid ? "bg-green-50" : 
          "bg-white"
        )}>
          {/* Input Container */}
          <div className="relative">
            {/* haady.app/@ prefix */}
            <span className={cn(
              "absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-3xl font-bold z-10",
              hasError ? "text-red-400" : 
              isValid ? "text-green-400" : 
              "text-gray-400"
            )}>
              haady.app/<span className={
                hasError ? "text-red-600" : 
                isValid ? "text-green-500" : 
                hasText ? "text-gray-900" : "text-gray-300"
              }>@</span> 
            </span>
            <input
              type={type}
              data-slot="username-input"
              id={inputId}
              aria-invalid={hasError ? "true" : undefined}
              aria-describedby={
                (hasError && errorId) || (isValid && successId) ? `${errorId} ${successId}` : undefined
              }
              className={cn(
                "rounded-xl placeholder:text-gray-300 transition-colors",
                "w-full min-w-0 py-3 text-3xl font-bold outline-none bg-transparent",
                hasError ? "text-red-600 focus:bg-red-50" : 
                isValid ? "text-green-500 focus:bg-green-50" : 
                "text-gray-900 focus:bg-gray-50",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                isRTL ? "text-right" : "text-left",
                "pl-[204px]",
                hasSuffix && (isRTL ? "ps-10 sm:ps-24" : "pr-[18px]"),
                getStateClasses(),
                className
              )}
              ref={ref}
              disabled={disabled || isChecking}
              dir="ltr" // Usernames are always LTR
              maxLength={12}
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              {...props}
            />
            {suffixIcon}
          </div>

          {/* Message Container - Inside the same div with same bg */}
          <div className="px-4 pb-2 flex flex-col items-center justify-center gap-2 min-h-[24px]">
            <AnimatePresence mode="wait">
              {/* Error Message */}
              {hasError && finalErrorMessage && (
                <motion.p
                  key="error"
                  id={errorId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-red-600 text-xs font-medium"
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
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-green-500 text-xs font-medium"
                >
                  {successMessage}
                </motion.p>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    )
  }
)

UsernameInput.displayName = "UsernameInput"

export { UsernameInput }
