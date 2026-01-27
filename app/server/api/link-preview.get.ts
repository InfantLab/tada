import { createLogger } from "~/server/utils/logger";
import {
  detectLinkType,
  getYouTubeThumbnail,
  isValidUrl,
  type LinkMetadata,
} from "~/utils/linkPreview";

const log = createLogger("api:link-preview");

/**
 * GET /api/link-preview?url=...
 *
 * Fetches metadata for a URL using oEmbed or OpenGraph parsing.
 * Supports YouTube, Spotify, SoundCloud with oEmbed.
 * Falls back to OpenGraph parsing for other URLs.
 */
export default defineEventHandler(async (event): Promise<LinkMetadata> => {
  const query = getQuery(event);
  const url = query["url"] as string | undefined;

  if (!url) {
    throw createError({
      statusCode: 400,
      message: "URL parameter is required",
    });
  }

  if (!isValidUrl(url)) {
    throw createError({
      statusCode: 400,
      message: "Invalid URL format",
    });
  }

  log.info("Fetching link preview", { url });

  const linkInfo = detectLinkType(url);

  try {
    // Try oEmbed first for supported providers
    if (linkInfo.oEmbedUrl) {
      const oEmbedData = await fetchOEmbed(linkInfo.oEmbedUrl);
      if (oEmbedData) {
        const metadata: LinkMetadata = {
          type: linkInfo.type,
          url,
          title: oEmbedData.title,
          description: undefined,
          thumbnailUrl: oEmbedData.thumbnail_url,
          authorName: oEmbedData.author_name,
          authorUrl: oEmbedData.author_url,
          providerName: oEmbedData.provider_name,
        };

        // For YouTube, ensure we have a thumbnail
        if (
          linkInfo.type === "youtube" &&
          linkInfo.id &&
          !metadata.thumbnailUrl
        ) {
          metadata.thumbnailUrl = getYouTubeThumbnail(linkInfo.id, "medium");
        }

        log.info("oEmbed success", { url, title: metadata.title });
        return metadata;
      }
    }

    // For YouTube without oEmbed response, still provide thumbnail
    if (linkInfo.type === "youtube" && linkInfo.id) {
      return {
        type: "youtube",
        url,
        thumbnailUrl: getYouTubeThumbnail(linkInfo.id, "medium"),
        providerName: "YouTube",
      };
    }

    // Fall back to OpenGraph parsing
    const ogData = await fetchOpenGraph(url);
    if (ogData) {
      return {
        type: linkInfo.type,
        url,
        title: ogData.title,
        description: ogData.description,
        thumbnailUrl: ogData.image,
        providerName: ogData.siteName || getDomainFromUrl(url),
      };
    }

    // Minimal fallback
    return {
      type: linkInfo.type,
      url,
      providerName: getDomainFromUrl(url),
    };
  } catch (error) {
    log.error("Failed to fetch link preview", { url, error });

    // Return minimal metadata on error
    return {
      type: linkInfo.type,
      url,
      providerName: getDomainFromUrl(url),
    };
  }
});

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  provider_name?: string;
  provider_url?: string;
  html?: string;
}

/**
 * Fetch oEmbed data from an oEmbed endpoint
 */
async function fetchOEmbed(oEmbedUrl: string): Promise<OEmbedResponse | null> {
  try {
    const response = await fetch(oEmbedUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Tada/1.0",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OEmbedResponse;
  } catch {
    return null;
  }
}

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/**
 * Fetch and parse OpenGraph meta tags from a URL
 */
async function fetchOpenGraph(url: string): Promise<OpenGraphData | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (compatible; Tada/1.0; +https://github.com/peterbe/tada)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Parse OpenGraph tags with regex (lightweight, no DOM parser needed)
    const getMetaContent = (property: string): string | undefined => {
      // Match both property="og:..." and name="og:..."
      const patterns = [
        new RegExp(
          `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
          "i",
        ),
        new RegExp(
          `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
          "i",
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
          "i",
        ),
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return decodeHtmlEntities(match[1]);
      }
      return undefined;
    };

    // Also try to get title from <title> tag
    const getTitleTag = (): string | undefined => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
    };

    return {
      title: getMetaContent("og:title") || getTitleTag(),
      description:
        getMetaContent("og:description") || getMetaContent("description"),
      image: getMetaContent("og:image"),
      siteName: getMetaContent("og:site_name"),
    };
  } catch {
    return null;
  }
}

/**
 * Extract domain name from URL for display
 */
function getDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. prefix
    return hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

/**
 * Decode HTML entities in strings
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}
