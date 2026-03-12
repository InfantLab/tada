import { defineEventHandler } from "h3";
import {
  validateSession,
  setSessionCookie,
  clearSessionCookie,
} from "~/server/utils/auth";

const SESSION_COOKIE_NAME = "auth_session";

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, SESSION_COOKIE_NAME) ?? null;

  if (!sessionId) {
    event.context.user = null;
    event.context.session = null;
    return;
  }

  const { session, user } = await validateSession(sessionId);

  if (session && session.fresh) {
    setSessionCookie(event, session.id);
  }

  if (!session) {
    clearSessionCookie(event);
  }

  event.context.user = user;
  event.context.session = session;
});
