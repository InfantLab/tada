import { defineEventHandler } from "h3";
import { lucia } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName) ?? null;

  if (!sessionId) {
    event.context.user = null;
    event.context.session = null;
    return;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    setCookie(
      event,
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  }

  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie();
    setCookie(
      event,
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );
  }

  event.context.user = user;
  event.context.session = session;
});
