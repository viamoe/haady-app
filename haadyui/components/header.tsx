'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Globe, LogOut, User, Settings, Gift } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '../utils/cn'

const HAADY_LOGO_URL = 'https://rovphhvuuxwbhgnsifto.supabase.co/storage/v1/object/public/assets/haady-icon.svg'

export interface HeaderUser {
  id: string
  email?: string
}

export interface HeaderUserProfile {
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

export interface HeaderProps {
  /** Current user (null if not logged in) */
  user?: HeaderUser | null
  /** User profile data */
  userProfile?: HeaderUserProfile | null
  /** Current locale */
  locale: 'en' | 'ar'
  /** Whether the layout is RTL */
  isRTL?: boolean
  /** Whether auth check is in progress */
  isLoading?: boolean
  /** Callback when language toggle is clicked */
  onLanguageToggle?: () => void
  /** Callback when sign out is clicked */
  onSignOut?: () => void
  /** Callback when user dropdown item is clicked (profile/continue onboarding) */
  onUserClick?: () => void
  /** Callback when settings is clicked */
  onSettingsClick?: () => void
  /** Callback when my gifts is clicked */
  onMyGiftsClick?: () => void
  /** Whether user has completed onboarding (shows "Profile" vs "Continue Onboarding") */
  isOnboarded?: boolean
  /** Custom logo URL */
  logoUrl?: string
  /** Custom logo click handler */
  onLogoClick?: () => void
  /** Additional class names */
  className?: string
  /** Show login button when not authenticated */
  showLoginButton?: boolean
  /** Callback when login button is clicked */
  onLoginClick?: () => void
}

/**
 * Get initials from name or email for avatar fallback
 */
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0]?.toUpperCase() || '?'
  }
  if (email) {
    return email[0]?.toUpperCase() || '?'
  }
  return '?'
}

/**
 * HaadyUI Header Component
 * 
 * A unified header component with logo, user menu, and language toggle.
 * Supports both authenticated and unauthenticated states.
 */
export function Header({
  user,
  userProfile,
  locale,
  isRTL = false,
  isLoading = false,
  onLanguageToggle,
  onSignOut,
  onUserClick,
  onSettingsClick,
  onMyGiftsClick,
  isOnboarded = false,
  logoUrl = HAADY_LOGO_URL,
  onLogoClick,
  className,
  showLoginButton = true,
  onLoginClick,
}: HeaderProps) {
  const router = useRouter()

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick()
    } else {
      router.push('/')
    }
  }

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick()
    } else {
      router.push('/login')
    }
  }

  return (
    <header className={cn('w-full', className)}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Haady"
              className="w-12 h-12 cursor-pointer"
              onClick={handleLogoClick}
            />
          </div>

          {/* Action Buttons / User Info */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-10 w-32 rounded-full" />
            ) : user && userProfile ? (
              // Show user info when logged in - dropdown menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer outline-none',
                      isRTL && 'flex-row-reverse'
                    )}
                    aria-label="User menu"
                  >
                    <Avatar size="default" shape="circle" className="border-0 shadow-none !size-10">
                      {userProfile.avatar_url ? (
                        <AvatarImage 
                          src={userProfile.avatar_url} 
                          alt={userProfile.full_name || user.email || 'User'} 
                        />
                      ) : null}
                      <AvatarFallback
                        identifier={userProfile.full_name || user.email || user.id}
                        className="text-lg font-semibold"
                      >
                        {getInitials(userProfile.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'flex flex-col',
                      isRTL ? 'items-end text-right' : 'items-start text-left'
                    )}>
                      {userProfile.username && (
                        <span className="text-sm font-semibold text-gray-900">
                          @{userProfile.username}
                        </span>
                      )}
                      {user.email && (
                        <span className="text-xs text-gray-500">{user.email}</span>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isRTL ? 'start' : 'end'}
                  className="w-56"
                >
                  <DropdownMenuItem onClick={onUserClick}>
                    <User className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                    <span>
                      {isOnboarded
                        ? (locale === 'ar' ? 'الملف الشخصي' : 'Profile')
                        : (locale === 'ar' ? 'متابعة الإعداد' : 'Continue Onboarding')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onMyGiftsClick}>
                    <Gift className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                    <span>{locale === 'ar' ? 'هداياي' : 'My Gifts'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSettingsClick}>
                    <Settings className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                    <span>{locale === 'ar' ? 'الإعدادات' : 'Settings'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} variant="destructive">
                    <LogOut className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                    <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : showLoginButton ? (
              // Show login button when not logged in
              <Button
                onClick={handleLoginClick}
                size="lg"
                className="rounded-full px-6"
              >
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            ) : null}
            
            {/* Language Toggle */}
            <Button
              onClick={onLanguageToggle}
              size="lg"
              variant="outline"
              className="rounded-full w-10 h-10 p-0"
              aria-label={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
            >
              <Globe className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
