import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18201e",
        mist: "#f4f7f5",
        moss: "#2f6b4f",
        sage: "#dfe9e2",
        clay: "#b45538"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(24, 32, 30, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
