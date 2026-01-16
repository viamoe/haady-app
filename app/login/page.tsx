'use client'

import { useState, useEffect, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button, EmailInput } from '@haady/ui'
import { isAdminUser, getUserWithPreferences } from '@/lib/db/client-repos'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { getNextOnboardingStep, ONBOARDING_PATHS } from '@/lib/onboarding'
import { ArrowLeft, ArrowRight, Mail, Phone, Globe } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

type AuthStep = 'email' | 'verify-email'

function JoinHaadyContent() {
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    setLocale(newLocale)
  }
  
  const [step, setStep] = useState<AuthStep>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // Get username from query params (from landing page)
  const usernameFromQuery = searchParams?.get('username') || null
  
  // Form states
  const [email, setEmail] = useState('')
  

  // Form validation - check if email is valid using EmailInput validation
  const validateForm = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return email.trim().length > 0 && emailRegex.test(email.trim())
  }

  // Reset form
  const resetForm = () => {
    setEmail('')
  }

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, error: authError } = await getCurrentUser()
        
        if (authError) {
          console.error('Auth check error:', authError)
          setIsCheckingAuth(false)
          return
        }
        
        if (user) {
          // Check if user is an admin first
          const { isAdmin, error: adminError } = await isAdminUser(user.id)
          
          if (adminError) {
            console.error('Error checking admin status:', adminError)
          }
          
          if (isAdmin) {
            router.push('/home')
            return
          }

          // Check user's onboarding status
          const { data: userDataWithFlags, error: userError } = await getUserWithPreferences(user.id)
          
          if (userError) {
            // On login page, if user doesn't have a profile yet, that's expected
            // Allow them to continue with login instead of blocking
            // Only log as warning since this is a normal flow for new users
            const errorCode = (userError as any)?.code || 'UNKNOWN'
            const errorMessage = userError instanceof Error ? userError.message : String(userError) || 'Unknown user loading error'
            
            // Log as warning (not error) since user can still login
            console.warn('User profile not found (expected for new users):', JSON.stringify({ 
              code: errorCode, 
              message: errorMessage 
            }))
            
            // Don't block - allow user to continue with login
            setIsCheckingAuth(false)
            return
          }
          
          // User exists and has profile - redirect to appropriate onboarding step
          if (userDataWithFlags) {
            const nextStep = getNextOnboardingStep((userDataWithFlags as Record<string, unknown>) || {})
            router.push(nextStep)
            return
          }
          
          // No user data but no error - allow login
          setIsCheckingAuth(false)
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
      // Build redirect URL with username if present
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
      if (usernameFromQuery) {
        callbackUrl.searchParams.set('username', usernameFromQuery)
      }
      
      // Send magic link via email OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      })

      if (error) throw error

      toast.success(t('toast.magicLinkSent') || 'Magic link sent!', {
        description: t('toast.checkEmailForLink') || 'Check your email to sign in.',
      })
      
      setStep('verify-email')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('toast.tryAgain')
      toast.error(t('toast.errorOccurred'), {
        description: errorMessage,
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(t('toast.errorOccurred'), {
        description: errorMessage,
      })
    } finally {
      setIsResending(false)
    }
  }

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      // Build redirect URL with username if present
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
      if (usernameFromQuery) {
        callbackUrl.searchParams.set('username', usernameFromQuery)
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })
      if (error) throw error
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign in failed'
      toast.error(t('toast.googleSignInFailed'), {
        description: errorMessage,
      })
      setIsLoading(false)
    }
  }

  // Handle phone sign in navigation
  const handlePhoneSignIn = () => {
    router.push('/phone')
  }


  // Loading state with skeleton
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="w-full">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Skeleton className="w-12 h-12 rounded-lg" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-20 rounded-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
          <div className="w-full max-w-md px-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Verify email step
  if (step === 'verify-email') {
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
                  onClick={() => {
                    setStep('email')
                    resetForm()
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                  <span>{t('auth.back') || 'Back'}</span>
                </button>
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
        </main>
      </div>
    )
  }

  // Main email form
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
              >
                <EmailInput
                  id="email"
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isRTL={isRTL}
                  enableValidation={true}
                  t={t}
                  successMessage={t('validation.emailValid')}
                />
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={isLoading || !email.trim() || !validateForm()}
                  className="w-full h-12 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
      </main>
    </div>
  )
}

export default function JoinHaady() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <JoinHaadyContent />
    </Suspense>
  )
}

