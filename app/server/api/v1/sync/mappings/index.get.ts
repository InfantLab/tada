/**
 * GET /api/v1/sync/mappings
 *
 * List sync mappings with optional provider filter.
 */

import { z } from "zod";
import { requirePermission } from "~/server/utils/permissions";
import { paginated, validationError } from "~/server/utils/response";
import { getMappingsByProvider } from "~/server/services/syncMappings";
import { getMappingsForEntry } from "~/server/services/syncMappings";

const querySchema = z.object({
  provider: z.string().optional(),
  entry_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, "sync:manage");

  const auth = event.context['auth']!;
  const userId = auth.userId;

  const rawQuery = getQuery(event);
  const parseResult = querySchema.safeParse(rawQuery);

  if (!parseResult.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    throw createError(validationError(event, errors));
  }

  const { provider, entry_id, limit, offset } = parseResult.data;

  let mappings;

  if (entry_id) {
    mappings = await getMappingsForEntry(userId, entry_id);
  } else if (provider) {
    mappings = await getMappingsByProvider(userId, provider);
  } else {
    // Return empty — provider or entry_id filter required
    mappings = [];
  }

  // Manual pagination
  const total = mappings.length;
  const paged = mappings.slice(offset, offset + limit);

  return paginated(event, paged, total, limit, offset);
});
