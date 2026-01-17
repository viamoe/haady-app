'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button } from '@haady/ui'
import { isAdminUser, getUserWithPreferences, getAllColors, updateUser, getUserById, getUserTraits, getUserBrands, getUserColors } from '@/lib/db/client-repos'
import { toast } from '@/lib/toast'
import { Globe } from 'lucide-react'
import { useLocale } from '@/i18n/context'
import { getNextOnboardingStep, ONBOARDING_STEPS, calculateProfileCompletion, PROFILE_REDIRECT } from '@/lib/onboarding'
import { Skeleton } from '@/components/ui/skeleton'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface Color {
  id: string
  name: string
  hex: string
  category?: string | null
}

export default function FavoriteColors() {
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
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [colors, setColors] = useState<Color[]>([])

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
      if (nextStep !== '/favorite-colors') {
        if (nextStep === PROFILE_REDIRECT) {
          const username = (userDataWithFlags as Record<string, unknown>)?.username as string | null
          router.push(username ? `/@${username}` : '/')
        } else {
          router.push(nextStep)
        }
        return
      }

      // Load existing colors if any
      const userData = userDataWithFlags as { has_favorite_colors?: boolean } & Record<string, unknown>
      if (userData.has_favorite_colors) {
        // Get user colors IDs
        const { data: userColorsData } = await getUserColors(user.id)
        if (userColorsData && userColorsData.length > 0) {
          setSelectedColors(userColorsData)
        }
      }

      // Fetch available colors from master table
      const { data: colorsData, error: colorsError } = await getAllColors()
      
      if (colorsError) {
        console.error('Error fetching colors:', colorsError)
        toast.error(t('toast.errorOccurred'), {
          description: colorsError.message,
        })
      } else if (colorsData) {
        setColors(colorsData as Color[])
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
      // Bulk save colors via API
      const response = await fetch('/api/users/colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colors: selectedColors }),
      })

      const data = await response.json()

      if (!data.ok) {
        const errorMessage = data.error?.message || 'Failed to save colors'
        throw new Error(errorMessage)
      }

      // Calculate profile completion - check junction tables
      const [traitsResult, brandsResult, userResult] = await Promise.all([
        getUserTraits(userId),
        getUserBrands(userId),
        getUserById(userId),
      ])

      // Handle errors from Promise.all
      if (userResult.error) {
        console.error('Error fetching user data:', userResult.error)
      }
      if (traitsResult.error) {
        console.error('Error fetching traits:', traitsResult.error)
      }
      if (brandsResult.error) {
        console.error('Error fetching brands:', brandsResult.error)
      }

      // Ensure we have all required fields for calculateProfileCompletion
      const userData = userResult.data || {}
      const completionData = {
        full_name: userData.full_name || null,
        username: userData.username || null,
        has_personality_traits: (traitsResult.data?.length || 0) > 0,
        has_favorite_brands: (brandsResult.data?.length || 0) > 0,
        has_favorite_colors: selectedColors.length > 0,
      }
      const completionPercentage = calculateProfileCompletion(completionData)

      // Update onboarding step and completion
      const { error: updateError } = await updateUser(userId, {
        onboarding_step: ONBOARDING_STEPS.COMPLETED,
        is_onboarded: true, // Mark as fully onboarded
        profile_completion: completionPercentage, // Store completion percentage
      })

      if (updateError) throw new Error(updateError.message)

      toast.success(locale === 'ar' ? 'تم إكمال ملفك الشخصي بنجاح!' : 'Profile completed successfully!')
      
      // Redirect to user's profile
      const username = userData.username as string | null
      router.push(username ? `/${username}` : '/')
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
      // Calculate profile completion even when skipping - check junction tables
      const [traitsResult, brandsResult, userResult] = await Promise.all([
        getUserTraits(userId),
        getUserBrands(userId),
        getUserById(userId),
      ])

      // Handle errors from Promise.all
      if (userResult.error) {
        console.error('Error fetching user data:', userResult.error)
      }
      if (traitsResult.error) {
        console.error('Error fetching traits:', traitsResult.error)
      }
      if (brandsResult.error) {
        console.error('Error fetching brands:', brandsResult.error)
      }

      // Ensure we have all required fields for calculateProfileCompletion
      const userData = userResult.data || {}
      const completionData = {
        full_name: userData.full_name || null,
        username: userData.username || null,
        has_personality_traits: (traitsResult.data?.length || 0) > 0,
        has_favorite_brands: (brandsResult.data?.length || 0) > 0,
        has_favorite_colors: false, // Skipped
      }
      const completionPercentage = calculateProfileCompletion(completionData)

      const { error: updateError } = await updateUser(userId, {
        onboarding_step: ONBOARDING_STEPS.COMPLETED,
        is_onboarded: true, // Mark as onboarded even when skipping
        profile_completion: completionPercentage,
      })

      if (updateError) {
        console.error('Error updating user:', updateError)
      }
      
      // Redirect to user's profile
      const username = userData.username as string | null
      router.push(username ? `/${username}` : '/')
    } catch (error) {
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleColor = (colorId: string) => {
    setSelectedColors(prev => 
      prev.includes(colorId) 
        ? prev.filter(id => id !== colorId)
        : [...prev, colorId]
    )
  }

  // Loading state
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
            <div className="grid grid-cols-4 gap-3 mb-5">
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
            {locale === 'ar' ? 'الألوان المفضلة' : 'Favorite Colors'}
          </h1>
          
          <p className={`text-gray-400 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            {locale === 'ar' 
              ? 'اختر الألوان المفضلة لديك'
              : 'Select your favorite colors'}
          </p>

          {/* Colors Selection */}
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {colors.length === 0 ? (
                <div className={`col-span-4 text-center text-gray-400 py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {locale === 'ar' ? 'جاري تحميل الألوان...' : 'Loading colors...'}
                </div>
              ) : (
                colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleColor(color.id)}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      selectedColors.includes(color.id)
                        ? 'border-primary ring-2 ring-secondary'
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                      {selectedColors.includes(color.id) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">✅</span>
                        </div>
                      )}
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
                <span>{t('landing.createAccount') || (locale === 'ar' ? 'إنشاء حساب' : 'Create Account')}</span>
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

