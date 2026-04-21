/**
 * POST /api/ourmoji/invites/:id/accept
 *
 * Accept a pending pairing invite. Creates the underlying experiment run.
 */

import { defineEventHandler, createError, getRouterParam } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { acceptInvite } from "~/server/services/ourmoji/invites";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing invite id" });
  }

  const result = await acceptInvite(id, user.id);
  return result;
});
