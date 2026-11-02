// A loud two-tone "new order" alarm, made in the browser so there is no sound file to host.
// Square waves cut through kitchen noise much better than soft sine tones, and a compressor
// keeps the loud peaks from distorting on phone and tablet speakers.
export function chime(ctx) {
  const t = ctx.currentTime;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  const master = ctx.createGain();
  master.gain.value = 1;
  comp.connect(master).connect(ctx.destination);

  const step = 0.26;
  [1047, 1319, 1047, 1319, 1047, 1319, 1047, 1319].forEach((f, i) => {
    const start = t + i * step;
    // the square wave carries the loudness, a sine an octave down adds body
    [["square", f, 0.55], ["sine", f / 2, 0.45]].forEach(([type, freq, peak]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      g.gain.setValueAtTime(peak, start + step - 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, start + step - 0.02);
      o.connect(g).connect(comp);
      o.start(start);
      o.stop(start + step);
    });
  });
}
