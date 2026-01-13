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
