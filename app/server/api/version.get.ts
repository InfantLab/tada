/**
 * GET /api/version
 *
 * Returns app version and build information
 */

export default defineEventHandler(() => {
  const config = useRuntimeConfig();

  // Get version info from runtime config (set in nuxt.config.ts)
  const appVersion = config.public.appVersion;
  const gitHash = config.public.gitHash;
  const gitShortHash = config.public.gitShortHash;

  return {
    version: appVersion,
    gitHash,
    gitShortHash,
    fullVersion: gitShortHash
      ? `${appVersion}+${gitShortHash}`
      : appVersion,
  };
});
