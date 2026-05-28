import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Surface hierarchy
        surface: {
          page: "hsl(var(--surface-page))",
          base: "hsl(var(--surface-base))",
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
          modal: "hsl(var(--surface-modal))",
          public: "hsl(var(--surface-public))",
        },
        // Border tiers
        "border-subtle": "hsl(var(--border-subtle))",
        "border-default": "hsl(var(--border-default))",
        "border-strong": "hsl(var(--border-strong))",
        "border-interactive": "hsl(var(--border-interactive))",
        // Semantic text colors
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          muted: "hsl(var(--text-muted))",
          inverted: "hsl(var(--text-inverted))",
        },
        // Accent interactive surfaces
        "accent-muted": "hsl(var(--accent-muted))",
        "accent-hover": "hsl(var(--accent-hover))",
        // Brand (deliberate Kivvi green use only)
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          foreground: "hsl(var(--neutral-foreground))",
        },
        "tag-purple": {
          DEFAULT: "hsl(var(--tag-purple))",
          foreground: "hsl(var(--tag-purple-foreground))",
        },
        "tag-rose": {
          DEFAULT: "hsl(var(--tag-rose))",
          foreground: "hsl(var(--tag-rose-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        nano: "var(--text-nano)",
        micro: "var(--text-micro)",
      },
      letterSpacing: {
        display: "var(--tracking-display)",
        label: "var(--tracking-label)",
        caps: "var(--tracking-caps)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        "panel-strong": "var(--shadow-panel-strong)",
      },
      borderRadius: {
        // Layered radius scale anchored on --radius (0.5rem default).
        // Smaller values for tight controls, larger for sheets/pills.
        sm: "calc(var(--radius) * 0.6)", // 0.3rem
        md: "calc(var(--radius) * 0.8)", // 0.4rem
        lg: "var(--radius)", // 0.5rem
        xl: "calc(var(--radius) * 1.4)", // 0.7rem
        "2xl": "calc(var(--radius) * 1.8)", // 0.9rem
        "3xl": "calc(var(--radius) * 2.2)", // 1.1rem
        pill: "calc(var(--radius) * 3.5)", // 1.75rem
      },
      maxWidth: {
        shell: "var(--shell-max)",
      },
      minHeight: {
        page: "var(--page-min-height)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
