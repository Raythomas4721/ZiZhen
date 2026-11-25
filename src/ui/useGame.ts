// 把純函式引擎接上 requestAnimationFrame。

import { useCallback, useEffect, useRef, useState } from 'react';
import { step } from '../engine/game';
import type { Ctx } from '../engine/ctx';
import { TICK_RATE, type GameEvent, type GameState } from '../engine/types';
import { KIND_COLOR, type Fx } from './draw';

export interface GameHandle {
  state: GameState;
  stateRef: React.MutableRefObject<GameState>;
  fxRef: React.MutableRefObject<Fx[]>;
  act: (fn: (s: GameState) => GameState) => void;
  speed: number;
  setSpeed: (n: number) => void;
  paused: boolean;
  setPaused: (b: boolean) => void;
  /** 最近一批事件，給介面顯示提示用。 */
  lastEvents: GameEvent[];
}

export function useGame(ctx: Ctx, initial: () => GameState, onEvents?: (ev: GameEvent[]) => void): GameHandle {
  const [state, setState] = useState<GameState>(initial);
  const stateRef = useRef(state);
  const fxRef = useRef<Fx[]>([]);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  const onEventsRef = useRef(onEvents);
  speedRef.current = speed;
  pausedRef.current = paused;
  onEventsRef.current = onEvents;

  const handleEvents = useCallback(
    (s: GameState, events: GameEvent[]) => {
      if (!events.length) return;
      const now = performance.now();
      for (const ev of events) {
        if (ev.t === 'hit') {
          fxRef.current.push({
            kind: 'hit',
            x: ev.from.x + 0.5,
            y: ev.from.y + 0.5,
            x2: ev.to.x,
            y2: ev.to.y,
            color: KIND_COLOR[ev.kind],
            born: now,
            life: 160,
          });
        } else if (ev.t === 'kill') {
          fxRef.current.push({ kind: 'kill', x: ev.x, y: ev.y, text: `+${ev.reward}`, born: now, life: 600 });
        } else if (ev.t === 'merge') {
          fxRef.current.push({ kind: 'merge', x: ev.x + 0.5, y: ev.y + 0.5, born: now, life: 500 });
        } else if (ev.t === 'ink') {
          fxRef.current.push({ kind: 'ink', x: ev.x + 0.5, y: ev.y + 0.5, born: now, life: 500 });
        } else if (ev.t === 'swap') {
          fxRef.current.push({ kind: 'swap', x: ev.a.x + 0.5, y: ev.a.y + 0.5, x2: ev.b.x + 0.5, y2: ev.b.y + 0.5, born: now, life: 700 });
        } else if (ev.t === 'idiom') {
          fxRef.current.push({ kind: 'flash', x: 0, y: 0, born: now, life: 700 });
        } else if (ev.t === 'broken') {
          fxRef.current.push({ kind: 'broken', x: ev.x + 0.5, y: ev.y + 0.5, born: now, life: 500 });
        }
      }
      if (fxRef.current.length > 300) fxRef.current = fxRef.current.slice(-200);
      const notable = events.filter((e) => e.t !== 'hit' && e.t !== 'kill');
      if (notable.length) setLastEvents(notable);
      onEventsRef.current?.(events);
      void s;
    },
    [],
  );

  const act = useCallback(
    (fn: (s: GameState) => GameState) => {
      const next = fn(stateRef.current);
      if (next === stateRef.current) return;
      stateRef.current = next;
      handleEvents(next, next.events);
      setState(next);
    },
    [handleEvents],
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const dt = 1000 / TICK_RATE;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = Math.min(250, t - last);
      last = t;
      if (pausedRef.current || stateRef.current.phase !== 'wave') {
        acc = 0;
        return;
      }
      acc += elapsed * speedRef.current;
      let s = stateRef.current;
      const events: GameEvent[] = [];
      while (acc >= dt) {
        acc -= dt;
        s = step(ctx, s);
        events.push(...s.events);
        if (s.phase !== 'wave') break;
      }
      if (s !== stateRef.current) {
        stateRef.current = s;
        handleEvents(s, events);
        setState(s);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, handleEvents]);

  return { state, stateRef, fxRef, act, speed, setSpeed, paused, setPaused, lastEvents };
}
