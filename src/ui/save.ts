// 存檔：每章最好的星數、發現過的詞、上次的書箱。

const KEY = 'zizhen.save.v1';

export interface SaveData {
  v: 1;
  stars: Record<string, number>;
  found: string[];
  boxes: Record<string, string[]>;
  /** 終章找回的字（之後挑書箱時可以選）。 */
  secrets: string[];
}

const empty = (): SaveData => ({ v: 1, stars: {}, found: [], boxes: {}, secrets: [] });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.v !== 1) return empty();
    return { v: 1, stars: d.stars ?? {}, found: d.found ?? [], boxes: d.boxes ?? {}, secrets: d.secrets ?? [] };
  } catch {
    return empty();
  }
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // 無痕模式等存不了就算了
  }
}

export function recordResult(d: SaveData, chapter: string, stars: number, found: string[], secret?: string): SaveData {
  const next: SaveData = {
    ...d,
    secrets: secret && !d.secrets.includes(secret) ? [...d.secrets, secret] : d.secrets,
    stars: { ...d.stars, [chapter]: Math.max(d.stars[chapter] ?? 0, stars) },
    found: [...d.found, ...found.filter((w) => !d.found.includes(w))],
  };
  writeSave(next);
  return next;
}

export function recordFound(d: SaveData, found: string[]): SaveData {
  const fresh = found.filter((w) => !d.found.includes(w));
  if (!fresh.length) return d;
  const next = { ...d, found: [...d.found, ...fresh] };
  writeSave(next);
  return next;
}

export function recordBox(d: SaveData, chapter: string, box: string[]): SaveData {
  const next = { ...d, boxes: { ...d.boxes, [chapter]: box } };
  writeSave(next);
  return next;
}
