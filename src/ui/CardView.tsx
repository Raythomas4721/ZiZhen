import type { Ctx } from '../engine/ctx';
import type { Card, ToolId } from '../engine/types';
import { KIND_COLOR, KIND_NAME } from './draw';

export const TOOL_INFO: Record<ToolId, { glyph: string; name: string; desc: string }> = {
  shovel: { glyph: '鏟', name: '鏟子', desc: '拖到盤面上的字：把它收回手上（手滿了就換回一半文錢）。' },
  brush: { glyph: '筆', name: '毛筆', desc: '拖到盤面上的字：換成同部首的另一個字，會優先挑能湊成詞的。' },
  weight: { glyph: '鎮', name: '紙鎮', desc: '拖到盤面上的字：鎖住它，不會被塗改塗黑。' },
};

export function cardGlyph(c: Card): string {
  return c.kind === 'tool' ? TOOL_INFO[c.v as ToolId].glyph : c.v;
}

export function cardColor(ctx: Ctx, c: Card): string {
  if (c.kind !== 'char') return '#5b514a';
  const def = ctx.chars.get(c.v);
  return def ? KIND_COLOR[def.kind] : '#5b514a';
}

export function cardTag(ctx: Ctx, c: Card): string {
  if (c.kind === 'part') return '部件';
  if (c.kind === 'tool') return TOOL_INFO[c.v as ToolId].name;
  const def = ctx.chars.get(c.v);
  return def ? KIND_NAME[def.kind] : '';
}

interface Props {
  ctx: Ctx;
  card: Card;
  className?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  dataUid?: number;
}

export function CardView({ ctx, card, className, onPointerDown }: Props) {
  const color = cardColor(ctx, card);
  return (
    <div
      className={`card ${card.kind} ${className ?? ''}`}
      style={{ borderColor: color, color }}
      data-uid={card.uid}
      onPointerDown={onPointerDown}
    >
      <span className="tag">{cardTag(ctx, card)}</span>
      <span className="glyph">{cardGlyph(card)}</span>
      {card.kind === 'char' && <span className="lv">{'●'.repeat(card.lv)}</span>}
    </div>
  );
}
