/**
 * GET /api/version
 *
 * Returns app version and build information
 */

export default defineEventHandler(() => {
  const config = useRuntimeConfig();

  // Get version info from runtime config (set in nuxt.config.ts)
  const pub = (config as unknown as Record<string, Record<string, unknown>>)['public']!;
  const appVersion = pub['appVersion'] as string;
  const gitHash = pub['gitHash'] as string;
  const gitShortHash = pub['gitShortHash'] as string;

  return {
    version: appVersion,
    gitHash,
    gitShortHash,
    fullVersion: gitShortHash
      ? `${appVersion}+${gitShortHash}`
      : appVersion,
  };
});
