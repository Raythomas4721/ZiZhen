import { unlockedChars, wordsWithin, type Ctx } from '../engine/ctx';
import type { WordDef } from '../engine/types';
import type { SaveData } from './save';

interface Props {
  ctx: Ctx;
  save: SaveData;
  onBack: () => void;
}

/** 依照「第幾章開始湊得出來」把詞分組。 */
function groups(ctx: Ctx): { book: string; words: WordDef[] }[] {
  const seen = new Set<string>();
  return ctx.content.chapters.map((ch) => {
    const ws = wordsWithin(ctx, unlockedChars(ctx, ch.id)).filter((w) => !seen.has(w.w));
    ws.forEach((w) => seen.add(w.w));
    return { book: ch.book, words: ws };
  });
}

export function Dictionary({ ctx, save, onBack }: Props) {
  const found = new Set(save.found);
  return (
    <div className="shelf">
      <button className="ghost" onClick={onBack}>
        ← 書架
      </button>
      <h2>
        字典本　<span className="muted">{found.size} / {ctx.content.words.length}</span>
      </h2>
      {groups(ctx).map((g) => (
        <section key={g.book}>
          <h3>《{g.book}》</h3>
          <div className="word-list">
            {g.words.map((w) =>
              found.has(w.w) ? (
                <div key={w.w} className="word-item">
                  <b>{w.w}</b>
                  <small>{w.note}</small>
                </div>
              ) : (
                <div key={w.w} className="word-item unknown">
                  <b>{[...w.w][0]}？</b>
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
