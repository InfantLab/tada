# Ourmoji — Home-Server Agent Setup

How to configure an external agent (running on your home server) to post the
daily Ourmoji oracle on behalf of multiple users.

The agent authenticates as the project owner using a single long-lived API key
with admin scope, and posts to an admin-only endpoint that accepts a target
`userId`. No per-user session cookies or per-user keys are needed.

Production base URL: `https://tada.living`

Replace `https://tada.living` below if running against a different deployment
(e.g. `http://localhost:3000` for local dev).

---

## Prerequisites

1. **You are an admin.** Your user id must be listed in the server-side
   `ADMIN_USER_IDS` env var (comma-separated).
2. **You know both user ids** — Caspar's (yours) and Marian's.
   You can find user ids via `GET https://tada.living/api/v1/admin/users` once
   you have a session, or in the database directly.
3. **You are logged in to tada in a browser** on the same origin (for the key
   minting step, which requires session auth).

---

## Step 1 — Mint the API key (browser)

Open the devtools console on any `https://tada.living/*` page while signed in,
and run:

```js
await fetch("https://tada.living/api/v1/auth/keys", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "home-server ourmoji agent",
    permissions: ["admin:users:write"],
  }),
}).then((r) => r.json());
```

The response includes a `key` field of the form `tada_key_…`. **This is the
only time the plaintext key is ever shown.** Copy it to the home-server agent's
secret store immediately. If you lose it, revoke and mint a new one.

> `admin:users:write` is the same permission used by the existing admin
> module-toggle and user-update endpoints. A single key with this scope can
> post daily Ourmoji for any user, toggle feature flags, update users, reset
> passwords, clear sessions, etc. Treat it like a root credential — do not
> share it outside the home-server agent.

---

## Step 2 — Enable Ourmoji for each user (one-shot)

The agent can only post for users who have the `ourmoji` module flag turned
on. Do this once per user from the home server (or anywhere with curl):

**For Caspar (you):**

```bash
curl -X PATCH https://tada.living/api/v1/admin/users/<CASPAR_USER_ID>/modules \
  -H "Authorization: Bearer tada_key_…" \
  -H "Content-Type: application/json" \
  -d '{"ourmoji": true}'
```

**For Marian:**

```bash
curl -X PATCH https://tada.living/api/v1/admin/users/<MARIAN_USER_ID>/modules \
  -H "Authorization: Bearer tada_key_…" \
  -H "Content-Type: application/json" \
  -d '{"ourmoji": true}'
```

A 200 with `{"data": {"enabledModules": {"ourmoji": true, …}}}` confirms the
flag is set.

---

## Step 3 — Verify the key (optional)

Quick sanity check from the home server:

```bash
curl https://tada.living/api/v1/admin/health \
  -H "Authorization: Bearer tada_key_…"
```

Expect a 200. If you get 401, the key is wrong or revoked. If you get 403,
your user is not in `ADMIN_USER_IDS` on the server.

---

## Step 4 — Daily posting (what the agent does each morning)

Once per user per day, POST to `/api/v1/admin/ourmoji/daily`:

```bash
curl -X POST https://tada.living/api/v1/admin/ourmoji/daily \
  -H "Authorization: Bearer tada_key_…" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<CASPAR_USER_ID>",
    "date": "2026-04-21",
    "timestamp": "2026-04-21T08:00:00+01:00",
    "emoji": "🌙",
    "reflection": "The waning gibbous whispers of release.",
    "moonPhase": "Waning Gibbous",
    "moonIllumination": 75,
    "wheelOfYear": "Beltane",
    "wheelCategory": "fire",
    "timezone": "Europe/London",
    "category": "moments",
    "subcategory": "magic"
  }'
```

### Field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | yes | Target user (Caspar or Marian) |
| `date` | string `YYYY-MM-DD` | yes | Local date the entry belongs to; idempotency key |
| `emoji` | string (1–16 chars) | yes | Drawn from the 23-emoji Sacred Set |
| `reflection` | string (≤ 5000 chars) | yes | Poetic reflection text |
| `moonPhase` | string | yes | e.g. "Waning Gibbous" |
| `moonIllumination` | number 0–100 | no | Percent illuminated |
| `wheelOfYear` | string | no | e.g. "Beltane", "Samhain" |
| `wheelCategory` | string | no | e.g. "fire", "water" |
| `timezone` | string | yes | IANA zone, e.g. "Europe/London" |
| `timestamp` | string ISO-8601 | no | When the reading was generated. Defaults to server-side NOW. Its calendar date must match `date` |
| `category` | string | no | Category slug. Defaults to `"moments"` for new Ourmoji entries |
| `subcategory` | string | no | Subcategory slug. Defaults to `"magic"` for new Ourmoji entries |

### Idempotency

The endpoint is idempotent per `(userId, date)` — re-posting for the same date
updates the existing entry rather than creating a duplicate. Safe to retry on
network failure.

### Response

```json
{
  "data": {
    "entry": {
      "id": "…",
      "date": "2026-04-21",
      "emoji": "🌙",
      "reflection": "…",
      "moonPhase": "Waning Gibbous",
      "moonIllumination": 75,
      "wheelOfYear": "Beltane",
      "wheelCategory": "fire",
      "timestamp": "2026-04-21T08:00:00+01:00",
      "timezone": "Europe/London",
      "category": "moments",
      "subcategory": "magic"
    }
  }
}
```

### Error cases

| Status | Meaning | Fix |
|--------|---------|-----|
| 400 | "Target user does not have the ourmoji module enabled" | Run Step 2 for that user |
| 401 | Missing/invalid Bearer token | Check the key |
| 403 | Admin check failed | Ensure your user id is in `ADMIN_USER_IDS` |
| 404 | Target user does not exist | Check the `userId` value |
| 422 | Validation error | Check the payload shape against the table above |

---

## Rotating / revoking the key

List your keys (browser console, logged in):

```js
await fetch("https://tada.living/api/v1/auth/keys", {
  credentials: "include",
}).then((r) => r.json());
```

Revoke by id:

```js
await fetch("https://tada.living/api/v1/auth/keys/<KEY_ID>", {
  method: "DELETE",
  credentials: "include",
});
```

Then redo Step 1 to mint a replacement and swap it into the agent's secret
store.

---

## What the agent needs to hold

- Base URL (`https://tada.living`)
- One Bearer token (`tada_key_…`)
- Caspar's user id
- Marian's user id
- Whatever it uses to compute each day's emoji / moon / Wheel of Year / reflection

That's it — no session cookies, no per-user credentials, no rotation
co-ordination across users.

---

## Reference: live API docs

Interactive docs for this endpoint (and the rest of the API) are served from
the app itself — no local setup needed:

- **Scalar UI:** https://tada.living/api-docs
- **OpenAPI JSON:** https://tada.living/api/openapi.json

---

[Back to Ourmoji](./ourmoji.md)
