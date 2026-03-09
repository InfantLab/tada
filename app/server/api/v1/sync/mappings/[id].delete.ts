/**
 * DELETE /api/v1/sync/mappings/:id
 *
 * Remove a sync mapping (unlinks entry from external system).
 * Does NOT delete the entry itself.
 */

import { requirePermission } from "~/server/utils/permissions";
import { success, apiError, notFound } from "~/server/utils/response";
import { deleteMapping } from "~/server/services/syncMappings";
import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";
import { syncMappings } from "~/server/db/schema";
import { withRetry } from "~/server/db/operations";

export default defineEventHandler(async (event) => {
  requirePermission(event, "sync:manage");

  const auth = event.context['auth']!;
  const userId = auth.userId;

  const mappingId = getRouterParam(event, "id");
  if (!mappingId) {
    throw createError(
      apiError(event, "INVALID_ID", "Mapping ID is required", 400),
    );
  }

  // Verify the mapping belongs to this user
  const existing = await withRetry(() =>
    db.query.syncMappings.findFirst({
      where: and(
        eq(syncMappings.id, mappingId),
        eq(syncMappings.userId, userId),
      ),
    }),
  );

  if (!existing) {
    throw createError(notFound(event, "Sync mapping"));
  }

  await deleteMapping(mappingId);

  return success(event, { deleted: true }, { deleted: true });
});
