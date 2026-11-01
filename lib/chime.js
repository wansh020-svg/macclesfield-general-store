// Two rising chimes, made in the browser so there is no sound file to host.
export function chime(ctx) {
  const t = ctx.currentTime;
  [880, 1175, 880, 1175].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.22);
    g.gain.exponentialRampToValueAtTime(0.5, t + i * 0.22 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t + i * 0.22);
    o.stop(t + i * 0.22 + 0.22);
  });
}
