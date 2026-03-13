import { defineEventHandler, setResponseHeader } from "h3";
import { nanoid } from "nanoid";

export default defineEventHandler((event) => {
  const requestId = nanoid(12);
  event.context.requestId = requestId;
  event.context.requestStartTime = Date.now();
  setResponseHeader(event, "X-Request-Id", requestId);
});
