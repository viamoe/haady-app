'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button } from '@haady/ui'
import { isAdminUser, getUserWithPreferences, updateUser, upsertUser, getUserById } from '@/lib/db/client-repos'
import { toast } from '@/lib/toast'
import { getNextOnboardingStep, PROFILE_REDIRECT } from '@/lib/onboarding'
import { ArrowLeft, ArrowRight, Mail, Globe } from 'lucide-react'
import { useLocale } from '@/i18n/context'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface FieldErrors {
  otp?: string | null
}

function VerifyEmailOtpContent() {
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get email, username, and flow from query params
  const emailFromQuery = searchParams?.get('email') || null
  const usernameFromQuery = searchParams?.get('username') || null
  const flow = searchParams?.get('flow') || 'signup' // Default to signup if not specified
  
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Error states
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, error: authError } = await getCurrentUser()
        
        if (authError) {
          console.error('Auth error:', authError)
          setIsCheckingAuth(false)
          return
        }
        
        if (user) {
          // Check if user is an admin first - admins skip onboarding
          const { isAdmin, error: adminError } = await isAdminUser(user.id)
          
          if (adminError) {
            console.error('Error checking admin status:', adminError)
          }
          
          if (isAdmin) {
            router.push('/')
            return
          }

          // Check user's onboarding status
          const { data: userDataWithFlags, error: userError } = await getUserWithPreferences(user.id)
          
          if (userError) {
            // Extract error message properly from AppError type
            let errorCode = 'UNKNOWN'
            let errorMessage = 'Unknown user loading error'
            
            if (typeof userError === 'object' && userError !== null) {
              const err = userError as any
              errorCode = err.code || 'UNKNOWN'
              
              // AppError has a message field that's a string
              if (err.message && typeof err.message === 'string') {
                errorMessage = err.message
              } else if (err.message && typeof err.message === 'object') {
                // If message is an object, stringify it
                errorMessage = JSON.stringify(err.message)
              } else if (userError instanceof Error) {
                errorMessage = userError.message
              } else {
                errorMessage = String(userError)
              }
            } else if (userError instanceof Error) {
              errorMessage = userError.message
            } else {
              errorMessage = String(userError)
            }
            
            console.warn('User profile not found (expected for new users):', JSON.stringify({ 
              code: errorCode, 
              message: errorMessage 
            }))
            setIsCheckingAuth(false)
            return
          }
          
          // User exists and has profile - redirect to appropriate onboarding step
          if (userDataWithFlags) {
            const nextStep = getNextOnboardingStep((userDataWithFlags as Record<string, unknown>) || {})
            router.push(nextStep)
            return
          }
        }
        
        setIsCheckingAuth(false)
      } catch (error) {
        console.error('Error checking auth:', error)
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  // Validation
  const validateOtp = (otpArray: string[]): string | null => {
    const otpString = otpArray.join('')
    if (otpString.length !== 6) {
      return t('validation.otpRequired') || 'Please enter the complete 6-digit code'
    }
    if (!/^\d{6}$/.test(otpString)) {
      return t('validation.otpRequired') || 'Please enter a valid 6-digit code'
    }
    return null
  }

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '')
    
    if (digit.length > 1) {
      // Handle paste: fill multiple inputs
      const digits = digit.slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d
        }
      })
      setOtp(newOtp)
      setErrors(prev => ({ ...prev, otp: null }))
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
    } else {
      // Single digit input
      const newOtp = [...otp]
      newOtp[index] = digit
      setOtp(newOtp)
      setErrors(prev => ({ ...prev, otp: null }))

      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
    
    if (pastedData.length > 0) {
      const digits = pastedData.slice(0, 6).split('')
      const newOtp = [...otp]
      
      // Fill from the first input
      digits.forEach((d, i) => {
        if (i < 6) {
          newOtp[i] = d
        }
      })
      
      setOtp(newOtp)
      setErrors(prev => ({ ...prev, otp: null }))
      
      // Focus the last filled input or the last input
      const focusIndex = Math.min(digits.length - 1, 5)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const otpError = validateOtp(otp)
    
    if (otpError) {
      setErrors({ otp: otpError })
      setTouched(prev => ({ ...prev, otp: true }))
      return
    }

    setIsLoading(true)
    try {
      if (!emailFromQuery) {
        throw new Error('Email is required')
      }

      const otpString = otp.join('')

      // Verify email OTP
      // Note: Supabase deprecated 'signup' type, use 'email' for both signup and login flows
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailFromQuery.trim().toLowerCase(),
        token: otpString,
        type: 'email',
      })

      if (error) {
        // Log the full error object for debugging
        console.error('OTP verification error (Supabase):', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: (error as any)?.code,
          error: error, // Full error object
        })
        
        // Throw the original Supabase error to preserve error details
        throw error
      }
      
      if (!data?.user) {
        throw new Error('OTP verification failed: No user returned')
      }

      // User verified successfully
      if (data.user) {
        // Check if this is a new user or existing user
        const { data: userData, error: getUserError } = await getUserById(data.user.id)

        // NOT_FOUND is expected for new users or business users without regular profiles
        // Only throw if there's a different error
        if (getUserError && getUserError.code !== 'NOT_FOUND') {
          // Safely extract error details
          const errorCode = getUserError.code || 'UNKNOWN'
          let errorMessage = 'Failed to load user'
          
          if (getUserError.message) {
            if (typeof getUserError.message === 'string') {
              errorMessage = getUserError.message
            } else if (typeof getUserError.message === 'object') {
              try {
                errorMessage = JSON.stringify(getUserError.message)
              } catch {
                errorMessage = String(getUserError.message)
              }
            }
          }
          
          // Safely stringify the full error object
          let errorStringified = '{}'
          try {
            errorStringified = JSON.stringify(getUserError, null, 2)
          } catch {
            errorStringified = String(getUserError)
          }
          
          // Log with JSON.stringify to ensure proper serialization
          console.error('Error loading user profile (non-NOT_FOUND):', JSON.stringify({
            errorCode,
            errorMessage,
            errorStringified,
            userId: data.user.id,
            errorKeys: typeof getUserError === 'object' ? Object.keys(getUserError) : [],
            fullError: getUserError,
          }, null, 2))
          
          // Don't throw - log and continue (might be a transient issue)
          // The user profile creation will handle the case where userData is null
          console.warn(`⚠️ Non-NOT_FOUND error loading user profile for ${data.user.id}, but continuing with profile creation`)
        }
        
        // If userData is null and error is NOT_FOUND, this is expected (new user or business user)
        // Profile will be created in the next step

        // Check if user has a business profile (merchant/store owner)
        // This allows users with business accounts to also have regular Haady accounts
        let hasBusinessProfile = false
        try {
          const businessCheckResponse = await fetch('/api/users/check-business-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          })
          
          if (businessCheckResponse.ok) {
            const businessCheckData = await businessCheckResponse.json()
            if (businessCheckData.ok && businessCheckData.data?.hasBusinessProfile) {
              hasBusinessProfile = true
            }
          } else {
            // Log but don't fail - business profile check is optional
            const errorText = await businessCheckResponse.text().catch(() => 'Unknown error')
            console.warn('Could not check business profile - continuing anyway:', {
              status: businessCheckResponse.status,
              statusText: businessCheckResponse.statusText,
              error: errorText,
            })
          }
        } catch (error) {
          // Business profile check failed - log but continue
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.warn('Error checking business profile (non-blocking):', errorMsg)
        }

        // Get username from query params (from landing page flow)
        // We'll set it directly in the upsert - no need to claim via API first
        let usernameToSet: string | null = null
        if (usernameFromQuery) {
          usernameToSet = usernameFromQuery.trim().toLowerCase()
        }

        // Determine if this is a new user or existing user
        // New user: No entry in users table (userData is null)
        // Existing user: Has entry in users table (userData exists)
        const isNewUser = !userData

        if (isNewUser) {
          // NEW USER: Create users table entry + user_profile entry
          // This handles:
          // 1. Completely new users (no auth.users entry before OTP)
          // 2. Users with business profiles who need a regular Haady account
          try {
            // Create user_profile entry with username if available
            const userDataToUpsert: Record<string, unknown> = {}
            
            if (usernameToSet) {
              userDataToUpsert.username = usernameToSet
            }
            
            const { data: createdUser, error: upsertError } = await upsertUser(data.user.id, userDataToUpsert)

            if (upsertError) {
              console.error('Error creating user profile:', {
                error: upsertError,
                code: upsertError.code,
                message: upsertError.message,
                userId: data.user.id,
                hasBusinessProfile,
              })
              
              // Provide more specific error message based on error code
              let errorMessage = 'Failed to create user profile'
              if (upsertError.code === 'CONFLICT') {
                errorMessage = 'User profile already exists'
              } else if (upsertError.code === 'FORBIDDEN') {
                errorMessage = 'Permission denied - cannot create user profile'
              } else if (upsertError.message) {
                errorMessage = upsertError.message
              }
              
              throw new Error(errorMessage)
            }
            
            // Profile created successfully
          } catch (upsertErr) {
            // Re-throw with better context
            const errMsg = upsertErr instanceof Error ? upsertErr.message : 'Failed to create user profile'
            console.error('Failed to upsert user profile:', {
              userId: data.user.id,
              error: upsertErr,
              errorMessage: errMsg,
              hasBusinessProfile,
            })
            throw new Error(errMsg)
          }
        } else {
          // EXISTING USER: Only create/update user_profile entry (users table already exists)
          // Update user_profile - set username if provided and user doesn't have one
          const updateData: Record<string, unknown> = {}
          
          if (usernameToSet && !userData.username) {
            updateData.username = usernameToSet
          }
          
          const { error: updateError } = await updateUser(data.user.id, updateData)

          if (updateError) {
            console.error('Error updating user:', updateError)
          }
        }

        // Get user with preferences to check onboarding status
        const { data: userDataWithFlags, error: userPrefsError } = await getUserWithPreferences(data.user.id)
        
        if (userPrefsError) {
          console.error('Error loading user preferences:', userPrefsError)
          // Still redirect to onboarding step 1 if we can't load preferences
          router.push('/complete-profile')
          return
        }
        
        // Check if user is an admin
        const { isAdmin } = await isAdminUser(data.user.id)
        
        if (isAdmin) {
          router.push('/')
          return
        }
        
        const nextStep = getNextOnboardingStep((userDataWithFlags as Record<string, unknown>) || {})
        if (nextStep === PROFILE_REDIRECT) {
          const username = (userDataWithFlags as Record<string, unknown>)?.username as string | null
          router.push(username ? `/@${username}` : '/')
        } else {
          router.push(nextStep)
        }
      }
    } catch (error) {
      // Extract error message properly
      let errorMessage = t('toast.errorOccurred') || 'An error occurred'
      let errorCode = ''
      
      // Helper to safely extract error properties
      const safeExtract = (obj: any, key: string): string => {
        try {
          const value = obj?.[key]
          if (typeof value === 'string') return value
          if (typeof value === 'number') return String(value)
          if (value && typeof value === 'object') {
            try {
              return JSON.stringify(value)
            } catch {
              return String(value)
            }
          }
          return ''
        } catch {
          return ''
        }
      }
      
      // Helper to safely stringify error object
      const safeStringify = (obj: any): string => {
        try {
          if (obj === null || obj === undefined) return 'null/undefined'
          if (typeof obj === 'string') return obj
          if (typeof obj === 'number') return String(obj)
          if (obj instanceof Error) {
            return JSON.stringify({
              name: obj.name,
              message: obj.message,
              stack: obj.stack,
              ...Object.getOwnPropertyNames(obj).reduce((acc, key) => {
                try {
                  acc[key] = (obj as any)[key]
                } catch {
                  // Skip non-enumerable properties
                }
                return acc
              }, {} as Record<string, unknown>),
            }, null, 2)
          }
          return JSON.stringify(obj, null, 2)
        } catch {
          return String(obj)
        }
      }
      
      // Handle different error types
      if (error instanceof Error) {
        errorMessage = error.message || 'An unknown error occurred'
        errorCode = safeExtract(error, 'code') || safeExtract(error, 'status') || ''
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any
        
        // Extract error code
        errorCode = safeExtract(err, 'code') || safeExtract(err, 'status') || ''
        
        // Extract error message - handle nested objects
        const messageStr = safeExtract(err, 'message')
        const descStr = safeExtract(err, 'error_description')
        const errorStr = safeExtract(err, 'error')
        
        if (messageStr) {
          errorMessage = messageStr
        } else if (descStr) {
          errorMessage = descStr
        } else if (errorStr) {
          errorMessage = errorStr
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Log error for debugging
      console.error('OTP verification failed:', { code: errorCode, message: errorMessage })
      
      // Show user-friendly error messages
      const isExpired = errorMessage.toLowerCase().includes('expired') || 
                       errorMessage.toLowerCase().includes('invalid') || 
                       errorCode === 'token_expired' ||
                       errorCode === 'invalid_token' ||
                       errorMessage.toLowerCase().includes('token has expired')
      
      if (isExpired) {
        errorMessage = t('auth.otpExpired') || 'This code has expired. Please request a new one.'
        // Clear OTP inputs when expired
        setOtp(['', '', '', '', '', ''])
        // Reset resend timer to allow immediate resend
        setResendTimer(0)
      } else if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('too many')) {
        errorMessage = 'Too many attempts. Please wait a moment and try again.'
      } else if (errorMessage.toLowerCase().includes('invalid') && !isExpired) {
        errorMessage = t('auth.otpInvalid') || 'Invalid code. Please check and try again.'
      }
      
      toast.error(t('toast.otpVerificationFailed') || 'OTP verification failed', {
        description: errorMessage,
      })
      setErrors({ otp: errorMessage })
      setTouched(prev => ({ ...prev, otp: true }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !emailFromQuery) return

    setIsResending(true)
    try {
      // Resend OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: emailFromQuery.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) throw error

      toast.success(t('toast.otpResent') || 'OTP resent successfully')
      setResendTimer(60)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.errorOccurred')
      toast.error(t('toast.otpSendFailed') || 'Failed to resend OTP', {
        description: errorMessage,
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    setLocale(newLocale)
  }

  const handleBack = () => {
    // Go back to create-account or login page
    const backUrl = usernameFromQuery ? '/create-account' : '/login'
    const url = new URL(backUrl, window.location.origin)
    if (usernameFromQuery) {
      url.searchParams.set('username', usernameFromQuery)
    }
    router.push(url.toString())
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white">
        <header className="w-full">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-24 rounded-full" />
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
          <div className="w-full max-w-md px-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!emailFromQuery) {
    // No email provided, redirect to create-account
    router.push('/create-account')
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="w-full">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <img
                src={HAADY_LOGO_URL}
                alt="Haady"
                className="w-12 h-12"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLanguageToggle}
                size="lg"
                variant="outline"
                className="rounded-full bg-white hover:bg-gray-50 border-gray-200 shadow-sm hover:shadow-md w-12 h-12 p-0"
                title={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
                aria-label={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
              >
                <Globe className="w-5 h-5 text-gray-700" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
        <div className="w-full max-w-md px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Back Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                <span>{t('auth.back') || 'Back'}</span>
              </button>
            </div>

            {/* Email Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <Mail className="w-10 h-10 text-primary" />
              </div>
            </div>

            {/* Header */}
            <h1 className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center`}>
              {t('auth.enterOtp') || 'Enter verification code'}
            </h1>
            
            <p className="text-gray-500 mb-2 text-center">
              {t('auth.otpSubtitle') || 'We sent a 6-digit code to'}
            </p>
            
            <p className="text-gray-900 font-semibold mb-8 text-center">
              {emailFromQuery}
            </p>

            {/* OTP Input */}
            <div className="mb-6" data-testid="otp-input-wrapper">
              <div 
                className="flex justify-center gap-2"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    className={`w-14 h-[55px] text-center !text-[18px] md:!text-[18px] font-medium rounded-xl transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${
                      errors.otp && touched.otp
                        ? 'border-2 border-red-500 bg-red-50 text-red-700'
                        : 'border-0 bg-gray-50 focus:bg-gray-100 text-gray-700'
                    }`}
                    autoFocus={index === 0}
                    data-testid={`otp-input-${index}`}
                  />
                ))}
              </div>
              {errors.otp && touched.otp && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-red-500 mt-2 text-center pl-0"
                >
                  {errors.otp}
                </motion.p>
              )}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.join('').length !== 6}
              className="w-full h-12 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              data-testid="otp-verify-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('auth.verifying') || 'Verifying...'}</span>
                </span>
              ) : (
                <span>{t('auth.verify') || 'Verify'}</span>
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-2">
                {t('auth.didntReceive') || "Didn't receive the code?"}
              </p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending || resendTimer > 0}
                className="text-primary hover:text-primary/80 font-semibold text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                data-testid="otp-resend-btn"
              >
                {isResending
                  ? t('auth.resendingOtp') || 'Resending...'
                  : resendTimer > 0
                  ? (t('auth.resendOtpIn', { seconds: resendTimer }) || `Resend OTP in ${resendTimer}s`)
                  : t('auth.resendOtp') || 'Resend OTP'}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export default function VerifyEmailOtp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailOtpContent />
    </Suspense>
  )
}
