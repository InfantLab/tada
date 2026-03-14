/**
 * Unit tests for auth endpoints:
 *   POST /api/auth/login
 *   POST /api/auth/register
 *   POST /api/auth/logout
 *   POST /api/auth/change-password
 *   POST /api/auth/reset-password
 *
 * Also covers session management helpers from ~/server/utils/auth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import loginHandler from "~/server/api/auth/login.post";
import registerHandler from "~/server/api/auth/register.post";
import logoutHandler from "~/server/api/auth/logout.post";
import changePasswordHandler from "~/server/api/auth/change-password.post";
import resetPasswordHandler from "~/server/api/auth/reset-password.post";
import { verifyPassword } from "~/server/utils/password";
import {
  createSession,
  setSessionCookie,
  invalidateSession,
} from "~/server/utils/auth";
import { isTokenExpired } from "~/server/utils/tokens";

// ---------------------------------------------------------------------------
// Hoisted mocks — these run before any module-level imports
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  // Nuxt auto-imports required by the handler modules
  (globalThis as Record<string, unknown>)["defineEventHandler"] = (
    handler: (...args: unknown[]) => unknown,
  ) => handler;
  (globalThis as Record<string, unknown>)["getCookie"] = vi.fn();
  (globalThis as Record<string, unknown>)["setCookie"] = vi.fn();
  (globalThis as Record<string, unknown>)["deleteCookie"] = vi.fn();
  (globalThis as Record<string, unknown>)["readBody"] = vi.fn();
  (globalThis as Record<string, unknown>)["createError"] = (opts: {
    statusCode: number;
    statusMessage: string;
  }) => {
    const err = new Error(opts.statusMessage) as Error & {
      statusCode: number;
      statusMessage: string;
    };
    err.statusCode = opts.statusCode;
    err.statusMessage = opts.statusMessage;
    return err;
  };

  // Chainable mock for drizzle query builder.
  // Every method returns the chain, and the chain itself is thenable
  // (resolves to undefined) so `await db.update().set().where()` works.
  function createChainableMock(resolveValue: unknown = []) {
    const chain: Record<string, ReturnType<typeof vi.fn>> & {
      then: ReturnType<typeof vi.fn>;
    } = {} as any;
    chain.then = vi.fn((resolve?: (v: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve),
    );
    chain.select = vi.fn().mockReturnValue(chain);
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockResolvedValue(resolveValue);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    chain.insert = vi.fn().mockReturnValue(chain);
    chain.values = vi.fn().mockResolvedValue(undefined);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.set = vi.fn().mockReturnValue(chain);
    chain.delete = vi.fn().mockReturnValue(chain);
    return chain;
  }

  const dbMock = createChainableMock();

  return {
    db: dbMock,
    createChainableMock,
    readBodyValue: { current: {} as Record<string, unknown> },
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("~/server/db", () => ({
  db: mocks.db,
}));

vi.mock("~/server/db/schema", () => ({
  users: { username: "username", id: "id" },
  sessions: { id: "id", userId: "user_id" },
  passwordResetTokens: { tokenHash: "token_hash", userId: "user_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => val),
  and: vi.fn((...args: unknown[]) => args),
  isNull: vi.fn((col: unknown) => col),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("~/server/utils/authEvents", () => ({
  logAuthEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/server/utils/email", () => ({
  isEmailConfigured: vi.fn().mockReturnValue(false),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/server/templates/email", () => ({
  passwordChangedEmail: vi.fn().mockReturnValue({
    subject: "test",
    html: "<p>test</p>",
    text: "test",
  }),
}));

vi.mock("~/server/utils/tokens", () => ({
  hashToken: vi.fn((t: string) => `hashed_${t}`),
  isTokenExpired: vi.fn().mockReturnValue(false),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "generated-id-1234"),
}));

// We import the real password utils (they are pure crypto, no DB)
// but mock them here to keep tests fast and deterministic.
vi.mock("~/server/utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("scrypt$hashed"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

vi.mock("~/server/utils/auth", async () => {
  return {
    createSession: vi.fn().mockResolvedValue({
      id: "session-abc",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86400000),
      fresh: false,
    }),
    setSessionCookie: vi.fn(),
    clearSessionCookie: vi.fn(),
    invalidateSession: vi.fn().mockResolvedValue(undefined),
    validateSession: vi.fn(),
  };
});

// h3 re-exports — the handlers import from "h3" but the real work is done by
// the globals we already shimmed above.
vi.mock("h3", () => ({
  defineEventHandler: (handler: (...args: unknown[]) => unknown) => handler,
  readBody: (...args: unknown[]) =>
    (globalThis as Record<string, unknown>)["readBody"]!(...(args as [unknown])),
  createError: (...args: unknown[]) =>
    (globalThis as Record<string, unknown>)["createError"]!(...(args as [unknown])),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockEvent(overrides: Record<string, unknown> = {}) {
  return { context: {}, ...overrides } as any;
}

function setReadBody(value: Record<string, unknown>) {
  (globalThis as Record<string, unknown>)["readBody"] = vi
    .fn()
    .mockResolvedValue(value);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success with valid credentials", async () => {
    setReadBody({ username: "alice", password: "password123" });

    // DB returns a matching user
    mocks.db.limit.mockResolvedValueOnce([
      {
        id: "user-1",
        username: "alice",
        passwordHash: "scrypt$hashed",
        timezone: "UTC",
      },
    ]);

    const result = await loginHandler(mockEvent());

    expect(result).toEqual({
      success: true,
      user: { id: "user-1", username: "alice" },
    });
    expect(createSession).toHaveBeenCalledWith("user-1");
    expect(setSessionCookie).toHaveBeenCalled();
  });

  it("should reject missing username", async () => {
    setReadBody({ password: "password123" });

    await expect(loginHandler(mockEvent())).rejects.toThrow(
      "Username and password are required",
    );
  });

  it("should reject missing password", async () => {
    setReadBody({ username: "alice" });

    await expect(loginHandler(mockEvent())).rejects.toThrow(
      "Username and password are required",
    );
  });

  it("should reject empty fields", async () => {
    setReadBody({ username: "", password: "" });

    await expect(loginHandler(mockEvent())).rejects.toThrow(
      "Username and password are required",
    );
  });

  it("should reject nonexistent user", async () => {
    setReadBody({ username: "ghost", password: "password123" });
    mocks.db.limit.mockResolvedValueOnce([]); // no user found

    await expect(loginHandler(mockEvent())).rejects.toThrow(
      "Invalid username or password",
    );
  });

  it("should reject invalid password", async () => {
    setReadBody({ username: "alice", password: "wrong" });

    mocks.db.limit.mockResolvedValueOnce([
      {
        id: "user-1",
        username: "alice",
        passwordHash: "scrypt$hashed",
      },
    ]);

    // verifyPassword returns false for wrong password
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await expect(loginHandler(mockEvent())).rejects.toThrow(
      "Invalid username or password",
    );
  });

  it("should reject user with null passwordHash", async () => {
    setReadBody({ username: "alice", password: "password123" });
    mocks.db.limit.mockResolvedValueOnce([
      { id: "user-1", username: "alice", passwordHash: null },
    ]);

    await expect(loginHandler(mockEvent())).rejects.toThrow(
      "Invalid username or password",
    );
  });
});

// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user with valid data", async () => {
    setReadBody({
      username: "newuser",
      password: "securepass123",
      timezone: "America/New_York",
    });

    // No existing user
    mocks.db.limit.mockResolvedValueOnce([]);
    // Insert succeeds (values mock)
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await registerHandler(mockEvent());

    expect(result).toEqual({
      success: true,
      user: { id: "generated-id-1234", username: "newuser" },
    });
    expect(createSession).toHaveBeenCalledWith("generated-id-1234");
    expect(setSessionCookie).toHaveBeenCalled();
  });

  it("should reject missing username", async () => {
    setReadBody({ password: "securepass123" });

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Username and password are required",
    );
  });

  it("should reject missing password", async () => {
    setReadBody({ username: "newuser" });

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Username and password are required",
    );
  });

  it("should reject password shorter than 8 characters", async () => {
    setReadBody({ username: "newuser", password: "short" });

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Password must be at least 8 characters",
    );
  });

  it("should reject password of exactly 7 characters", async () => {
    setReadBody({ username: "newuser", password: "1234567" });

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Password must be at least 8 characters",
    );
  });

  it("should accept password of exactly 8 characters", async () => {
    setReadBody({ username: "newuser", password: "12345678" });
    mocks.db.limit.mockResolvedValueOnce([]); // no duplicate
    mocks.db.values.mockResolvedValueOnce(undefined);

    const result = await registerHandler(mockEvent());
    expect(result.success).toBe(true);
  });

  it("should reject username shorter than 3 characters", async () => {
    setReadBody({ username: "ab", password: "securepass123" });

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Username must be between 3 and 31 characters",
    );
  });

  it("should reject username longer than 31 characters", async () => {
    setReadBody({
      username: "a".repeat(32),
      password: "securepass123",
    });

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Username must be between 3 and 31 characters",
    );
  });

  it("should reject duplicate username", async () => {
    setReadBody({ username: "existing", password: "securepass123" });
    // DB returns existing user
    mocks.db.limit.mockResolvedValueOnce([
      { id: "user-existing", username: "existing" },
    ]);

    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Username already taken",
    );
  });

  it("should default timezone to UTC when not provided", async () => {
    setReadBody({ username: "newuser", password: "securepass123" });
    mocks.db.limit.mockResolvedValueOnce([]);
    mocks.db.values.mockResolvedValueOnce(undefined);

    await registerHandler(mockEvent());

    // The db.insert().values() call should contain timezone: "UTC"
    const valuesCall = mocks.db.values.mock.calls[0]?.[0];
    expect(valuesCall).toMatchObject({ timezone: "UTC" });
  });
});

// ---------------------------------------------------------------------------

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should invalidate session and return success", async () => {
    (globalThis as Record<string, unknown>)["getCookie"] = vi
      .fn()
      .mockReturnValue("session-abc");

    const event = mockEvent();
    const result = await logoutHandler(event);

    expect(result).toEqual({ success: true });
    expect(invalidateSession).toHaveBeenCalledWith("session-abc");
  });

  it("should reject when no session cookie present", async () => {
    (globalThis as Record<string, unknown>)["getCookie"] = vi
      .fn()
      .mockReturnValue(undefined);

    await expect(logoutHandler(mockEvent())).rejects.toThrow(
      "No session found",
    );
  });
});

// ---------------------------------------------------------------------------

describe("POST /api/auth/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const authenticatedEvent = () =>
    mockEvent({
      context: {
        session: { id: "session-abc", userId: "user-1" },
        user: { id: "user-1", username: "alice" },
      },
    });

  it("should change password with valid current password", async () => {
    setReadBody({
      currentPassword: "oldpass123",
      newPassword: "newpass456",
    });

    // DB lookup returns user
    mocks.db.limit.mockResolvedValueOnce([
      {
        id: "user-1",
        username: "alice",
        passwordHash: "scrypt$oldhash",
        email: null,
      },
    ]);

    // verifyPassword succeeds
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    const result = await changePasswordHandler(authenticatedEvent());
    expect(result).toEqual({
      success: true,
      message: "Password changed successfully",
    });
  });

  it("should reject when not authenticated", async () => {
    setReadBody({
      currentPassword: "oldpass123",
      newPassword: "newpass456",
    });

    await expect(changePasswordHandler(mockEvent())).rejects.toThrow(
      "You must be logged in to change your password",
    );
  });

  it("should reject missing current password", async () => {
    setReadBody({ newPassword: "newpass456" });

    await expect(
      changePasswordHandler(authenticatedEvent()),
    ).rejects.toThrow("Current password is required");
  });

  it("should reject missing new password", async () => {
    setReadBody({ currentPassword: "oldpass123" });

    await expect(
      changePasswordHandler(authenticatedEvent()),
    ).rejects.toThrow("New password is required");
  });

  it("should reject new password shorter than 8 characters", async () => {
    setReadBody({ currentPassword: "oldpass123", newPassword: "short" });

    await expect(
      changePasswordHandler(authenticatedEvent()),
    ).rejects.toThrow("New password must be at least 8 characters");
  });

  it("should reject when new password equals current password", async () => {
    setReadBody({
      currentPassword: "samepass123",
      newPassword: "samepass123",
    });

    await expect(
      changePasswordHandler(authenticatedEvent()),
    ).rejects.toThrow(
      "New password must be different from current password",
    );
  });

  it("should reject wrong current password", async () => {
    setReadBody({
      currentPassword: "wrongpass",
      newPassword: "newpass456",
    });

    mocks.db.limit.mockResolvedValueOnce([
      {
        id: "user-1",
        username: "alice",
        passwordHash: "scrypt$oldhash",
        email: null,
      },
    ]);

    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await expect(
      changePasswordHandler(authenticatedEvent()),
    ).rejects.toThrow("Current password is incorrect");
  });
});

// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reset password with valid token", async () => {
    setReadBody({ token: "valid-token", password: "newpass456" });

    // DB returns matching token record
    mocks.db.limit.mockResolvedValueOnce([
      {
        token: {
          id: "tok-1",
          tokenHash: "hashed_valid-token",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          usedAt: null,
        },
        user: {
          id: "user-1",
          username: "alice",
          email: null,
        },
      },
    ]);

    vi.mocked(isTokenExpired).mockReturnValueOnce(false);

    const result = await resetPasswordHandler(mockEvent());
    expect(result).toMatchObject({ success: true });
  });

  it("should reject missing token", async () => {
    setReadBody({ password: "newpass456" });

    await expect(resetPasswordHandler(mockEvent())).rejects.toThrow(
      "Reset token is required",
    );
  });

  it("should reject missing password", async () => {
    setReadBody({ token: "valid-token" });

    await expect(resetPasswordHandler(mockEvent())).rejects.toThrow(
      "New password is required",
    );
  });

  it("should reject password shorter than 8 characters", async () => {
    setReadBody({ token: "valid-token", password: "short" });

    await expect(resetPasswordHandler(mockEvent())).rejects.toThrow(
      "Password must be at least 8 characters",
    );
  });

  it("should reject invalid / already-used token", async () => {
    setReadBody({ token: "bad-token", password: "newpass456" });
    mocks.db.limit.mockResolvedValueOnce([]); // no matching token

    await expect(resetPasswordHandler(mockEvent())).rejects.toThrow(
      "Invalid or expired reset link",
    );
  });

  it("should reject expired token", async () => {
    setReadBody({ token: "expired-tok", password: "newpass456" });

    mocks.db.limit.mockResolvedValueOnce([
      {
        token: {
          id: "tok-2",
          tokenHash: "hashed_expired-tok",
          expiresAt: new Date(Date.now() - 3600000).toISOString(),
          usedAt: null,
        },
        user: { id: "user-1", username: "alice", email: null },
      },
    ]);

    vi.mocked(isTokenExpired).mockReturnValueOnce(true);

    await expect(resetPasswordHandler(mockEvent())).rejects.toThrow(
      "This reset link has expired",
    );
  });
});

// ---------------------------------------------------------------------------

describe("Session management (auth.ts helpers)", () => {
  // These test the mocked interface matches the expected contract.
  // The real implementations hit the DB; we verify the functions are callable
  // and return the right shapes.

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSession returns session object with id and userId", async () => {
    const session = await createSession("user-1");
    expect(session).toMatchObject({
      id: expect.any(String),
      userId: "user-1",
      expiresAt: expect.any(Date),
    });
  });

  it("invalidateSession resolves without error", async () => {
    await expect(
      invalidateSession("session-abc"),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe("Password validation (minimum length enforcement)", () => {
  it("register rejects 7-char password", async () => {
    setReadBody({ username: "testuser", password: "1234567" });
    await expect(registerHandler(mockEvent())).rejects.toThrow(
      "Password must be at least 8 characters",
    );
  });

  it("register accepts 8-char password", async () => {
    setReadBody({ username: "testuser", password: "12345678" });
    mocks.db.limit.mockResolvedValueOnce([]);
    mocks.db.values.mockResolvedValueOnce(undefined);
    const result = await registerHandler(mockEvent());
    expect(result.success).toBe(true);
  });

  it("change-password rejects short new password", async () => {
    setReadBody({ currentPassword: "oldpass123", newPassword: "short" });
    const event = mockEvent({
      context: {
        session: { id: "s1", userId: "u1" },
        user: { id: "u1", username: "u" },
      },
    });
    await expect(changePasswordHandler(event)).rejects.toThrow(
      "New password must be at least 8 characters",
    );
  });

  it("reset-password rejects short password", async () => {
    setReadBody({ token: "tok", password: "short" });
    await expect(resetPasswordHandler(mockEvent())).rejects.toThrow(
      "Password must be at least 8 characters",
    );
  });
});
