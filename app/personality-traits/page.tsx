'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button } from '@haady/ui'
import { isAdminUser, getUserWithPreferences, getAllTraits, getUserTraits, updateUser } from '@/lib/db/client-repos'
import { toast } from '@/lib/toast'
import { Globe } from 'lucide-react'
import { useLocale } from '@/i18n/context'
import { getNextOnboardingStep, ONBOARDING_STEPS, PROFILE_REDIRECT } from '@/lib/onboarding'
import { Skeleton } from '@/components/ui/skeleton'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface Trait {
  id: string
  name: string
  emoji?: string | null
  description?: string | null
}

export default function PersonalityTraits() {
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const router = useRouter()
  
  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    setLocale(newLocale)
  }
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])
  const [traits, setTraits] = useState<Trait[]>([])

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
          router.push('/login')
          return
        }
      
      setUserId(user.id)
      
      // Check if user is an admin first - admins skip onboarding
      const { isAdmin, error: adminError } = await isAdminUser(user.id)
      
      if (adminError) {
        console.error('Error checking admin status:', adminError)
      }
      
      // If user is an admin, redirect to landing (skip onboarding)
      if (isAdmin) {
        router.push('/')
        return
      }
      
      // Check user's onboarding status and redirect to correct step
      const { data: userDataWithFlags, error: userError } = await getUserWithPreferences(user.id)
      
      if (userError) {
        console.error('Error loading user:', userError)
        router.push('/login')
        return
      }
      
      const nextStep = getNextOnboardingStep((userDataWithFlags as Record<string, unknown>) || {})
      
      // If user should be on a different step, redirect them
      if (nextStep !== '/personality-traits') {
        if (nextStep === PROFILE_REDIRECT) {
          const username = (userDataWithFlags as Record<string, unknown>)?.username as string | null
          router.push(username ? `/@${username}` : '/')
        } else {
          router.push(nextStep)
        }
        return
      }

      // Load existing traits if any
      const userData = userDataWithFlags as { has_personality_traits?: boolean } & Record<string, unknown>
      if (userData.has_personality_traits) {
        const { data: userTraitsData } = await getUserTraits(user.id)
        if (userTraitsData && userTraitsData.length > 0) {
          setSelectedTraits(userTraitsData)
        }
      }

      // Fetch available traits from master table
      const { data: traitsData, error: traitsError } = await getAllTraits()
      
      if (traitsError) {
        console.error('Error fetching traits:', traitsError)
        toast.error(t('toast.errorOccurred'), {
          description: traitsError.message,
        })
      } else if (traitsData) {
        setTraits(traitsData as Trait[])
      }
      
      setIsCheckingAuth(false)
      } catch (error) {
        console.error('Error checking auth:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('session') || errorMessage.includes('JWT') || errorMessage.includes('Auth session missing')) {
          router.push('/login')
          return
        }
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async () => {
    if (!userId) return
    
    setIsLoading(true)

    try {
      // Bulk save traits via API
      const response = await fetch('/api/users/traits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ traits: selectedTraits }),
      })

      const data = await response.json()

      if (!data.ok) {
        const errorMessage = data.error?.message || 'Failed to save traits'
        throw new Error(errorMessage)
      }

      // Update onboarding step
      const { error: updateError } = await updateUser(userId, {
        onboarding_step: ONBOARDING_STEPS.FAVORITE_BRANDS, // Move to next step
      })

      if (updateError) throw new Error(updateError.message)

      toast.success(locale === 'ar' ? 'تم حفظ الصفات الشخصية بنجاح' : 'Personality traits saved successfully')
      
      // Redirect to next onboarding step
      router.push('/favorite-brands')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(t('toast.errorOccurred'), {
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const { error: updateError } = await updateUser(userId, {
        onboarding_step: ONBOARDING_STEPS.FAVORITE_BRANDS,
      })

      if (updateError) {
        console.error('Error updating user:', updateError)
      }
      
      router.push('/favorite-brands')
    } catch (error) {
      router.push('/favorite-brands')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTrait = (traitId: string) => {
    setSelectedTraits(prev => 
      prev.includes(traitId) 
        ? prev.filter(id => id !== traitId)
        : [...prev, traitId]
    )
  }


  // Loading state with skeleton
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white">
        <header className="w-full">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
          <div className="w-full max-w-md px-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64 mb-8" />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </main>
      </div>
    )
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
                className="w-12 h-12 cursor-pointer"
                onClick={() => router.push('/')}
              />
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLanguageToggle}
                size="lg"
                variant="outline"
                className="rounded-full w-10 h-10 p-0"
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
          {/* Header */}
          <h1 className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {locale === 'ar' ? 'الصفات الشخصية' : 'Personality Traits'}
          </h1>
          
          <p className={`text-gray-400 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            {locale === 'ar' 
              ? 'اختر الصفات التي تصفك بشكل أفضل'
              : 'Select the traits that best describe you'}
          </p>

          {/* Traits Selection */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {traits.length === 0 ? (
                <div className={`col-span-2 text-center text-gray-400 py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {locale === 'ar' ? 'جاري تحميل الصفات...' : 'Loading traits...'}
                </div>
              ) : (
                traits.map((trait) => (
                  <button
                    key={trait.id}
                    type="button"
                    onClick={() => toggleTrait(trait.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTraits.includes(trait.id)
                        ? 'border-primary bg-secondary text-primary'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary'
                    }`}
                  >
                    <span className="font-medium flex items-center gap-2">
                      {trait.emoji && <span>{trait.emoji}</span>}
                      <span>{trait.name}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
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
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 cursor-pointer py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locale === 'ar' ? 'تخطي الآن' : 'Skip for now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

