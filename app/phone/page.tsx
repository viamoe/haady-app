'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/supabase/auth-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { getNextOnboardingStep } from '@/lib/onboarding'
import { ArrowLeft, Phone, CheckCircle2 } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLocale } from '@/i18n/context'
import { motion, AnimatePresence } from 'framer-motion'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

type PhoneStep = 'phone' | 'verify-otp'

interface FieldErrors {
  phone?: string | null
  otp?: string | null
}

// Common country codes
const COUNTRY_CODES = [
  { code: '+966', country: 'SA', flag: '🇸🇦' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+965', country: 'KW', flag: '🇰🇼' },
  { code: '+974', country: 'QA', flag: '🇶🇦' },
  { code: '+973', country: 'BH', flag: '🇧🇭' },
  { code: '+968', country: 'OM', flag: '🇴🇲' },
  { code: '+20', country: 'EG', flag: '🇪🇬' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'GB', flag: '🇬🇧' },
]

export default function PhoneAuth() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()
  
  const [step, setStep] = useState<PhoneStep>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // Form states
  const [phoneCountryCode, setPhoneCountryCode] = useState('+966')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Error states
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await getCurrentUser()
        
        if (user) {
          // Check if user is an admin first - admins skip onboarding
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .eq('is_active', true)
            .single()
          
          if (adminData) {
            router.push('/home')
            return
          }

          // User is authenticated, check their onboarding status and redirect
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, username, onboarding_step, is_onboarded')
            .eq('id', user.id)
            .single()
          
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
          router.push(nextStep)
          return
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  // Resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendTimer])

  // Auto-focus first OTP input when step changes
  useEffect(() => {
    if (step === 'verify-otp') {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [step])

  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) return t('validation.phoneRequired') || 'Phone number is required'
    const phoneRegex = /^[0-9]{8,15}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return t('validation.phoneInvalid') || 'Please enter a valid phone number'
    }
    return null
  }

  const validateOtp = (otpArray: string[]): string | null => {
    const otpString = otpArray.join('')
    if (otpString.length !== 6) {
      return t('validation.otpRequired') || 'Please enter the complete 6-digit code'
    }
    return null
  }

  const handlePhoneChange = (value: string) => {
    // Only allow digits and spaces
    const cleaned = value.replace(/[^0-9\s]/g, '')
    setPhoneNumber(cleaned)
    if (touched.phone) {
      setErrors(prev => ({ ...prev, phone: validatePhone(cleaned) }))
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '')
    
    if (digit.length > 1) {
      // Handle paste: fill multiple inputs
      const digits = digit.slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d
        }
      })
      setOtp(newOtp)
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
    } else {
      // Single digit input
      const newOtp = [...otp]
      newOtp[index] = digit
      setOtp(newOtp)
      setErrors(prev => ({ ...prev, otp: null }))

      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSendOtp = async () => {
    const phoneError = validatePhone(phoneNumber)
    
    if (phoneError) {
      setErrors({ phone: phoneError })
      setTouched(prev => ({ ...prev, phone: true }))
      return
    }

    setIsLoading(true)
    try {
      const fullPhone = `${phoneCountryCode}${phoneNumber.replace(/\s/g, '')}`
      
      // Send OTP via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          channel: 'sms',
        },
      })

      if (error) throw error

      toast.success(t('toast.otpSent') || 'OTP sent successfully')
      setStep('verify-otp')
      setResendTimer(60) // 60 second cooldown
    } catch (error: any) {
      toast.error(t('toast.otpSendFailed') || 'Failed to send OTP', {
        description: error.message || t('toast.errorOccurred'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const otpError = validateOtp(otp)
    
    if (otpError) {
      setErrors({ otp: otpError })
      return
    }

    setIsLoading(true)
    try {
      const fullPhone = `${phoneCountryCode}${phoneNumber.replace(/\s/g, '')}`
      const otpString = otp.join('')

      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpString,
        type: 'sms',
      })

      if (error) throw error

      if (data.user) {
        // Check if this is a new user or existing user
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, username, onboarding_step, is_onboarded')
          .eq('id', data.user.id)
          .single()

        if (!userData) {
          // New user - create profile
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              phone: fullPhone,
              onboarding_step: 1,
              is_onboarded: false,
            })
        } else {
          // Existing user - update last active
          await supabase
            .from('users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', data.user.id)
        }

        // Check junction tables for completion flags
        const { data: traitsData } = await supabase
          .from('user_traits')
          .select('trait_id')
          .eq('user_id', data.user.id)
        
        const { data: brandsData } = await supabase
          .from('user_brands')
          .select('brand_id')
          .eq('user_id', data.user.id)
        
        const { data: colorsData } = await supabase
          .from('user_colors')
          .select('color_id')
          .eq('user_id', data.user.id)
        
        const userDataWithFlags = {
          ...userData,
          has_personality_traits: (traitsData?.length || 0) > 0,
          has_favorite_brands: (brandsData?.length || 0) > 0,
          has_favorite_colors: (colorsData?.length || 0) > 0,
        }
        
        const nextStep = getNextOnboardingStep(userDataWithFlags || {})
        router.push(nextStep)
      }
    } catch (error: any) {
      toast.error(t('toast.otpVerificationFailed') || 'OTP verification failed', {
        description: error.message || t('toast.errorOccurred'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return

    setIsResending(true)
    try {
      const fullPhone = `${phoneCountryCode}${phoneNumber.replace(/\s/g, '')}`
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          channel: 'sms',
        },
      })

      if (error) throw error

      toast.success(t('toast.otpResent') || 'OTP resent successfully')
      setResendTimer(60)
    } catch (error: any) {
      toast.error(t('toast.otpSendFailed') || 'Failed to resend OTP', {
        description: error.message || t('toast.errorOccurred'),
      })
    } finally {
      setIsResending(false)
    }
  }

  const isFieldValid = (field: keyof FieldErrors): boolean => {
    return touched[field] && !errors[field] && 
      (field === 'phone' ? phoneNumber.trim().length > 0 : otp.join('').length === 6)
  }

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
      
      {/* Language Switcher in top right/left based on RTL */}
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
            {/* Back Button and Logo - Same Row, Aligned Left, 32px Spacing */}
            <div className="mb-6 flex items-center gap-4">
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                type="button"
                onClick={() => {
                  if (step === 'verify-otp') {
                    setStep('phone')
                    setOtp(['', '', '', '', '', ''])
                    setErrors({})
                  } else {
                    router.push('/login')
                  }
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
              
              <img 
                src={HAADY_LOGO_URL}
                alt="Haady"
                className="w-14 h-14"
              />
            </div>

            {/* Header */}
            <motion.h1
              key={step}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
            >
              {step === 'phone' 
                ? (t('auth.continueWithPhone') || 'Continue with Phone')
                : (t('auth.verifyOtp') || 'Verify OTP')
              }
            </motion.h1>
            
            {/* Subtitle */}
            <motion.div
              key={`subtitle-${step}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mb-8"
            >
              <p className="text-gray-400 text-lg font-medium">
                {step === 'phone'
                  ? (t('auth.phoneSubtitle') || 'Enter your phone number to receive a verification code')
                  : (t('auth.otpSubtitle') || 'Enter the 6-digit code sent to your phone')
                }
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {step === 'phone' ? (
                <motion.form
                  key="phone-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendOtp()
                  }}
                  className="space-y-5"
                >
                  {/* Phone Number Input */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium">
                      {t('auth.phoneNumber') || 'Phone Number'}
                    </Label>
                    <div className="flex gap-2">
                      {/* Country Code Selector */}
                      <div className="relative">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="h-12 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-700 font-medium cursor-pointer appearance-none pr-8"
                          style={{ direction: 'ltr' }}
                        >
                          {COUNTRY_CODES.map(({ code, country, flag }) => (
                            <option key={code} value={code}>
                              {flag} {code}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Phone Number Input */}
                      <div className="flex-1 relative">
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={t('auth.phonePlaceholder') || '1234567890'}
                          value={phoneNumber}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                          className={`h-12 ${errors.phone ? 'border-red-500 focus:ring-red-500' : isFieldValid('phone') ? 'border-green-500 focus:ring-green-500' : ''}`}
                        />
                        <AnimatePresence>
                          {isFieldValid('phone') && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2`}
                            >
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Send OTP Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !phoneNumber.trim() || validatePhone(phoneNumber) !== null}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('auth.sendingOtp') || 'Sending OTP...'}</span>
                      </span>
                    ) : (
                      <span>{t('auth.sendOtp') || 'Send OTP'}</span>
                    )}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleVerifyOtp()
                  }}
                  className="space-y-5"
                >
                  {/* OTP Input */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      {t('auth.enterOtp') || 'Enter Verification Code'}
                    </Label>
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <Input
                          key={index}
                          ref={(el) => {
                            inputRefs.current[index] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(e.target.value, index)}
                          onKeyDown={(e) => handleOtpKeyDown(e, index)}
                          className={`w-12 h-14 text-center text-xl font-semibold ${errors.otp ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-rose-500'} rounded-xl`}
                        />
                      ))}
                    </div>
                    {errors.otp && (
                      <p className="text-sm text-red-500 mt-1 text-center">{errors.otp}</p>
                    )}
                  </div>

                  {/* Resend OTP */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || isResending}
                      className="text-sm text-gray-600 hover:text-rose-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isResending ? (
                        t('auth.resendingOtp') || 'Resending...'
                      ) : resendTimer > 0 ? (
                        t('auth.resendOtpIn')?.replace('{seconds}', resendTimer.toString()) || `Resend OTP in ${resendTimer}s`
                      ) : (
                        t('auth.resendOtp') || 'Resend OTP'
                      )}
                    </button>
                  </div>

                  {/* Verify Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || otp.join('').length !== 6}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('auth.verifying') || 'Verifying...'}</span>
                      </span>
                    ) : (
                      <span>{t('auth.verify') || 'Verify'}</span>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

