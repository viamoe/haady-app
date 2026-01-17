'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Locale } from './request'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  dir: 'ltr' | 'rtl'
  isRTL: boolean
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ 
  children, 
  initialLocale = 'en' 
}: { 
  children: React.ReactNode
  initialLocale?: Locale 
}) {
  // Only use initialLocale for the initial state - don't sync it later to avoid re-render loops
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale)

  const dir = useMemo((): 'rtl' | 'ltr' => locale === 'ar' ? 'rtl' : 'ltr', [locale])
  const isRTL = useMemo(() => locale === 'ar', [locale])

  // Track if we've already set the document attributes to prevent unnecessary updates
  const hasSetDocumentRef = useRef(false)
  const lastDirRef = useRef<string | null>(null)
  const lastLocaleRef = useRef<Locale | null>(null)

  const setLocale = useCallback((newLocale: Locale) => {
    // Prevent setting the same locale
    if (newLocale === locale) {
      return
    }
    setLocaleState(newLocale)
    // Set cookie for server-side
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`
    // Reload to apply new locale
    window.location.reload()
  }, [locale])

  useEffect(() => {
    // Update document direction and language only once on mount
    // The server-side layout already sets these, so we only need to sync on client
    if (typeof window !== 'undefined' && !hasSetDocumentRef.current) {
      const html = document.documentElement
      html.dir = dir
      html.lang = locale
      lastDirRef.current = dir
      lastLocaleRef.current = locale
      hasSetDocumentRef.current = true
    }
  }, []) // Only run once on mount

  // Update document when locale actually changes (user action)
  useEffect(() => {
    if (typeof window !== 'undefined' && hasSetDocumentRef.current) {
      const html = document.documentElement
      if (lastDirRef.current !== dir) {
        html.dir = dir
        lastDirRef.current = dir
      }
      if (lastLocaleRef.current !== locale) {
        html.lang = locale
        lastLocaleRef.current = locale
      }
    }
  }, [dir, locale])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    locale,
    setLocale,
    dir,
    isRTL,
  }), [locale, setLocale, dir, isRTL])

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

