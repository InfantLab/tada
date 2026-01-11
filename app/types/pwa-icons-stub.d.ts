// Stub types for PWA icons (generated at build time, not during dev)
// This silences TypeScript errors during development

export interface PWAIcons {
  transparent: Record<string, PWAIconAsset>;
  maskable: Record<string, PWAIconAsset>;
  apple: Record<string, PWAIconAsset>;
  appleSplashScreen: Record<string, PWAIconAsset>;
  favicon: Record<string, PWAIconAsset>;
}

export interface PWAIconAsset {
  size: number;
  src: string;
}

// Props types for PWA image components
export interface PwaAppleImageProps {
  name?: string;
}

export interface PwaAppleSplashScreenImageProps {
  name?: string;
}

export interface PwaFaviconImageProps {
  name?: string;
}

export interface PwaMaskableImageProps {
  name?: string;
}

export interface PwaTransparentImageProps {
  name?: string;
}
