import { useEffect, useRef, useState } from 'react';
import { canDraw, draw, drawCost, place, sell } from '../engine/actions';
import { chapterOf, type Ctx } from '../engine/ctx';
import { createGame, startWave } from '../engine/game';
import { COLS, HAND_SIZE, PAGE_HP, type Card, type GameEvent } from '../engine/types';
import { BoardCanvas, type BoardHandle } from './BoardCanvas';
import { CardView, cardGlyph } from './CardView';
import { useGame } from './useGame';

interface Props {
  ctx: Ctx;
  chapter: string;
  onExit: () => void;
}

function useCellSize() {
  const calc = () => Math.floor(Math.min(window.innerWidth - 12, 448, (window.innerHeight - 230) * (7 / 9)) / COLS);
  const [cell, setCell] = useState(calc);
  useEffect(() => {
    const on = () => setCell(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return cell;
}

interface Drag {
  card: Card;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export function GameScreen({ ctx, chapter, onExit }: Props) {
  const ch = chapterOf(ctx, chapter);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const showToast = (text: string) => setToast({ text, key: Date.now() });
  const onEvents = (evs: GameEvent[]) => {
    for (const e of evs) {
      if (e.t === 'invalid') showToast(e.reason);
      if (e.t === 'waveEnd') showToast(e.held ? `守住了！+${e.bonus} 文` : `這頁被啃掉了… +${e.bonus} 文`);
    }
  };
  const game = useGame(ctx, () => createGame(ctx, { chapter, seed: Date.now() % 100000 }), onEvents);
  const s = game.state;
  const boardRef = useRef<BoardHandle>(null);
  const cell = useCellSize();
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  // 選到的卡不見了就取消選取
  useEffect(() => {
    if (selected !== null && !s.hand.some((h) => h.uid === selected)) setSelected(null);
  }, [s.hand, selected]);

  const dropAt = (card: Card, clientX: number, clientY: number) => {
    const c = boardRef.current?.cellAt(clientX, clientY);
    if (c) {
      game.act((st) => place(ctx, st, card.uid, c.x, c.y));
      return;
    }
    const el = document.elementFromPoint(clientX, clientY);
    if (el?.closest('.sell')) game.act((st) => sell(st, card.uid));
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8;
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved });
      boardRef.current?.setHover(moved ? boardRef.current.cellAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      setDrag(null);
      boardRef.current?.setHover(null);
      if (!d) return;
      if (d.moved) {
        dropAt(d.card, e.clientX, e.clientY);
        setSelected(null);
      } else {
        setSelected((cur) => (cur === d.card.uid ? null : d.card.uid));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const onBoardDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = boardRef.current?.cellAt(e.clientX, e.clientY);
    if (!c) return;
    if (selected !== null) {
      game.act((st) => place(ctx, st, selected, c.x, c.y));
      setSelected(null);
    }
  };

  const tip = s.phase === 'prep' ? ch.tips?.[s.wave] : undefined;
  const cost = drawCost(s);
  const slots = Array.from({ length: HAND_SIZE }, (_, i) => s.hand[i]);

  return (
    <div className="game">
      <header className="hud">
        <button className="ghost" onClick={onExit}>
          ← 書架
        </button>
        <div className="hud-title">
          《{ch.book}》 {Math.min(s.wave + 1, ch.waves.length)}/{ch.waves.length}
          {ch.waves[s.wave]?.boss ? ' 頭目' : ''}
        </div>
        <div className="hud-stats">
          <span className="page">頁 {Math.max(0, Math.ceil(s.pageHp))}/{PAGE_HP}</span>
          <span className="coin">{s.coins} 文</span>
        </div>
      </header>

      {tip && <div className="tip">{tip}</div>}

      <BoardCanvas ref={boardRef} ctx={ctx} stateRef={game.stateRef} fxRef={game.fxRef} cell={cell} onPointerDown={onBoardDown} />

      <div className="hand-row">
        <div className="hand">
          {slots.map((c, i) =>
            c ? (
              <CardView
                key={c.uid}
                ctx={ctx}
                card={c}
                className={`${selected === c.uid ? 'drop' : ''} ${drag?.card.uid === c.uid && drag.moved ? 'dragging' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrag({ card: c, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
                }}
              />
            ) : (
              <div key={`empty-${i}`} className="slot" />
            ),
          )}
        </div>
        <div className="side">
          <button className="draw-btn primary" disabled={!canDraw(s)} onClick={() => game.act((st) => draw(ctx, st))}>
            抽字
            <small>{cost} 文</small>
          </button>
          <div className={`sell ${drag?.moved ? 'drop' : ''}`}>拖來賣</div>
        </div>
      </div>

      <div className="controls">
        {s.phase === 'prep' && (
          <button className="primary" onClick={() => game.act((st) => startWave(ctx, st))}>
            開始第 {s.wave + 1} 波
          </button>
        )}
        {s.phase === 'wave' && (
          <>
            <button onClick={() => game.setPaused(!game.paused)}>{game.paused ? '繼續' : '暫停'}</button>
            <button onClick={() => game.setSpeed(game.speed === 1 ? 2 : 1)}>速度 ×{game.speed}</button>
          </>
        )}
        {s.phase === 'done' && <div className="done">這本書守完了。</div>}
      </div>

      {drag?.moved && (
        <div className="ghost-card" style={{ left: drag.x, top: drag.y }}>
          {cardGlyph(drag.card)}
        </div>
      )}
      {toast && (
        <div key={toast.key} className="toast">
          {toast.text}
        </div>
      )}
    </div>
  );
}
