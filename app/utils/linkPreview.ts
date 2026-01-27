/**
 * Link Preview Utilities
 *
 * Detects link types (YouTube, Spotify, Insight Timer) and provides
 * metadata extraction helpers.
 */

export type LinkType =
  | "youtube"
  | "spotify"
  | "insight-timer"
  | "soundcloud"
  | "generic";

export interface LinkInfo {
  type: LinkType;
  url: string;
  /** Extracted video/track ID if applicable */
  id?: string;
  /** oEmbed endpoint URL if available */
  oEmbedUrl?: string;
}

export interface LinkMetadata {
  type: LinkType;
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  authorName?: string;
  authorUrl?: string;
  duration?: number;
  providerName?: string;
  providerIcon?: string;
}

/**
 * YouTube URL patterns:
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - youtube.com/v/VIDEO_ID
 * - youtube.com/shorts/VIDEO_ID
 */
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

/**
 * Spotify URL patterns:
 * - open.spotify.com/track/TRACK_ID
 * - open.spotify.com/album/ALBUM_ID
 * - open.spotify.com/playlist/PLAYLIST_ID
 * - open.spotify.com/episode/EPISODE_ID
 */
const SPOTIFY_PATTERN =
  /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/;

/**
 * Insight Timer URL patterns:
 * - insighttimer.com/TEACHER/guided-meditations/MEDITATION
 * - insight.timer.com/...
 */
const INSIGHT_TIMER_PATTERN = /insighttimer\.com|insight\.timer\.com/;

/**
 * SoundCloud URL patterns:
 * - soundcloud.com/USER/TRACK
 */
const SOUNDCLOUD_PATTERN = /soundcloud\.com\/[^/]+\/[^/]+/;

/**
 * Detect link type and extract relevant IDs
 */
export function detectLinkType(url: string): LinkInfo {
  const normalized = url.toLowerCase().trim();

  // YouTube
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        type: "youtube",
        url,
        id: videoId,
        oEmbedUrl: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      };
    }
  }

  // Spotify
  const spotifyMatch = url.match(SPOTIFY_PATTERN);
  if (spotifyMatch) {
    return {
      type: "spotify",
      url,
      id: spotifyMatch[2],
      oEmbedUrl: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    };
  }

  // Insight Timer
  if (INSIGHT_TIMER_PATTERN.test(normalized)) {
    return {
      type: "insight-timer",
      url,
    };
  }

  // SoundCloud
  if (SOUNDCLOUD_PATTERN.test(normalized)) {
    return {
      type: "soundcloud",
      url,
      oEmbedUrl: `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    };
  }

  // Generic URL
  return {
    type: "generic",
    url,
  };
}

/**
 * Get provider icon emoji for display
 */
export function getProviderIcon(type: LinkType): string {
  switch (type) {
    case "youtube":
      return "▶️";
    case "spotify":
      return "🎵";
    case "insight-timer":
      return "🔔";
    case "soundcloud":
      return "🎧";
    default:
      return "🔗";
  }
}

/**
 * Get provider display name
 */
export function getProviderName(type: LinkType): string {
  switch (type) {
    case "youtube":
      return "YouTube";
    case "spotify":
      return "Spotify";
    case "insight-timer":
      return "Insight Timer";
    case "soundcloud":
      return "SoundCloud";
    default:
      return "Link";
  }
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: "default" | "medium" | "high" | "maxres" = "medium",
): string {
  const qualityMap = {
    default: "default",
    medium: "mqdefault",
    high: "hqdefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Validate that a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
