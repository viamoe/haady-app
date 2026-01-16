import { createServerSupabase, createPublicSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, createAuthError, createValidationError, type AppError } from './errors';
import type { User, UserWithPreferences } from './types';

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<{ data: User | null; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null }; // Not found, but not an error
      }
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data: data as User, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Get user with preferences (traits, brands, colors flags)
 */
export async function getUserWithPreferences(userId: string): Promise<{ data: UserWithPreferences | null; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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

    const userWithPreferences: UserWithPreferences = {
      ...(user as User),
      has_personality_traits: (traitsResult.data?.length || 0) > 0,
      has_favorite_brands: (brandsResult.data?.length || 0) > 0,
      has_favorite_colors: (colorsResult.data?.length || 0) > 0,
    };

    return { data: userWithPreferences, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Update user
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: User | null; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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

    return { data: data as User, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}

/**
 * Check if username is available
 * 
 * RLS IMPACT: This function uses a database RPC function (check_username_availability)
 * with SECURITY DEFINER to bypass RLS. This is necessary because:
 * - This is a public endpoint (no auth required)
 * - Anonymous users need to check username availability during signup
 * - The RPC function only reads the username column (no sensitive data exposed)
 * - The function is read-only and cannot modify data
 * 
 * Security considerations:
 * - Function only checks existence of username (boolean result)
 * - No user data is returned, only availability status
 * - Function is granted to 'anon' and 'authenticated' roles only
 * - Input is sanitized and validated before query
 */
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; error: AppError | null }> {
  try {
    if (!username || username.trim().length === 0) {
      return { available: false, error: createValidationError('Username is required') };
    }

    // Use public client for unauthenticated endpoint
    let supabase;
    try {
      supabase = createPublicSupabase();
    } catch (clientError) {
      console.error('Failed to create public Supabase client:', {
        error: clientError instanceof Error ? clientError.message : String(clientError),
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
      return { 
        available: false, 
        error: {
          code: 'INTERNAL',
          message: 'Failed to initialize database connection',
        }
      };
    }
    
    // Use RPC function to bypass RLS
    const normalizedUsername = username.toLowerCase().trim();
    const { data, error } = await supabase.rpc('check_username_availability', {
      check_username: normalizedUsername
    });

    if (error) {
      console.error('Supabase RPC error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Fallback to direct query if RPC doesn't exist yet
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('RPC function not found, falling back to direct query');
        return await checkUsernameAvailabilityDirect(supabase, normalizedUsername);
      }
      
      return { available: false, error: mapSupabaseError(error) };
    }

    // RPC returns { available: boolean, username: string, error?: string }
    if (data && typeof data === 'object' && 'available' in data) {
      // If RPC returned an error in the response, it means the function executed but had an issue
      if (data.error) {
        console.warn('RPC function returned error, falling back to direct query:', data.error);
        // Fallback to direct query - might work if RLS allows it
        return await checkUsernameAvailabilityDirect(supabase, normalizedUsername);
      }
      // Success - return the availability status
      return { available: data.available as boolean, error: null };
    }

    // Fallback if RPC returns unexpected format
    console.warn('RPC returned unexpected format, falling back to direct query:', data);
    return await checkUsernameAvailabilityDirect(supabase, normalizedUsername);
  } catch (error) {
    console.error('Error in checkUsernameAvailability:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return { available: false, error: mapSupabaseError(error) };
  }
}

/**
 * Fallback method: Direct query (may fail due to RLS)
 * This is used as a fallback if RPC function doesn't exist
 */
async function checkUsernameAvailabilityDirect(supabase: any, username: string): Promise<{ available: boolean; error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return { available: false, error: mapSupabaseError(error) };
    }

    return { available: !data, error: null };
  } catch (error) {
    return { available: false, error: mapSupabaseError(error) };
  }
}

/**
 * Create or update user (for onboarding)
 */
export async function upsertUser(
  userId: string,
  userData: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: User | null; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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

    return { data: data as User, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}
