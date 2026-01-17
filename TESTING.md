# Testing Documentation

## Test Setup

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm test -- --ui

# Run specific test file
npm test -- username-validation.test.ts
```

## Manual Test Checklist

### Repository Pattern Refactoring

#### ✅ Happy Path Tests

1. **Username Claiming Flow**
   - [ ] Navigate to `/claim-username`
   - [ ] Enter valid username (4-12 chars, starts with letter)
   - [ ] Verify username availability check works
   - [ ] Submit and verify redirect to `/personality-traits`
   - [ ] Verify username is saved in database

2. **Onboarding Flow**
   - [ ] Complete profile → Claim username → Personality traits → Brands → Colors
   - [ ] Verify each step redirects correctly
   - [ ] Verify profile completion percentage updates
   - [ ] Verify final redirect to `/home` after completion

3. **API Routes**
   - [ ] POST `/api/users/traits` with valid UUIDs
   - [ ] POST `/api/users/brands` with valid UUIDs
   - [ ] POST `/api/users/colors` with valid UUIDs
   - [ ] Verify all return `{ ok: true, data: { count: number } }`

#### ✅ Invalid Input Tests

1. **Username Validation**
   - [ ] Try username < 4 chars → Should show error
   - [ ] Try username > 12 chars → Should show error
   - [ ] Try username starting with number → Should show error
   - [ ] Try username with spaces → Should show error
   - [ ] Try username with invalid chars (hyphens, @, etc.) → Should show error
   - [ ] Try reserved words (admin, haady, etc.) → Should show error
   - [ ] Try consecutive separators (.., __, ._) → Should show error
   - [ ] Try all numbers → Should show error

2. **API Validation**
   - [ ] POST `/api/users/traits` with invalid UUIDs → Should return validation error
   - [ ] POST `/api/users/traits` with non-array → Should return validation error
   - [ ] POST `/api/users/traits` with empty array → Should succeed (clears traits)
   - [ ] POST `/api/users/traits` with non-existent trait IDs → Should return validation error

#### ✅ Unauthorized/Forbidden Tests

1. **Authentication**
   - [ ] Access `/claim-username` without login → Should redirect to `/login`
   - [ ] Access `/home` without login → Should redirect to `/login`
   - [ ] POST to `/api/users/traits` without auth → Should return 401
   - [ ] POST to `/api/users/brands` without auth → Should return 401
   - [ ] POST to `/api/users/colors` without auth → Should return 401

2. **Admin Users**
   - [ ] Login as admin user → Should skip onboarding, go to `/home`
   - [ ] Verify admin users don't see onboarding steps

#### ✅ Loading + Empty + Error States

1. **Loading States**
   - [ ] Verify spinner appears when checking username availability
   - [ ] Verify spinner appears when submitting forms
   - [ ] Verify loading state on page initial load

2. **Error States**
   - [ ] Verify error messages display correctly
   - [ ] Verify error messages are user-friendly (no raw DB errors)
   - [ ] Verify error messages disappear when fixed

3. **Empty States**
   - [ ] Verify empty state when no traits/brands/colors selected
   - [ ] Verify empty state when user has no profile data

#### ✅ Mobile/Responsive Tests

1. **Responsive Design**
   - [ ] Test on mobile viewport (< 640px)
   - [ ] Test on tablet viewport (640px - 1024px)
   - [ ] Test on desktop viewport (> 1024px)
   - [ ] Verify RTL layout works correctly (Arabic)
   - [ ] Verify all forms are usable on mobile

## Automated Tests

### Unit Tests

**File:** `haadyui/components/__tests__/username-validation.test.ts`
- Tests all username validation rules
- Tests edge cases (min/max length, reserved words, etc.)
- Tests translation function support

**Run:** `npm test -- username-validation.test.ts`

### Integration Tests

**File:** `server/db/__tests__/users.repo.test.ts`
- Tests repository functions with test database
- Tests RLS policies
- Tests error handling

**Note:** Integration tests require a test database setup. See test file for setup instructions.

## Risk Assessment

### High Risk Areas

1. **Username Validation**
   - **Risk:** Invalid usernames could be saved if validation is bypassed
   - **Mitigation:** ✅ Server-side validation in API routes (`/api/users/claim-username`)
   - **Test Coverage:** ✅ Unit tests added, ✅ API route with server-side validation

2. **Repository Pattern**
   - **Risk:** Breaking changes to database queries could affect all pages
   - **Mitigation:** All queries centralized in repositories
   - **Test Coverage:** ⚠️ Integration tests needed (requires test DB)

3. **API Response Format**
   - **Risk:** Frontend breaking if response format changes
   - **Mitigation:** Standardized response format enforced
   - **Test Coverage:** ✅ Manual testing checklist

4. **Authentication Flow**
   - **Risk:** Users could access protected routes without auth
   - **Mitigation:** Auth checks in all pages and API routes
   - **Test Coverage:** ✅ Manual testing checklist

### Medium Risk Areas

1. **Onboarding Flow**
   - **Risk:** Users could get stuck in onboarding loop
   - **Mitigation:** Proper step tracking and redirects
   - **Test Coverage:** ✅ Manual testing checklist

2. **Error Handling**
   - **Risk:** Raw errors exposed to users
   - **Mitigation:** Error sanitization in repositories
   - **Test Coverage:** ✅ Manual testing checklist

## Test Coverage Summary

- ✅ Username validation: Unit tests added
- ⚠️ Repository functions: Integration tests structure created (needs test DB)
- ✅ API routes: Manual test checklist provided
- ✅ UI flows: Manual test checklist provided
- ✅ Error handling: Manual test checklist provided

## Next Steps

1. Set up test database for integration tests
2. Add E2E tests for critical flows (signup → claim username → enter app)
3. Add integration tests for all repository functions
4. Add API route integration tests
