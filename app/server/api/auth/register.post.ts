import { defineEventHandler, readBody, createError } from "h3";
import { createSession, setSessionCookie } from "~/server/utils/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createLogger } from "~/server/utils/logger";
import { hashPassword } from "~/server/utils/password";
import { apiError, internalError } from "~/server/utils/response";
import { upsertWeeklyRhythmSettings, refreshNextDueTimes } from "~/server/services/weekly-rhythms/settings";

const logger = createLogger("api:auth:register");

interface RegisterBody {
  username: string;
  password: string;
  timezone?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as RegisterBody;

    // Validate input
    if (!body.username || !body.password) {
      throw createError(
        apiError(event, "MISSING_CREDENTIALS", "Username and password are required", 400)
      );
    }

    if (body.username.length < 3 || body.username.length > 31) {
      throw createError(
        apiError(event, "INVALID_USERNAME_LENGTH", "Username must be between 3 and 31 characters", 400)
      );
    }

    if (body.password.length < 8) {
      throw createError(
        apiError(event, "PASSWORD_TOO_SHORT", "Password must be at least 8 characters", 400)
      );
    }

    // Check if username already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existingUser.length > 0) {
      throw createError(
        apiError(event, "USERNAME_TAKEN", "Username already taken", 400)
      );
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create user
    const userId = nanoid();
    await db.insert(users).values({
      id: userId,
      username: body.username,
      passwordHash,
      timezone: body.timezone || "UTC",
    });

    // Create session
    const session = await createSession(userId);
    setSessionCookie(event, session.id);

    // Auto-enable weekly celebrations + encouragement for new users
    try {
      await upsertWeeklyRhythmSettings(userId, {
        celebrationEnabled: true,
        encouragementEnabled: true,
        celebrationTier: "stats_only",
        onboardingCompletedAt: new Date().toISOString(),
      });
      await refreshNextDueTimes(userId);
    } catch (settingsErr) {
      // Non-fatal — user can enable manually in settings
      logger.error("Failed to create default weekly rhythm settings", settingsErr);
    }

    logger.info("User registered successfully", { username: body.username });

    return {
      success: true,
      user: {
        id: userId,
        username: body.username,
      },
    };
  } catch (error: unknown) {
    logger.error("Registration failed", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError(internalError(event, "Registration failed"));
  }
});
