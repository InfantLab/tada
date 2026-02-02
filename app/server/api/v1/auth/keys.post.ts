/**
 * POST /api/v1/auth/keys
 *
 * Generate a new API key for the authenticated user
 *
 * User Story 3: API Key Management
 */

import { z } from "zod";
import { created, apiError, validationError } from "~/server/utils/response";
import { createApiKey } from "~/server/utils/api-key";
import type { Permission } from "~/types/api";

// Validation schema for API key creation
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z
    .array(
      z.enum([
        "entries:read",
        "entries:write",
        "rhythms:read",
        "insights:read",
        "export:read",
        "webhooks:manage",
        "user:read",
      ]),
    )
    .min(1)
    .max(10),
  expiresAt: z.string().datetime().optional(),
});

export default defineEventHandler(async (event) => {
  const auth = event.context.auth;

  // This endpoint requires session authentication (not API key auth)
  if (!auth || auth.type !== "session") {
    throw createError(
      apiError(
        event,
        "SESSION_REQUIRED",
        "This endpoint requires session authentication",
        401,
      ),
    );
  }

  const userId = auth.userId;

  // Parse and validate request body
  const body = await readBody(event);
  const parseResult = createKeySchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};

    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }

    throw createError(validationError(event, errors));
  }

  const { name, permissions, expiresAt } = parseResult.data;

  try {
    // Create new API key
    const result = await createApiKey(
      userId,
      name,
      permissions as Permission[],
      expiresAt,
    );

    // Return created response with warning
    return created(event, {
      id: result.id,
      key: result.key, // ⚠️ Plaintext key returned ONLY ONCE
      keyPrefix: result.keyPrefix,
      permissions: result.permissions,
      expiresAt: result.expiresAt,
      warning:
        "Save this API key now. You won't be able to see it again. If you lose it, you'll need to generate a new one.",
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    throw createError(
      apiError(
        event,
        "CREATE_KEY_FAILED",
        "Failed to create API key",
        500,
      ),
    );
  }
});
