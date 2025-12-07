'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from '@/lib/toast'
import { CheckCircle2, ArrowLeft, ArrowRight, User, MapPin, Gift } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { motion } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Flag } from '@/components/flag'
import { cn } from '@/lib/utils'
import { getNextOnboardingStep, ONBOARDING_STEPS } from '@/lib/onboarding'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

const gulfCountries = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', phoneCode: '+966' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', phoneCode: '+971' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', phoneCode: '+965' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', phoneCode: '+974' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', phoneCode: '+973' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', phoneCode: '+968' },
]

const cities = [
  // Saudi Arabia
  { name: 'Riyadh', nameAr: 'الرياض', countryCode: 'SA' },
  { name: 'Jeddah', nameAr: 'جدة', countryCode: 'SA' },
  { name: 'Mecca', nameAr: 'مكة المكرمة', countryCode: 'SA' },
  { name: 'Medina', nameAr: 'المدينة المنورة', countryCode: 'SA' },
  { name: 'Dammam', nameAr: 'الدمام', countryCode: 'SA' },
  { name: 'Khobar', nameAr: 'الخبر', countryCode: 'SA' },
  { name: 'Abha', nameAr: 'أبها', countryCode: 'SA' },
  { name: 'Taif', nameAr: 'الطائف', countryCode: 'SA' },
  // UAE
  { name: 'Dubai', nameAr: 'دبي', countryCode: 'AE' },
  { name: 'Abu Dhabi', nameAr: 'أبو ظبي', countryCode: 'AE' },
  { name: 'Sharjah', nameAr: 'الشارقة', countryCode: 'AE' },
  // Kuwait
  { name: 'Kuwait City', nameAr: 'مدينة الكويت', countryCode: 'KW' },
  // Qatar
  { name: 'Doha', nameAr: 'الدوحة', countryCode: 'QA' },
  // Bahrain
  { name: 'Manama', nameAr: 'المنامة', countryCode: 'BH' },
  // Oman
  { name: 'Muscat', nameAr: 'مسقط', countryCode: 'OM' },
]

interface ProfileData {
  fullName: string
  phone: string
  phoneCountryCode: string
  country: string
  city: string
  dateOfBirth: Date | undefined
}

interface FieldErrors {
  fullName?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  country?: string | null
  city?: string | null
}

export default function CompleteProfile() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Form states
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    phone: '',
    phoneCountryCode: '+966',
    country: '',
    city: '',
    dateOfBirth: undefined,
  })
  
  // Error states
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Not logged in, redirect to login
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
      
      // If user has already completed this step, redirect to next step
      if (nextStep !== '/complete-profile') {
        router.push(nextStep)
        return
      }
      
      // Pre-fill name if available from OAuth
      if (user.user_metadata?.full_name) {
        setProfile(prev => ({ ...prev, fullName: user.user_metadata.full_name }))
      }
      
      setIsCheckingAuth(false)
    }
    
    checkAuth()
  }, [router])

  // Validation helpers
  const validateFullName = (name: string): string | null => {
    if (!name.trim()) return t('validation.fullNameRequired')
    if (name.trim().length < 2) return t('validation.fullNameMinLength')
    return null
  }

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null // Phone is optional
    const phoneDigits = phone.replace(/\D/g, '') // Remove non-digits
    if (phoneDigits.length < 7) return t('validation.phoneMinLength')
    if (phoneDigits.length > 15) return t('validation.phoneMaxLength')
    if (!/^[0-9]+$/.test(phoneDigits)) return t('validation.phoneInvalid')
    return null
  }

  const validateDateOfBirth = (date: Date | undefined): string | null => {
    if (!date) return null // Date of birth is optional
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const birthDate = new Date(date)
    birthDate.setHours(0, 0, 0, 0)
    
    if (isNaN(birthDate.getTime())) return t('validation.dateOfBirthInvalid')
    if (birthDate > today) return t('validation.dateOfBirthFuture')
    
    // Check minimum age (13 years)
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    const dayDiff = today.getDate() - birthDate.getDate()
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
    
    if (actualAge < 13) return t('validation.dateOfBirthTooYoung')
    if (actualAge > 120) return t('validation.dateOfBirthTooOld')
    
    return null
  }

  // Validate field on blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field)
  }

  // Validate single field
  const validateField = (field: string) => {
    let error: string | null = null
    
    switch (field) {
      case 'fullName':
        error = validateFullName(profile.fullName)
        break
      case 'phone':
        error = validatePhone(profile.phone)
        break
      case 'dateOfBirth':
        error = validateDateOfBirth(profile.dateOfBirth)
        break
    }
    
    setErrors(prev => ({ ...prev, [field]: error }))
    return error
  }

  // Validate required fields
  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {}
    
    newErrors.fullName = validateFullName(profile.fullName)
    newErrors.phone = validatePhone(profile.phone)
    newErrors.dateOfBirth = validateDateOfBirth(profile.dateOfBirth)
    
    setErrors(newErrors)
    setTouched({ fullName: true, phone: true, dateOfBirth: true })
    
    return !Object.values(newErrors).some(error => error !== null)
  }

  // Check if field is valid
  const isFieldValid = (field: keyof FieldErrors): boolean => {
    if (!touched[field]) return false
    if (errors[field]) return false
    
    switch (field) {
      case 'fullName':
        return profile.fullName.trim().length >= 2
      case 'phone':
        if (!profile.phone) return false // Optional field, only valid if filled
        const phoneDigits = profile.phone.replace(/\D/g, '')
        return phoneDigits.length >= 7 && phoneDigits.length <= 15 && /^[0-9]+$/.test(phoneDigits)
      case 'dateOfBirth':
        if (!profile.dateOfBirth) return false // Optional field, only valid if filled
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const birthDate = new Date(profile.dateOfBirth)
        birthDate.setHours(0, 0, 0, 0)
        if (isNaN(birthDate.getTime()) || birthDate > today) return false
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        const dayDiff = today.getDate() - birthDate.getDate()
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
        return actualAge >= 13 && actualAge <= 120
      default:
        return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !userId) {
      return
    }
    
    setIsLoading(true)

    try {
      // Upsert user profile in database (create if doesn't exist, update if exists)
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          full_name: profile.fullName,
          phone: profile.phone ? `${profile.phoneCountryCode}${profile.phone}` : null,
          country: profile.country || null,
          city: profile.city || null,
          birthdate: profile.dateOfBirth ? profile.dateOfBirth.toISOString().split('T')[0] : null,
          onboarding_step: ONBOARDING_STEPS.CLAIM_USERNAME, // Move to next step
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })

      if (error) throw error

      toast.success(t('toast.profileUpdated'))
      
      // Redirect to claim username step
      router.push('/claim-username')
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
      // Upsert user profile with minimal data when skipping, but move to next step
      await supabase
        .from('users')
        .upsert({
          id: userId,
          onboarding_step: ONBOARDING_STEPS.CLAIM_USERNAME, // Move to step 2 even when skipping
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
      
      router.push('/claim-username')
    } catch (error) {
      router.push('/claim-username')
    }
  }

  // Helper to get input className based on error/success state
  const getInputClassName = (field: keyof FieldErrors) => {
    const hasError = touched[field] && errors[field]
    const isValid = isFieldValid(field)
    const textAlign = isRTL ? 'text-right' : 'text-left'
    const baseClasses = `h-12 bg-white rounded-xl text-gray-900 placeholder:text-gray-400 transition-colors ${textAlign}`
    
    let borderClasses: string
    if (hasError) {
      borderClasses = 'border-red-500 hover:border-red-600 focus:border-red-500 focus-visible:border-red-500 focus:ring-red-500/20 focus-visible:ring-red-500/50 focus-visible:ring-[3px]'
    } else if (isValid) {
      borderClasses = 'border-green-500 hover:border-green-600 focus:border-green-500 focus-visible:border-green-500 focus:ring-green-500/20 focus-visible:ring-green-500/50 focus-visible:ring-[3px]'
    } else {
      borderClasses = 'border-gray-200 hover:border-orange-400 hover:border-2 focus:border-orange-500 focus-visible:border-orange-500 focus:ring-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:ring-[3px]'
    }
    
    return `${baseClasses} ${borderClasses}`
  }

  // Error message component
  const ErrorMessage = ({ message }: { message: string | null | undefined }) => {
    if (!message) return null
    return (
      <div className="mt-1.5 text-red-500 text-xs font-medium">
        <span>{message}</span>
      </div>
    )
  }

  // Success message component
  const SuccessMessage = ({ message }: { message: string }) => {
    return (
      <div className="mt-1.5 text-green-500 text-xs font-medium">
        <span>{message}</span>
      </div>
    )
  }

  // Field validation feedback component
  const FieldFeedback = ({ field, successMessage }: { field: keyof FieldErrors; successMessage: string }) => {
    if (touched[field] && errors[field]) {
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
              {t('auth.completeProfile')}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`text-gray-400 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {t('auth.almostThere')}
            </motion.p>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Full Name - Required */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="space-y-2"
              >
                <Label htmlFor="fullName" className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.fullName')} <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('auth.fullNamePlaceholder')}
                    value={profile.fullName}
                    onChange={(e) => {
                      setProfile(prev => ({ ...prev, fullName: e.target.value }))
                      if (touched.fullName) validateField('fullName')
                    }}
                    onBlur={() => handleBlur('fullName')}
                    className={`${getInputClassName('fullName')} ${isFieldValid('fullName') ? (isRTL ? 'ps-10' : 'pe-10') : ''}`}
                  />
                  {isFieldValid('fullName') && (
                    <CheckCircle2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-green-500`} />
                  )}
                </div>
                <FieldFeedback field="fullName" successMessage={t('validation.fullNameValid')} />
              </motion.div>

              {/* Phone - Optional */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
                className="space-y-2"
              >
                <Label htmlFor="phone" className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.phone')}
                </Label>
                <div className="flex items-center gap-2">
                  {/* Country Code Selector */}
                  <Select
                    value={profile.phoneCountryCode}
                    onValueChange={(value) => {
                      // Find the country by phone code
                      const selectedCountry = gulfCountries.find(c => c.phoneCode === value)
                      if (selectedCountry) {
                        setProfile(prev => {
                          // Get cities for the new country
                          const countryCities = cities.filter(c => c.countryCode === selectedCountry.code)
                          const currentCity = prev.city
                          // Clear city if it doesn't belong to the new country
                          const newCity = countryCities.some(c => c.name === currentCity) ? currentCity : ''
                          
                          return {
                            ...prev,
                            phoneCountryCode: value,
                            country: selectedCountry.code,
                            city: newCity
                          }
                        })
                      } else {
                        setProfile(prev => ({ ...prev, phoneCountryCode: value }))
                      }
                    }}
                  >
                    <SelectTrigger className={`h-12 w-[140px] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <SelectValue>
                        {profile.phoneCountryCode && (() => {
                          const selectedCountry = gulfCountries.find(c => c.phoneCode === profile.phoneCountryCode)
                          if (!selectedCountry) return profile.phoneCountryCode
                          return (
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                              <Flag
                                code={selectedCountry.code}
                                size="s"
                                hasBorder={false}
                                hasDropShadow={false}
                              />
                              <span className="text-sm">{selectedCountry.phoneCode}</span>
                            </div>
                          )
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                      {gulfCountries.map((country) => (
                        <SelectItem 
                          key={country.code} 
                          value={country.phoneCode}
                        >
                          <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            <Flag
                              code={country.code}
                              size="s"
                              hasBorder={false}
                              hasDropShadow={false}
                            />
                            <span>{country.phoneCode}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Phone Number Input */}
                  <div className="relative flex-1">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t('auth.phonePlaceholder')}
                      value={profile.phone}
                      onChange={(e) => {
                        setProfile(prev => ({ ...prev, phone: e.target.value }))
                        if (touched.phone) validateField('phone')
                      }}
                      onBlur={() => handleBlur('phone')}
                      className={`${getInputClassName('phone')} ${isFieldValid('phone') ? (isRTL ? 'ps-10' : 'pe-10') : ''} ${isRTL ? 'text-right placeholder:text-right' : 'text-left placeholder:text-left'}`}
                      dir="ltr"
                    />
                    {isFieldValid('phone') && (
                      <CheckCircle2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-green-500`} />
                    )}
                  </div>
                </div>
                <FieldFeedback field="phone" successMessage={t('validation.phoneValid')} />
              </motion.div>

              {/* Country - Optional */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="space-y-2"
              >
                <Label className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('auth.country')}</Label>
                <Select
                  value={profile.country}
                  onValueChange={(value) => {
                    setProfile(prev => {
                      // Get cities for the new country
                      const countryCities = cities.filter(c => c.countryCode === value)
                      const currentCity = prev.city
                      // Clear city if it doesn't belong to the new country
                      const newCity = countryCities.some(c => c.name === currentCity) ? currentCity : ''
                      
                      // Also update phone country code if country matches
                      const selectedCountry = gulfCountries.find(c => c.code === value)
                      const newPhoneCountryCode = selectedCountry ? selectedCountry.phoneCode : prev.phoneCountryCode
                      
                      return {
                        ...prev,
                        country: value,
                        city: newCity,
                        phoneCountryCode: newPhoneCountryCode
                      }
                    })
                  }}
                >
                  <SelectTrigger className={`h-12 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <SelectValue placeholder={t('auth.selectCountry')}>
                      {profile.country && (() => {
                        const selectedCountry = gulfCountries.find(c => c.code === profile.country)
                        if (!selectedCountry) return null
                        return (
                          <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                            {isRTL ? (
                              <>
                                <span>{selectedCountry.nameAr}</span>
                                <Flag
                                  code={selectedCountry.code}
                                  size="s"
                                  hasBorder={false}
                                  hasDropShadow={false}
                                />
                              </>
                            ) : (
                              <>
                                <Flag
                                  code={selectedCountry.code}
                                  size="s"
                                  hasBorder={false}
                                  hasDropShadow={false}
                                />
                                <span>{selectedCountry.name}</span>
                              </>
                            )}
                          </div>
                        )
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                    {gulfCountries.map((country) => (
                      <SelectItem 
                        key={country.code} 
                        value={country.code}
                      >
                        <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          {isRTL ? (
                            <>
                              <span>{country.nameAr}</span>
                              <Flag
                                code={country.code}
                                size="s"
                                hasBorder={false}
                                hasDropShadow={false}
                              />
                            </>
                          ) : (
                            <>
                              <Flag
                                code={country.code}
                                size="s"
                                hasBorder={false}
                                hasDropShadow={false}
                              />
                              <span>{country.name}</span>
                            </>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* City - Optional */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="space-y-2"
              >
                <Label className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.city')}
                </Label>
                <Select
                  value={profile.city}
                  onValueChange={(value) => setProfile(prev => ({ ...prev, city: value }))}
                  disabled={!profile.country}
                >
                  <SelectTrigger className={`h-12 bg-white border-gray-200 rounded-xl hover:border-orange-400 focus:border-orange-500 focus-visible:border-orange-500 focus:ring-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:ring-[3px] ${isRTL ? 'flex-row-reverse' : ''} ${!profile.country ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder={profile.country ? t('auth.cityPlaceholder') : t('auth.selectCountryFirst')} />
                  </SelectTrigger>
                  <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                    {profile.country
                      ? cities
                          .filter(city => city.countryCode === profile.country)
                          .map((city) => (
                            <SelectItem key={city.name} value={city.name}>
                              {locale === 'ar' ? city.nameAr : city.name}
                            </SelectItem>
                          ))
                      : cities.map((city) => (
                          <SelectItem key={city.name} value={city.name}>
                            {locale === 'ar' ? city.nameAr : city.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Date of Birth - Optional */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="space-y-2"
              >
                <Label className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('auth.dateOfBirth')}</Label>
                <div className="relative">
                  <DatePicker
                    date={profile.dateOfBirth}
                    onDateChange={(date) => {
                      setProfile(prev => ({ ...prev, dateOfBirth: date }))
                      setTouched(prev => ({ ...prev, dateOfBirth: true }))
                      validateField('dateOfBirth')
                    }}
                    placeholder={t('auth.dateOfBirthPlaceholder')}
                    className={cn(
                      touched.dateOfBirth && errors.dateOfBirth
                        ? 'border-red-500 hover:border-red-600 focus:border-red-500 focus-visible:border-red-500'
                        : touched.dateOfBirth && isFieldValid('dateOfBirth')
                        ? 'border-green-500 hover:border-green-600 focus:border-green-500 focus-visible:border-green-500'
                        : ''
                    )}
                  />
                  {touched.dateOfBirth && isFieldValid('dateOfBirth') && (
                    <CheckCircle2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 pointer-events-none`} />
                  )}
                </div>
                <FieldFeedback field="dateOfBirth" successMessage={t('validation.dateOfBirthValid')} />
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
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
                      <span>{t('auth.settingUp')}</span>
                    </div>
                  ) : (
                    <span>{t('auth.finishSetup')}</span>
                  )}
                </Button>
              </motion.div>

              {/* Skip Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                type="button"
                onClick={handleSkip}
                disabled={isLoading}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 cursor-pointer py-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t('auth.skip')}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

