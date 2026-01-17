-- ================================
-- Check Username Availability Function
-- ================================
-- Description: Creates a database function to check if a username is available.
--              This function uses SECURITY DEFINER to bypass RLS, allowing
--              anonymous users to check username availability.
-- Date: 2025-01-XX

-- ================================
-- Function: check_username_availability
-- ================================

CREATE OR REPLACE FUNCTION check_username_availability(check_username TEXT)
RETURNS JSONB AS $$
DECLARE
  clean_username TEXT;
  username_exists BOOLEAN;
BEGIN
  -- 1. Sanitize input
  clean_username := lower(trim(check_username));
  
  -- 2. Basic validation
  IF clean_username IS NULL OR char_length(clean_username) = 0 THEN
    RETURN jsonb_build_object('available', false, 'error', 'Username is required');
  END IF;
  
  -- 3. Check if username exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_profile 
    WHERE username = clean_username
  ) INTO username_exists;
  
  -- 4. Return availability status
  RETURN jsonb_build_object(
    'available', NOT username_exists,
    'username', clean_username
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'available', false,
    'error', 'An error occurred while checking username availability'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- Documentation
-- ================================

COMMENT ON FUNCTION check_username_availability(TEXT) IS 
'Checks if a username is available. Uses SECURITY DEFINER to bypass RLS, allowing anonymous users to check availability. Returns JSONB with available status and username.';

-- ================================
-- Grant execute permission
-- ================================

GRANT EXECUTE ON FUNCTION check_username_availability(TEXT) TO anon, authenticated;

-- ================================
-- Usage Notes
-- ================================
-- 
-- This function:
-- 1. Bypasses RLS using SECURITY DEFINER
-- 2. Allows anonymous users to check username availability
-- 3. Returns a simple JSONB response
-- 4. Sanitizes input (lowercase, trimmed)
--
-- Example usage via Supabase RPC:
-- const { data, error } = await supabase.rpc('check_username_availability', { check_username: 'myusername' })
-- Returns: {"available": true, "username": "myusername"}
-- Or: {"available": false, "username": "myusername"}
