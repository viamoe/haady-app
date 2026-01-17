# API Route: `/api/users/claim-username`

## Overview

Server-side API route for claiming usernames with comprehensive validation and availability checking.

## Endpoint

**POST** `/api/users/claim-username`

## Authentication

Requires authenticated user (JWT token in cookies/headers).

## Request Body

```typescript
{
  username: string  // 4-12 characters, validated on server
}
```

## Response Format

### Success Response
```typescript
{
  ok: true,
  data: {
    username: string  // Normalized (lowercase, trimmed) username
  }
}
```

### Error Responses

#### Authentication Error
```typescript
{
  ok: false,
  error: {
    code: "AUTH",
    message: "Authentication required"
  }
}
```

#### Validation Error
```typescript
{
  ok: false,
  error: {
    code: "VALIDATION",
    message: "Validation failed: username: Username must be at least 4 characters",
    details: [...] // Zod error details
  }
}
```

#### Conflict Error (Username Taken)
```typescript
{
  ok: false,
  error: {
    code: "CONFLICT",
    message: "This username is already taken"
  }
}
```

#### Internal Error
```typescript
{
  ok: false,
  error: {
    code: "INTERNAL",
    message: "An error occurred while processing your request"
  }
}
```

## Validation Rules

The server validates usernames according to these rules (enforced via Zod schema):

1. **Length:** 4-12 characters
2. **Characters:** Only letters (a-z), numbers (0-9), underscores (_), and periods (.)
3. **No spaces:** Spaces are not allowed
4. **Start:** Must start with a letter
5. **End:** Must end with a letter or number
6. **Separators:** No consecutive separators (.., __, ._, _.)
7. **Numbers:** Cannot be all numbers
8. **Reserved:** Cannot be a reserved word (admin, support, haady, etc.)

## Process Flow

1. **Authentication Check:** Verifies user is authenticated
2. **Request Parsing:** Parses and validates JSON body
3. **Zod Validation:** Validates username format against schema
4. **Availability Check:** Checks if username is already taken
5. **Save Username:** Updates user record with normalized username
6. **Response:** Returns success or appropriate error

## Usage Example

### Frontend (React)

```typescript
const response = await fetch('/api/users/claim-username', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
  }),
})

const result = await response.json()

if (result.ok) {
  console.log('Username claimed:', result.data.username)
} else {
  console.error('Error:', result.error.message)
}
```

### cURL

```bash
curl -X POST http://localhost:3001/api/users/claim-username \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{"username": "john_doe"}'
```

## Files

- **Route:** `app/api/users/claim-username/route.ts`
- **Validation Schema:** `server/api/validation.ts` (claimUsernameRequestSchema)
- **Repository:** `server/db/users.repo.ts` (checkUsernameAvailability, updateUser)
- **Frontend Usage:** `app/claim-username/page.tsx`

## Security Features

1. ✅ **Server-side validation** - Cannot bypass client-side checks
2. ✅ **Authentication required** - Only authenticated users can claim usernames
3. ✅ **Availability checking** - Prevents duplicate usernames
4. ✅ **Normalization** - Usernames stored in lowercase for consistency
5. ✅ **Error sanitization** - No raw database errors exposed to client

## Testing

### Manual Testing

1. **Valid Username:**
   ```bash
   POST /api/users/claim-username
   Body: { "username": "john_doe" }
   Expected: { "ok": true, "data": { "username": "john_doe" } }
   ```

2. **Invalid Username (too short):**
   ```bash
   POST /api/users/claim-username
   Body: { "username": "abc" }
   Expected: { "ok": false, "error": { "code": "VALIDATION", ... } }
   ```

3. **Reserved Word:**
   ```bash
   POST /api/users/claim-username
   Body: { "username": "admin" }
   Expected: { "ok": false, "error": { "code": "VALIDATION", ... } }
   ```

4. **Taken Username:**
   ```bash
   POST /api/users/claim-username
   Body: { "username": "existing_user" }
   Expected: { "ok": false, "error": { "code": "CONFLICT", ... } }
   ```

5. **Unauthenticated:**
   ```bash
   POST /api/users/claim-username
   (No auth cookie)
   Expected: { "ok": false, "error": { "code": "AUTH", ... } }
   ```

## Status

✅ **COMPLETE** - Fully implemented with server-side validation, availability checking, and standardized error handling.
