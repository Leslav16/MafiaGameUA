/**
 * Quiet, synthesized table sounds (no audio files). The context is made on
 * first use; browsers only allow sound after the person has clicked once.
 */
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A muffled, distant pistol shot: a noise crack through a low-pass filter plus a low thump. */
export function playShot(volume = 0.22) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;

  const len = Math.floor(ac.sampleRate * 0.6);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2400, t);
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.4);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(volume, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  noise.connect(lp).connect(ng).connect(ac.destination);
  noise.start(t);

  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
  const og = ac.createGain();
  og.gain.setValueAtTime(volume * 1.4, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

/** A soft wooden click for a vote chip landing. */
export function playChip(volume = 0.12) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  const osc = ac.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.06);
  const g = ac.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}
