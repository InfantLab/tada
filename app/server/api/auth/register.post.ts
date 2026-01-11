import { defineEventHandler, readBody, createError } from "h3";
import { lucia } from "~/server/utils/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createLogger } from "~/server/utils/logger";

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
      throw createError({
        statusCode: 400,
        statusMessage: "Username and password are required",
      });
    }

    if (body.username.length < 3 || body.username.length > 31) {
      throw createError({
        statusCode: 400,
        statusMessage: "Username must be between 3 and 31 characters",
      });
    }

    if (body.password.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: "Password must be at least 6 characters",
      });
    }

    // Check if username already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existingUser.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Username already taken",
      });
    }

    // Hash password
    const passwordHash = await (
      Bun as unknown as {
        password: {
          hash: (
            password: string,
            options: { algorithm: string; memoryCost: number; timeCost: number }
          ) => Promise<string>;
        };
      }
    ).password.hash(body.password, {
      algorithm: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
    });

    // Create user
    const userId = nanoid();
    await db.insert(users).values({
      id: userId,
      username: body.username,
      passwordHash,
      timezone: body.timezone || "UTC",
    });

    // Create session
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    setCookie(
      event,
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

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

    throw createError({
      statusCode: 500,
      statusMessage: "Registration failed",
    });
  }
});
