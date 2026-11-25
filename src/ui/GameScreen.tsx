import { useEffect, useRef, useState } from 'react';
import { chapterOf, type Ctx } from '../engine/ctx';
import { createGame, startWave } from '../engine/game';
import { COLS, PAGE_HP } from '../engine/types';
import { BoardCanvas, type BoardHandle } from './BoardCanvas';
import { useGame } from './useGame';

interface Props {
  ctx: Ctx;
  chapter: string;
  onExit: () => void;
}

function useCellSize() {
  const calc = () => Math.floor(Math.min(window.innerWidth - 16, 448) / COLS);
  const [cell, setCell] = useState(calc);
  useEffect(() => {
    const on = () => setCell(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return cell;
}

export function GameScreen({ ctx, chapter, onExit }: Props) {
  const ch = chapterOf(ctx, chapter);
  const game = useGame(ctx, () => createGame(ctx, { chapter, seed: Date.now() % 100000 }));
  const s = game.state;
  const boardRef = useRef<BoardHandle>(null);
  const cell = useCellSize();

  return (
    <div className="game">
      <header className="hud">
        <button className="ghost" onClick={onExit}>
          ← 書架
        </button>
        <div className="hud-title">
          《{ch.book}》 第 {Math.min(s.wave + 1, ch.waves.length)} / {ch.waves.length} 波
        </div>
        <div className="hud-stats">
          <span title="書頁">頁 {Math.max(0, s.pageHp)}/{PAGE_HP}</span>
          <span title="文錢">錢 {s.coins}</span>
        </div>
      </header>

      <BoardCanvas ref={boardRef} ctx={ctx} stateRef={game.stateRef} fxRef={game.fxRef} cell={cell} />

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
    </div>
  );
}
