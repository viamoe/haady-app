'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from '@/i18n/context'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ArrowRight, Gift, Heart, Sparkles, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, Suspense } from 'react'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

// Component to handle OAuth redirects
function OAuthRedirectHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams?.get('code')
    if (code) {
      // Check for OAuth origin cookie to determine if this is a merchant OAuth
      const cookies = document.cookie.split(';')
      let oauthOriginCookie: string | null = null
      
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'haady_oauth_origin') {
          oauthOriginCookie = decodeURIComponent(value)
          break
        }
      }
      
      // If we have an OAuth code and cookie indicates merchant, redirect to callback
      if (oauthOriginCookie) {
        try {
          const oauthData = JSON.parse(oauthOriginCookie)
          if (oauthData.app_type === 'merchant') {
            // Use the origin from the cookie if available, otherwise fallback to production URL
            const businessOrigin = oauthData.origin || 'https://business.haady.app'
            const callbackUrl = new URL(`${businessOrigin}/auth/callback`)
            callbackUrl.searchParams.set('code', code)
            callbackUrl.searchParams.set('app_type', 'merchant')
            if (oauthData.preferred_country) {
              callbackUrl.searchParams.set('preferred_country', oauthData.preferred_country)
            }
            if (oauthData.preferred_language) {
              callbackUrl.searchParams.set('preferred_language', oauthData.preferred_language)
            }
            console.log('🔵 Redirecting merchant OAuth from root page to:', callbackUrl.toString())
            window.location.href = callbackUrl.toString()
            return
          }
        } catch (e) {
          console.error('Failed to parse OAuth origin cookie:', e)
        }
      }
      
      // For regular haady.app OAuth, redirect to /auth/callback
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('code', code)
      // Preserve any other query params
      searchParams?.forEach((value, key) => {
        if (key !== 'code') {
          callbackUrl.searchParams.set(key, value)
        }
      })
      console.log('🔵 Redirecting OAuth from root page to /auth/callback:', callbackUrl.toString())
      router.replace(callbackUrl.pathname + callbackUrl.search)
    }
  }, [searchParams, router])

  return null
}

function LandingPageContent() {
  const t = useTranslations()
  const { isRTL, locale } = useLocale()
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/login')
  }

  return (
    <>
      <OAuthRedirectHandler />
      <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-200 via-50% to-orange-400" />
      <div className="absolute inset-0 bg-gradient-to-tr from-rose-200/40 via-transparent to-purple-200/30" />
      
      {/* Language Switcher */}
      <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} z-20`}>
        <LanguageSwitcher />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={HAADY_LOGO_URL}
              alt="Haady"
              className="w-10 h-10"
            />
            <span className="text-2xl font-bold text-gray-900">Haady</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGetStarted}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {t('landing.getStarted') || 'Get Started'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {t('landing.heroTitle') || 'Share Joy, Gift Happiness'}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              {t('landing.heroSubtitle') || 'Discover the perfect way to celebrate life\'s moments with thoughtful gifts that create lasting memories.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-8 py-6 rounded-xl"
              >
                {t('landing.getStarted') || 'Get Started'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-900 text-gray-900 hover:bg-gray-50 text-lg px-8 py-6 rounded-xl"
              >
                {t('landing.learnMore') || 'Learn More'}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.featuresTitle') || 'Why Choose Haady?'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('landing.featuresSubtitle') || 'Experience the joy of giving with our personalized gift recommendations'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('landing.feature1Title') || 'Personalized Recommendations'}
              </h3>
              <p className="text-gray-600">
                {t('landing.feature1Desc') || 'AI-powered suggestions based on personality, preferences, and occasions'}
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('landing.feature2Title') || 'Thoughtful Gifting'}
              </h3>
              <p className="text-gray-600">
                {t('landing.feature2Desc') || 'Find the perfect gift that shows you care and understand their style'}
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Gift className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('landing.feature3Title') || 'Easy & Fast'}
              </h3>
              <p className="text-gray-600">
                {t('landing.feature3Desc') || 'Quick setup, seamless experience, and instant gift ideas'}
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('landing.feature4Title') || 'Connect with Friends'}
              </h3>
              <p className="text-gray-600">
                {t('landing.feature4Desc') || 'Share your gift lists and discover what your friends love'}
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('landing.feature5Title') || 'Smart Reminders'}
              </h3>
              <p className="text-gray-600">
                {t('landing.feature5Desc') || 'Never miss a special occasion with personalized event reminders'}
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Gift className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('landing.feature6Title') || 'Curated Collections'}
              </h3>
              <p className="text-gray-600">
                {t('landing.feature6Desc') || 'Explore handpicked gift collections for every occasion and personality'}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="max-w-3xl mx-auto text-center bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('landing.ctaTitle') || 'Ready to Start Gifting?'}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('landing.ctaSubtitle') || 'Join thousands of users who make every gift special'}
          </p>
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-8 py-6 rounded-xl"
          >
            {t('landing.getStarted') || 'Get Started'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200/50 mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={HAADY_LOGO_URL}
                alt="Haady"
                className="w-8 h-8"
              />
              <span className="text-lg font-bold text-gray-900">Haady</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="#" className="hover:text-gray-900">{t('landing.privacy') || 'Privacy'}</Link>
              <Link href="#" className="hover:text-gray-900">{t('landing.terms') || 'Terms'}</Link>
              <Link href="#" className="hover:text-gray-900">{t('landing.contact') || 'Contact'}</Link>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Haady. {t('landing.rights') || 'All rights reserved.'}</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  )
}
