/**
 * Onboarding step constants
 */
export const ONBOARDING_STEPS = {
  PERSONAL_INFO: 1,        // Unskippable
  CLAIM_USERNAME: 2,       // Unskippable
  PERSONALITY_TRAITS: 3,   // Skippable
  FAVORITE_BRANDS: 4,      // Skippable
  FAVORITE_COLORS: 5,      // Skippable
  COMPLETED: 6,
} as const

/**
 * Onboarding step paths
 */
export const ONBOARDING_PATHS = {
  [ONBOARDING_STEPS.PERSONAL_INFO]: '/complete-profile',
  [ONBOARDING_STEPS.CLAIM_USERNAME]: '/claim-username',
  [ONBOARDING_STEPS.PERSONALITY_TRAITS]: '/personality-traits',
  [ONBOARDING_STEPS.FAVORITE_BRANDS]: '/favorite-brands',
  [ONBOARDING_STEPS.FAVORITE_COLORS]: '/favorite-colors',
  [ONBOARDING_STEPS.COMPLETED]: '/home',
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
  // If already onboarded, go to home
  if (userData?.is_onboarded) {
    return '/home'
  }

  // If onboarding_step is COMPLETED, go to home (even if is_onboarded is not set)
  if (userData?.onboarding_step === ONBOARDING_STEPS.COMPLETED) {
    return '/home'
  }

  // Step 1: Personal Information (Unskippable)
  if (!userData?.full_name) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONAL_INFO]
  }

  // Step 2: Claim Username (Unskippable)
  if (!userData?.username) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.CLAIM_USERNAME]
  }

  // User has completed required steps (full_name and username)
  // Now check optional steps - only redirect if they're explicitly on an optional step
  const currentStep = userData?.onboarding_step

  // If no onboarding_step is set but user has required fields, they can go to home
  // (optional steps are skippable)
  if (!currentStep) {
    return '/home'
  }

  // Step 3: Personality Traits (Skippable)
  // Only redirect if they're explicitly on this step
  if (currentStep === ONBOARDING_STEPS.PERSONALITY_TRAITS) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.PERSONALITY_TRAITS]
  }

  // Step 4: Favorite Brands (Skippable)
  // Only redirect if they're explicitly on this step
  if (currentStep === ONBOARDING_STEPS.FAVORITE_BRANDS) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.FAVORITE_BRANDS]
  }

  // Step 5: Favorite Colors (Skippable)
  // Only redirect if they're explicitly on this step
  if (currentStep === ONBOARDING_STEPS.FAVORITE_COLORS) {
    return ONBOARDING_PATHS[ONBOARDING_STEPS.FAVORITE_COLORS]
  }

  // All steps completed or user has completed required steps and can skip optional ones
  return '/home'
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

  // Step 2: Claim Username (Unskippable)
  if (!userData?.username) {
    return ONBOARDING_STEPS.CLAIM_USERNAME
  }

  // Step 3: Personality Traits (Skippable)
  if (!userData?.has_personality_traits) {
    return ONBOARDING_STEPS.PERSONALITY_TRAITS
  }

  // Step 4: Favorite Brands (Skippable)
  if (!userData?.has_favorite_brands) {
    return ONBOARDING_STEPS.FAVORITE_BRANDS
  }

  // Step 5: Favorite Colors (Skippable)
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
  const totalSteps = 5 // Total onboarding steps
  let completedSteps = 0

  // Step 1: Personal Information (Required)
  if (userData?.full_name) {
    completedSteps++
  }

  // Step 2: Claim Username (Required)
  if (userData?.username) {
    completedSteps++
  }

  // Step 3: Personality Traits (Optional)
  if (userData?.has_personality_traits) {
    completedSteps++
  }

  // Step 4: Favorite Brands (Optional)
  if (userData?.has_favorite_brands) {
    completedSteps++
  }

  // Step 5: Favorite Colors (Optional)
  if (userData?.has_favorite_colors) {
    completedSteps++
  }

  return Math.round((completedSteps / totalSteps) * 100)
}

