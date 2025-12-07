'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { useLocale } from '@/i18n/context'
import { motion } from 'framer-motion'
import { User, MapPin, Calendar, Phone, CheckCircle2, Sparkles, Palette, Tag } from 'lucide-react'
import { getNextOnboardingStep } from '@/lib/onboarding'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface UserProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  birthdate: string | null
  phone: string | null
  country: string | null
  city: string | null
  profile_completion: number | null
  points: number | null
  level: number | null
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

export default function Home() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [traits, setTraits] = useState<Trait[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [colors, setColors] = useState<Color[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, error: authError } = await getCurrentUser()
        
        if (authError) {
          console.error('Auth error:', authError)
          router.push('/')
          return
        }
        
        if (!user) {
          router.push('/')
          return
        }
        
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
      
      // If user is an admin, allow them to stay on home page (skip onboarding check)
      if (!isAdmin) {
        // Only check onboarding for non-admin users
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
        if (nextStep !== '/home') {
          router.push(nextStep)
          return
        }
      }

      // Load user profile (only for non-admin users, or if admin has a profile)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, birthdate, phone, country, city, profile_completion, points, level')
        .eq('id', user.id)
        .single()

      // If user is admin and doesn't have a profile, create a minimal profile object
      if (profileError) {
        if (isAdmin) {
          // Admin users might not have a profile in public.users, that's okay
          // Create a minimal profile from auth user data
          const { user: authUser, error: getUserError } = await getCurrentUser()
          
          if (getUserError || !authUser) {
            console.error('Error getting auth user:', getUserError)
            router.push('/')
            return
          }
          setProfile({
            id: authUser?.id || '',
            full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Admin User',
            username: null,
            avatar_url: authUser?.user_metadata?.avatar_url || null,
            birthdate: null,
            phone: null,
            country: null,
            city: null,
            profile_completion: null,
            points: null,
            level: null,
          })
        } else {
          // For regular users, show error
          console.error('Error loading profile:', profileError)
          toast.error(t('toast.errorOccurred'), {
            description: profileError.message || 'Failed to load profile',
          })
          setIsCheckingAuth(false)
          return
        }
      } else {
        setProfile(profileData)
      }

      // Only load traits, brands, and colors if user is not an admin (admins might not have these)
      if (!isAdmin) {
        // Load user traits
        const { data: userTraitsData } = await supabase
          .from('user_traits')
          .select('trait_id')
          .eq('user_id', user.id)

        if (userTraitsData && userTraitsData.length > 0) {
          const traitIds = userTraitsData.map(t => t.trait_id)
          const { data: traitsData } = await supabase
            .from('traits_master')
            .select('id, name, emoji')
            .in('id', traitIds)
          
          if (traitsData) {
            setTraits(traitsData)
          }
        }

        // Load user brands
        const { data: userBrandsData } = await supabase
          .from('user_brands')
          .select('brand_id')
          .eq('user_id', user.id)

        if (userBrandsData && userBrandsData.length > 0) {
          const brandIds = userBrandsData.map(b => b.brand_id)
          const { data: brandsData } = await supabase
            .from('brands_master')
            .select('id, name, logo_url')
            .in('id', brandIds)
          
          if (brandsData) {
            setBrands(brandsData)
          }
        }

        // Load user colors
        const { data: userColorsData } = await supabase
          .from('user_colors')
          .select('color_id')
          .eq('user_id', user.id)

        if (userColorsData && userColorsData.length > 0) {
          const colorIds = userColorsData.map(c => c.color_id)
          const { data: colorsData } = await supabase
            .from('colors_master')
            .select('id, name, hex')
            .in('id', colorIds)
          
          if (colorsData) {
            setColors(colorsData)
          }
        }
      }

      setIsLoading(false)
      setIsCheckingAuth(false)
      } catch (error: any) {
        console.error('Error checking auth:', error)
        // If it's a session error, redirect to login
        if (error?.message?.includes('session') || error?.message?.includes('JWT') || error?.message?.includes('Auth session missing')) {
          router.push('/')
          return
        }
        setIsCheckingAuth(false)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    try {
      // Sign out from Supabase (clears session and cookies)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        toast.error(t('toast.errorOccurred'), {
          description: error.message,
        })
        return
      }

      // Clear any local state
      setProfile(null)
      setTraits([])
      setBrands([])
      setColors([])

      // Redirect to login page
      router.push('/')
      router.refresh() // Force refresh to clear any cached data
    } catch (error: any) {
      console.error('Error signing out:', error)
      toast.error(t('toast.errorOccurred'), {
        description: error.message || 'Failed to sign out',
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Loading state
  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-200 to-orange-400">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return null
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

      {/* Sign Out Button */}
      <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} z-20`}>
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-20">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white rounded-4xl shadow-2xl shadow-gray-900/10 p-8 sm:p-10"
          >
            {/* Profile Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-6 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-orange-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center border-4 border-orange-200">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                {profile.profile_completion === 100 && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Name and Username */}
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {profile.full_name || 'User'}
                </h1>
                {profile.username && (
                  <p className="text-gray-500 text-lg">@{profile.username}</p>
                )}
                {profile.profile_completion !== null && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-600">
                        {locale === 'ar' ? 'اكتمال الملف الشخصي' : 'Profile Completion'}
                      </span>
                      <span className="text-sm font-semibold text-orange-600">
                        {profile.profile_completion}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${profile.profile_completion}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-gradient-to-r from-orange-400 to-rose-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats */}
            {(profile.points !== null || profile.level !== null) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="grid grid-cols-2 gap-4 mb-8"
              >
                {profile.points !== null && (
                  <div className={`bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-gray-600">
                        {locale === 'ar' ? 'النقاط' : 'Points'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{profile.points}</p>
                  </div>
                )}
                {profile.level !== null && (
                  <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-600">
                        {locale === 'ar' ? 'المستوى' : 'Level'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{profile.level}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mb-8"
            >
              <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {locale === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}
              </h2>
              <div className="space-y-3">
                {profile.birthdate && (
                  <div className={`flex items-center gap-3 text-gray-700 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span>{formatDate(profile.birthdate)}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className={`flex items-center gap-3 text-gray-700 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {(profile.country || profile.city) && (
                  <div className={`flex items-center gap-3 text-gray-700 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span>
                      {[profile.city, profile.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Personality Traits */}
            {traits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="mb-8"
              >
                <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  {locale === 'ar' ? 'الصفات الشخصية' : 'Personality Traits'}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait) => (
                    <motion.div
                      key={trait.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex items-center gap-2"
                    >
                      {trait.emoji && <span>{trait.emoji}</span>}
                      <span className="text-gray-800 font-medium">{trait.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Favorite Brands */}
            {brands.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="mb-8"
              >
                <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                  <Tag className="w-5 h-5 text-orange-500" />
                  {locale === 'ar' ? 'العلامات المفضلة' : 'Favorite Brands'}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {brands.map((brand) => (
                    <motion.div
                      key={brand.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 hover:border-orange-300 transition-colors"
                    >
                      {brand.logo_url && (
                        <img src={brand.logo_url} alt={brand.name} className="w-6 h-6 object-contain" />
                      )}
                      <span className="text-gray-800 font-medium">{brand.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Favorite Colors */}
            {colors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                  <Palette className="w-5 h-5 text-orange-500" />
                  {locale === 'ar' ? 'الألوان المفضلة' : 'Favorite Colors'}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <motion.div
                      key={color.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative w-16 h-16 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-colors cursor-pointer"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold drop-shadow-lg">
                          {color.name}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty State */}
            {traits.length === 0 && brands.length === 0 && colors.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className={`text-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <p className="text-gray-500">
                  {locale === 'ar' 
                    ? 'ابدأ بإضافة صفاتك الشخصية والعلامات والألوان المفضلة!'
                    : 'Start by adding your personality traits, favorite brands, and colors!'}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

