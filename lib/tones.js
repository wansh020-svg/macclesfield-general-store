// One colour per division, cycling. Full class names so Tailwind can see them.
export const TONES = [
  { solid: "bg-pine text-canvas-light", ring: "border-pine", btn: "bg-pine text-canvas-light", soft: "bg-pine/10" },
  { solid: "bg-rust text-canvas-light", ring: "border-rust", btn: "bg-rust text-canvas-light", soft: "bg-rust/10" },
  { solid: "bg-gold text-ink", ring: "border-gold", btn: "bg-gold text-ink", soft: "bg-gold/20" },
  { solid: "bg-clay text-canvas-light", ring: "border-clay", btn: "bg-clay text-canvas-light", soft: "bg-clay/10" },
  { solid: "bg-sage text-canvas-light", ring: "border-sage", btn: "bg-sage text-canvas-light", soft: "bg-sage/10" },
];
export const toneAt = (i) => TONES[((i % TONES.length) + TONES.length) % TONES.length];
