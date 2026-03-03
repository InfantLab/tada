/**
 * Umami Analytics Client Plugin
 *
 * Dynamically injects the Umami tracking script at runtime based on
 * public runtime config. No rebuild required — just set the env vars:
 *   NUXT_PUBLIC_UMAMI_HOST=https://your-umami.example.com/script.js
 *   NUXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
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
