/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}", // lib/tones.js holds colour class names
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F2E8D5",
        "canvas-light": "#FAF3E4",
        ink: "#2A2419",
        pine: "#2F3B2C",
        "pine-dark": "#202A1E",
        rust: "#6E2A38",
        gold: "#F0B93A",
        clay: "#B4532A",
        sage: "#55703A",
      },
      // The site's classes are written font-700 / font-900; without these the
      // headings silently rendered at normal weight.
      fontWeight: { 500: "500", 600: "600", 700: "700", 900: "900" },
      keyframes: {
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.35)" }, "100%": { transform: "scale(1)" } },
        rise: { from: { transform: "translateY(120%)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: { pop: "pop 280ms ease-out", rise: "rise 320ms cubic-bezier(.2,.9,.3,1)" },
      fontFamily: {
        display: ["\"Fraunces Variable\"", "Georgia", "serif"],
        body: ["\"Work Sans\"", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
    },
  },
  plugins: [],
};
