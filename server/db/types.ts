/**
 * Common types for repository layer
 */

export interface User {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  gender: string | null;
  birthdate: string | null;
  preferred_language: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  points: number | null;
  level: number | null;
  xp: number | null;
  streak_days: number | null;
  gift_privacy: string | null;
  last_active_at: string | null;
  is_active: boolean | null;
  is_blocked: boolean | null;
  deleted_at: string | null;
  onboarding_step: number | null;
  is_onboarded: boolean | null;
  profile_completion: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserWithPreferences extends User {
  has_personality_traits?: boolean;
  has_favorite_brands?: boolean;
  has_favorite_colors?: boolean;
}

export interface AdminUser {
  id: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Trait {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  is_popular: boolean | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
  category: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
