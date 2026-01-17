'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button, Header } from '@haady/ui'
import { getUserById } from '@/lib/db/client-repos'
import { toast } from '@/lib/toast'
import { useLocale } from '@/i18n/context'
import { User, MapPin, Sparkles, Palette, Tag, Gift, Share2, Copy, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getNextOnboardingStep, PROFILE_REDIRECT } from '@/lib/onboarding'

interface UserProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  birthdate: string | null
  country: string | null
  city: string | null
  profile_completion: number | null
}

interface Trait {
  id: string
  name: string
  emoji: string | null
}

interface Brand {
  id: string
  name: string
  logo_url: string | null
}

interface Color {
  id: string
  name: string
  hex: string
}

export default function ProfilePage() {
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  
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
    router.push('/settings')
  }

  const handleMyGiftsClick = () => {
    router.push('/my-gifts')
  }
  
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [traits, setTraits] = useState<Trait[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)
  
  // Current logged-in user state (for header)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [nextStep, setNextStep] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Clean username (remove @ if present, handle URL encoding)
        const decodedUsername = decodeURIComponent(username)
        const cleanUsername = decodedUsername.startsWith('@') ? decodedUsername.slice(1) : decodedUsername
        
        // Fetch profile by username using public API (works for unauthenticated users)
        const profileResponse = await fetch(`/api/users/profile/${encodeURIComponent(cleanUsername)}`)
        const profileResult = await profileResponse.json()
        
        if (!profileResponse.ok || !profileResult.ok) {
          if (profileResult.error?.code === 'NOT_FOUND') {
            setNotFound(true)
            setIsLoading(false)
            return
          }
          console.error('Error loading profile:', profileResult.error)
          setNotFound(true)
          setIsLoading(false)
          return
        }
        
        const profileData = profileResult.data
        if (!profileData) {
          // User not found (not an error, just doesn't exist)
          setNotFound(true)
          setIsLoading(false)
          return
        }
        
        setProfile(profileData as UserProfile)
        
        // Check if current user is the profile owner
        const { user } = await getCurrentUser()
        if (user) {
          setCurrentUser({ id: user.id, email: user.email || null })
          
          // Fetch current user's profile for header
          const { data: currentUserData } = await getUserById(user.id)
          if (currentUserData) {
            setCurrentUserProfile(currentUserData as unknown as UserProfile)
            // Calculate next step for navigation
            const step = getNextOnboardingStep(currentUserData as unknown as Record<string, unknown>)
            setNextStep(step)
          }
          
          if (user.id === (profileData as any).id) {
            setIsOwner(true)
          }
        }
        
        // Load user's traits, brands, and colors using public API
        const prefsResponse = await fetch(`/api/users/profile/${encodeURIComponent(cleanUsername)}/preferences`)
        const prefsResult = await prefsResponse.json()
        
        if (prefsResponse.ok && prefsResult.ok && prefsResult.data) {
          setTraits(prefsResult.data.traits || [])
          setBrands(prefsResult.data.brands || [])
          setColors(prefsResult.data.colors || [])
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error loading profile:', error)
        setNotFound(true)
        setIsLoading(false)
      }
    }

    if (username) {
      loadProfile()
    }
  }, [username])

  const handleCopyLink = async () => {
    const profileUrl = `${window.location.origin}/@${profile?.username}`
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      toast.success(t('profile.linkCopied'))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(t('profile.failedToCopy'))
    }
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/@${profile?.username}`
    const shareData = {
      title: `${profile?.full_name || profile?.username} on Haady`,
      text: locale === 'ar' 
        ? `شاهد ملف ${profile?.full_name || profile?.username} على Haady`
        : `Check out ${profile?.full_name || profile?.username}'s profile on Haady`,
      url: profileUrl,
    }
    
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // User cancelled or share failed, fall back to copy
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const formatBirthday = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'long',
      day: 'numeric'
    })
  }

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
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
          <div className="w-full max-w-lg px-6">
            <div className="flex flex-col items-center mb-8">
              <Skeleton className="w-28 h-28 rounded-full mb-4" />
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32 mb-4" />
            </div>
            <div className="flex gap-3 mb-8">
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Not found state
  if (notFound) {
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
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
          <div className="w-full max-w-lg px-6 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('profile.userNotFound')}
            </h1>
            <p className="text-gray-500 mb-6">
              {t('profile.couldNotFind')} @{decodeURIComponent(username).replace(/^@/, '')}
            </p>
            <Button onClick={() => router.push('/')}>
              {t('profile.goToHome')}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return null
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
        isOnboarded={nextStep === PROFILE_REDIRECT}
        showLoginButton={false}
      />

      {/* Sign Up Banner for unauthenticated users */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
          <div className="container mx-auto px-6 py-4">
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Gift className="w-8 h-8 flex-shrink-0" />
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="font-semibold text-lg">
                    {t('profile.signupBannerTitle')}
                  </p>
                  <p className="text-white/80 text-sm">
                    {t('profile.signupBannerSubtitle')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/create-account')}
                className="bg-white text-primary hover:bg-white/90 font-semibold px-6 whitespace-nowrap"
              >
                {t('profile.signUpFree')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-8">
        <div className="w-full max-w-lg px-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center mb-8">
            {/* Avatar */}
            <div className="relative mb-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  className="w-28 h-28 rounded-full object-cover border-4 border-secondary"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-14 h-14 text-white" />
                </div>
              )}
            </div>

            {/* Name and Username */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 text-center">
              {profile.full_name || 'User'}
            </h1>
            <p className="text-gray-500 text-lg mb-2">@{profile.username}</p>
            
            {/* Location */}
            {(profile.country || profile.city) && (
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-8">
            <Button
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
              <span>{t('profile.share')}</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span>{t('profile.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>{t('profile.copyLink')}</span>
                </>
              )}
            </Button>
          </div>

          {/* Gift Hint */}
          <div className="bg-secondary rounded-2xl p-5 mb-6 text-center">
            <Gift className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-gray-700 font-medium">
              {t('profile.sendGiftTo')} {profile.full_name?.split(' ')[0] || profile.username}!
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {t('profile.noAddressNeeded')}
            </p>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            {/* Birthday Card */}
            {profile.birthdate && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <h2 className={`text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  🎂 {t('profile.birthday')}
                </h2>
                <p className="text-gray-700">{formatBirthday(profile.birthdate)}</p>
              </div>
            )}

            {/* Traits Card */}
            {traits.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <h2 className={`text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Sparkles className="w-5 h-5 text-primary" />
                  {t('profile.personality')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait) => (
                    <div
                      key={trait.id}
                      className="bg-secondary rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                    >
                      {trait.emoji && <span className="text-sm">{trait.emoji}</span>}
                      <span className="text-sm text-gray-800 font-medium">{trait.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brands Card */}
            {brands.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <h2 className={`text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Tag className="w-5 h-5 text-primary" />
                  {t('profile.favoriteBrands')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                    >
                      {brand.logo_url && (
                        <img src={brand.logo_url} alt={brand.name} className="w-4 h-4 object-contain" />
                      )}
                      <span className="text-sm text-gray-800 font-medium">{brand.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Colors Card */}
            {colors.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <h2 className={`text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Palette className="w-5 h-5 text-primary" />
                  {t('profile.favoriteColors')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <div
                      key={color.id}
                      className="w-10 h-10 rounded-lg border-2 border-gray-200"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Owner Actions */}
          {isOwner && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/complete-profile')}
              >
                {t('profile.editProfile')}
              </Button>
            </div>
          )}

          {/* Extra padding for fixed bottom CTA on mobile */}
          {!currentUser && <div className="h-24 sm:hidden" />}
        </div>
      </main>

      {/* Fixed Bottom CTA for unauthenticated users (mobile) */}
      {!currentUser && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:hidden z-50">
          <Button
            onClick={() => router.push('/create-account')}
            className={`w-full h-14 text-lg font-semibold ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Gift className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('profile.signUpAndSendGift')}
          </Button>
        </div>
      )}
    </div>
  )
}
