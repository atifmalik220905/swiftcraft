/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ─── Material Design 3 Surface Hierarchy (Eco/Organic/Cream Vibe) ───
        "surface": "#fcfbfa",
        "surface-dim": "#dcdad4",
        "surface-bright": "#fcfbfa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f4f0",
        "surface-container": "#f0ede6",
        "surface-container-high": "#e9e5dc",
        "surface-container-highest": "#e3ddd1",
        "surface-variant": "#e9e5dc",
        "surface-tint": "#228B22",

        // ─── On-Surface ───
        "on-surface": "#1c1b18",
        "on-surface-variant": "#494740",
        "on-background": "#1c1b18",
        "background": "#fcfbfa",

        // ─── Inverse ───
        "inverse-surface": "#31302c",
        "inverse-on-surface": "#f4f0eb",
        "inverse-primary": "#87df84",

        // ─── Primary (Forest Green) ───
        "primary": "#228B22",
        "on-primary": "#ffffff",
        "primary-container": "#186318",
        "on-primary-container": "#d4ffd4",
        "primary-fixed": "#abffa5",
        "primary-fixed-dim": "#87df84",
        "on-primary-fixed": "#002202",
        "on-primary-fixed-variant": "#00530d",

        // ─── Secondary (Terracotta) ───
        "secondary": "#E2725B",
        "on-secondary": "#ffffff",
        "secondary-container": "#fcdad3",
        "on-secondary-container": "#631c10",
        "secondary-fixed": "#ffdad2",
        "secondary-fixed-dim": "#ffb4a3",
        "on-secondary-fixed": "#410002",
        "on-secondary-fixed-variant": "#93000b",

        // ─── Tertiary (Cream) ───
        "tertiary": "#8c7e00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#FFFDD0",
        "on-tertiary-container": "#2c2600",
        "tertiary-fixed": "#ffea36",
        "tertiary-fixed-dim": "#e0c700",
        "on-tertiary-fixed": "#1d1900",
        "on-tertiary-fixed-variant": "#4b4200",

        // ─── Error ───
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // ─── Outline ───
        "outline": "#7a776f",
        "outline-variant": "#cfc6b8",

        // ─── SwiftCart Brand Accents (from Design System Doc) ───
        "brand-indigo": "#228B22",
        "brand-green": "#FFFDD0",
        "brand-orange": "#E2725B",
        "brand-slate": "#1c1b18",
      },

      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px",
      },

      spacing: {
        "base": "4px",
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "gutter": "16px",
        "margin-mobile": "16px",
        "margin-desktop": "48px",
      },

      fontFamily: {
        "headline": ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        "body": ["Inter", "system-ui", "sans-serif"],
        "label": ["Inter", "system-ui", "sans-serif"],
      },

      fontSize: {
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "30px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-bold": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },

      boxShadow: {
        "card": "0px 4px 12px rgba(63, 81, 181, 0.08)",
        "elevated": "0px 10px 25px rgba(0, 0, 0, 0.1)",
        "nav": "0px -4px 12px rgba(63, 81, 181, 0.08)",
      },

      animation: {
        "shimmer": "shimmer 2s infinite",
        "bounce-in": "bounceIn 0.5s ease",
        "fade-in": "fadeIn 0.3s ease",
        "slide-up": "slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      },

      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        bounceIn: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
