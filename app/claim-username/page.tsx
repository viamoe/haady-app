'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { getNextOnboardingStep, ONBOARDING_STEPS } from '@/lib/onboarding'
import { motion, AnimatePresence } from 'framer-motion'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface FieldErrors {
  username?: string | null
}

export default function ClaimUsername() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  
  // Form states
  const [username, setUsername] = useState('')
  
  // Error states
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, error: authError } = await getCurrentUser()
        
        if (authError) {
          console.error('Auth error:', authError)
          router.push('/login')
          return
        }
        
        if (!user) {
          // Not logged in, redirect to login
          router.push('/login')
          return
        }
      
      setUserId(user.id)
      
      // Check if user is an admin first - admins skip onboarding
      // Check both admin_users table and if user exists in auth but not in public.users
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .single()
      
      // Also check if user exists in auth but not in public.users (indicates admin account)
      const { data: userCheckData, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()
      
      // If user is in admin_users table OR doesn't exist in public.users table, treat as admin
      const isAdmin = adminData || (userCheckError && userCheckError.code === 'PGRST116') // PGRST116 = no rows returned
      
      // If user is an admin, redirect to home (skip onboarding)
      if (isAdmin) {
        router.push('/home')
        return
      }
      
      // Check user's onboarding status and redirect to correct step
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username, onboarding_step, is_onboarded')
        .eq('id', user.id)
        .single()
      
      // Check junction tables for completion flags
      const { data: traitsData } = await supabase
        .from('user_traits')
        .select('trait_id')
        .eq('user_id', user.id)
      
      const { data: brandsData } = await supabase
        .from('user_brands')
        .select('brand_id')
        .eq('user_id', user.id)
      
      const { data: colorsData } = await supabase
        .from('user_colors')
        .select('color_id')
        .eq('user_id', user.id)
      
      const userDataWithFlags = {
        ...userData,
        has_personality_traits: (traitsData?.length || 0) > 0,
        has_favorite_brands: (brandsData?.length || 0) > 0,
        has_favorite_colors: (colorsData?.length || 0) > 0,
      }
      
      const nextStep = getNextOnboardingStep(userDataWithFlags || {})
      
      // If user should be on a different step, redirect them
      if (nextStep !== '/claim-username') {
        router.push(nextStep)
        return
      }
      
      setIsCheckingAuth(false)
      } catch (error: any) {
        console.error('Error checking auth:', error)
        if (error?.message?.includes('session') || error?.message?.includes('JWT') || error?.message?.includes('Auth session missing')) {
          router.push('/login')
          return
        }
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
    
    // Cleanup debounce timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [router])

  // Validation helpers
  const validateUsername = (username: string): string | null => {
    const trimmed = username.trim()
    
    if (!trimmed) return t('validation.usernameRequired')
    
    // Minimum length
    if (trimmed.length < 3) return t('validation.usernameMinLength')
    
    // Maximum length (typically 30 characters)
    if (trimmed.length > 30) {
      return t('validation.usernameMaxLength')
    }
    
    // Must start with a letter or number (not underscore or hyphen)
    if (!/^[a-zA-Z0-9]/.test(trimmed)) {
      return t('validation.usernameStartWithLetter')
    }
    
    // Must end with a letter or number (not underscore or hyphen)
    if (!/[a-zA-Z0-9]$/.test(trimmed)) {
      return t('validation.usernameEndWithLetter')
    }
    
    // Username should only contain letters, numbers, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return t('validation.usernameInvalidChars')
    }
    
    // No consecutive special characters (e.g., __ or --)
    if (/[_-]{2,}/.test(trimmed)) {
      return t('validation.usernameConsecutiveChars')
    }
    
    return null
  }

  // Check username availability
  const checkUsernameAvailability = async (usernameValue: string) => {
    const trimmed = usernameValue.trim()
    
    // Reset availability if input is too short or empty
    if (!trimmed || trimmed.length < 3) {
      setIsUsernameAvailable(null)
      setIsCheckingUsername(false)
      return
    }

    // Check validation rules first - don't check availability if validation fails
    const validationError = validateUsername(usernameValue)
    if (validationError) {
      setIsUsernameAvailable(false)
      setIsCheckingUsername(false)
      return
    }

    // Prevent multiple simultaneous checks
    if (isCheckingUsername) {
      return
    }

    // Only set checking state when we're actually going to make the API call
    setIsCheckingUsername(true)
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmed.toLowerCase())
        .maybeSingle()

      if (error) {
        console.error('Error checking username availability:', error)
        setIsUsernameAvailable(false)
        setIsCheckingUsername(false)
        return
      }

      // If data exists, check if it's the current user's username
      if (data && userId && data.id === userId) {
        // It's the current user's username, so it's available for them
        setIsUsernameAvailable(true)
      } else {
        // Username is available if no data found, not available if data exists
        setIsUsernameAvailable(!data)
      }
    } catch (error) {
      console.error('Error checking username availability:', error)
      setIsUsernameAvailable(false)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  // Validate field on blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field)
    if (field === 'username' && username.trim().length >= 3) {
      // Only check availability if validation passes
      const validationError = validateUsername(username)
      if (!validationError) {
        checkUsernameAvailability(username)
      }
    }
  }

  // Validate single field
  const validateField = (field: string) => {
    let error: string | null = null
    
    switch (field) {
      case 'username':
        error = validateUsername(username)
        break
    }
    
    setErrors(prev => ({ ...prev, [field]: error }))
    return error
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {}
    
    newErrors.username = validateUsername(username)
    
    setErrors(newErrors)
    setTouched({ username: true })
    
    // Also check availability
    if (!newErrors.username) {
      checkUsernameAvailability(username)
    }
    
    return !Object.values(newErrors).some(error => error !== null) && isUsernameAvailable === true
  }

  // Check if field is valid
  const isFieldValid = (field: keyof FieldErrors): boolean => {
    if (!touched[field]) return false
    if (errors[field]) return false
    
    switch (field) {
      case 'username':
        return username.trim().length >= 3 && isUsernameAvailable === true
      default:
        return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !userId || isUsernameAvailable !== true) {
      if (isUsernameAvailable === false) {
        toast.error(locale === 'ar' ? 'اسم المستخدم غير متاح' : 'Username is not available')
      }
      return
    }
    
    setIsLoading(true)

    try {
      // Update username in database and mark onboarding as complete
      const { error } = await supabase
        .from('users')
        .update({
          username: username.trim().toLowerCase(),
          onboarding_step: ONBOARDING_STEPS.PERSONALITY_TRAITS, // Move to step 3 (Personality Traits)
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      toast.success(locale === 'ar' ? 'تم حفظ اسم المستخدم بنجاح' : 'Username saved successfully')
      
      // Redirect to next onboarding step (Personality Traits)
      router.push('/personality-traits')
    } catch (error: any) {
      toast.error(t('toast.errorOccurred'), {
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      // Update onboarding step - move to next step (Personality Traits)
      // Note: Username is required, so this shouldn't normally be skipped
      await supabase
        .from('users')
        .update({ 
          onboarding_step: ONBOARDING_STEPS.PERSONALITY_TRAITS,
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
      
      // Redirect to next onboarding step
      const nextStep = getNextOnboardingStep({ username: null, onboarding_step: ONBOARDING_STEPS.PERSONALITY_TRAITS })
      router.push(nextStep)
    } catch (error) {
      router.push('/home')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to get input className based on error/success state
  const getInputClassName = (field: keyof FieldErrors) => {
    const hasError = touched[field] && errors[field]
    const isValid = isFieldValid(field)
    const textAlign = isRTL ? 'text-right' : 'text-left'
    const baseClasses = `h-12 bg-white rounded-xl text-gray-900 placeholder:text-gray-400 transition-colors ${textAlign}`
    
    let borderClasses: string
    if (hasError || (touched[field] && isUsernameAvailable === false)) {
      borderClasses = 'border-red-500 hover:border-red-600 focus:border-red-500 focus-visible:border-red-500 focus:ring-red-500/20 focus-visible:ring-red-500/50 focus-visible:ring-[3px]'
    } else if (isValid) {
      borderClasses = 'border-green-500 hover:border-green-600 focus:border-green-500 focus-visible:border-green-500 focus:ring-green-500/20 focus-visible:ring-green-500/50 focus-visible:ring-[3px]'
    } else {
      borderClasses = 'border-gray-200 hover:border-orange-400 hover:border-2 focus:border-orange-500 focus-visible:border-orange-500 focus:ring-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:ring-[3px]'
    }
    
    return `${baseClasses} ${borderClasses}`
  }

  // Error message component
  const ErrorMessage = ({ message }: { message: string | null | undefined }) => {
    if (!message) return null
    return (
      <div className="mt-1.5 text-red-500 text-xs font-medium">
        <span>{message}</span>
      </div>
    )
  }

  // Success message component
  const SuccessMessage = ({ message }: { message: string }) => {
    return (
      <div className="mt-1.5 text-green-500 text-xs font-medium">
        <span>{message}</span>
      </div>
    )
  }

  // Field validation feedback component
  const FieldFeedback = ({ field, successMessage }: { field: keyof FieldErrors; successMessage: string }) => {
    // Show validation errors first
    if (touched[field] && errors[field]) {
      return <ErrorMessage message={errors[field]} />
    }
    
    // Show checking spinner
    if (touched[field] && isCheckingUsername) {
      return (
        <div className="mt-1.5 flex items-center gap-2 text-gray-500 text-xs font-medium">
          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
          <span>{locale === 'ar' ? 'جارٍ التحقق من توفر اسم المستخدم...' : 'Checking username availability...'}</span>
        </div>
      )
    }
    
    // Show unavailable message
    if (touched[field] && isUsernameAvailable === false && !errors[field]) {
      return <ErrorMessage message={locale === 'ar' ? 'اسم المستخدم غير متاح' : 'Username is not available'} />
    }
    
    // Show success message
    if (isFieldValid(field)) {
      return <SuccessMessage message={successMessage} />
    }
    
    return null
  }

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-200 to-orange-400">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-200 via-50% to-orange-400" />
      <div className="absolute inset-0 bg-gradient-to-tr from-rose-200/40 via-transparent to-purple-200/30" />
      
      {/* Logo */}
      <div className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} z-20`}>
        <img src={HAADY_LOGO_URL} alt="Haady" className="w-14 h-14 cursor-pointer" />
      </div>

      {/* Language Switcher */}
      <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} z-20`}>
        <LanguageSwitcher />
      </div>

      {/* Centered Card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white rounded-4xl shadow-2xl shadow-gray-900/10 p-8 sm:p-10"
          >
            {/* Header */}
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('auth.stepClaimUsername')}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`text-gray-400 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {locale === 'ar' 
                ? 'اختر اسم مستخدم فريد لك. يمكنك تغييره لاحقاً.'
                : 'Choose a unique username for yourself. You can change it later.'}
            </motion.p>

            {/* Username Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Username - Required */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="username" className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.username')} <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('auth.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setUsername(newValue)
                      
                      // Reset availability state when input changes (but keep checking state if already checking)
                      setIsUsernameAvailable(null)
                      
                      // Clear previous timeout
                      if (debounceTimeoutRef.current) {
                        clearTimeout(debounceTimeoutRef.current)
                        debounceTimeoutRef.current = null
                      }
                      
                      // Only reset checking state if we're not currently checking
                      // This prevents the spinner from blinking
                      if (!isCheckingUsername) {
                        setIsCheckingUsername(false)
                      }
                      
                      // Validate immediately
                      validateField('username')
                      
                      // Debounce username availability check (only if validation passes)
                      const trimmed = newValue.trim()
                      if (trimmed.length >= 3) {
                        // Check validation before setting timeout
                        const validationError = validateUsername(newValue)
                        if (!validationError && !isCheckingUsername) {
                          debounceTimeoutRef.current = setTimeout(() => {
                            checkUsernameAvailability(newValue)
                          }, 500)
                        }
                      } else {
                        // If input is too short, make sure checking is false
                        setIsCheckingUsername(false)
                      }
                    }}
                    onBlur={() => handleBlur('username')}
                    className={`${getInputClassName('username')} ${(isFieldValid('username') || isCheckingUsername || (touched.username && isUsernameAvailable === false)) ? (isRTL ? 'ps-10 sm:ps-24' : 'pe-10 sm:pe-24') : ''}`}
                    dir="ltr"
                    disabled={isCheckingUsername}
                  />
                  {/* Spinner while checking */}
                  {isCheckingUsername && (
                    <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 flex items-center gap-2`}>
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                      <span className="text-xs text-gray-500 font-medium hidden sm:inline whitespace-nowrap">
                        {locale === 'ar' ? 'جارٍ التحقق...' : 'Checking...'}
                      </span>
                    </div>
                  )}
                  {/* Success icon */}
                  {!isCheckingUsername && isFieldValid('username') && (
                    <CheckCircle2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-green-500`} />
                  )}
                  {/* Error icon */}
                  {!isCheckingUsername && touched.username && isUsernameAvailable === false && !errors.username && (
                    <XCircle className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-red-500`} />
                  )}
                  {/* Validation error icon */}
                  {!isCheckingUsername && touched.username && errors.username && (
                    <XCircle className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-red-500`} />
                  )}
                </div>
                <FieldFeedback field="username" successMessage={t('validation.usernameValid')} />
              </motion.div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || isCheckingUsername || isUsernameAvailable !== true}
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                  </div>
                ) : (
                  <span>{locale === 'ar' ? 'متابعة' : 'Continue'}</span>
                )}
              </Button>

              {/* Skip Button */}
              <button
                type="button"
                onClick={handleSkip}
                disabled={isLoading}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 cursor-pointer py-2"
              >
                {locale === 'ar' ? 'تخطي الآن' : 'Skip for now'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

