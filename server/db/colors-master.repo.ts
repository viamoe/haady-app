import { createServerSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, type AppError } from './errors';
import type { Color } from './types';

/**
 * Get all active colors
 */
export async function getAllColors(): Promise<{ data: Color[]; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase
      .from('colors_master')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: (data as Color[]) || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Validate color IDs exist
 */
export async function validateColorIds(colorIds: string[]): Promise<{ valid: boolean; error: AppError | null }> {
  try {
    if (colorIds.length === 0) {
      return { valid: true, error: null };
    }

    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase
      .from('colors_master')
      .select('id')
      .in('id', colorIds);

    if (error) {
      return { valid: false, error: mapSupabaseError(error) };
    }

    const existingIds = data?.map(c => c.id) || [];
    const missingIds = colorIds.filter(id => !existingIds.includes(id));

    if (missingIds.length > 0) {
      return { valid: false, error: null }; // Invalid IDs, but not a system error
    }

    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: mapSupabaseError(error) };
  }
}
