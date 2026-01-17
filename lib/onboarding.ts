/**
 * Onboarding step constants
 */
export const ONBOARDING_STEPS = {
  PERSONAL_INFO: 1,        // Unskippable
  PERSONALITY_TRAITS: 2,   // Skippable (was step 3, now step 2)
  FAVORITE_BRANDS: 3,      // Skippable (was step 4, now step 3)
  FAVORITE_COLORS: 4,      // Skippable (was step 5, now step 4)
  COMPLETED: 5,            // (was step 6, now step 5)
} as const

/**
 * Special redirect indicator for profile page
 * When this is returned, the calling code should redirect to /{username}
 */
export const PROFILE_REDIRECT = '__PROFILE__' as const

/**
 * Onboarding step paths
 * Note: CLAIM_USERNAME step has been removed - username is now handled in complete-profile
 * Note: COMPLETED redirects to user's profile page (/{username})
 */
export const ONBOARDING_PATHS = {
  [ONBOARDING_STEPS.PERSONAL_INFO]: '/complete-profile',
  [ONBOARDING_STEPS.PERSONALITY_TRAITS]: '/personality-traits',
  [ONBOARDING_STEPS.FAVORITE_BRANDS]: '/favorite-brands',
  [ONBOARDING_STEPS.FAVORITE_COLORS]: '/favorite-colors',
  [ONBOARDING_STEPS.COMPLETED]: PROFILE_REDIRECT,
} as const

/**
 * Determines the next onboarding step based on user's profile completion status
 * @param userData - User data from the database
 * @returns The path to redirect to
 */
export function getNextOnboardingStep(userData: {
  full_name?: string | null
  username?: string | null
  onboarding_step?: number | null
  is_onboarded?: boolean | null
  has_personality_traits?: boolean | null
  has_favorite_brands?: boolean | null
  has_favorite_colors?: boolean | null
}): string {
  // If already onboarded, go to profile
  if (userData?.is_onboarded) {
    return PROFILE_REDIRECT
  }

  // If onboarding_step is COMPLETED, go to profile (even if is_onboarded is not set)
  if (userData?.onboarding_step === ONBOARDING_STEPS.COMPLETED) {
    return PROFILE_REDIRECT
  }

  // Step 1: Personal Information (Unskippable)
  if (!userData?.full_name) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONAL_INFO]
  }

  // Note: Username is now handled in complete-profile step, so we skip the claim-username step
  // User has completed required step (full_name)
  // Now check optional steps - only redirect if they're explicitly on an optional step
  const currentStep = userData?.onboarding_step

  // If no onboarding_step is set but user has required fields, they can go to profile
  // (optional steps are skippable)
  if (!currentStep) {
    return PROFILE_REDIRECT
  }

  // Step 2: Personality Traits (Skippable)
  if (currentStep === ONBOARDING_STEPS.PERSONALITY_TRAITS) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONALITY_TRAITS]
  }

  // Step 3: Favorite Brands (Skippable)
  if (currentStep === ONBOARDING_STEPS.FAVORITE_BRANDS) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.FAVORITE_BRANDS]
  }

  // Step 4: Favorite Colors (Skippable)
  if (currentStep === ONBOARDING_STEPS.FAVORITE_COLORS) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.FAVORITE_COLORS]
  }

  // All steps completed or user has completed required steps and can skip optional ones
  return PROFILE_REDIRECT
}

/**
 * Determines the current onboarding step number based on user data
 * @param userData - User data from the database
 * @returns The step number (1-6)
 */
export function getCurrentOnboardingStep(userData: {
  full_name?: string | null
  username?: string | null
  has_personality_traits?: boolean | null
  has_favorite_brands?: boolean | null
  has_favorite_colors?: boolean | null
}): number {
  // Step 1: Personal Information (Unskippable)
  if (!userData?.full_name) {
    return ONBOARDING_STEPS.PERSONAL_INFO
  }

  // Note: Username is now handled in complete-profile step, so we skip the claim-username step

  // Step 2: Personality Traits (Skippable) - was step 3, now step 2
  if (!userData?.has_personality_traits) {
    return ONBOARDING_STEPS.PERSONALITY_TRAITS
  }

  // Step 3: Favorite Brands (Skippable) - was step 4, now step 3
  if (!userData?.has_favorite_brands) {
    return ONBOARDING_STEPS.FAVORITE_BRANDS
  }

  // Step 4: Favorite Colors (Skippable) - was step 5, now step 4
  if (!userData?.has_favorite_colors) {
    return ONBOARDING_STEPS.FAVORITE_COLORS
  }

  // All steps completed
  return ONBOARDING_STEPS.COMPLETED
}

/**
 * Calculates profile completion percentage
 * @param userData - User data from the database
 * @returns Completion percentage (0-100)
 */
export function calculateProfileCompletion(userData: {
  full_name?: string | null
  username?: string | null
  has_personality_traits?: boolean | null
  has_favorite_brands?: boolean | null
  has_favorite_colors?: boolean | null
}): number {
  const totalSteps = 4 // Total onboarding steps (removed claim-username as separate step)
  let completedSteps = 0

  // Step 1: Personal Information (Required)
  if (userData?.full_name) {
    completedSteps++
  }

  // Note: Username is now part of personal information step, not counted separately

  // Step 2: Personality Traits (Optional) - was step 3, now step 2
  if (userData?.has_personality_traits) {
    completedSteps++
  }

  // Step 3: Favorite Brands (Optional) - was step 4, now step 3
  if (userData?.has_favorite_brands) {
    completedSteps++
  }

  // Step 4: Favorite Colors (Optional) - was step 5, now step 4
  if (userData?.has_favorite_colors) {
    completedSteps++
  }

  return Math.round((completedSteps / totalSteps) * 100)
}

