'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { getNextOnboardingStep } from '@/lib/onboarding'
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Phone } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { motion, AnimatePresence } from 'framer-motion'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

type AuthStep = 'email' | 'verify-email'

interface FieldErrors {
  email?: string | null
}

export default function JoinHaady() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [step, setStep] = useState<AuthStep>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // Form states
  const [email, setEmail] = useState('')
  
  // Error states
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Validation helpers
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t('validation.emailRequired')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return t('validation.emailInvalid')
    return null
  }

  // Form validation
  const validateForm = (): boolean => {
    const emailError = validateEmail(email)
    
    setErrors({ email: emailError })
    setTouched({ email: true })
    
    return !emailError
  }

  // Validate individual field
  const validateField = (field: keyof FieldErrors) => {
    if (field === 'email') {
      setErrors(prev => ({ ...prev, email: validateEmail(email) }))
    }
  }

  // Handle blur events
  const handleBlur = (field: keyof FieldErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field)
  }

  // Check if field is valid (touched and no error)
  const isFieldValid = (field: keyof FieldErrors): boolean => {
    return touched[field] && !errors[field] && (field === 'email' ? email.trim().length > 0 : false)
  }

  // Reset form
  const resetForm = () => {
    setErrors({})
    setTouched({})
  }

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Auth check error:', authError)
          setIsCheckingAuth(false)
          return
        }
        
        if (user) {
          // Check if user is an admin first
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .eq('is_active', true)
            .single()
          
          if (adminData) {
            router.push('/home')
            return
          }

          // Check user's onboarding status
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, username, onboarding_step, is_onboarded')
            .eq('id', user.id)
            .single()
          
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
          router.push(nextStep)
          return
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  // Handle email magic link submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)

    try {
      // Send magic link via email OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      toast.success(t('toast.magicLinkSent') || 'Magic link sent!', {
        description: t('toast.checkEmailForLink') || 'Check your email to sign in.',
      })
      
      setStep('verify-email')
    } catch (error: any) {
      toast.error(t('toast.errorOccurred'), {
        description: error.message || t('toast.tryAgain'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle resend email
  const handleResendEmail = async () => {
    setIsResending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
      
      toast.success(t('toast.emailResent') || 'Email resent!')
    } catch (error: any) {
      toast.error(t('toast.errorOccurred'), {
        description: error.message,
      })
    } finally {
      setIsResending(false)
    }
  }

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(t('toast.googleSignInFailed'), {
        description: error.message || t('toast.errorOccurred'),
      })
      setIsLoading(false)
    }
  }

  // Handle phone sign in navigation
  const handlePhoneSignIn = () => {
    router.push('/phone')
  }

  // Helper to get input className
  const getInputClassName = (field: keyof FieldErrors): string => {
    let borderClasses: string
    
    if (errors[field] && touched[field]) {
      borderClasses = 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
    } else if (isFieldValid(field)) {
      borderClasses = 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
    } else {
      borderClasses = 'border-gray-200 hover:border-orange-400 hover:border-2 focus:border-orange-500 focus-visible:border-orange-500 focus:ring-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:ring-[3px]'
    }
    
    return `h-12 bg-white ${borderClasses} rounded-xl text-gray-900 placeholder:text-gray-400 transition-colors`
  }

  // Error/Success messages
  const ErrorMessage = ({ message }: { message: string | null | undefined }) => (
    message ? (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className={`text-sm text-red-500 ${isRTL ? 'text-right' : 'text-left'}`}
      >
        {message}
      </motion.p>
    ) : null
  )

  const SuccessMessage = ({ message }: { message: string }) => (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-sm text-green-500 ${isRTL ? 'text-right' : 'text-left'}`}
    >
      {message}
    </motion.p>
  )

  // Field feedback component
  const FieldFeedback = ({ field, successMessage }: { field: keyof FieldErrors; successMessage: string }) => {
    if (errors[field] && touched[field]) {
      return <ErrorMessage message={errors[field]} />
    }
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

  // Verify email step
  if (step === 'verify-email') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-200 via-50% to-orange-400" />
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-200/40 via-transparent to-purple-200/30" />
        
        <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} z-20`}>
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white rounded-4xl shadow-2xl shadow-gray-900/10 p-8 sm:p-10"
            >
              {/* Back Button and Logo */}
              <div className="mb-6 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    resetForm()
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {isRTL ? <ArrowRight className="w-5 h-5 text-gray-600" /> : <ArrowLeft className="w-5 h-5 text-gray-600" />}
                </button>
                <img src={HAADY_LOGO_URL} alt="Haady" className="w-14 h-14" />
              </div>

              {/* Email Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                  <Mail className="w-10 h-10 text-orange-500" />
                </div>
              </div>

              {/* Header */}
              <h1 className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center`}>
                {t('auth.checkYourEmail')}
              </h1>
              
              <p className="text-gray-500 mb-2 text-center">
                {t('auth.magicLinkSentTo') || "We've sent a magic link to"}
              </p>
              
              <p className="text-gray-900 font-semibold mb-6 text-center">
                {email}
              </p>

              <p className="text-gray-400 text-sm mb-8 text-center">
                {t('auth.clickLinkToSignIn') || 'Click the link in your email to sign in. The link will expire in 1 hour.'}
              </p>

              {/* Resend button */}
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-2">
                  {t('auth.didntReceive')}
                </p>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-sm hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? (t('auth.resending') || 'Resending...') : (t('auth.resendEmail') || 'Resend email')}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  // Main email form
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-200 via-50% to-orange-400" />
      <div className="absolute inset-0 bg-gradient-to-tr from-rose-200/40 via-transparent to-purple-200/30" />
      
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
            {/* Logo */}
            <div className="mb-6 flex justify-start">
              <img 
                src={HAADY_LOGO_URL}
                alt="Haady"
                className="w-14 h-14"
              />
            </div>

            {/* Header */}
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
            >
              {t('auth.joinHaady')}
            </motion.h1>
            
            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mb-8"
            >
              <p className="text-gray-400 text-lg font-medium">
                {t('auth.joinSubtitle')}
              </p>
            </motion.div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (touched.email) validateField('email')
                    }}
                    onBlur={() => handleBlur('email')}
                    className={`${getInputClassName('email')} ${isFieldValid('email') ? (isRTL ? 'ps-10' : 'pe-10') : ''}`}
                  />
                  <AnimatePresence>
                    {isFieldValid('email') && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2`}
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <FieldFeedback field="email" successMessage={t('validation.emailValid')} />
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim() || validateEmail(email) !== null}
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('auth.sendingLink') || 'Sending link...'}</span>
                    </span>
                  ) : (
                    <span>{t('auth.continueWithEmail') || 'Continue with Email'}</span>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">{t('auth.orContinueWith')}</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              {/* Continue with Phone */}
              <button
                type="button"
                onClick={handlePhoneSignIn}
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Phone className="w-5 h-5" />
                <span>{t('auth.continueWithPhone') || 'Continue with Phone'}</span>
              </button>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>{t('auth.google')}</span>
              </button>
            </div>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-gray-500 leading-relaxed">
              {t('auth.termsContinuing') || 'By continuing you are agreeing to the Haady'}{' '}
              <a href="#" className="text-gray-700 underline hover:text-gray-900 cursor-pointer">{t('auth.termsAndConditions')}</a>
              {' '}{t('auth.and')}{' '}
              <a href="#" className="text-gray-700 underline hover:text-gray-900 cursor-pointer">{t('auth.privacyPolicy')}</a>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
