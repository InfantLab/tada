# Email & Password Recovery Implementation Plan

**Version:** v0.2.0  
**Status:** ✅ Complete (Phase 1)  
**Created:** January 14, 2026  
**Completed:** January 14, 2026

## Overview

Add email field to users and implement password reset flow with email verification. Gracefully degrades for self-hosted instances without SMTP configuration.

## Database Schema Changes

### 1. Update `users` table

```sql
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
```

### 2. New `password_reset_tokens` table

| Column     | Type    | Description                          |
| ---------- | ------- | ------------------------------------ |
| id         | TEXT PK | UUID                                 |
| user_id    | TEXT FK | References users.id                  |
| token_hash | TEXT    | SHA-256 hash of token                |
| expires_at | TEXT    | ISO 8601 expiry (6 hours)            |
| used_at    | TEXT    | When token was used (null if unused) |
| created_at | TEXT    | Creation timestamp                   |

### 3. New `auth_events` table (audit logging)

| Column     | Type      | Description                                                                     |
| ---------- | --------- | ------------------------------------------------------------------------------- |
| id         | TEXT PK   | UUID                                                                            |
| user_id    | TEXT FK   | References users.id                                                             |
| event_type | TEXT      | login, logout, password_change, password_reset_request, password_reset_complete |
| ip_address | TEXT      | Client IP                                                                       |
| user_agent | TEXT      | Browser/client info                                                             |
| metadata   | TEXT JSON | Additional context                                                              |
| created_at | TEXT      | Event timestamp                                                                 |

## API Endpoints

### Password Reset Flow

1. **POST /api/auth/forgot-password**

   - Body: `{ email: string }`
   - Creates token, sends email (if SMTP configured)
   - Always returns success (no email enumeration)
   - Rate limit: 1 request per email per minute

2. **GET /api/auth/verify-reset-token**

   - Query: `?token=xxx`
   - Returns: `{ valid: boolean, email?: string }`
   - Checks token exists, not expired, not used

3. **POST /api/auth/reset-password**
   - Body: `{ token: string, password: string }`
   - Validates token, updates password, marks token used
   - Logs auth event
   - Invalidates all existing sessions

### Password Change (Authenticated)

4. **POST /api/auth/change-password**
   - Body: `{ currentPassword: string, newPassword: string }`
   - Requires authentication
   - Verifies current password
   - Logs auth event

### Email Management

5. **POST /api/auth/update-email**

   - Body: `{ email: string, password: string }`
   - Requires authentication
   - Sends verification email (if SMTP configured)

6. **POST /api/auth/verify-email**
   - Body: `{ token: string }`
   - Marks email as verified

## File Structure

```
app/server/
├── api/auth/
│   ├── forgot-password.post.ts    # ✅ CREATED
│   ├── reset-password.post.ts     # ✅ CREATED
│   ├── verify-reset-token.get.ts  # ✅ CREATED
│   ├── change-password.post.ts    # ✅ CREATED
│   ├── update-email.post.ts       # 🔲 TODO (Phase 2)
│   └── verify-email.post.ts       # 🔲 TODO (Phase 2)
├── db/
│   ├── schema.ts                  # ✅ MODIFIED - added email, emailVerified, passwordResetTokens, authEvents
│   └── migrations/
│       └── 0003_fast_brood.sql    # ✅ CREATED & APPLIED
├── utils/
│   ├── email.ts                   # ✅ CREATED - Nodemailer wrapper
│   ├── tokens.ts                  # ✅ CREATED - Token generation/verification
│   ├── tokens.test.ts             # ✅ CREATED - 16 tests passing
│   └── authEvents.ts              # ✅ CREATED - Audit logging & rate limiting
└── templates/
    └── email.ts                   # ✅ CREATED - All email templates

app/pages/
├── forgot-password.vue            # ✅ CREATED
├── reset-password.vue             # ✅ CREATED
├── login.vue                      # ✅ MODIFIED - Added "Forgot password?" link
└── settings.vue                   # ✅ MODIFIED - Added Security section
```

## Environment Variables

```env
# SMTP Configuration (optional for self-hosted)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASSWORD=secret
SMTP_FROM="Ta-Da! <noreply@example.com>"

# App URL (for email links)
APP_URL=https://tada.living
```

## Implementation Order

1. ✅ **Schema Changes** (15 min)

   - Add email fields to users
   - Create password_reset_tokens table
   - Create auth_events table
   - Generate and run migration (0003_fast_brood.sql)

2. ✅ **Token Utilities** (10 min)

   - Create server/utils/tokens.ts
   - generateSecureToken() - 32 bytes, URL-safe base64
   - hashToken() - SHA-256
   - Token expiry validation
   - 16 unit tests passing

3. ✅ **Email Service** (20 min)

   - Create server/utils/email.ts
   - Nodemailer transport setup
   - isEmailConfigured() check
   - sendEmail() wrapper with error handling

4. ✅ **Email Templates** (15 min)

   - HTML/text templates for password reset
   - Styled with Ta-Da branding
   - Responsive design
   - Created: password reset, welcome, email verification, password changed

5. ✅ **Password Reset API** (30 min)

   - forgot-password.post.ts
   - verify-reset-token.get.ts
   - reset-password.post.ts
   - Rate limiting (1/min per email)

6. ✅ **Change Password API** (15 min)

   - change-password.post.ts
   - Verify current password
   - Audit logging

7. ✅ **Auth Event Logging** (15 min)

   - Created server/utils/authEvents.ts
   - Add to login, password changes
   - Store IP and user agent

8. ✅ **UI: Forgot Password** (20 min)

   - /forgot-password page
   - Email input form
   - Success/error states

9. ✅ **UI: Reset Password** (20 min)

   - /reset-password page
   - Token validation on mount
   - New password form

10. ✅ **UI: Settings Updates** (30 min)

    - Add email field to settings
    - Change password section
    - Email verification status display

11. ✅ **Testing** (30 min)
    - Unit tests for token utilities (16 tests passing)
    - API endpoint tests (pending)
    - Integration tests (pending)

## Remaining Work (Phase 2)

- [ ] **Email verification flow** - POST /api/auth/update-email, POST /api/auth/verify-email
- [ ] **Logout event logging** - Add logAuthEvent to logout endpoint
- [ ] **API integration tests** - Full flow testing with test database

## Security Considerations

- **Token Security:** 32-byte cryptographically random tokens, stored as SHA-256 hash
- **No Email Enumeration:** Always return success on forgot-password
- **Rate Limiting:** 1 reset request per email per minute
- **Token Expiry:** 6 hours, single use only
- **Session Invalidation:** Reset password invalidates all sessions
- **Password Requirements:** Minimum 6 characters (consider strengthening)
- **Audit Trail:** All auth events logged with IP and user agent

## Graceful Degradation

When SMTP is not configured:

- Password reset links shown in server logs (dev mode only)
- UI shows "Email not configured" message
- Change password still works for logged-in users
- No email verification required

## Dependencies

- **nodemailer:** ^6.9.x (email sending) ✅ Installed
- **@types/nodemailer:** ^6.4.x (TypeScript types) ✅ Installed

## Testing Strategy

1. **Unit Tests:**

   - ✅ Token generation/validation (16 tests passing)
   - 🔲 Email template rendering
   - 🔲 Password validation

2. **API Tests:**

   - 🔲 Forgot password flow
   - 🔲 Reset token verification
   - 🔲 Password update
   - 🔲 Rate limiting

3. **Manual Testing:**
   - 🔲 Full flow with real SMTP (Mailtrap/Ethereal)
   - 🔲 Self-hosted mode without SMTP
