import { idiomsWithin, unlockedChars, wordsWithin, type Ctx } from '../engine/ctx';
import type { IdiomDef, WordDef } from '../engine/types';
import type { SaveData } from './save';

interface Props {
  ctx: Ctx;
  save: SaveData;
  onBack: () => void;
}

/** 依照「第幾章開始湊得出來」把詞分組。 */
function groups(ctx: Ctx): { book: string; words: (WordDef | IdiomDef)[] }[] {
  const seen = new Set<string>();
  const groups = ctx.content.chapters.map((ch) => {
    const pool = unlockedChars(ctx, ch.id);
    const ws = [...idiomsWithin(ctx, pool), ...wordsWithin(ctx, pool)].filter((w) => !seen.has(w.w));
    ws.forEach((w) => seen.add(w.w));
    return { book: ch.book, words: ws };
  });
  const rest = [...ctx.content.idioms, ...ctx.content.words].filter((w) => !seen.has(w.w));
  return rest.length ? [...groups, { book: '？？', words: rest }] : groups;
}

export function Dictionary({ ctx, save, onBack }: Props) {
  const found = new Set(save.found);
  return (
    <div className="shelf">
      <button className="ghost" onClick={onBack}>
        ← 書架
      </button>
      <h2>
        字典本　<span className="muted">{found.size} / {ctx.content.words.length + ctx.content.idioms.length}</span>
      </h2>
      {groups(ctx).map((g) => (
        <section key={g.book}>
          <h3>{g.book === '？？' ? '終章之後' : `《${g.book}》`}</h3>
          <div className="word-list">
            {g.words.map((w) =>
              found.has(w.w) ? (
                <div key={w.w} className="word-item">
                  <b>{w.w}</b>
                  <small>
                    {'cat' in w ? `［${w.cat}］` : '［成語］'}
                    {w.note}
                  </small>
                </div>
              ) : (
                <div key={w.w} className="word-item unknown">
                  <b>{[...w.w][0]}{'？'.repeat([...w.w].length - 1)}</b>
                  <small>還沒連出來過</small>
                </div>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
