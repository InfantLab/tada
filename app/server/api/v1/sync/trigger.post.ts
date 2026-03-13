/**
 * POST /api/v1/sync/trigger
 *
 * Trigger a sync run for a specific provider.
 * Requires sync:manage permission.
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, validationError } from "~/server/utils/response";
import { getSyncProvider } from "~/registry/syncProviders";
import { runSync } from "~/server/services/syncEngine";
import { createLogger } from "~/server/utils/logger";

const logger = createLogger("api:v1:sync:trigger");

const bodySchema = z.object({
  provider: z.string().min(1),
  direction: z.enum(["pull", "push", "both"]).default("both"),
  dryRun: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, "sync:manage");

  const auth = event.context['auth']!;
  const userId = auth.userId;

  const body = await readBody(event);
  const parseResult = bodySchema.safeParse(body);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const { provider: providerId, direction, dryRun } = parseResult.data;

  // Verify provider exists
  const provider = getSyncProvider(providerId);
  if (!provider) {
    throw createError(
      apiError(event, "PROVIDER_NOT_FOUND", `Sync provider "${providerId}" not found`, 404),
    );
  }

  try {
    const summary = await runSync(userId, providerId, { direction, dryRun });
    return success(event, summary);
  } catch (error) {
    logger.error("Sync trigger failed", error instanceof Error ? error : new Error(String(error)), { userId: event.context.user?.id, requestId: event.context.requestId });
    throw createError(
      apiError(event, "SYNC_FAILED", "Sync operation failed", 500),
    );
  }
});
