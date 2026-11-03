import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--color-paper)",
          2: "var(--color-paper-2)",
          3: "var(--color-paper-3)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          2: "var(--color-ink-2)",
        },
        muted: "var(--color-muted)",
        rule: {
          DEFAULT: "var(--color-rule)",
          2: "var(--color-rule-2)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          ink: "var(--color-accent-ink)",
          soft: "var(--color-accent-soft)",
        },
        cool: {
          DEFAULT: "var(--color-cool)",
          soft: "var(--color-cool-soft)",
        },
        ok: {
          DEFAULT: "var(--color-ok)",
          soft: "var(--color-ok-soft)",
        },
        bad: {
          DEFAULT: "var(--color-bad)",
          soft: "var(--color-bad-soft)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        outlier: ["var(--font-outlier)"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
    },
  },
  plugins: [],
};

export default config;
