/**
 * POST /api/ourmoji/invites
 *
 * Create a pending pairing invite from the viewer to another ourmoji-
 * enabled user. On accept, an experiment run is created.
 */

import { defineEventHandler, readBody, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { createInvite } from "~/server/services/ourmoji/invites";
import { parseOrThrow } from "~/server/services/ourmoji/validation";
import { createInviteSchema } from "./schemas";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const body = await readBody(event);
  const payload = parseOrThrow(createInviteSchema, body, "invite payload");

  const invite = await createInvite({
    fromUserId: user.id,
    toUserId: payload.toUserId,
    name: payload.name,
    startDate: payload.startDate,
    endDate: payload.endDate,
  });

  return { invite };
});
