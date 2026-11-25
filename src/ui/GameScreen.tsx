import { useEffect, useRef, useState } from 'react';
import { canDraw, canMerge, combine, draw, drawCost, moveTower, place, recipeFor, sell, towerAt } from '../engine/actions';
import { chapterOf, type Ctx } from '../engine/ctx';
import { createGame, starsOf, startWave } from '../engine/game';
import { kindOf } from '../engine/stats';
import { COLS, HAND_SIZE, PAGE_HP, TICK_RATE, type Card, type Cell, type GameEvent, type GameState, type ToolId, type Tower } from '../engine/types';
import { KIND_NAME } from './draw';
import { BoardCanvas, type BoardHandle } from './BoardCanvas';
import { CardView, cardGlyph, TOOL_INFO } from './CardView';
import { IdiomBar, reachableIdioms } from './IdiomBar';
import { useGame } from './useGame';
import { castIdiom } from '../engine/idioms';

interface Props {
  ctx: Ctx;
  chapter: string;
  box?: string[];
  /** 存檔裡已經發現過的詞。 */
  known: string[];
  onExit: () => void;
  onFound: (words: string[]) => void;
  onFinish: (stars: number, found: string[]) => void;
  onRetry: () => void;
}

/** 格子大小：寬度和高度都要塞得下（reserve 是盤面以外的介面高度）。 */
function useCellSize(reserve: number) {
  const calc = () => Math.floor(Math.min(window.innerWidth - 12, 448, (window.innerHeight - reserve) * (7 / 9)) / COLS);
  const [cell, setCell] = useState(calc);
  useEffect(() => {
    const on = () => setCell(calc());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserve]);
  return cell;
}

/** 拖的東西：手上的卡，或盤面上的字。 */
type DragSrc = { t: 'card'; card: Card } | { t: 'tower'; from: Cell; ch: string; lv: number };

interface Drag {
  src: DragSrc;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

function srcGlyph(src: DragSrc): string {
  return src.t === 'card' ? cardGlyph(src.card) : src.ch;
}

export function GameScreen({ ctx, chapter, box, known, onExit, onFound, onFinish, onRetry }: Props) {
  const ch = chapterOf(ctx, chapter);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [wordNote, setWordNote] = useState<{ w: string; note: string; fresh: boolean } | null>(null);
  const [info, setInfo] = useState<Cell | null>(null);
  const knownRef = useRef(new Set(known));
  const showToast = (text: string) => setToast({ text, key: Date.now() });
  const onEvents = (evs: GameEvent[]) => {
    const fresh: string[] = [];
    for (const e of evs) {
      if (e.t === 'invalid') showToast(e.reason);
      if (e.t === 'waveEnd') showToast(e.held ? `守住了！+${e.bonus} 文` : `這頁被啃掉了… +${e.bonus} 文`);
      if (e.t === 'word') {
        const def = ctx.words.get(e.w) ?? ctx.idioms.get(e.w);
        const isIdiom = ctx.idioms.has(e.w);
        const isNew = !knownRef.current.has(e.w);
        if (isNew) {
          knownRef.current.add(e.w);
          fresh.push(e.w);
        }
        // 塗黑又恢復時也會重新連詞，只有真的新詞才跳提示
        if (isNew || e.fresh) setWordNote({ w: e.w, note: def?.note ?? '', fresh: isNew });
        if (isNew) showToast(isIdiom ? `排出成語「${e.w}」！開始集氣` : `新詞「${e.w}」！`);
        else if (isIdiom && e.fresh) showToast(`「${e.w}」開始集氣`);
      }
      if (e.t === 'compose') showToast(`${e.a}＋${e.b}＝${e.out}`);
      if (e.t === 'idiomReady') showToast(`「${e.w}」集滿了！`);
      if (e.t === 'idiom') showToast(`${e.w}！`);
      if (e.t === 'swap') showToast('錯字把兩個字對調了！');
    }
    if (fresh.length) onFound(fresh);
  };
  const game = useGame(ctx, () => createGame(ctx, { chapter, seed: Date.now() % 100000, box }), onEvents);
  const s = game.state;
  const boardRef = useRef<BoardHandle>(null);
  const cell = useCellSize(reachableIdioms(ctx, s).length ? 330 : 280);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  useEffect(() => {
    if (selected !== null && !s.hand.some((h) => h.uid === selected)) setSelected(null);
  }, [s.hand, selected]);

  const dropAt = (src: DragSrc, clientX: number, clientY: number) => {
    const c = boardRef.current?.cellAt(clientX, clientY);
    if (src.t === 'tower') {
      if (c) game.act((st) => moveTower(ctx, st, src.from, c));
      return;
    }
    if (c) {
      game.act((st) => place(ctx, st, src.card.uid, c.x, c.y));
      return;
    }
    const el = document.elementFromPoint(clientX, clientY);
    const target = el?.closest<HTMLElement>('[data-uid]');
    if (target) {
      const uid = Number(target.dataset.uid);
      game.act((st) => combine(ctx, st, src.card.uid, uid));
      return;
    }
    if (el?.closest('.sell')) game.act((st) => sell(st, src.card.uid));
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
        dropAt(d.src, e.clientX, e.clientY);
        setSelected(null);
      } else if (d.src.t === 'tower') {
        const from = d.src.from;
        setInfo((cur) => (cur && cur.x === from.x && cur.y === from.y ? null : from));
      } else if (d.src.t === 'card') {
        const uid = d.src.card.uid;
        // 已經選了一張卡，再點另一張卡就是把兩張疊起來
        if (selected !== null && selected !== uid) {
          game.act((st) => combine(ctx, st, selected, uid));
          setSelected(null);
        } else setSelected((cur) => (cur === uid ? null : uid));
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
      return;
    }
    const t = towerAt(game.stateRef.current, c.x, c.y);
    if (t) {
      e.preventDefault();
      setDrag({ src: { t: 'tower', from: c, ch: t.ch, lv: t.lv }, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
    }
  };

  const dragging = drag?.moved ? drag.src : null;
  const mergeable = (c: Card): boolean => {
    const src = dragging ?? (selected !== null ? { t: 'card' as const, card: s.hand.find((h) => h.uid === selected)! } : null);
    if (!src || src.t !== 'card' || !src.card || src.card.uid === c.uid) return false;
    if (src.card.kind === 'part' && c.kind === 'part') return !!recipeFor(ctx, src.card.v, c.v);
    return src.card.kind === 'char' && c.kind === 'char' && canMerge({ ch: src.card.v, lv: src.card.lv }, { ch: c.v, lv: c.lv });
  };

  // 守完一本書：記錄一次
  const finishedRef = useRef(false);
  useEffect(() => {
    if (s.phase === 'done' && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(starsOf(s.results), s.found);
    }
  }, [s.phase, s.results, s.found, onFinish]);

  const infoTower = info ? towerAt(s, info.x, info.y) : undefined;
  const selectedCard = selected !== null ? s.hand.find((h) => h.uid === selected) : undefined;
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
      {selectedCard && selectedCard.kind !== 'char' && (
        <div className="tip">
          {selectedCard.kind === 'tool' ? (
            <>
              <b>{TOOL_INFO[selectedCard.v as ToolId].name}</b>　{TOOL_INFO[selectedCard.v as ToolId].desc}
            </>
          ) : (
            <>
              <b>部件「{selectedCard.v}」</b>　疊到另一張部件上合成字。這章可以合：
              {ctx.recipes
                .filter((r) => (r.a === selectedCard.v || r.b === selectedCard.v) && ch.parts.includes(r.a) && ch.parts.includes(r.b))
                .map((r) => `${r.a}＋${r.b}＝${r.out}`)
                .join('、')}
            </>
          )}
        </div>
      )}
      {!selectedCard && !tip && infoTower && <TowerInfo ctx={ctx} s={s} t={infoTower} />}
      {!tip && !infoTower && wordNote && (
        <div className="tip">
          <b>{wordNote.w}</b>　{wordNote.note}
        </div>
      )}

      <BoardCanvas ref={boardRef} ctx={ctx} stateRef={game.stateRef} fxRef={game.fxRef} cell={cell} onPointerDown={onBoardDown} />

      <div className="hand-row">
        <div className="hand">
          {slots.map((c, i) =>
            c ? (
              <CardView
                key={c.uid}
                ctx={ctx}
                card={c}
                className={[
                  selected === c.uid ? 'drop' : '',
                  mergeable(c) ? 'drop' : '',
                  dragging?.t === 'card' && dragging.card.uid === c.uid ? 'dragging' : '',
                ].join(' ')}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrag({ src: { t: 'card', card: c }, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
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
          <div className={`sell ${dragging?.t === 'card' ? 'drop' : ''}`}>拖來賣</div>
        </div>
      </div>

      <IdiomBar ctx={ctx} s={s} known={knownRef.current} onCast={(w) => game.act((st) => castIdiom(ctx, st, w))} />

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

      {s.phase === 'done' && (
        <div className="modal-bg">
          <div className="modal">
            <h2>《{ch.book}》守住了</h2>
            <div className="big-stars">{'★'.repeat(starsOf(s.results)) + '☆'.repeat(3 - starsOf(s.results))}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              {s.results.filter((r) => r === 'lost').length === 0
                ? '一頁都沒被啃掉。'
                : `有 ${s.results.filter((r) => r === 'lost').length} 頁被啃掉了，下次可以再補回來。`}
            </p>
            <p className="muted">補回來的書頁：</p>
            <div className="story">
              {ch.story.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {s.found.length > 0 && <p className="muted">這次連出的詞：{s.found.join('、')}</p>}
            <div className="actions">
              <button onClick={onRetry}>再守一次</button>
              <button className="primary" onClick={onExit}>
                回書架
              </button>
            </div>
          </div>
        </div>
      )}

      {dragging && (
        <div className="ghost-card" style={{ left: drag!.x, top: drag!.y }}>
          {srcGlyph(dragging)}
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

function TowerInfo({ ctx, s, t }: { ctx: Ctx; s: GameState; t: Tower }) {
  const ws = s.words.filter((w) => (w.a.x === t.x && w.a.y === t.y) || (w.b.x === t.x && w.b.y === t.y));
  const st = t.stats;
  const parts: string[] = [];
  if (st.attacks) {
    parts.push(`傷害 ${Math.round(st.dmg)}`);
    parts.push(`每秒 ${(TICK_RATE / Math.max(2, Math.round(st.cd))).toFixed(1)} 下`);
    parts.push(`射程 ${st.range.toFixed(1)}`);
  } else parts.push('不攻擊，幫旁邊的字加快攻速');
  if (t.onPath) parts.push(`屏障 ${Math.ceil(t.block)}/${Math.round(st.blockMax)}`);
  if (t.locked) parts.push('已用紙鎮鎖住');
  if (t.inked > 0) parts.push('被塗黑了');
  return (
    <div className="tip">
      <b>
        {t.ch}　{'●'.repeat(t.lv)}　{KIND_NAME[kindOf(ctx, t.ch)]}
      </b>
      　{parts.join('・')}
      {ws.length > 0 && <div className="muted">在詞裡：{ws.map((w) => w.w).join('、')}</div>}
    </div>
  );
}
