import type { Ctx } from '../engine/ctx';
import type { SaveData } from './save';

interface Props {
  ctx: Ctx;
  save: SaveData;
  onBack: () => void;
  onPlay: (chapter: string) => void;
  onDictionary?: () => void;
  onHelp?: () => void;
}

export function isUnlocked(ctx: Ctx, save: SaveData, chapterId: string): boolean {
  const ch = ctx.chapters.get(chapterId)!;
  if (ch.index === 1) return true;
  const prev = ctx.content.chapters.find((c) => c.index === ch.index - 1);
  return !!prev && (save.stars[prev.id] ?? 0) > 0;
}

export function Shelf({ ctx, save, onBack, onPlay, onDictionary, onHelp }: Props) {
  return (
    <div className="shelf">
      <button className="ghost" onClick={onBack}>
        ← 封面
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>藏書閣</h2>
        {onHelp && <button onClick={onHelp}>怎麼玩</button>}
      </div>
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
      {save.secrets.length > 0 && (
        <p className="muted" style={{ textAlign: 'center' }}>
          字典裡多了一個字：<b style={{ color: 'var(--ink)' }}>{save.secrets.join('、')}</b>。再守《無名字典》時可以把它挑進書箱。
        </p>
      )}
      {onDictionary && (
        <button style={{ marginTop: '0.6rem', width: '100%' }} onClick={onDictionary}>
          字典本（{save.found.length} / {ctx.content.words.length + ctx.content.idioms.length}）
        </button>
      )}
    </div>
  );
}
