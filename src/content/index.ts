import { buildCtx } from '../engine/ctx';
import type { Content } from '../engine/types';
import { ch01 } from './chapters/ch01';
import { ch02 } from './chapters/ch02';
import { ch03 } from './chapters/ch03';
import { chars } from './chars';
import { enemies } from './enemies';
import { recipes } from './recipes';
import { words } from './words';

export const content: Content = {
  chars,
  words,
  recipes,
  enemies,
  chapters: [ch01, ch02, ch03],
};

export const ctx = buildCtx(content);
