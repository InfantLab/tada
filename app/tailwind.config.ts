/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Dark theme (default) - Cosmic palette
        cosmic: {
          violet: "#2B0F3A", // background.base
          indigo: "#3A1A55", // background.surface
          void: "#1E0B2A", // background.chrome
        },
        // Light theme - Warm palette
        pearl: {
          base: "#FBF6EE", // background.base
          mist: "#EFE6F7", // background.surface
          cream: "#FFF3D6", // background.chrome
        },
        // Text colors (semantic)
        text: {
          dark: {
            primary: "#F7F4FA",
            secondary: "#CBBFDA",
            muted: "#9A8BB3",
          },
          light: {
            primary: "#2B1A3A",
            secondary: "#5C4A6F",
            muted: "#8B7C99",
          },
        },
        // Accent colors - Solar Gold (TA-DA moments)
        gold: {
          dark: "#FFC83D", // accent.primary (dark)
          amber: "#FF9F1C", // accent.secondary (dark)
          spark: "#FFF1A8", // accent.spark (dark)
          light: "#E6A800", // accent.primary (light)
          line: "#FFB703", // accent.secondary (light)
          highlight: "#FFD966", // accent.spark (light)
        },
        // TA-DA accent colors (alias to gold for backward compatibility)
        tada: {
          50: "#FFD966", // gold-highlight
          100: "#FFD966",
          300: "#FFB703",
          400: "#FF9F1C",
          500: "#E6A800", // gold-light
          600: "#E6A800",
          700: "#D49700",
          900: "rgba(230, 168, 0, 0.2)",
          "900/50": "rgba(230, 168, 0, 0.2)",
        },
        // Brand - Lotus colors (gradients/illustrations)
        lotus: {
          teal: "#3FB7A5",
          jade: "#6EDC9A",
          sky: "#6BB7E8",
          lilac: "#B88CF2",
          // Light theme variants
          "teal-soft": "#7ED8C8",
          "jade-soft": "#9BE3B8",
          "sky-soft": "#9ED3F5",
          "lilac-soft": "#D6B9F5",
        },
        // Category colors - Mindfulness (timed activities, meditation)
        mindfulness: {
          light: "#6BB7E8", // lotus-sky
          dark: "#B88CF2", // lotus-lilac
        },
        // Cosmic indigo light for borders
        "cosmic-indigo": {
          DEFAULT: "#3A1A55",
          light: "#4A2A65",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
