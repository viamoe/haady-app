'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, UsernameInput, validateUsername as validateUsernameUtil, Header } from '@haady/ui'
import { useLocale } from '@/i18n/context'
import { Skeleton } from '@/components/ui/skeleton'
import { ONBOARDING_PATHS, PROFILE_REDIRECT } from '@/lib/onboarding'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { getUserById, getUserWithPreferences } from '@/lib/db/client-repos'
import { getNextOnboardingStep } from '@/lib/onboarding'
import { supabase } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

// Component to handle OAuth redirects
function OAuthRedirectHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams?.get('code')
    if (code) {
      // Check for OAuth origin cookie to determine if this is a merchant OAuth
      const cookies = document.cookie.split(';')
      let oauthOriginCookie: string | null = null

      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'haady_oauth_origin') {
          oauthOriginCookie = decodeURIComponent(value)
          break
        }
      }

      // If we have an OAuth code and cookie indicates merchant, redirect to callback
      if (oauthOriginCookie) {
        try {
          const oauthData = JSON.parse(oauthOriginCookie)
          if (oauthData.app_type === 'merchant') {
            // Use the origin from the cookie if available, otherwise fallback to production URL
            const businessOrigin = oauthData.origin || 'https://business.haady.app'
            const callbackUrl = new URL(`${businessOrigin}/auth/callback`)
            callbackUrl.searchParams.set('code', code)
            callbackUrl.searchParams.set('app_type', 'merchant')
            if (oauthData.preferred_country) {
              callbackUrl.searchParams.set('preferred_country', oauthData.preferred_country)
            }
            if (oauthData.preferred_language) {
              callbackUrl.searchParams.set('preferred_language', oauthData.preferred_language)
            }
            // Redirect to merchant callback
            window.location.href = callbackUrl.toString()
            return
          }
        } catch (e) {
          console.error('Failed to parse OAuth origin cookie:', e)
        }
      }

      // For regular haady.app OAuth, redirect to /auth/callback
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('code', code)
      // Preserve any other query params
      searchParams?.forEach((value, key) => {
        if (key !== 'code') {
          callbackUrl.searchParams.set(key, value)
        }
      })
      // Redirect to auth callback
      router.replace(callbackUrl.pathname + callbackUrl.search)
    }
  }, [searchParams, router])

  return null
}

function LandingPageContent() {
  const router = useRouter()
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const [username, setUsername] = useState('')
  const [isUsernameValid, setIsUsernameValid] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null)
  const [isTouched, setIsTouched] = useState(false)
  
  // User session state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [userProfile, setUserProfile] = useState<{ 
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [nextStep, setNextStep] = useState<string | null>(null)

  const handleLogin = () => {
    router.push('/login')
  }


  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user: authUser, error } = await getCurrentUser()
        
        if (error || !authUser) {
          setIsCheckingAuth(false)
          return
        }

        setUser({ id: authUser.id, email: authUser.email })

        // Get user profile
        const { data: profileData } = await getUserById(authUser.id)
        if (profileData) {
          setUserProfile({
            full_name: (profileData.full_name as string) || null,
            username: (profileData.username as string) || null,
            avatar_url: (profileData.avatar_url as string) || null,
          })
        }

        // Get user with preferences to determine next step
        const { data: userDataWithFlags } = await getUserWithPreferences(authUser.id)
        if (userDataWithFlags) {
          const step = getNextOnboardingStep((userDataWithFlags as unknown as Record<string, unknown>) || {})
          setNextStep(step)
        } else {
          // If no profile data, default to complete-profile
          setNextStep('/complete-profile')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [])

  const checkUsernameAvailability = async (usernameValue: string) => {
    const trimmed = usernameValue.trim().toLowerCase()
    if (!trimmed) {
      setIsUsernameAvailable(null)
      return
    }

    // First validate format
    const validation = validateUsernameUtil(trimmed, t)
    if (!validation.isValid) {
      setIsUsernameAvailable(null)
      return
    }

    setIsCheckingAvailability(true)
    try {
      const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(trimmed)}`)
      
      if (!response.ok) {
        // HTTP error status
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          // Not valid JSON
          console.error('Error checking username availability: HTTP', response.status, errorText || 'Unknown error')
          setIsUsernameAvailable(null)
          return
        }
        
        // Check if error object has meaningful content
        if (errorData?.error && typeof errorData.error === 'object') {
          const error = errorData.error
          const errorCode = typeof error.code === 'string' ? error.code.trim() : ''
          const errorMessage = typeof error.message === 'string' ? error.message.trim() : ''
          const hasErrorCode = errorCode.length > 0
          const hasErrorMessage = errorMessage.length > 0
          
          if (errorCode === 'CONFLICT' || (hasErrorMessage && errorMessage.includes('taken'))) {
            setIsUsernameAvailable(false)
          } else if (hasErrorCode || hasErrorMessage) {
            // Error has meaningful properties - use string-based logging to avoid empty object issues
            const code = hasErrorCode ? errorCode : 'UNKNOWN'
            const message = hasErrorMessage ? errorMessage : 'Unknown error'
            
            // 500 errors are infrastructure issues - log as warning (not critical for user)
            // 400-level errors are client issues - log as error
            if (response.status >= 500) {
              // Server errors - likely infrastructure issues, handle gracefully
              console.warn(
                `Username availability check failed (server error): code="${code}", message="${message}", status=${response.status}`
              )
              // Silently fail - don't block user, just reset availability state
              setIsUsernameAvailable(null)
            } else {
              // Client errors (400-499) - log as error
              console.error(
                `Error checking username availability: code="${code}", message="${message}", status=${response.status}`
              )
              setIsUsernameAvailable(null)
            }
          } else {
            // Empty error object - check if it has any keys at all
            const errorKeys = Object.keys(error)
            if (errorKeys.length === 0) {
              console.error('Error checking username availability: Empty error object, HTTP', response.status, 'Response body:', JSON.stringify(errorData))
            } else {
              console.error('Error checking username availability: Error object missing code/message, HTTP', response.status, 'Error keys:', errorKeys, 'Full error:', JSON.stringify(error))
            }
            setIsUsernameAvailable(null)
          }
        } else {
          console.error('Error checking username availability: Invalid error format, HTTP', response.status, 'Response:', JSON.stringify(errorData))
          setIsUsernameAvailable(null)
        }
        return
      }
      
      const data = await response.json()
      
      if (data.ok && data.data !== undefined) {
        // API returned a valid response with availability status
        setIsUsernameAvailable(data.data.available)
      } else if (data.error) {
        // Check if error object has meaningful content
        const errorCode = typeof data.error.code === 'string' ? data.error.code.trim() : ''
        const errorMessage = typeof data.error.message === 'string' ? data.error.message.trim() : ''
        const hasErrorCode = errorCode.length > 0
        const hasErrorMessage = errorMessage.length > 0
        
        if (errorCode === 'CONFLICT' || (hasErrorMessage && errorMessage.includes('taken'))) {
          // Explicitly marked as taken
          setIsUsernameAvailable(false)
        } else if (hasErrorCode || hasErrorMessage) {
          // Error has meaningful properties - use string-based logging
          const code = hasErrorCode ? errorCode : 'UNKNOWN'
          const message = hasErrorMessage ? errorMessage : 'Unknown error'
          
          // For successful HTTP responses with error in body, log as error
          // (This shouldn't happen with our API design, but handle it anyway)
          console.error(
            `Error checking username availability: code="${code}", message="${message}"`
          )
          setIsUsernameAvailable(null)
        } else {
          // Empty error object
          const errorKeys = Object.keys(data.error)
          if (errorKeys.length === 0) {
            console.error('Error checking username availability: Empty error object in response body. Full response:', JSON.stringify(data))
          } else {
            console.error('Error checking username availability: Error object missing code/message. Error keys:', errorKeys, 'Full error:', JSON.stringify(data.error), 'Full response:', JSON.stringify(data))
          }
          setIsUsernameAvailable(null)
        }
      } else {
        // No error object at all - unexpected response format
        console.error('Error checking username availability: Unexpected response format. Expected ok:true with data or ok:false with error. Got:', JSON.stringify(data))
        setIsUsernameAvailable(null)
      }
    } catch (error) {
      console.error('Error checking username availability:', error instanceof Error ? error.message : 'Network or parsing error', error)
      setIsUsernameAvailable(null)
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)
    setIsTouched(true)
    
    // Validate username in real-time
    if (value.trim()) {
      const validation = validateUsernameUtil(value, t)
      setIsUsernameValid(validation.isValid)
      if (!validation.isValid) {
        setIsUsernameAvailable(null)
      }
    } else {
      setIsUsernameValid(false)
      setIsUsernameAvailable(null)
    }
  }

  // Check username availability with debounce
  useEffect(() => {
    if (!isUsernameValid || !username.trim()) {
      setIsUsernameAvailable(null)
      return
    }

    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, isUsernameValid])

  const handleCreateAccount = () => {
    const trimmedUsername = username.trim().toLowerCase()
    if (trimmedUsername && isUsernameValid) {
      // Redirect to unified auth page with username in query params
      router.push(`/auth?username=${encodeURIComponent(trimmedUsername)}`)
    }
  }

  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    setLocale(newLocale)
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        toast.error(t('toast.errorOccurred') || 'An error occurred', {
          description: error.message,
        })
        return
      }

      // Clear user state
      setUser(null)
      setUserProfile(null)
      setNextStep(null)

      // Redirect to landing page
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out'
      toast.error(t('toast.errorOccurred') || 'An error occurred', {
        description: errorMessage,
      })
    }
  }

  const handleUserClick = () => {
    // If user has a username and is fully onboarded, go to their public profile
    if (nextStep === PROFILE_REDIRECT && userProfile?.username) {
      router.push(`/@${userProfile.username}`)
    } else if (nextStep && nextStep !== PROFILE_REDIRECT) {
      router.push(nextStep)
    }
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  const handleMyGiftsClick = () => {
    router.push('/my-gifts')
  }

  return (
    <>
      <OAuthRedirectHandler />
      <div className="min-h-screen bg-white">
        <Header
          user={user as { id: string; email?: string } | null}
          userProfile={userProfile}
          locale={locale}
          isRTL={isRTL}
          isLoading={isCheckingAuth}
          onLanguageToggle={handleLanguageToggle}
          onSignOut={handleSignOut}
          onUserClick={handleUserClick}
          onSettingsClick={handleSettingsClick}
          onMyGiftsClick={handleMyGiftsClick}
          isOnboarded={nextStep === PROFILE_REDIRECT}
          onLoginClick={handleLogin}
        />

        {/* Main Content - Hero Section */}
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
          <div className="text-center px-6 max-w-[600px]">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-lg sm:text-xl text-[var(--color-gray-400)] mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>
            {/* Only show username input if user is not logged in or doesn't have a username */}
            {(!user || !userProfile?.username) && (
              <div className="flex flex-col items-center justify-center max-w-md mx-auto gap-4">
                <div className="w-full" data-testid="username-input-wrapper">
                  <UsernameInput
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={handleUsernameChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isUsernameValid && isUsernameAvailable === true) {
                        handleCreateAccount()
                      }
                    }}
                    className="w-full"
                    isRTL={isRTL}
                    enableValidation={true}
                    touched={isTouched}
                    isChecking={isCheckingAvailability}
                    isAvailable={isUsernameAvailable}
                    successMessage={isUsernameAvailable === true ? t('validation.usernameValid') : undefined}
                    errorMessage={isUsernameAvailable === false ? t('validation.usernameTaken') : undefined}
                    t={t}
                    data-testid="landing-username-input"
                  />
                </div>
                <AnimatePresence>
                  {isUsernameValid && isUsernameAvailable === true && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                      }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        mass: 0.8
                      }}
                      className="w-full sm:w-auto"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.02, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Button
                          onClick={handleCreateAccount}
                          size="lg"
                          className="rounded-full px-8 w-full sm:w-auto mt-2 shadow-lg hover:shadow-xl transition-shadow"
                          data-testid="landing-create-account-btn"
                        >
                          {t('landing.createAccount')}
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Skeleton */}
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
      
      {/* Main Content Skeleton */}
      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
        <div className="text-center px-6 max-w-[600px] w-full">
          <Skeleton className="h-16 w-full max-w-[500px] mx-auto mb-6" />
          <Skeleton className="h-6 w-full max-w-[400px] mx-auto mb-4" />
          <Skeleton className="h-6 w-full max-w-[450px] mx-auto mb-8" />
          <Skeleton className="h-12 w-full max-w-md mx-auto rounded-xl" />
        </div>
      </main>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<LandingPageSkeleton />}>
      <LandingPageContent />
    </Suspense>
  )
}
