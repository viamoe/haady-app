import { createServerSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, createValidationError, type AppError } from './errors';

/**
 * Get user traits
 */
export async function getUserTraits(userId: string): Promise<{ data: string[]; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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
 * Replace all user traits (delete existing, insert new)
 */
export async function replaceUserTraits(
  userId: string,
  traitIds: string[]
): Promise<{ data: { count: number }; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = traitIds.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      return {
        data: { count: 0 },
        error: createValidationError(`Invalid trait IDs: ${invalidIds.join(', ')}`),
      };
    }

    // Validate trait IDs exist in traits_master
    if (traitIds.length > 0) {
      const { data: existingTraits, error: checkError } = await supabase
        .from('traits_master')
        .select('id')
        .in('id', traitIds);

      if (checkError) {
        return { data: { count: 0 }, error: mapSupabaseError(checkError) };
      }

      const existingTraitIds = existingTraits?.map(t => t.id) || [];
      const missingIds = traitIds.filter(id => !existingTraitIds.includes(id));

      if (missingIds.length > 0) {
        return {
          data: { count: 0 },
          error: createValidationError(`Trait IDs not found: ${missingIds.join(', ')}`),
        };
      }
    }

    // Delete existing
    const { error: deleteError } = await supabase
      .from('user_traits')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      return { data: { count: 0 }, error: mapSupabaseError(deleteError) };
    }

    // Insert new
    if (traitIds.length > 0) {
      const traitsToInsert = traitIds.map(traitId => ({
        user_id: userId,
        trait_id: traitId,
      }));

      const { error: insertError } = await supabase
        .from('user_traits')
        .insert(traitsToInsert);

      if (insertError) {
        return { data: { count: 0 }, error: mapSupabaseError(insertError) };
      }
    }

    return { data: { count: traitIds.length }, error: null };
  } catch (error) {
    return { data: { count: 0 }, error: mapSupabaseError(error) };
  }
}
