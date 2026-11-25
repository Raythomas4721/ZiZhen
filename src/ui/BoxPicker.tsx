import { useState } from 'react';
import { boxCandidates, boxReport, boxSize, recommendBox } from '../engine/box';
import { chapterOf, idiomsWithin, wordsWithin, type Ctx } from '../engine/ctx';
import { partnersOf } from '../engine/words';
import { KIND_COLOR, KIND_NAME } from './draw';
import { TOOL_INFO } from './CardView';

interface Props {
  ctx: Ctx;
  chapter: string;
  last?: string[];
  onBack: () => void;
  onStart: (box: string[]) => void;
}

export function BoxPicker({ ctx, chapter, last, onBack, onStart }: Props) {
  const ch = chapterOf(ctx, chapter);
  const cands = boxCandidates(ctx, chapter);
  const size = boxSize(ctx, chapter);
  const valid = (b?: string[]) => !!b && b.length === size && b.every((c) => cands.includes(c));
  const [box, setBox] = useState<string[]>(() => (valid(last) ? last! : recommendBox(ctx, chapter)));
  const rep = boxReport(ctx, box);
  const fresh = new Set(ch.unlock);

  const toggle = (c: string) => {
    if (box.includes(c)) setBox(box.filter((x) => x !== c));
    else if (box.length < size) setBox([...box, c]);
  };

  return (
    <div className="shelf">
      <button className="ghost" onClick={onBack}>
        ← 書架
      </button>
      <h2>《{ch.book}》</h2>
      <p className="muted" style={{ lineHeight: 1.7 }}>
        {ch.intro}
      </p>
      <h3 style={{ marginBottom: 0 }}>
        挑書箱（{box.length} / {size}）
      </h3>
      <p className="muted" style={{ margin: '0.2rem 0' }}>
        抽字只會抽到書箱裡的字。數字是「在這箱裡能跟幾個字湊成詞」，有 ! 的字湊不到 2 個詞，容易變死牌。
      </p>
      <div className="chip-grid">
        {cands.map((c) => {
          const on = box.includes(c);
          const def = ctx.chars.get(c)!;
          const n = partnersOf(ctx, c, box).length;
          return (
            <button
              key={c}
              className={`chip ${on ? 'on' : ''} ${on && n < 2 ? 'warn' : ''}`}
              style={on ? undefined : { color: KIND_COLOR[def.kind] }}
              onClick={() => toggle(c)}
              title={KIND_NAME[def.kind]}
            >
              {c}
              <small>
                {KIND_NAME[def.kind]}
                {on ? `・${n}` : fresh.has(c) ? '・新' : ''}
              </small>
            </button>
          );
        })}
      </div>
      <p>
        這箱能湊出 <b>{rep.words}</b> 個詞
        {rep.weak.length > 0 && <span className="muted">（「{rep.weak.join('、')}」可能變死牌）</span>}
      </p>
      <p className="muted">{wordsWithin(ctx, box).map((w) => w.w).join('、') || '還湊不出詞'}</p>
      {ctx.content.idioms.length > 0 && ch.index >= 4 && (
        <p>
          成語：
          {idiomsWithin(ctx, box).length ? (
            <b>{idiomsWithin(ctx, box).map((w) => (ch.rules?.idiomHint ? w.w : `${[...w.w][0]}？？？`)).join('、')}</b>
          ) : (
            <span className="muted">這箱排不出成語</span>
          )}
        </p>
      )}
      {(ch.parts.length > 0 || ch.tools.length > 0) && (
        <p className="muted">
          {ch.parts.length > 0 && <>這章還會抽到部件：{ch.parts.join('、')}。</>}
          {ch.tools.length > 0 && <>工具：{ch.tools.map((t) => TOOL_INFO[t].name).join('、')}。</>}
        </p>
      )}
      <div className="actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button onClick={() => setBox(recommendBox(ctx, chapter))}>用推薦的</button>
        <button className="primary" disabled={box.length !== size} onClick={() => onStart(box)}>
          開始守書
        </button>
      </div>
    </div>
  );
}
