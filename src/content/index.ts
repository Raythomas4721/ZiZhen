import { buildCtx } from '../engine/ctx';
import type { Content } from '../engine/types';
import { ch01 } from './chapters/ch01';
import { chars } from './chars';
import { enemies } from './enemies';

export const content: Content = {
  chars,
  words: [],
  recipes: [],
  enemies,
  chapters: [ch01],
};

export const ctx = buildCtx(content);
