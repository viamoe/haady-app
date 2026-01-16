/**
 * Client-side repository wrappers
 * These use the browser Supabase client and follow the same pattern as server repos
 * Used by client components for user-scoped reads/writes
 */

import { supabase } from '@/lib/supabase/client';
import type { AppError } from '@/server/db/errors';
import { mapSupabaseError } from '@/server/db/errors';

/**
 * Get user by ID (client-side)
 */
export async function getUserById(userId: string): Promise<{ data: Record<string, unknown> | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, birthdate, phone, country, city, profile_completion, points, level')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data: data as Record<string, unknown>, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Get user with preferences (client-side)
 */
export async function getUserWithPreferences(userId: string): Promise<{ data: unknown | null; error: AppError | null }> {
  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: mapSupabaseError(userError) };
    }

    // Check junction tables
    const [traitsResult, brandsResult, colorsResult] = await Promise.all([
      supabase.from('user_traits').select('trait_id').eq('user_id', userId),
      supabase.from('user_brands').select('brand_id').eq('user_id', userId),
      supabase.from('user_colors').select('color_id').eq('user_id', userId),
    ]);

    return {
      data: {
        ...user,
        has_personality_traits: (traitsResult.data?.length || 0) > 0,
        has_favorite_brands: (brandsResult.data?.length || 0) > 0,
        has_favorite_colors: (colorsResult.data?.length || 0) > 0,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Check if user is admin (client-side)
 */
export async function isAdminUser(userId: string): Promise<{ isAdmin: boolean; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { isAdmin: false, error: mapSupabaseError(error) };
    }

    return { isAdmin: !!data, error: null };
  } catch (error) {
    return { isAdmin: false, error: mapSupabaseError(error) };
  }
}

/**
 * Get all active traits (client-side)
 */
export async function getAllTraits(): Promise<{ data: unknown[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('traits_master')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Get all active brands (client-side)
 */
export async function getAllBrands(): Promise<{ data: unknown[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('brands_master')
      .select('*')
      .order('name');

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Get all active colors (client-side)
 */
export async function getAllColors(): Promise<{ data: unknown[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('colors_master')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Update user (client-side)
 */
export async function updateUser(
  userId: string,
  updates: Record<string, unknown>
): Promise<{ data: unknown | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Upsert user (create or update) - client-side
 */
export async function upsertUser(
  userId: string,
  userData: Record<string, unknown>
): Promise<{ data: unknown | null; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        ...userData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Check if username is available (client-side)
 */
export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string
): Promise<{ available: boolean; error: AppError | null }> {
  try {
    if (!username || username.trim().length === 0) {
      return { available: false, error: null };
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { available: false, error: mapSupabaseError(error) };
    }

    // If data exists, check if it's the current user's username
    if (data && currentUserId && data.id === currentUserId) {
      return { available: true, error: null };
    }

    return { available: !data, error: null };
  } catch (error) {
    return { available: false, error: mapSupabaseError(error) };
  }
}

/**
 * Get user traits IDs (client-side)
 */
export async function getUserTraits(userId: string): Promise<{ data: string[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('user_traits')
      .select('trait_id')
      .eq('user_id', userId);

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: data?.map(t => t.trait_id) || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Get user brands IDs (client-side)
 */
export async function getUserBrands(userId: string): Promise<{ data: string[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('user_brands')
      .select('brand_id')
      .eq('user_id', userId);

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: data?.map(b => b.brand_id) || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Get user colors IDs (client-side)
 */
export async function getUserColors(userId: string): Promise<{ data: string[]; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('user_colors')
      .select('color_id')
      .eq('user_id', userId);

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: data?.map(c => c.color_id) || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}
