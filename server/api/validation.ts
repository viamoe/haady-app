import { z } from 'zod'

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Reserved usernames that cannot be used
 * Includes system routes and common reserved terms to prevent URL conflicts
 */
export const RESERVED_USERNAMES = [
  // System routes
  'home', 'login', 'logout', 'signup', 'signin', 'signout',
  'register', 'auth', 'callback', 'verify', 'verify-email', 'verify-email-otp',
  'complete-profile', 'personality-traits', 'favorite-brands', 'favorite-colors',
  'create-account', 'forgot-password', 'reset-password', 'phone',
  'profile', 'settings', 'account', 'dashboard', 'notifications',
  'messages', 'inbox', 'search', 'explore', 'discover',
  'wishlist', 'gifts', 'my-gifts', 'orders', 'checkout', 'cart',
  
  // API and system
  'api', 'admin', 'administrator', 'support', 'haady',
  'www', 'mail', 'email', 'root', 'system', 'test', 'testing',
  'null', 'undefined', 'true', 'false',
  
  // Common pages
  'about', 'contact', 'help', 'faq', 'terms', 'privacy', 'legal',
  'blog', 'news', 'press', 'careers', 'jobs',
  
  // Reserved for future use
  'store', 'stores', 'shop', 'shops', 'business', 'merchant', 'merchants',
  'seller', 'sellers', 'buyer', 'buyers', 'user', 'users',
  'gift', 'send', 'receive', 'payments', 'billing', 'subscription',
  'premium', 'pro', 'plus', 'vip', 'official', 'verified',
]

/**
 * Username validation schema
 * Rules:
 * - Length: 4-12 characters
 * - Allowed: a-z, 0-9, underscore _, period .
 * - No spaces
 * - Must start with a letter
 * - Must end with letter/number
 * - No consecutive separators (.., __, ._, _.)
 * - Not all numbers
 * - Not a reserved word
 */
export const usernameSchema = z.string()
  .trim()
  .min(1, 'Username is required')
  .min(4, 'Username must be at least 4 characters')
  .max(12, 'Username must be 12 characters or less')
  .refine(
    (val) => !/\s/.test(val),
    'Username cannot contain spaces'
  )
  .refine(
    (val) => /^[a-zA-Z]/.test(val),
    'Username must start with a letter'
  )
  .refine(
    (val) => /[a-zA-Z0-9]$/.test(val),
    'Username must end with a letter or number'
  )
  .refine(
    (val) => /^[a-zA-Z0-9_.]+$/.test(val),
    'Username can only contain letters, numbers, underscores, and periods'
  )
  .refine(
    (val) => !/[._]{2,}|\._|_\./.test(val),
    'Username cannot have consecutive separators (.., __, ._, _.)'
  )
  .refine(
    (val) => !/^\d+$/.test(val),
    'Username cannot be all numbers'
  )
  .refine(
    (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
    'This username is reserved and cannot be used'
  )

/**
 * Schema for claim username API request
 */
export const claimUsernameRequestSchema = z.object({
  username: usernameSchema,
})

/**
 * Schema for traits API request
 */
export const traitsRequestSchema = z.object({
  traits: z.array(uuidSchema).min(0, 'Traits array cannot be empty if provided'),
})

/**
 * Schema for brands API request
 */
export const brandsRequestSchema = z.object({
  brands: z.array(uuidSchema).min(0, 'Brands array cannot be empty if provided'),
})

/**
 * Schema for colors API request
 */
export const colorsRequestSchema = z.object({
  colors: z.array(uuidSchema).min(0, 'Colors array cannot be empty if provided'),
})

/**
 * Type exports for TypeScript
 */
export type ClaimUsernameRequest = z.infer<typeof claimUsernameRequestSchema>
export type TraitsRequest = z.infer<typeof traitsRequestSchema>
export type BrandsRequest = z.infer<typeof brandsRequestSchema>
export type ColorsRequest = z.infer<typeof colorsRequestSchema>
