let audio: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let music = true;
let volume = .45;
let timer: ReturnType<typeof setInterval> | null = null;
let chord = 0;
const voices = new Set<OscillatorNode>();
try {
  enabled = localStorage.getItem('ya-specialist/sound') === 'true';
  music = localStorage.getItem('ya-specialist/music') !== 'false';
  const stored = Number(localStorage.getItem('ya-specialist/volume') ?? '.45');
  if (Number.isFinite(stored)) volume = Math.max(0, Math.min(1, stored));
} catch { /* optional storage */ }
export const soundEnabled = (): boolean => enabled;
export const musicEnabled = (): boolean => music;
export const soundVolume = (): number => volume;
function persist(key: string, value: unknown): void { try { localStorage.setItem(`ya-specialist/${key}`,String(value)); } catch { /* session only */ } }
function context(): AudioContext {
  audio ??= new AudioContext();
  if (!master) { master=audio.createGain();master.gain.value=volume;master.connect(audio.destination); }
  return audio;
}
function note(frequency: number, start: number, duration: number, level: number, type: OscillatorType): void {
  const ctx=context();const oscillator=ctx.createOscillator();const envelope=ctx.createGain();
  oscillator.type=type;oscillator.frequency.value=frequency;
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(level,start+Math.min(.35,duration*.15));
  envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(envelope);envelope.connect(master!);voices.add(oscillator);
  oscillator.start(start);oscillator.stop(start+duration+.02);
  oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
}
function stopMusic(): void { if(timer)clearInterval(timer);timer=null; }
function ambientChord(): void {
  if(!enabled || !music || document.hidden || !audio || audio.state!=='running')return;
  const chords=[[130.81,164.81,196],[110,130.81,164.81],[87.31,130.81,174.61],[98,146.83,196]];
  const notes=chords[chord++%chords.length]!;const start=audio.currentTime;
  notes.forEach((frequency,i)=>note(frequency,start+i*.13,5.8,.028,'sine'));
  note(notes[1]!*2,start+1.7,2.8,.016,'sine');
}
function startMusic(): void { if(timer || !enabled || !music || document.hidden)return;ambientChord();timer=setInterval(ambientChord,6000); }
export function setSound(value: boolean): void {
  enabled=value;persist('sound',value);
  if(!value){stopMusic();for(const voice of voices)try{voice.stop();}catch{/* already ended */}if(audio)void audio.suspend().catch(()=>undefined);return;}
  playSound('success');
}
export function setMusic(value: boolean): void {
  music=value;persist('music',value);
  if(!value){stopMusic();for(const voice of voices)try{voice.stop();}catch{/* already ended */}}
  else if(enabled)startMusic();
}
export function setSoundVolume(value: number): void {
  volume=Math.max(0,Math.min(1,value));persist('volume',volume);
  if(audio && master)master.gain.setTargetAtTime(volume,audio.currentTime,.04);
}
export type SoundCue = 'tap'|'success'|'notice'|'achievement'|'knowledge'|'mail'|'chapter'|'finale';
/** All audio is synthesized locally, starts only after enabling sound, and is optional. */
export function playSound(kind: SoundCue): void {
  if(!enabled || document.hidden)return;
  try {
    const ctx=context();void ctx.resume().then(()=>{
      if(!enabled)return;startMusic();
      const melodies: Record<SoundCue,number[]>={tap:[392],notice:[392,329.63],success:[523.25,659.25,783.99],achievement:[523.25,659.25,783.99,1046.5],knowledge:[440,554.37,659.25],mail:[659.25,783.99],chapter:[261.63,392,523.25],finale:[261.63,329.63,392,523.25,659.25,783.99]};
      const spacing=kind==='finale'?.16:.11;
      melodies[kind].forEach((frequency,i)=>note(frequency,ctx.currentTime+i*spacing,kind==='tap'?.09:.65,kind==='tap'?.035:.085,kind==='tap'?'sine':'triangle'));
    }).catch(()=>undefined);
  }catch{/* The game remains usable without audio support. */}
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopMusic();for(const voice of voices)try{voice.stop();}catch{/* already ended */}if(audio)void audio.suspend().catch(()=>undefined);}
  else if(enabled && audio)void audio.resume().then(startMusic).catch(()=>undefined);
});
