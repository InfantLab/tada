/**
 * Umami Analytics Client Plugin
 *
 * Dynamically injects the Umami tracking script at runtime.
 * Set env vars: UMAMI_HOST and UMAMI_WEBSITE_ID
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const host = config.public.umamiHost as string;
  const websiteId = config.public.umamiWebsiteId as string;

  if (host && websiteId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = host;
    script.dataset.websiteId = websiteId;
    document.head.appendChild(script);
  }
});
