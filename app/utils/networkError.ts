/**
 * Distinguishes a genuine connectivity failure (airplane mode, DNS down,
 * no signal) from a real HTTP/application error.
 *
 * ofetch's FetchError exposes a `.response` getter only when a response
 * was actually received from the server. A raw `fetch()` rejection (no
 * connection at all) never reaches that point, so the thrown error has
 * no `.response`. We rely on that distinction rather than `navigator.onLine`,
 * which captive portals and some Android WebView versions report
 * unreliably.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const response = (err as { response?: unknown }).response;
  return response === undefined || response === null;
}
