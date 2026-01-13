declare module "#build/pwa-icons/pwa-icons" {
  export interface PWAIcons {
    transparent?: Record<string, unknown>;
    maskable?: Record<string, unknown>;
    apple?: Record<string, unknown>;
    favicon?: Record<string, unknown>;
    appleSplashScreen?: Record<string, unknown>;
  }
  export const icons: PWAIcons;
}

declare module "#build/pwa-icons/PwaAppleImage" {
  export interface PwaAppleImageProps {
    width?: number;
    height?: number;
  }
}

declare module "#build/pwa-icons/PwaAppleSplashScreenImage" {
  export interface PwaAppleSplashScreenImageProps {
    width?: number;
    height?: number;
  }
}

declare module "#build/pwa-icons/PwaFaviconImage" {
  export interface PwaFaviconImageProps {
    width?: number;
    height?: number;
  }
}

declare module "#build/pwa-icons/PwaMaskableImage" {
  export interface PwaMaskableImageProps {
    width?: number;
    height?: number;
  }
}

declare module "#build/pwa-icons/PwaTransparentImage" {
  export interface PwaTransparentImageProps {
    width?: number;
    height?: number;
  }
}

declare module "#pwa" {
  export function useApplePwaIcon(props?: unknown): { icon: unknown };
  export function useAppleSplashScreenPwaIcon(props?: unknown): {
    icon: unknown;
  };
  export function useFaviconPwaIcon(props?: unknown): { icon: unknown };
  export function useMaskablePwaIcon(props?: unknown): { icon: unknown };
  export function useTransparentPwaIcon(props?: unknown): { icon: unknown };
}
