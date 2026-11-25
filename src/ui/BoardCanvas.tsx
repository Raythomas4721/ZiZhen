import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Ctx } from '../engine/ctx';
import { COLS, ROWS, type GameState } from '../engine/types';
import { drawBoard, type Fx } from './draw';

export interface BoardHandle {
  /** 螢幕座標換成格子；不在盤面上回傳 null。 */
  cellAt: (clientX: number, clientY: number) => { x: number; y: number } | null;
  setHover: (c: { x: number; y: number } | null) => void;
  element: () => HTMLCanvasElement | null;
}

interface Props {
  ctx: Ctx;
  stateRef: React.MutableRefObject<GameState>;
  fxRef: React.MutableRefObject<Fx[]>;
  cell: number;
  onPointerDown?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

export const BoardCanvas = forwardRef<BoardHandle, Props>(function BoardCanvas({ ctx, stateRef, fxRef, cell, onPointerDown }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    cellAt(clientX, clientY) {
      const c = canvasRef.current;
      if (!c) return null;
      const r = c.getBoundingClientRect();
      const x = Math.floor(((clientX - r.left) / r.width) * COLS);
      const y = Math.floor(((clientY - r.top) / r.height) * ROWS);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
      return { x, y };
    },
    setHover(c) {
      hoverRef.current = c;
    },
    element: () => canvasRef.current,
  }));

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = COLS * cell * dpr;
    c.height = ROWS * cell * dpr;
    const g = c.getContext('2d')!;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const now = performance.now();
      fxRef.current = fxRef.current.filter((f) => now - f.born < f.life);
      drawBoard(g, ctx, stateRef.current, cell, fxRef.current, now, hoverRef.current);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, cell, stateRef, fxRef]);

  return (
    <canvas
      ref={canvasRef}
      className="board"
      style={{ width: COLS * cell, height: ROWS * cell }}
      onPointerDown={onPointerDown}
    />
  );
});
