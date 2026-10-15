let audio: AudioContext | null = null;
let enabled = false;
try { enabled = localStorage.getItem('ya-specialist/sound') === 'true'; } catch { /* optional */ }

export function soundEnabled(): boolean { return enabled; }
export function setSound(value: boolean): void {
  enabled = value;
  try { localStorage.setItem('ya-specialist/sound', String(value)); } catch { /* session only */ }
  if (!value && audio) void audio.suspend().catch(() => undefined);
  if (value) playSound('success');
}

/** Short, quiet synthesized cues; no downloads, microphone or autoplay music. */
export function playSound(kind: 'tap' | 'success' | 'notice'): void {
  if (!enabled) return;
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    void ctx.resume().then(() => {
      if (!enabled) return;
      const notes = kind === 'success' ? [523.25, 659.25, 783.99] : kind === 'notice' ? [440, 349.23] : [440];
      notes.forEach((frequency, i) => {
        const t = ctx.currentTime + i * .09;
        const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.035, t + .008);
        gain.gain.exponentialRampToValueAtTime(.001, t + .12);
        oscillator.connect(gain); gain.connect(ctx.destination);
        oscillator.start(t); oscillator.stop(t + .14);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    }).catch(() => undefined);
  } catch { /* Audio is optional; text feedback remains available. */ }
}
