/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
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
      },
      fontFamily: {
        display: ["\"Fraunces Variable\"", "Georgia", "serif"],
        body: ["\"Work Sans\"", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
    },
  },
  plugins: [],
};
