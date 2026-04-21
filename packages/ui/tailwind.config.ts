import type { Config } from "tailwindcss";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Chronicle Labs shared Tailwind preset.
 *
 * Every token is wired to a CSS variable declared in `src/styles/tokens.css`
 * so utilities pick up the active `data-theme` automatically and a single
 * source of truth stays in CSS.
 *
 * This file plays two roles:
 *   1. As a Tailwind *preset* for apps — they do
 *        presets: [require("ui/tailwind.config")]
 *      and add their own `content` globs.
 *   2. As a Tailwind *config* for Storybook — it points `content` at this
 *      package's own sources via an absolute path so Tailwind generates
 *      every utility the design-system components use.
 *
 * App Tailwind configs' `content` is merged with the preset's, so having
 * absolute paths here is harmless for apps and necessary for Storybook.
 */
const preset: Config = {
  content: [
    path.join(here, "src/**/*.{ts,tsx,mdx}"),
    path.join(here, ".storybook/**/*.{ts,tsx,mdx}"),
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        void: "var(--c-void)",
        black: "var(--c-black)",
        page: "var(--c-page)",

        surface: {
          DEFAULT: "var(--c-surface-01)",
          "00": "var(--c-surface-00)",
          "01": "var(--c-surface-01)",
          "02": "var(--c-surface-02)",
          "03": "var(--c-surface-03)",
        },

        hairline: {
          DEFAULT: "var(--c-hairline)",
          strong: "var(--c-hairline-strong)",
        },
        divider: "var(--c-divider)",

        ink: {
          DEFAULT: "var(--c-ink)",
          hi: "var(--c-ink-hi)",
          lo: "var(--c-ink-lo)",
          dim: "var(--c-ink-dim)",
          faint: "var(--c-ink-faint)",
          inv: {
            DEFAULT: "var(--c-ink-inv)",
            hi: "var(--c-ink-inv-hi)",
            lo: "var(--c-ink-inv-lo)",
            dim: "var(--c-ink-inv-dim)",
          },
        },

        ember: {
          DEFAULT: "var(--c-ember)",
          deep: "var(--c-ember-deep)",
        },
        sage: {
          DEFAULT: "var(--c-sage)",
          deep: "var(--c-sage-deep)",
        },
        gold: {
          DEFAULT: "var(--c-gold)",
          deep: "var(--c-gold-deep)",
        },
        bronze: "var(--c-bronze)",
        bone: "var(--c-bone)",

        event: {
          teal: "var(--c-event-teal)",
          amber: "var(--c-event-amber)",
          green: "var(--c-event-green)",
          orange: "var(--c-event-orange)",
          pink: "var(--c-event-pink)",
          violet: "var(--c-event-violet)",
          red: "var(--c-event-red)",
          white: "var(--c-event-white)",
        },

        row: {
          hover: "var(--c-row-hover)",
          active: "var(--c-row-active)",
        },

        // Legacy aliases — kept so older variant names in consumer code
        // don't 500 during the migration. Map to the closest new token.
        critical: "var(--c-event-red)",
        caution: "var(--c-event-amber)",
        nominal: "var(--c-event-green)",
        data: "var(--c-event-teal)",
        primary: "var(--c-ink-hi)",
        secondary: "var(--c-ink-lo)",
        tertiary: "var(--c-ink-dim)",
        disabled: "var(--c-ink-faint)",
        elevated: "var(--c-surface-02)",
        hover: "var(--c-surface-03)",
        active: "var(--c-surface-03)",
        base: "var(--c-surface-00)",
        "border-dim": "var(--c-hairline)",
        "border-default": "var(--c-hairline-strong)",
        "border-bright": "var(--c-ink-dim)",
      },

      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },

      fontSize: {
        "display-xxl": ["var(--fs-display-xxl)", { lineHeight: "0.94" }],
        "display-xl": ["var(--fs-display-xl)", { lineHeight: "0.96" }],
        "display-lg": ["var(--fs-display-lg)", { lineHeight: "1" }],
        "display-md": ["var(--fs-display-md)", { lineHeight: "1" }],
        "display-sm": ["var(--fs-display-sm)", { lineHeight: "1.05" }],
        "title-lg": ["var(--fs-title-lg)", { lineHeight: "1.15" }],
        title: ["var(--fs-title)", { lineHeight: "1.2" }],
        "title-sm": ["var(--fs-title-sm)", { lineHeight: "1.3" }],
        "body-lg": ["var(--fs-body-lg)", { lineHeight: "1.5" }],
        body: ["var(--fs-body)", { lineHeight: "1.5" }],
        "body-sm": ["var(--fs-body-sm)", { lineHeight: "1.5" }],
        micro: ["var(--fs-micro)", { lineHeight: "1.4" }],
        "mono-lg": ["var(--fs-mono-lg)", { lineHeight: "1.5" }],
        mono: ["var(--fs-mono)", { lineHeight: "1.5" }],
        "mono-sm": ["var(--fs-mono-sm)", { lineHeight: "1.5" }],
        "mono-xs": ["var(--fs-mono-xs)", { lineHeight: "1.5" }],
      },

      letterSpacing: {
        tight: "-0.02em",
        display: "-0.025em",
        normal: "0",
        mono: "0.02em",
        tactical: "0.08em",
        eyebrow: "0.1em",
      },

      spacing: {
        "s-1": "var(--s-1)",
        "s-2": "var(--s-2)",
        "s-3": "var(--s-3)",
        "s-4": "var(--s-4)",
        "s-5": "var(--s-5)",
        "s-6": "var(--s-6)",
        "s-8": "var(--s-8)",
        "s-10": "var(--s-10)",
        "s-12": "var(--s-12)",
        "s-16": "var(--s-16)",
        "s-20": "var(--s-20)",
      },

      borderRadius: {
        none: "0",
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        pill: "var(--r-pill)",
      },

      boxShadow: {
        card: "var(--shadow-card)",
        panel: "var(--shadow-panel)",
        "glow-ember": "var(--shadow-glow-ember)",
      },

      backgroundImage: {
        lightsource: "var(--grad-lightsource)",
        "lightsource-90": "var(--grad-lightsource-90)",
        "lightsource-45": "var(--grad-lightsource-45)",
      },

      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
      },

      transitionDuration: {
        fast: "var(--dur-fast)",
        DEFAULT: "var(--dur)",
        slow: "var(--dur-slow)",
      },

      animation: {
        "chron-pulse": "chron-pulse 1.6s ease-in-out infinite",
      },

      keyframes: {
        "chron-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
};

export default preset;
