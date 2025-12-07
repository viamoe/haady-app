'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { getNextOnboardingStep, ONBOARDING_STEPS, calculateProfileCompletion } from '@/lib/onboarding'
import { motion } from 'framer-motion'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface Color {
  id: string
  name: string
  hex: string
  category?: string | null
}

export default function FavoriteColors() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [colors, setColors] = useState<Color[]>([])

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
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
      // Check if user has colors in user_colors table
      const { data: userColorsData } = await supabase
        .from('user_colors')
        .select('color_id')
        .eq('user_id', user.id)
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username, onboarding_step, is_onboarded')
        .eq('id', user.id)
        .single()
      
      const userDataWithFlags = {
        ...userData,
        has_favorite_colors: (userColorsData?.length || 0) > 0,
      }
      
      const nextStep = getNextOnboardingStep(userDataWithFlags || {})
      
      // If user should be on a different step, redirect them
      if (nextStep !== '/favorite-colors') {
        router.push(nextStep)
        return
      }

      // Load existing colors if any
      if (userColorsData && userColorsData.length > 0) {
        setSelectedColors(userColorsData.map(c => c.color_id))
      }

      // Fetch available colors from master table
      const { data: colorsData, error: colorsError } = await supabase
        .from('colors_master')
        .select('id, name, hex, category')
        .eq('is_active', true)
        .order('name')
      
      if (colorsError) {
        console.error('Error fetching colors:', colorsError)
        toast.error(t('toast.errorOccurred'), {
          description: colorsError.message,
        })
      } else if (colorsData) {
        setColors(colorsData)
      }
      
      setIsCheckingAuth(false)
    }
    
    checkAuth()
  }, [router, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save colors')
      }

      // Calculate profile completion - check junction tables
      const { data: traitsData } = await supabase
        .from('user_traits')
        .select('trait_id')
        .eq('user_id', userId)
      
      const { data: brandsData } = await supabase
        .from('user_brands')
        .select('brand_id')
        .eq('user_id', userId)
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', userId)
        .single()

      const completionData = {
        ...userData,
        has_personality_traits: (traitsData?.length || 0) > 0,
        has_favorite_brands: (brandsData?.length || 0) > 0,
        has_favorite_colors: selectedColors.length > 0,
      }
      const completionPercentage = calculateProfileCompletion(completionData)

      // Update onboarding step and completion
      const { error } = await supabase
        .from('users')
        .update({
          onboarding_step: ONBOARDING_STEPS.COMPLETED,
          is_onboarded: true, // Mark as fully onboarded
          profile_completion: completionPercentage, // Store completion percentage
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      toast.success(locale === 'ar' ? 'تم إكمال ملفك الشخصي بنجاح!' : 'Profile completed successfully!')
      
      // Redirect to home
      router.push('/home')
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
      // Calculate profile completion even when skipping - check junction tables
      const { data: traitsData } = await supabase
        .from('user_traits')
        .select('trait_id')
        .eq('user_id', userId)
      
      const { data: brandsData } = await supabase
        .from('user_brands')
        .select('brand_id')
        .eq('user_id', userId)
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', userId)
        .single()

      const completionData = {
        ...userData,
        has_personality_traits: (traitsData?.length || 0) > 0,
        has_favorite_brands: (brandsData?.length || 0) > 0,
        has_favorite_colors: false, // Skipped
      }
      const completionPercentage = calculateProfileCompletion(completionData)

      await supabase
        .from('users')
        .update({ 
          onboarding_step: ONBOARDING_STEPS.COMPLETED,
          is_onboarded: true, // Mark as onboarded even when skipping
          profile_completion: completionPercentage,
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
      
      router.push('/home')
    } catch (error) {
      router.push('/home')
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
              {locale === 'ar' ? 'الألوان المفضلة' : 'Favorite Colors'}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`text-gray-400 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {locale === 'ar' 
                ? 'اختر الألوان المفضلة لديك'
                : 'Select your favorite colors'}
            </motion.p>

            {/* Colors Selection */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="grid grid-cols-4 gap-3"
              >
                {colors.length === 0 ? (
                  <div className={`col-span-4 text-center text-gray-400 py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {locale === 'ar' ? 'جاري تحميل الألوان...' : 'Loading colors...'}
                  </div>
                ) : (
                  colors.map((color) => (
                    <motion.button
                      key={color.id}
                      type="button"
                      onClick={() => toggleColor(color.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        selectedColors.includes(color.id)
                          ? 'border-orange-500 ring-2 ring-orange-200'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedColors.includes(color.id) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <span className="text-white text-xl font-bold">✓</span>
                        </motion.div>
                      )}
                    </motion.button>
                  ))
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                    </div>
                  ) : (
                    <span>{locale === 'ar' ? 'إنهاء' : 'Finish'}</span>
                  )}
                </Button>
              </motion.div>

              {/* Skip Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                type="button"
                onClick={handleSkip}
                disabled={isLoading}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 cursor-pointer py-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {locale === 'ar' ? 'تخطي الآن' : 'Skip for now'}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

