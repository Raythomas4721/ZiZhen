import { reachableIdioms as reach } from '../engine/box';
import { chapterOf, type Ctx } from '../engine/ctx';
import { canCast } from '../engine/idioms';
import type { GameState } from '../engine/types';

interface Props {
  ctx: Ctx;
  s: GameState;
  known: Set<string>;
  onCast: (w: string) => void;
}

/** 這一局有機會排出來的成語（書箱的字，加上部件合得出的字）。 */
export function reachableIdioms(ctx: Ctx, s: GameState) {
  return reach(ctx, s.chapter, s.box);
}

export function IdiomBar({ ctx, s, known, onCast }: Props) {
  const ch = chapterOf(ctx, s.chapter);
  const list = reachableIdioms(ctx, s);
  if (!list.length) return null;
  const onBoard = new Set(s.idioms.map((i) => i.w));
  const placed = new Set(s.towers.map((t) => t.ch));
  return (
    <div className="idiom-bar">
      {list.map((def) => {
        const shown = ch.rules?.idiomHint || known.has(def.w) || onBoard.has(def.w);
        const charge = s.charge[def.w] ?? 0;
        const ready = canCast(s, def.w);
        return (
          <button
            key={def.w}
            className={`idiom ${ready ? 'ready' : ''} ${onBoard.has(def.w) ? 'live' : ''}`}
            disabled={!ready}
            onClick={() => onCast(def.w)}
            title={shown ? def.note : '還沒排出來過'}
          >
            <span className="idiom-text">
              {[...def.w].map((c, i) =>
                shown || i === 0 ? (
                  <span key={i} className={placed.has(c) ? 'have' : ''}>
                    {c}
                  </span>
                ) : (
                  <span key={i}>？</span>
                ),
              )}
            </span>
            <span className="idiom-meter">
              <span style={{ width: `${Math.round(charge * 100)}%` }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
