// Two looks for the printable pages: the full dark brand colours, or an "ink saver"
// version with a light background for printing on an ordinary office printer.
export function printTheme(light) {
  return light
    ? { page: "bg-canvas text-ink", sub: "text-ink/75", accent: "text-rust", line: "border-ink/20", qrTile: "bg-white border-2 border-ink/15", fade: "to-canvas", fadeFrom: "from-canvas" }
    : { page: "bg-pine-dark text-canvas-light", sub: "text-canvas-light/80", accent: "text-gold", line: "border-canvas-light/25", qrTile: "bg-canvas", fade: "to-pine-dark", fadeFrom: "from-pine-dark" };
}
export const isLight = (v) => v === "1";
