import { createServerSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, type AppError } from './errors';
import type { AdminUser } from './types';

/**
 * Check if user is an admin
 */
export async function isAdminUser(userId: string): Promise<{ isAdmin: boolean; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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
 * Get admin user by ID
 */
export async function getAdminUserById(userId: string): Promise<{ data: AdminUser | null; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: mapSupabaseError(error) };
    }

    return { data: data as AdminUser, error: null };
  } catch (error) {
    return { data: null, error: mapSupabaseError(error) };
  }
}
