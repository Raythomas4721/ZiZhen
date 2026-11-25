import type { WordDef } from '../engine/types';

// 二字詞。照閱讀順序相鄰才算：橫排左到右、直排上到下。
export const words: WordDef[] = [
  // 第一章
  { w: '火山', effect: { dmg: 0.8, splash: 0.5 }, note: '火更旺，濺得更遠；山也跟著發燙。' },
  { w: '山水', effect: { slow: 0.25, block: 0.8, dmg: 0.3 }, note: '水更緩，山更穩。' },
  { w: '水火', effect: { rate: 0.5, dmg: 0.2 }, note: '水火相激，兩邊都打得更快。' },
  { w: '水木', effect: { rate: 0.35, range: 0.4 }, note: '水養木：攻速和射程都變好。' },
  { w: '山木', effect: { block: 1.0, dmg: 0.5 }, note: '山上有樹：屏障更厚，打得也更重。' },
];
