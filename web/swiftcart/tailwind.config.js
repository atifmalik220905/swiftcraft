/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ─── Material Design 3 Surface Hierarchy ───
        "surface": "#f9f9ff",
        "surface-dim": "#cfdaf2",
        "surface-bright": "#f9f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f3ff",
        "surface-container": "#e7eeff",
        "surface-container-high": "#dee8ff",
        "surface-container-highest": "#d8e3fb",
        "surface-variant": "#d8e3fb",
        "surface-tint": "#4355b9",

        // ─── On-Surface ───
        "on-surface": "#111c2d",
        "on-surface-variant": "#454652",
        "on-background": "#111c2d",
        "background": "#f9f9ff",

        // ─── Inverse ───
        "inverse-surface": "#263143",
        "inverse-on-surface": "#ecf1ff",
        "inverse-primary": "#bac3ff",

        // ─── Primary (Indigo) ───
        "primary": "#24389c",
        "on-primary": "#ffffff",
        "primary-container": "#3f51b5",
        "on-primary-container": "#cacfff",
        "primary-fixed": "#dee0ff",
        "primary-fixed-dim": "#bac3ff",
        "on-primary-fixed": "#00105c",
        "on-primary-fixed-variant": "#293ca0",

        // ─── Secondary (Green / Success) ───
        "secondary": "#006c49",
        "on-secondary": "#ffffff",
        "secondary-container": "#6cf8bb",
        "on-secondary-container": "#00714d",
        "secondary-fixed": "#6ffbbe",
        "secondary-fixed-dim": "#4edea3",
        "on-secondary-fixed": "#002113",
        "on-secondary-fixed-variant": "#005236",

        // ─── Tertiary (Orange / Urgency) ───
        "tertiary": "#722f00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#974000",
        "on-tertiary-container": "#ffc6a9",
        "tertiary-fixed": "#ffdbca",
        "tertiary-fixed-dim": "#ffb690",
        "on-tertiary-fixed": "#341100",
        "on-tertiary-fixed-variant": "#783200",

        // ─── Error ───
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // ─── Outline ───
        "outline": "#757684",
        "outline-variant": "#c5c5d4",

        // ─── SwiftCart Brand Accents (from Design System Doc) ───
        "brand-indigo": "#3F51B5",
        "brand-green": "#10B981",
        "brand-orange": "#F97316",
        "brand-slate": "#1E293B",
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
