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
        railway: {
          blue: "#0A2540",
          navy: "#0d2b45",
          red: "#C8102E",
          emerald: "#10B981",
          amber: "#F59E0B",
          slate: "#1E293B",
        },
      },
    },
  },
  plugins: [],
};

export default config;
