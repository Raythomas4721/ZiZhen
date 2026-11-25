// 可設定種子的亂數（mulberry32）。狀態只是一個整數，存在 GameState.rng。

export function nextRng(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** 在可變的草稿狀態上抽一個 0～1 的亂數。 */
export function roll(s: { rng: number }): number {
  const [v, next] = nextRng(s.rng);
  s.rng = next;
  return v;
}

export function pickWeighted<T>(s: { rng: number }, items: T[], weight: (t: T) => number): T | undefined {
  const total = items.reduce((sum, it) => sum + weight(it), 0);
  if (total <= 0) return undefined;
  let r = roll(s) * total;
  for (const it of items) {
    r -= weight(it);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}
