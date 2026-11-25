import type { CharDef } from '../engine/types';

// radical 是「部首家族」：毛筆會在同一家族裡換字（水、氵算同一家，火、灬算同一家）。
export const chars: CharDef[] = [
  // 第一章
  { ch: '火', radical: '火', kind: 'fire' },
  { ch: '水', radical: '水', kind: 'water' },
  { ch: '山', radical: '山', kind: 'wall' },
  { ch: '木', radical: '木', kind: 'wall' },
  // 第二章
  { ch: '湯', radical: '水', kind: 'water' },
  { ch: '鍋', radical: '金', kind: 'metal' },
  { ch: '刀', radical: '刀', kind: 'metal' },
  { ch: '口', radical: '口', kind: 'support' },
  { ch: '煮', radical: '火', kind: 'fire' },
  // 第三章
  { ch: '溪', radical: '水', kind: 'water' },
  { ch: '清', radical: '水', kind: 'water' },
  { ch: '石', radical: '石', kind: 'wall' },
  { ch: '林', radical: '木', kind: 'wall' },
  { ch: '日', radical: '日', kind: 'light' },
  { ch: '明', radical: '日', kind: 'light' },
  { ch: '月', radical: '月', kind: 'light' },
  // 第四章
  { ch: '海', radical: '水', kind: 'water' },
  { ch: '雨', radical: '雨', kind: 'water' },
  { ch: '風', radical: '風', kind: 'light' },
  { ch: '千', radical: '十', kind: 'metal' },
  { ch: '萬', radical: '艸', kind: 'support' },
  // 第五章
  { ch: '星', radical: '日', kind: 'light' },
  { ch: '燈', radical: '火', kind: 'light' },
  { ch: '夜', radical: '夕', kind: 'light' },
  { ch: '雪', radical: '雨', kind: 'water' },
  { ch: '花', radical: '艸', kind: 'support' },
  { ch: '江', radical: '水', kind: 'water' },
];
