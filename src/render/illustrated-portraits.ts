import type { Emotion } from '../types.ts';
import { portraitFrames } from './portrait-frames.ts';

const images = import.meta.glob<string>('../../assets/portraits/*.webp', { eager: true, query: '?url', import: 'default' });
const emotions: Emotion[] = ['neutral', 'smile', 'joy', 'worry', 'stern'];
const escapeAttribute = (value: string): string => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/** Clip one expression from a transparent five-frame sheet. No opaque backing in scenes. */
export function illustratedPortrait(id: string, emotion: Emotion, label: string, plate?: string): string | undefined {
  const frame = portraitFrames[id];
  const image = images[`../../assets/portraits/${id}.webp`];
  if (!frame || !image) return undefined;
  const index = Math.max(0, emotions.indexOf(emotion));
  const x = frame.edges[index]!;
  const width = frame.edges[index + 1]! - x;
  const clipId = `portrait-frame-${id}-${emotion}`;
  const backing = plate ? `<rect x="${x}" y="${frame.top}" width="${width}" height="${frame.height}" rx="20" fill="${escapeAttribute(plate)}"/>` : '';
  return `<svg class="illustrated-portrait" data-character="${escapeAttribute(id)}" data-emotion="${emotion}" viewBox="${x} ${frame.top} ${width} ${frame.height}" width="${width}" height="${frame.height}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeAttribute(label)}">
    <defs><clipPath id="${clipId}"><rect x="${x}" y="${frame.top}" width="${width}" height="${frame.height}"/></clipPath></defs>
    <g clip-path="url(#${clipId})">${backing}<image href="${image}" x="0" y="0" width="${frame.width}" height="${frame.sourceHeight}"/></g>
  </svg>`;
}
