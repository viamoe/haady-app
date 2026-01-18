'use client'

import { useState, useEffect, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button, Input } from '@haady/ui'
import { isAdminUser, getUserWithPreferences, getUserById } from '@/lib/db/client-repos'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { CheckCircle2, Globe } from 'lucide-react'
import { useLocale } from '@/i18n/context'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@haady/ui'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getNextOnboardingStep, ONBOARDING_STEPS, ONBOARDING_PATHS, PROFILE_REDIRECT } from '@/lib/onboarding'
import { Skeleton } from '@/components/ui/skeleton'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

// Country type matching API response
interface Country {
  code: string // iso2
  name: string
  nameAr: string | null
  phoneCode: string // phone_code
  flagUrl: string | null // flag_url
}

// City type matching API response
interface City {
  id: string
  name: string
  nameAr: string | null
  slug: string | null
  countryCode: string | null
  countryId: string
}

interface ProfileData {
  fullName: string
  phone: string
  phoneCountryCode: string
  country: string
  city: string
  dateOfBirth: Date | undefined
  birthMonth: string
  birthDay: string
}

interface FieldErrors {
  fullName?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  country?: string | null
  city?: string | null
}

/**
 * Strips country code from phone number input
 * Handles various autocomplete formats like:
 * - +20 01158397714
 * - +20-01158397714
 * - +20 - 01158397714
 * - 002001158397714
 * - 201158397714
 */
function stripCountryCode(rawValue: string, selectedCountryCode: string): string {
  // First, extract just the digits
  const digitsOnly = rawValue.replace(/\D/g, '')
  
  // Get country code digits (e.g., "+20" -> "20", "+966" -> "966")
  const countryDigits = selectedCountryCode.replace(/\D/g, '')
  
  if (!countryDigits || !digitsOnly) {
    return digitsOnly
  }
  
  // Check if number starts with country code (with or without leading zeros)
  // Handle: 20..., 0020...
  if (digitsOnly.startsWith('00' + countryDigits)) {
    return digitsOnly.slice(2 + countryDigits.length)
  }
  
  if (digitsOnly.startsWith(countryDigits)) {
    // Make sure we're not stripping part of the local number
    // Only strip if remaining digits form a valid local number (7+ digits typically)
    const remaining = digitsOnly.slice(countryDigits.length)
    if (remaining.length >= 7) {
      return remaining
    }
  }
  
  // Return digits as-is if no country code detected
  return digitsOnly
}

function CompleteProfileContent() {
  const t = useTranslations()
  const { isRTL, locale, setLocale } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleLanguageToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en'
    setLocale(newLocale)
  }
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [cities, setCities] = useState<City[]>([])
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  
  // Get username from query params (from landing page flow)
  const usernameFromQuery = searchParams?.get('username') || null
  
  // Form states
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    phone: '',
    phoneCountryCode: '+966',
    country: '',
    city: '',
    dateOfBirth: undefined,
    birthMonth: '',
    birthDay: '',
  })

  // Month options (1-12)
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1
    const date = new Date(2000, monthIndex - 1, 1)
    return {
      value: monthIndex.toString(),
      label: date.toLocaleString(locale === 'ar' ? 'ar' : 'en', { month: 'long' }),
    }
  })

  // Day options (1-31, will be filtered based on selected month)
  const getDaysForMonth = (month: string): number[] => {
    if (!month) return []
    const monthNum = parseInt(month)
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return []
    
    // Get days in month (using a non-leap year for simplicity)
    const daysInMonth = new Date(2000, monthNum, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }

  // Update dateOfBirth when month or day changes
  useEffect(() => {
    if (profile.birthMonth && profile.birthDay) {
      const monthNum = parseInt(profile.birthMonth)
      const dayNum = parseInt(profile.birthDay)
      if (!isNaN(monthNum) && !isNaN(dayNum) && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        // Use current year for validation purposes (but we don't store year)
        const currentYear = new Date().getFullYear()
        const newDate = new Date(currentYear, monthNum - 1, dayNum)
        // Validate the date is valid (e.g., not Feb 30)
        if (newDate.getMonth() === monthNum - 1 && newDate.getDate() === dayNum) {
          setProfile(prev => ({ ...prev, dateOfBirth: newDate }))
          // Validate if field has been touched
          if (touched.dateOfBirth) {
            const error = validateDateOfBirth(newDate)
            setErrors(prev => ({ ...prev, dateOfBirth: error }))
          }
        } else {
          // Invalid date (e.g., Feb 30)
          setProfile(prev => ({ ...prev, dateOfBirth: undefined }))
          if (touched.dateOfBirth) {
            setErrors(prev => ({ ...prev, dateOfBirth: t('validation.dateOfBirthInvalid') }))
          }
        }
      }
    } else {
      setProfile(prev => ({ ...prev, dateOfBirth: undefined }))
      if (touched.dateOfBirth && (!profile.birthMonth || !profile.birthDay)) {
        setErrors(prev => ({ ...prev, dateOfBirth: null }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.birthMonth, profile.birthDay])
  
  // Error states
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoadingCountries(true)
        const response = await fetch('/api/countries')
        if (!response.ok) {
          throw new Error('Failed to fetch countries')
        }
        const data = await response.json()
        
        // Map API response to component format
        const mappedCountries: Country[] = (data.countries || []).map((country: any) => ({
          code: country.iso2,
          name: country.name,
          nameAr: country.name_ar || null,
          phoneCode: country.phone_code || '',
          flagUrl: country.flag_url || null,
        }))
        
        setCountries(mappedCountries)
      } catch (error) {
        console.error('Error fetching countries:', error)
        // Fallback to empty array on error
        setCountries([])
      } finally {
        setIsLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  // Fetch cities from API when country changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!profile.country) {
        setCities([])
        setProfile(prev => ({ ...prev, city: '' }))
        return
      }

      try {
        setIsLoadingCities(true)
        const response = await fetch(`/api/cities?country=${profile.country}`)
        if (!response.ok) {
          throw new Error('Failed to fetch cities')
        }
        const data = await response.json()
        
        // Map API response to component format
        const mappedCities: City[] = (data.cities || []).map((city: any) => ({
          id: city.id,
          name: city.name,
          nameAr: city.nameAr || null,
          slug: city.slug || null,
          countryCode: city.countryCode || null,
          countryId: city.countryId,
        }))
        
        setCities(mappedCities)
        
        // Clear city selection if current city doesn't belong to new country
        // Use functional update to access current state
        setProfile(prev => {
          if (prev.city) {
            const cityExists = mappedCities.some(c => c.name === prev.city)
            if (!cityExists) {
              return { ...prev, city: '' }
            }
          }
          return prev
        })
      } catch (error) {
        console.error('Error fetching cities:', error)
        // Fallback to empty array on error
        setCities([])
      } finally {
        setIsLoadingCities(false)
      }
    }
    fetchCities()
  }, [profile.country])

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
          // Not logged in, redirect to login
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
      
      const nextStep = getNextOnboardingStep((userDataWithFlags as unknown as Record<string, unknown>) || {})
      
      // If user has already completed this step, redirect to next step
      if (nextStep !== '/complete-profile') {
        if (nextStep === PROFILE_REDIRECT) {
          const username = (userDataWithFlags as unknown as Record<string, unknown>)?.username as string | null
          router.push(username ? `/@${username}` : '/')
        } else {
          router.push(nextStep)
        }
        return
      }
      
      // Pre-fill name if available from OAuth
      if (user.user_metadata?.full_name) {
        setProfile(prev => ({ ...prev, fullName: user.user_metadata.full_name }))
      }
      
      // Pre-fill birth month and day if birthdate exists
      const userResult = await getUserWithPreferences(user.id)
      if (!userResult.error && userResult.data?.birthdate) {
        const dob = new Date(userResult.data.birthdate)
        if (!isNaN(dob.getTime())) {
          setProfile(prev => ({
            ...prev,
            birthMonth: (dob.getMonth() + 1).toString(),
            birthDay: dob.getDate().toString(),
            dateOfBirth: dob,
          }))
        }
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

  // Validation helpers
  const validateFullName = (name: string): string | null => {
    if (!name.trim()) return t('validation.fullNameRequired')
    if (name.trim().length < 2) return t('validation.fullNameMinLength')
    return null
  }

  const validatePhone = (phone: string): string | null => {
    if (!phone || !phone.trim()) return t('validation.phoneRequired') || 'Phone number is required'
    const phoneDigits = phone.replace(/\D/g, '') // Remove non-digits
    if (phoneDigits.length < 7) return t('validation.phoneMinLength') || 'Phone number must be at least 7 digits'
    if (phoneDigits.length > 15) return t('validation.phoneMaxLength') || 'Phone number must be at most 15 digits'
    return null
  }

  const validateDateOfBirth = (date: Date | undefined): string | null => {
    // Since we only collect month/day (no year), we can't validate age
    // Just validate that the date is valid (not Feb 30, etc.)
    if (!date) return null // Date of birth is optional
    if (isNaN(date.getTime())) return t('validation.dateOfBirthInvalid')
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

  // Check if form can be submitted (required fields are valid)
  const canSubmit = (): boolean => {
    // Full name is required - must be filled and valid
    if (!profile.fullName.trim() || validateFullName(profile.fullName) !== null) {
      return false
    }
    // Phone is required - must be filled and valid
    if (!profile.phone || !profile.phone.trim() || validatePhone(profile.phone) !== null) {
      return false
    }
    // Date of birth (month and day) are required - both must be selected
    if (!profile.birthMonth || !profile.birthDay) {
      return false
    }
    // If dateOfBirth is set, it must be valid
    if (profile.dateOfBirth && validateDateOfBirth(profile.dateOfBirth) !== null) {
      return false
    }
    return true
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
      // Get current user data to check if username is already set
      const { data: currentUserData } = await getUserById(userId)
      
      // If username is provided from query params and user doesn't already have one, try to claim it
      let finalUsername: string | null = null
      if (usernameFromQuery && !currentUserData?.username) {
        const normalizedUsername = usernameFromQuery.trim().toLowerCase()
        
        // Check username availability via API
        const availabilityResponse = await fetch(`/api/users/claim-username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: normalizedUsername }),
        })
        
        const availabilityData = await availabilityResponse.json()
        
        if (availabilityData.ok && availabilityData.data?.username) {
          finalUsername = availabilityData.data.username
        } else {
          // Username not available, continue without it (user can set it later)
          console.warn('Username not available:', availabilityData.error?.message)
        }
      } else if (currentUserData?.username) {
        // User already has a username, use it
        finalUsername = currentUserData.username as string
      }

      // Create date with default year (2000) for storage since we only collect month/day
      let birthdateToSave: string | null = null
      if (profile.birthMonth && profile.birthDay) {
        const monthNum = parseInt(profile.birthMonth)
        const dayNum = parseInt(profile.birthDay)
        if (!isNaN(monthNum) && !isNaN(dayNum)) {
          // Use year 2000 as default since we don't collect year
          const dateToSave = new Date(2000, monthNum - 1, dayNum)
          if (dateToSave.getMonth() === monthNum - 1 && dateToSave.getDate() === dayNum) {
            birthdateToSave = dateToSave.toISOString().split('T')[0]
          }
        }
      }

      // Upsert user profile via API (handles server-side auth properly)
      const profileResponse = await fetch('/api/users/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile.fullName,
          username: finalUsername,
          phone: profile.phone ? `${profile.phoneCountryCode}${profile.phone}` : null,
          country: profile.country || null,
          city: profile.city || null,
          birthdate: birthdateToSave,
          onboarding_step: ONBOARDING_STEPS.PERSONALITY_TRAITS, // Always go to personality-traits (skip claim-username)
        }),
      })

      const profileResult = await profileResponse.json()
      if (!profileResponse.ok || !profileResult.ok) {
        throw new Error(profileResult.error?.message || 'Failed to update profile')
      }

      toast.success(t('toast.profileUpdated'))
      
      // Redirect to personality-traits (skip claim-username step)
      router.push(ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONALITY_TRAITS])
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
      // Get current user data to check if username is already set
      const { data: currentUserData } = await getUserById(userId)
      
      // If username is provided from query params and user doesn't already have one, try to save it even when skipping
      let finalUsername: string | null = null
      if (usernameFromQuery && !currentUserData?.username) {
        const normalizedUsername = usernameFromQuery.trim().toLowerCase()
        
        try {
          const availabilityResponse = await fetch(`/api/users/claim-username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: normalizedUsername }),
          })
          
          const availabilityData = await availabilityResponse.json()
          
          if (availabilityData.ok && availabilityData.data?.username) {
            finalUsername = availabilityData.data.username
          }
        } catch (error) {
          // Ignore errors when skipping
          console.warn('Could not save username when skipping:', error)
        }
      } else if (currentUserData?.username) {
        // User already has a username, use it
        finalUsername = currentUserData.username as string
      }

      // Upsert user profile via API with minimal data when skipping
      const profileResponse = await fetch('/api/users/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: finalUsername,
          onboarding_step: ONBOARDING_STEPS.PERSONALITY_TRAITS, // Always go to personality-traits (skip claim-username)
        }),
      })

      const profileResult = await profileResponse.json()
      if (!profileResponse.ok || !profileResult.ok) {
        console.error('Error updating user:', profileResult.error)
      }
      
      // Redirect to personality-traits (skip claim-username step)
      router.push(ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONALITY_TRAITS])
    } catch (error) {
      // Fallback redirect to personality-traits
      router.push(ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONALITY_TRAITS])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to get input className based on error/success state (matching EmailInput style)
  const getInputClassName = (field: keyof FieldErrors) => {
    const hasError = touched[field] && errors[field]
    const isValid = isFieldValid(field)
    const textAlign = isRTL ? 'text-right' : 'text-left'
    // Match EmailInput: h-[55px], bg-gray-50 focus:bg-gray-100, !text-[18px], pl-4, rounded-xl
    const baseClasses = `h-[55px] bg-gray-50 focus:bg-gray-100 rounded-xl placeholder:text-gray-400 transition-colors w-full min-w-0 pl-4 !text-[18px] md:!text-[18px] font-medium outline-none text-gray-700 ${textAlign}`
    
    // EmailInput doesn't use borders, but we keep minimal border for error states only
    let borderClasses: string
    if (hasError) {
      borderClasses = 'border border-red-500 focus:border-red-500'
    } else {
      borderClasses = 'border-0'
    }
    
    return `${baseClasses} ${borderClasses}`
  }
  
  // Helper to get select className (matching EmailInput style)
  const getSelectClassName = () => {
    return `h-[55px] bg-gray-50 focus:bg-gray-100 rounded-xl transition-colors w-full min-w-0 pl-4 pr-10 !text-[18px] md:!text-[18px] font-medium outline-none text-gray-700 border-0 !shadow-none`
  }

  // Error message component (matching EmailInput style)
  const ErrorMessage = ({ message }: { message: string | null | undefined }) => {
    if (!message) return null
    return (
      <p className="text-xs text-red-500 pl-4" role="alert">
        {message}
      </p>
    )
  }

  // Success message component (matching EmailInput style)
  const SuccessMessage = ({ message }: { message: string }) => {
    return (
      <p className="text-xs text-green-500 pl-4">
        {message}
      </p>
    )
  }

  // Field validation feedback component (matching EmailInput style)
  const FieldFeedback = ({ field, successMessage }: { field: keyof FieldErrors; successMessage: string }) => {
    return (
      <div className="px-0 pt-1 flex flex-col items-start justify-center gap-1 min-h-[20px]">
        {touched[field] && errors[field] ? (
          <ErrorMessage message={errors[field]} />
        ) : isFieldValid(field) ? (
          <SuccessMessage message={successMessage} />
        ) : null}
      </div>
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
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
        </header>
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

          {/* Header */}
          <h1 className={`text-2xl sm:text-3xl font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('auth.completeProfile')}
          </h1>
          
          <p className={`text-gray-500 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('auth.almostThere')}
          </p>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('auth.fullName')} <span className="text-primary">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={profile.fullName}
                  data-testid="profile-fullname-input"
                  autoComplete="name"
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, fullName: e.target.value }))
                    if (touched.fullName) validateField('fullName')
                  }}
                  onInput={(e) => {
                    // Handle autocomplete which may bypass onChange
                    const target = e.target as HTMLInputElement
                    if (target.value !== profile.fullName) {
                      setProfile(prev => ({ ...prev, fullName: target.value }))
                      setTouched(prev => ({ ...prev, fullName: true }))
                    }
                  }}
                  onBlur={() => handleBlur('fullName')}
                  className={`${getInputClassName('fullName')} ${isFieldValid('fullName') ? (isRTL ? 'pl-10' : 'pr-10') : ''}`}
                />
                {isFieldValid('fullName') && (
                  <CheckCircle2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 fill-green-500 stroke-green-500 [&>path:last-child]:stroke-white [&>path:last-child]:stroke-2`} />
                )}
              </div>
            <FieldFeedback field="fullName" successMessage={t('validation.fullNameValid')} />
          </div>

          {/* Phone - Optional */}
          <div className="space-y-2">
            <Label htmlFor="phone" className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('auth.phone')}
            </Label>
            <div className="flex items-center gap-2">
              {/* Country Code Selector */}
              <Select
                value={profile.phoneCountryCode}
                onValueChange={(value) => {
                  // Find the country by phone code
                  const selectedCountry = countries.find(c => c.phoneCode === value)
                  if (selectedCountry) {
                    setProfile(prev => ({
                      ...prev,
                      phoneCountryCode: value,
                      country: selectedCountry.code,
                      // City will be cleared automatically by the cities useEffect if it doesn't belong to new country
                    }))
                  } else {
                    setProfile(prev => ({ ...prev, phoneCountryCode: value }))
                  }
                }}
              >
                <SelectTrigger className={`!h-[55px] w-[140px] bg-gray-50 focus:bg-gray-100 rounded-xl border-0 !text-[18px] md:!text-[18px] font-medium outline-none text-gray-700 transition-colors px-4 py-0 !shadow-none ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <SelectValue>
                    {profile.phoneCountryCode && (() => {
                      const selectedCountry = countries.find(c => c.phoneCode === profile.phoneCountryCode)
                      if (!selectedCountry) return profile.phoneCountryCode
                      return (
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          {selectedCountry.flagUrl ? (
                            <Image
                              src={selectedCountry.flagUrl}
                              alt={selectedCountry.name}
                              width={16}
                              height={16}
                              className="rounded"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                          )}
                          <span className="!text-[18px] md:!text-[18px] font-medium">{selectedCountry.phoneCode}</span>
                        </div>
                      )
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                  {isLoadingCountries ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : countries.length === 0 ? (
                    <SelectItem value="no-countries" disabled>No countries available</SelectItem>
                  ) : (
                    countries.map((country) => (
                      <SelectItem 
                        key={country.code} 
                        value={country.phoneCode}
                      >
                        <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          {country.flagUrl ? (
                            <Image
                              src={country.flagUrl}
                              alt={country.name}
                              width={16}
                              height={16}
                              className="rounded"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="w-4 h-4 bg-gray-200 rounded" />
                          )}
                          <span className="!text-[18px] md:!text-[18px] font-medium">{country.phoneCode}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {/* Phone Number Input */}
              <div className="relative flex-1">
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('auth.phonePlaceholder')}
                  value={profile.phone}
                  data-testid="profile-phone-input"
                  autoComplete="tel-national"
                  onChange={(e) => {
                    // Strip country code if autocomplete added it (e.g., +20 01158397714 -> 01158397714)
                    const phoneValue = stripCountryCode(e.target.value, profile.phoneCountryCode)
                    setProfile(prev => ({ ...prev, phone: phoneValue }))
                    if (touched.phone) validateField('phone')
                  }}
                  onInput={(e) => {
                    // Handle autocomplete which may bypass onChange
                    const target = e.target as HTMLInputElement
                    const phoneValue = stripCountryCode(target.value, profile.phoneCountryCode)
                    if (phoneValue !== profile.phone) {
                      setProfile(prev => ({ ...prev, phone: phoneValue }))
                      setTouched(prev => ({ ...prev, phone: true }))
                    }
                  }}
                  onBlur={() => handleBlur('phone')}
                  className={`${getInputClassName('phone')} ${isFieldValid('phone') ? (isRTL ? 'pl-10' : 'pr-10') : ''} ${isRTL ? 'text-right placeholder:text-right' : 'text-left placeholder:text-left'}`}
                  dir="ltr"
                />
                {isFieldValid('phone') && (
                  <CheckCircle2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-5 h-5 fill-green-500 stroke-green-500 [&>path:last-child]:stroke-white [&>path:last-child]:stroke-2`} />
                )}
              </div>
            </div>
            <FieldFeedback field="phone" successMessage={t('validation.phoneValid')} />
          </div>


          {/* Date of Birth - Optional */}
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-[2] space-y-2">
                <Label className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.month') || 'Month'}
                </Label>
                <Select
                  value={profile.birthMonth}
                  onValueChange={(value) => {
                    setProfile(prev => {
                      // Clear day if it's invalid for the new month
                      let newBirthDay = prev.birthDay
                      if (prev.birthDay) {
                        const days = getDaysForMonth(value)
                        if (!days.includes(parseInt(prev.birthDay))) {
                          newBirthDay = ''
                        }
                      }
                      return { ...prev, birthMonth: value, birthDay: newBirthDay }
                    })
                    setTouched(prev => ({ ...prev, dateOfBirth: true }))
                  }}
                >
                  <SelectTrigger className={`${getSelectClassName()} ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <SelectValue placeholder={t('auth.month') || 'Month'} />
                  </SelectTrigger>
                  <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label className={`text-gray-700 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('auth.day') || 'Day'}
                </Label>
                <Select
                  value={profile.birthDay}
                  onValueChange={(value) => {
                    setProfile(prev => ({ ...prev, birthDay: value }))
                    setTouched(prev => ({ ...prev, dateOfBirth: true }))
                  }}
                  disabled={!profile.birthMonth}
                >
                  <SelectTrigger className={`${getSelectClassName()} ${isRTL ? 'flex-row-reverse' : ''} ${!profile.birthMonth ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder={t('auth.day') || 'Day'} />
                  </SelectTrigger>
                  <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                    {profile.birthMonth ? (
                      getDaysForMonth(profile.birthMonth).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="select-month-first" disabled>
                        {t('auth.selectMonthFirst') || 'Select month first'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {profile.birthMonth && profile.birthDay ? (
              (() => {
                const monthNum = parseInt(profile.birthMonth)
                const dayNum = parseInt(profile.birthDay)
                if (!isNaN(monthNum) && !isNaN(dayNum)) {
                  const today = new Date()
                  const currentYear = today.getFullYear()
                  let nextBirthday = new Date(currentYear, monthNum - 1, dayNum)
                  
                  // If birthday has passed this year, set it to next year
                  if (nextBirthday < today) {
                    nextBirthday = new Date(currentYear + 1, monthNum - 1, dayNum)
                  }
                  
                  // Calculate months and days accurately
                  let monthsUntil = 0
                  let daysUntil = 0
                  
                  // Start from today and count months
                  const tempDate = new Date(today)
                  
                  // Calculate months by adding months until we reach or pass the birthday
                  while (tempDate < nextBirthday) {
                    const nextMonthDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate())
                    
                    // If adding a month would go past the birthday, stop
                    if (nextMonthDate > nextBirthday) {
                      break
                    }
                    
                    monthsUntil++
                    tempDate.setMonth(tempDate.getMonth() + 1)
                  }
                  
                  // Calculate remaining days from the last month date to the birthday
                  daysUntil = Math.ceil((nextBirthday.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24))
                  
                  // Ensure daysUntil is not negative
                  if (daysUntil < 0) {
                    daysUntil = 0
                  }
                  
                  let countdownLine1Text = ''
                  let countdownLine1Emoji = '🎂'
                  let countdownLine2Text = ''
                  let countdownLine2Emoji = '🎁'
                  
                  if (locale === 'ar') {
                    if (monthsUntil > 0 && daysUntil > 0) {
                      countdownLine1Text = `${monthsUntil} ${monthsUntil === 1 ? 'شهر' : 'أشهر'}، ${daysUntil} ${daysUntil === 1 ? 'يوم' : 'أيام'} حتى عيد ميلادك`
                    } else if (daysUntil > 0) {
                      countdownLine1Text = `${daysUntil} ${daysUntil === 1 ? 'يوم' : 'أيام'} حتى عيد ميلادك`
                    } else {
                      countdownLine1Text = `عيد ميلادك اليوم!`
                    }
                    countdownLine2Text = t('auth.birthdayCountdownHelper') || 'أكمل إعداد ملفك الشخصي حتى يتمكن الأصدقاء من إرسال الهدايا لك — لا حاجة للعنوان'
                  } else {
                    if (monthsUntil > 0 && daysUntil > 0) {
                      countdownLine1Text = `${monthsUntil} ${monthsUntil === 1 ? 'month' : 'months'}, ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} until your birthday`
                    } else if (daysUntil > 0) {
                      countdownLine1Text = `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} until your birthday`
                    } else {
                      countdownLine1Text = `Your birthday is today!`
                    }
                    countdownLine2Text = t('auth.birthdayCountdownHelper') || 'Finish setting up your profile so friends can send you gifts — no address needed'
                  }
                  
                  return (
                    <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'} pl-0`}>
                      <p className="text-sm text-gray-700 font-bold">
                        <span className="text-lg">{countdownLine1Emoji}</span> {countdownLine1Text}
                      </p>
                      <p className="text-xs text-gray-600">
                        {countdownLine2Text} <span className="text-base">{countdownLine2Emoji}</span>
                      </p>
                    </div>
                  )
                }
                return null
              })()
            ) : (
              <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'} pl-0`}>
                🎂 {t('auth.birthdayHelper') || 'Add your birthday. Help friends celebrate you!'}
              </p>
            )}
            {touched.dateOfBirth && errors.dateOfBirth && (
              <p className={`text-xs text-red-500 pl-4 ${isRTL ? 'text-right pr-4' : 'text-left'}`}>
                {errors.dateOfBirth}
              </p>
            )}
            {touched.dateOfBirth && isFieldValid('dateOfBirth') && (
              <p className={`text-xs text-green-500 pl-4 ${isRTL ? 'text-right pr-4' : 'text-left'}`}>
                {t('validation.dateOfBirthValid')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <Button
              type="submit"
              disabled={isLoading || !canSubmit()}
              className="w-full"
              size="lg"
              data-testid="complete-profile-submit-btn"
            >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('auth.settingUp')}</span>
              </>
            ) : (
              <span>{t('landing.createAccount') || 'Create Account'}</span>
            )}
          </Button>
          </div>

        </form>
        </div>
      </main>
    </div>
  )
}

export default function CompleteProfile() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-secondary/80 to-primary/20">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <CompleteProfileContent />
    </Suspense>
  )
}
