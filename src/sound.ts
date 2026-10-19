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
function note(frequency: number, start: number, duration: number, level: number, type: OscillatorType, sustain = false): void {
  const ctx=context();const oscillator=ctx.createOscillator();const envelope=ctx.createGain();
  oscillator.type=type;oscillator.frequency.value=frequency;
  envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(level,start+Math.min(.55,duration*.15));
  if(sustain)envelope.gain.setValueAtTime(level*.8,start+duration*.7);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(envelope);envelope.connect(master!);voices.add(oscillator);
  oscillator.start(start);oscillator.stop(start+duration+.02);
  oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
}
function stopMusic(): void { if(timer)clearInterval(timer);timer=null; }
function ambientChord(): void {
  if(!enabled || !music || document.hidden || !audio || audio.state!=='running')return;
  // A bright major progression with a lilting melody and soft offbeat chords.
  // Eight beats per phrase at 112 BPM; phrases overlap without gaps.
  const chords=[[130.81,164.81,196],[174.61,220,261.63],[196,246.94,293.66],[130.81,164.81,196]];
  const notes=chords[chord++%chords.length]!;const start=audio.currentTime;
  const beat=60/112;
  notes.forEach((frequency)=>note(frequency,start,beat*8+.3,.018,'sine',true));
  const melody=[0,1,2,1,2,1,0,1,2,2,1,0,1,2,1,0];
  melody.forEach((step,i)=>note(notes[step]!*2,start+i*beat/2,beat*.72,i%4===0?.043:.032,'triangle'));
  [0,2,4,6].forEach((step)=>note(notes[0]!/2,start+step*beat,beat*.85,.026,'sine'));
  [1,3,5,7].forEach((step)=>notes.forEach((frequency)=>note(frequency*2,start+step*beat,beat*.35,.009,'sine')));
}
function startMusic(): void { if(timer || !enabled || !music || document.hidden)return;ambientChord();timer=setInterval(ambientChord,8*60/112*1000); }
/** Resume a saved sound preference on any user interaction, including story text. */
export function resumeSoundtrack(): void {
  if(!enabled || document.hidden)return;
  try { const ctx=context();void ctx.resume().then(()=>{if(enabled)startMusic();}).catch(()=>undefined); }
  catch { /* Audio support is optional. */ }
}
document.addEventListener('pointerdown',resumeSoundtrack,{passive:true});
document.addEventListener('keydown',resumeSoundtrack);

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
