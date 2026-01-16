import { createServerSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, createValidationError, type AppError } from './errors';

/**
 * Get user brands
 */
export async function getUserBrands(userId: string): Promise<{ data: string[]; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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
 * Replace all user brands (delete existing, insert new)
 */
export async function replaceUserBrands(
  userId: string,
  brandIds: string[]
): Promise<{ data: { count: number }; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = brandIds.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      return {
        data: { count: 0 },
        error: createValidationError(`Invalid brand IDs: ${invalidIds.join(', ')}`),
      };
    }

    // Validate brand IDs exist in brands_master
    if (brandIds.length > 0) {
      const { data: existingBrands, error: checkError } = await supabase
        .from('brands_master')
        .select('id')
        .in('id', brandIds);

      if (checkError) {
        return { data: { count: 0 }, error: mapSupabaseError(checkError) };
      }

      const existingBrandIds = existingBrands?.map(b => b.id) || [];
      const missingIds = brandIds.filter(id => !existingBrandIds.includes(id));

      if (missingIds.length > 0) {
        return {
          data: { count: 0 },
          error: createValidationError(`Brand IDs not found: ${missingIds.join(', ')}`),
        };
      }
    }

    // Delete existing
    const { error: deleteError } = await supabase
      .from('user_brands')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      return { data: { count: 0 }, error: mapSupabaseError(deleteError) };
    }

    // Insert new
    if (brandIds.length > 0) {
      const brandsToInsert = brandIds.map(brandId => ({
        user_id: userId,
        brand_id: brandId,
      }));

      const { error: insertError } = await supabase
        .from('user_brands')
        .insert(brandsToInsert);

      if (insertError) {
        return { data: { count: 0 }, error: mapSupabaseError(insertError) };
      }
    }

    return { data: { count: brandIds.length }, error: null };
  } catch (error) {
    return { data: { count: 0 }, error: mapSupabaseError(error) };
  }
}
