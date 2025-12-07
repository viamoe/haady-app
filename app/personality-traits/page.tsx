'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { getNextOnboardingStep, ONBOARDING_STEPS } from '@/lib/onboarding'
import { motion } from 'framer-motion'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

interface Trait {
  id: string
  name: string
  emoji?: string | null
  description?: string | null
}

export default function PersonalityTraits() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])
  const [traits, setTraits] = useState<Trait[]>([])

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
      // Check if user has traits in user_traits table
      const { data: userTraitsData } = await supabase
        .from('user_traits')
        .select('trait_id')
        .eq('user_id', user.id)
      
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username, onboarding_step, is_onboarded')
        .eq('id', user.id)
        .single()
      
      const userDataWithFlags = {
        ...userData,
        has_personality_traits: (userTraitsData?.length || 0) > 0,
      }
      
      const nextStep = getNextOnboardingStep(userDataWithFlags || {})
      
      // If user should be on a different step, redirect them
      if (nextStep !== '/personality-traits') {
        router.push(nextStep)
        return
      }

      // Load existing traits if any
      if (userTraitsData && userTraitsData.length > 0) {
        setSelectedTraits(userTraitsData.map(t => t.trait_id))
      }

      // Fetch available traits from master table
      const { data: traitsData, error: traitsError } = await supabase
        .from('traits_master')
        .select('id, name, emoji, description')
        .eq('is_active', true)
        .order('name')
      
      if (traitsError) {
        console.error('Error fetching traits:', traitsError)
        toast.error(t('toast.errorOccurred'), {
          description: traitsError.message,
        })
      } else if (traitsData) {
        setTraits(traitsData)
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
      // Bulk save traits via API
      const response = await fetch('/api/users/traits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ traits: selectedTraits }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save traits')
      }

      // Update onboarding step
      const { error } = await supabase
        .from('users')
        .update({
          onboarding_step: ONBOARDING_STEPS.FAVORITE_BRANDS, // Move to next step
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      toast.success(locale === 'ar' ? 'تم حفظ الصفات الشخصية بنجاح' : 'Personality traits saved successfully')
      
      // Redirect to next onboarding step
      router.push('/favorite-brands')
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
      await supabase
        .from('users')
        .update({ 
          onboarding_step: ONBOARDING_STEPS.FAVORITE_BRANDS,
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
      
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
              {locale === 'ar' ? 'الصفات الشخصية' : 'Personality Traits'}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`text-gray-400 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {locale === 'ar' 
                ? 'اختر الصفات التي تصفك بشكل أفضل'
                : 'Select the traits that best describe you'}
            </motion.p>

            {/* Traits Selection */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="grid grid-cols-2 gap-3"
              >
                {traits.length === 0 ? (
                  <div className={`col-span-2 text-center text-gray-400 py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {locale === 'ar' ? 'جاري تحميل الصفات...' : 'Loading traits...'}
                  </div>
                ) : (
                  traits.map((trait) => (
                    <motion.button
                      key={trait.id}
                      type="button"
                      onClick={() => toggleTrait(trait.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedTraits.includes(trait.id)
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="font-medium flex items-center gap-2">
                        {trait.emoji && <span>{trait.emoji}</span>}
                        <span>{trait.name}</span>
                      </span>
                    </motion.button>
                  ))
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer"
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

