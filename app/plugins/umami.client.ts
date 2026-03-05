/**
 * Umami Analytics Client Plugin
 *
 * Dynamically injects the Umami tracking script at runtime.
 * Set env vars: UMAMI_HOST and UMAMI_WEBSITE_ID
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const pub = (config as unknown as Record<string, Record<string, unknown>>)['public']!;
  const host = pub['umamiHost'] as string;
  const websiteId = pub['umamiWebsiteId'] as string;

  if (host && websiteId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `${host.replace(/\/+$/, "")}/script.js`;
    script.dataset['websiteId'] = websiteId;
    document.head.appendChild(script);
  }
});
