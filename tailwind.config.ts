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
        background: "#f4f7f4",
        surface: "#ffffff",
        ink: "#102017",
        accent: "#176c4f",
        danger: "#9b1c31",
        warning: "#a45800"
      }
    }
  },
  plugins: []
};

export default config;
