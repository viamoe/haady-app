'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button, Header } from '@haady/ui'
import { getUserById } from '@/lib/db/client-repos'
import { useLocale } from '@/i18n/context'
import { User, ChevronRight, Gift } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getNextOnboardingStep, PROFILE_REDIRECT } from '@/lib/onboarding'

interface UserProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function SettingsPage() {
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [nextStep, setNextStep] = useState<string | null>(null)

  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    setLocale(newLocale)
  }
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  
  const handleUserClick = () => {
    if (nextStep === PROFILE_REDIRECT && currentUserProfile?.username) {
      router.push(`/@${currentUserProfile.username}`)
    } else if (nextStep && nextStep !== PROFILE_REDIRECT) {
      router.push(nextStep)
    }
  }

  const handleSettingsClick = () => {
    // Already on settings page
  }

  const handleMyGiftsClick = () => {
    router.push('/my-gifts')
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user } = await getCurrentUser()
        
        if (!user) {
          router.push('/login')
          return
        }
        
        setCurrentUser({ id: user.id, email: user.email || null })
        
        const { data: profileData } = await getUserById(user.id)
        if (profileData) {
          setCurrentUserProfile(profileData as unknown as UserProfile)
          const step = getNextOnboardingStep(profileData as unknown as Record<string, unknown>)
          setNextStep(step)
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading user:', error)
        router.push('/login')
      }
    }

    loadUser()
  }, [router])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header
          locale={locale}
          isRTL={isRTL}
          isLoading={true}
          onLanguageToggle={handleLanguageToggle}
          showLoginButton={false}
        />
        <main className="min-h-[calc(100vh-80px)] py-8">
          <div className="container mx-auto px-6 max-w-2xl">
            <Skeleton className="h-10 w-48 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        user={currentUser ? { id: currentUser.id, email: currentUser.email ?? undefined } : null}
        userProfile={currentUserProfile}
        locale={locale}
        isRTL={isRTL}
        onLanguageToggle={handleLanguageToggle}
        onSignOut={handleSignOut}
        onUserClick={handleUserClick}
        onSettingsClick={handleSettingsClick}
        onMyGiftsClick={handleMyGiftsClick}
        isOnboarded={nextStep === PROFILE_REDIRECT}
        showLoginButton={false}
      />

      <main className="min-h-[calc(100vh-80px)] py-8">
        <div className="container mx-auto px-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            {t('settings.title')}
          </h1>

          <div className="space-y-4">
            {/* Profile Settings */}
            <button
              onClick={() => router.push('/complete-profile')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className={`text-left ${isRTL ? 'text-right' : ''}`}>
                  <p className="font-medium text-gray-900">
                    {t('settings.editProfile')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('settings.editProfileDesc')}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            {/* My Gifts */}
            <button
              onClick={() => router.push('/my-gifts')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div className={`text-left ${isRTL ? 'text-right' : ''}`}>
                  <p className="font-medium text-gray-900">
                    {t('settings.myGifts')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('settings.myGiftsDesc')}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('settings.dangerZone')}
            </h2>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={handleSignOut}
            >
              {t('settings.signOut')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
