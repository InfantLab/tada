import { defineEventHandler, readBody, createError } from "h3";
import { lucia } from "~/server/utils/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "~/server/utils/logger";
import { verifyPassword } from "~/server/utils/password";

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
      throw createError({
        statusCode: 400,
        statusMessage: "Username and password are required",
      });
    }

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existingUser.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid username or password",
      });
    }

    const user = existingUser[0];

    if (!user || !user.passwordHash) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid username or password",
      });
    }

    // Verify password
    const validPassword = await verifyPassword(body.password, user.passwordHash);

    if (!validPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid username or password",
      });
    }

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    setCookie(
      event,
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

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

    throw createError({
      statusCode: 500,
      statusMessage: "Login failed",
    });
  }
});
