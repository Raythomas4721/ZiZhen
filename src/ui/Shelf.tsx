import type { Ctx } from '../engine/ctx';
import type { SaveData } from './save';

interface Props {
  ctx: Ctx;
  save: SaveData;
  onBack: () => void;
  onPlay: (chapter: string) => void;
  onDictionary?: () => void;
}

export function isUnlocked(ctx: Ctx, save: SaveData, chapterId: string): boolean {
  const ch = ctx.chapters.get(chapterId)!;
  if (ch.index === 1) return true;
  const prev = ctx.content.chapters.find((c) => c.index === ch.index - 1);
  return !!prev && (save.stars[prev.id] ?? 0) > 0;
}

export function Shelf({ ctx, save, onBack, onPlay, onDictionary }: Props) {
  return (
    <div className="shelf">
      <button className="ghost" onClick={onBack}>
        ← 封面
      </button>
      <h2>藏書閣</h2>
      {ctx.content.chapters.map((ch) => {
        const open = isUnlocked(ctx, save, ch.id);
        const stars = save.stars[ch.id] ?? 0;
        return (
          <button key={ch.id} className={`book ${open ? '' : 'locked'}`} disabled={!open} onClick={() => onPlay(ch.id)}>
            <span className="spine" />
            <span>
              <div className="name">《{ch.book}》</div>
              <div className="meta">{open ? `第 ${ch.index} 章・${ch.waves.length} 波` : '守住上一本書才能翻開'}</div>
            </span>
            <span className="stars">{stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : ''}</span>
          </button>
        );
      })}
      {onDictionary && (
        <button style={{ marginTop: '0.6rem', width: '100%' }} onClick={onDictionary}>
          字典本（{save.found.length} / {ctx.content.words.length} 個詞）
        </button>
      )}
    </div>
  );
}
