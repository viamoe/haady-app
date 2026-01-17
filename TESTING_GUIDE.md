# Testing Guide - Repository Pattern Refactoring

## Quick Start

### 1. Start Development Server
```bash
cd haady-app
npm run dev
```
Server will start on http://localhost:3001

### 2. Run Automated Tests
```bash
npm test
```

### 3. Run Tests in Watch Mode
```bash
npm test -- --watch
```

---

## Automated Test Results

### Unit Tests: Username Validation
**File:** `haadyui/components/__tests__/username-validation.test.ts`

**Run:** `npm test -- username-validation.test.ts`

**Expected:** All 30+ test cases should pass

---

## Manual Testing Checklist

### Phase 1: Username Validation (Critical)

#### Test 1: Valid Usernames
1. Navigate to http://localhost:3001/claim-username
2. Test these valid usernames (should all pass):
   - `john` ✅
   - `john123` ✅
   - `john_doe` ✅
   - `john.doe` ✅
   - `a1b2` (4 chars - minimum) ✅
   - `abcdefghijkl` (12 chars - maximum) ✅

**Expected:** All show green checkmark and "Username is available"

#### Test 2: Invalid Length
1. Try `abc` (3 chars) → Should show: "Username must be at least 4 characters"
2. Try `abcdefghijklm` (13 chars) → Should show: "Username must be 12 characters or less"

**Expected:** Red error message appears

#### Test 3: Invalid Characters
1. Try `john-doe` → Should show: "can only contain letters, numbers, underscores, and periods"
2. Try `john doe` (with space) → Should show: "cannot contain spaces"
3. Try `john@doe` → Should show invalid characters error

**Expected:** Appropriate error messages

#### Test 4: Start/End Rules
1. Try `1234` → Should show: "must start with a letter"
2. Try `_john` → Should show: "must start with a letter"
3. Try `john_` → Should show: "must end with a letter or number"
4. Try `john.` → Should show: "must end with a letter or number"

**Expected:** Appropriate error messages

#### Test 5: Consecutive Separators
1. Try `john..doe` → Should show: "consecutive separators"
2. Try `john__doe` → Should show: "consecutive separators"
3. Try `john._doe` → Should show: "consecutive separators"

**Expected:** Error about consecutive separators

#### Test 6: Reserved Words
1. Try `admin` → Should show: "reserved"
2. Try `haady` → Should show: "reserved"
3. Try `ADMIN` (uppercase) → Should show: "reserved" (case-insensitive)

**Expected:** Reserved word error

#### Test 7: All Numbers
1. Try `1234` → Should show: "cannot be all numbers"
2. Try `12345678` → Should show: "cannot be all numbers"

**Expected:** All numbers error

---

### Phase 2: API Routes (Critical)

#### Test 8: POST /api/users/traits

**Setup:** Login first, then use browser DevTools Network tab

1. **Valid Request:**
   ```bash
   curl -X POST http://localhost:3001/api/users/traits \
     -H "Content-Type: application/json" \
     -H "Cookie: [your-auth-cookie]" \
     -d '{"traits": ["valid-uuid-1", "valid-uuid-2"]}'
   ```
   **Expected:** `{ "ok": true, "data": { "count": 2 } }`

2. **Unauthenticated:**
   ```bash
   curl -X POST http://localhost:3001/api/users/traits \
     -H "Content-Type: application/json" \
     -d '{"traits": ["uuid"]}'
   ```
   **Expected:** `{ "ok": false, "error": { "code": "AUTH", "message": "..." } }`

3. **Invalid Input:**
   ```bash
   curl -X POST http://localhost:3001/api/users/traits \
     -H "Content-Type: application/json" \
     -H "Cookie: [your-auth-cookie]" \
     -d '{"traits": "not-an-array"}'
   ```
   **Expected:** `{ "ok": false, "error": { "code": "VALIDATION", "message": "..." } }`

4. **Invalid UUIDs:**
   ```bash
   curl -X POST http://localhost:3001/api/users/traits \
     -H "Content-Type: application/json" \
     -H "Cookie: [your-auth-cookie]" \
     -d '{"traits": ["not-a-uuid", "also-not-a-uuid"]}'
   ```
   **Expected:** Validation error with code "VALIDATION"

**Repeat for:**
- `/api/users/brands`
- `/api/users/colors`

---

### Phase 3: Authentication & Authorization

#### Test 9: Protected Routes
1. Open incognito/private window
2. Navigate to http://localhost:3001/claim-username
   **Expected:** Redirects to `/login`

3. Navigate to http://localhost:3001/home
   **Expected:** Redirects to `/login`

4. Navigate to http://localhost:3001/personality-traits
   **Expected:** Redirects to `/login`

#### Test 10: Admin Users
1. Login as admin user
2. Navigate to http://localhost:3001/home
   **Expected:** Should access home (skips onboarding)

3. Try to access onboarding steps
   **Expected:** Should redirect to `/home`

---

### Phase 4: Onboarding Flow

#### Test 11: Complete Flow
1. Login as new user
2. Complete profile → Should redirect to `/claim-username`
3. Claim username → Should redirect to `/personality-traits`
4. Select traits → Should redirect to `/favorite-brands`
5. Select brands → Should redirect to `/favorite-colors`
6. Select colors → Should redirect to `/home`
7. Verify profile completion = 100%

**Expected:** Smooth flow with correct redirects

#### Test 12: Skip Functionality
1. On each onboarding step, click "Skip"
2. Verify moves to next step
3. Verify onboarding completes eventually

**Expected:** Skip works on all steps

---

### Phase 5: Error Handling

#### Test 13: API Error Messages
1. Disconnect internet
2. Try to save traits/brands/colors
3. Verify error message is user-friendly
4. Verify no raw database errors shown

**Expected:** Friendly error messages, no technical details

#### Test 14: Loading States
1. Submit form
2. Verify spinner appears
3. Verify loading state clears after response
4. Verify no layout shifts

**Expected:** Smooth loading experience

---

### Phase 6: Component Precedence

#### Test 15: HaadyUI Components
1. Inspect buttons on all pages
2. Verify they use `@haady/ui` Button (check React DevTools)
3. Verify styling matches HaadyUI (rounded-full, animations)

**Expected:** All pages use HaadyUI components

---

## Test Results Template

Use `MANUAL_TEST_RESULTS.md` to record your test results.

## Critical Paths to Verify

1. ✅ **Signup → Claim Username → Enter App**
   - This is the most critical user journey
   - Test thoroughly

2. ✅ **API Error Handling**
   - Verify no raw errors leak to UI
   - Verify all errors have proper codes

3. ✅ **Repository Pattern**
   - Verify no direct `supabase.from()` calls in pages
   - Verify all DB access goes through repositories

---

## Known Issues to Watch For

1. **Username availability check delay** - Should be 0.25s for spinner, 0.5s for validation
2. **API response format** - Should always be `{ ok, data/error }`
3. **Error messages** - Should never show raw Supabase errors
4. **Component imports** - Should use `@haady/ui` first, then shadcn

---

## Next Steps After Testing

1. Document any failures in `MANUAL_TEST_RESULTS.md`
2. Fix any critical issues found
3. Re-test fixed issues
4. Update test coverage based on findings
