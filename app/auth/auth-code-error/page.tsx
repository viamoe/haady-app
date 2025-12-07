'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

export default function AuthCodeError() {
  const t = useTranslations()
  const router = useRouter()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-200 via-50% to-orange-400" />
      <div className="absolute inset-0 bg-gradient-to-tr from-rose-200/40 via-transparent to-purple-200/30" />

      {/* Centered Card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white rounded-4xl shadow-2xl shadow-gray-900/10 p-8 sm:p-10"
          >
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <img 
                src={HAADY_LOGO_URL}
                alt="Haady"
                className="w-14 h-14"
              />
            </div>

            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Header */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
              {t('auth.authError') || 'Authentication Error'}
            </h1>
            
            <p className="text-gray-500 mb-8 text-center">
              {t('auth.authErrorDescription') || 'The link may have expired or is invalid. Please try signing in again.'}
            </p>

            {/* Try Again Button */}
            <Button
              onClick={() => router.push('/')}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl"
            >
              {t('auth.tryAgainButton') || 'Try Again'}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

