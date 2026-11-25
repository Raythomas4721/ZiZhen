// 音效：全部用 Web Audio 現場合成，不用音檔。第一次點畫面之後才會出聲（瀏覽器規定）。

import type { GameEvent } from '../engine/types';
import { loadSettings, type Settings } from './settings';

type SoundName =
  | 'place'
  | 'merge'
  | 'word'
  | 'couplet'
  | 'idiomReady'
  | 'idiom'
  | 'kill'
  | 'leak'
  | 'waveStart'
  | 'held'
  | 'lost'
  | 'invalid'
  | 'draw'
  | 'compose'
  | 'ink'
  | 'finale';

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let settings: Settings = loadSettings();
const lastPlayed = new Map<SoundName, number>();

/** 每種聲音最短間隔（毫秒），避免一大群墨妖同時死掉時吵成一團。 */
const MIN_GAP: Partial<Record<SoundName, number>> = { kill: 70, leak: 120, ink: 200, place: 40 };

export function setSoundSettings(s: Settings) {
  settings = s;
  if (master) master.gain.value = s.sound ? 0.35 : 0;
}

/** 在使用者第一次互動時呼叫，喚醒音訊。 */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ac) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = settings.sound ? 0.35 : 0;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') void ac.resume();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.5, slideTo?: number) {
  if (!ac || !master) return;
  const t0 = ac.currentTime + start;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.3, highpass = 800) {
  if (!ac || !master) return;
  const t0 = ac.currentTime + start;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = highpass;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// 五聲音階（宮商角徵羽），聽起來比較像古箏
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export function play(name: SoundName) {
  if (!settings.sound || !ac) return;
  const now = performance.now();
  const gap = MIN_GAP[name] ?? 0;
  if (gap && now - (lastPlayed.get(name) ?? 0) < gap) return;
  lastPlayed.set(name, now);
  switch (name) {
    case 'place':
      tone(420, 0, 0.08, 'triangle', 0.45, 260);
      break;
    case 'draw':
      noise(0, 0.07, 0.18, 2500);
      break;
    case 'merge':
      tone(PENTA[2], 0, 0.12, 'triangle', 0.4);
      tone(PENTA[4], 0.07, 0.18, 'triangle', 0.4);
      break;
    case 'compose':
      tone(PENTA[1], 0, 0.1, 'sine', 0.35);
      tone(PENTA[3], 0.06, 0.2, 'sine', 0.35);
      break;
    case 'word':
      [0, 2, 4].forEach((k, i) => tone(PENTA[k], i * 0.07, 0.35, 'triangle', 0.35));
      break;
    case 'couplet':
      tone(392, 0, 0.6, 'sine', 0.4);
      tone(587.33, 0.12, 0.6, 'sine', 0.35);
      break;
    case 'idiomReady':
      tone(1046.5, 0, 0.5, 'sine', 0.25);
      tone(1567.98, 0.05, 0.5, 'sine', 0.15);
      break;
    case 'idiom':
      noise(0, 0.35, 0.25, 400);
      [0, 2, 4, 5].forEach((k, i) => tone(PENTA[k] / 2, i * 0.05, 0.8, 'triangle', 0.3));
      break;
    case 'kill':
      tone(PENTA[Math.floor(Math.random() * 3) + 2], 0, 0.06, 'sine', 0.18);
      break;
    case 'leak':
      tone(110, 0, 0.18, 'sine', 0.5, 60);
      noise(0, 0.12, 0.22, 1200);
      break;
    case 'waveStart':
      tone(98, 0, 0.3, 'sine', 0.55, 60);
      tone(98, 0.18, 0.3, 'sine', 0.45, 60);
      break;
    case 'held':
      [0, 2, 4].forEach((k, i) => tone(PENTA[k], i * 0.1, 0.3, 'triangle', 0.35));
      break;
    case 'lost':
      tone(PENTA[2] / 2, 0, 0.3, 'triangle', 0.35);
      tone(PENTA[0] / 2, 0.15, 0.45, 'triangle', 0.35);
      break;
    case 'invalid':
      tone(160, 0, 0.1, 'square', 0.12);
      break;
    case 'ink':
      tone(220, 0, 0.25, 'sawtooth', 0.12, 140);
      break;
    case 'finale':
      [0, 1, 2, 3, 4, 5].forEach((k, i) => tone(PENTA[k], i * 0.12, 0.9, 'sine', 0.3));
      break;
  }
}

export function buzz(pattern: number | number[]) {
  if (!settings.vibrate) return;
  // 使用者還沒碰過畫面時，瀏覽器不准震動（還會在 console 報錯）
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ua && !ua.hasBeenActive) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 不支援就算了
  }
}

/** 遊戲事件對應的聲音與震動。 */
export function soundForEvents(events: GameEvent[]) {
  for (const e of events) {
    switch (e.t) {
      case 'kill':
        play('kill');
        break;
      case 'placed':
        play('place');
        break;
      case 'drew':
        play('draw');
        break;
      case 'waveStart':
        play('waveStart');
        if (e.boss) buzz([20, 60, 20]);
        break;
      case 'leak':
        if (e.dmg > 0) {
          play('leak');
          buzz(30);
        }
        break;
      case 'merge':
        play('merge');
        buzz(15);
        break;
      case 'word':
        if (e.fresh) {
          play('word');
          buzz(25);
        }
        break;
      case 'couplet':
        play('couplet');
        break;
      case 'idiomReady':
        play('idiomReady');
        break;
      case 'idiom':
        play('idiom');
        buzz([30, 40, 60]);
        break;
      case 'compose':
        play('compose');
        break;
      case 'invalid':
        play('invalid');
        break;
      case 'ink':
      case 'swap':
        play('ink');
        break;
      case 'waveEnd':
        play(e.held ? 'held' : 'lost');
        break;
      case 'becomeCard':
      case 'archived':
        play('finale');
        buzz([40, 60, 40]);
        break;
    }
  }
}

export { play as playSound };
