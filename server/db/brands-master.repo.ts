import { createServerSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, type AppError } from './errors';
import type { Brand } from './types';

/**
 * Get all active brands
 */
export async function getAllBrands(): Promise<{ data: Brand[]; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase
      .from('brands_master')
      .select('*')
      .order('name');

    if (error) {
      return { data: [], error: mapSupabaseError(error) };
    }

    return { data: (data as Brand[]) || [], error: null };
  } catch (error) {
    return { data: [], error: mapSupabaseError(error) };
  }
}

/**
 * Validate brand IDs exist
 */
export async function validateBrandIds(brandIds: string[]): Promise<{ valid: boolean; error: AppError | null }> {
  try {
    if (brandIds.length === 0) {
      return { valid: true, error: null };
    }

    const supabase = await createServerSupabase();
    
    const { data, error } = await supabase
      .from('brands_master')
      .select('id')
      .in('id', brandIds);

    if (error) {
      return { valid: false, error: mapSupabaseError(error) };
    }

    const existingIds = data?.map(b => b.id) || [];
    const missingIds = brandIds.filter(id => !existingIds.includes(id));

    if (missingIds.length > 0) {
      return { valid: false, error: null }; // Invalid IDs, but not a system error
    }

    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: mapSupabaseError(error) };
  }
}
