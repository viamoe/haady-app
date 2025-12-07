'use client'

import { useLocale } from '@/i18n/context'
import type { Locale } from '@/i18n/request'
import { Flag } from '@/components/flag'

const languages: { code: Locale; name: string; nativeName: string; countryCode: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', countryCode: 'GB-UKM' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', countryCode: 'SA' },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  const otherLang = languages.find(l => l.code !== locale)

  return (
    <button
      onClick={() => otherLang && setLocale(otherLang.code)}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer text-sm font-medium text-gray-700"
      title={`Switch to ${otherLang?.name}`}
    >
      <Flag
        code={otherLang?.countryCode || 'GB-UKM'}
        size="s"
        hasBorder={false}
        hasDropShadow={false}
        hasBorderRadius
        gradient="real-linear"
      />
      <span>{otherLang?.nativeName}</span>
    </button>
  )
}
