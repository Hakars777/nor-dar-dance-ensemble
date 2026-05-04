/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "#141011",
        cherry: {
          50: "#fff1f3",
          100: "#ffe2e7",
          300: "#d88594",
          500: "#9f2336",
          700: "#5b0d1a",
          800: "#3a0710",
          900: "#220409"
        },
        gold: {
          100: "#fff5d6",
          300: "#e6c15f",
          500: "#c79a2d",
          700: "#8b6417"
        },
        ivory: "#fbf7ef",
        silk: "#fffdf8",
        smoke: "#f2eee6"
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', '"Segoe UI"', "Arial", "sans-serif"]
      },
      boxShadow: {
        premium: "0 24px 70px rgba(34, 4, 9, 0.16)",
        soft: "0 14px 45px rgba(20, 16, 17, 0.08)"
      },
      backgroundImage: {
        "gold-line": "linear-gradient(90deg, transparent, rgba(199,154,45,.85), transparent)"
      }
    }
  },
  plugins: []
};
