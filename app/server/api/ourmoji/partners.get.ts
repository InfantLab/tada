/**
 * GET /api/ourmoji/partners
 *
 * List ourmoji-enabled users other than the viewer. Used by the
 * experiment-invite UI to pick a partner by username.
 */

import { defineEventHandler, createError } from "h3";

import { unauthorized } from "~/server/utils/response";
import { isOurmojiEnabledForUser } from "~/server/services/ourmoji/access";
import { listOurmojiPartners } from "~/server/services/ourmoji/invites";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) throw createError(unauthorized(event));

  if (!(await isOurmojiEnabledForUser(user.id))) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  const partners = await listOurmojiPartners(user.id);
  return { partners };
});
