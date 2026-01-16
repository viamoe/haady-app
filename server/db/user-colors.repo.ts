import { createServerSupabase } from '@/lib/supabase/server';
import { mapSupabaseError, createValidationError, type AppError } from './errors';

/**
 * Get user colors
 */
export async function getUserColors(userId: string): Promise<{ data: string[]; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();
    
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

/**
 * Replace all user colors (delete existing, insert new)
 */
export async function replaceUserColors(
  userId: string,
  colorIds: string[]
): Promise<{ data: { count: number }; error: AppError | null }> {
  try {
    const supabase = await createServerSupabase();

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = colorIds.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      return {
        data: { count: 0 },
        error: createValidationError(`Invalid color IDs: ${invalidIds.join(', ')}`),
      };
    }

    // Validate color IDs exist in colors_master
    if (colorIds.length > 0) {
      const { data: existingColors, error: checkError } = await supabase
        .from('colors_master')
        .select('id')
        .in('id', colorIds);

      if (checkError) {
        return { data: { count: 0 }, error: mapSupabaseError(checkError) };
      }

      const existingColorIds = existingColors?.map(c => c.id) || [];
      const missingIds = colorIds.filter(id => !existingColorIds.includes(id));

      if (missingIds.length > 0) {
        return {
          data: { count: 0 },
          error: createValidationError(`Color IDs not found: ${missingIds.join(', ')}`),
        };
      }
    }

    // Delete existing
    const { error: deleteError } = await supabase
      .from('user_colors')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      return { data: { count: 0 }, error: mapSupabaseError(deleteError) };
    }

    // Insert new
    if (colorIds.length > 0) {
      const colorsToInsert = colorIds.map(colorId => ({
        user_id: userId,
        color_id: colorId,
      }));

      const { error: insertError } = await supabase
        .from('user_colors')
        .insert(colorsToInsert);

      if (insertError) {
        return { data: { count: 0 }, error: mapSupabaseError(insertError) };
      }
    }

    return { data: { count: colorIds.length }, error: null };
  } catch (error) {
    return { data: { count: 0 }, error: mapSupabaseError(error) };
  }
}
