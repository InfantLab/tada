import { defineEventHandler, readBody, createError } from "h3";
import { createSession, setSessionCookie } from "~/server/utils/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import { verifyPassword } from "~/server/utils/password";
import { logAuthEvent } from "~/server/utils/authEvents";
import { apiError, internalError } from "~/server/utils/response";

const logger = createLogger("api:auth:login");

interface LoginBody {
  username: string;
  password: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as LoginBody;

    // Validate input
    if (!body.username || !body.password) {
      throw createError(
        apiError(event, "MISSING_CREDENTIALS", "Username and password are required", 400)
      );
    }

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existingUser.length === 0) {
      throw createError(
        apiError(event, "INVALID_CREDENTIALS", "Invalid username or password", 400)
      );
    }

    const user = existingUser[0];

    if (!user || !user.passwordHash) {
      throw createError(
        apiError(event, "INVALID_CREDENTIALS", "Invalid username or password", 400)
      );
    }

    // Verify password
    const validPassword = await verifyPassword(
      body.password,
      user.passwordHash
    );

    if (!validPassword) {
      throw createError(
        apiError(event, "INVALID_CREDENTIALS", "Invalid username or password", 400)
      );
    }

    // Create session
    const session = await createSession(user.id);
    setSessionCookie(event, session.id);

    // Log successful login
    await logAuthEvent({
      event,
      userId: user.id,
      eventType: "login",
    });

    logger.info("User logged in successfully", { username: user.username });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  } catch (error: unknown) {
    logger.error("Login failed", error);

    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    throw createError(internalError(event, "Login failed"));
  }
});
