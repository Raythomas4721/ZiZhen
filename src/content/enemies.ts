import type { EnemyDef } from '../engine/types';

export const enemies: EnemyDef[] = [
  { id: 'dot', name: '墨點', hp: 30, speed: 1.0, reward: 3, leak: 1, bite: 10, size: 0.32 },
  { id: 'blob', name: '墨團', hp: 120, speed: 0.6, reward: 7, leak: 2, bite: 25, size: 0.42 },
  { id: 'feibai', name: '飛白', hp: 24, speed: 1.8, reward: 3, leak: 1, bite: 0, flying: true, size: 0.3 },
  { id: 'tugai', name: '塗改', hp: 70, speed: 0.8, reward: 6, leak: 1, bite: 12, inker: true, size: 0.36 },
  { id: 'bigblob', name: '大墨團', hp: 900, speed: 0.4, reward: 40, leak: 6, bite: 60, boss: true, size: 0.62 },
  { id: 'scorch', name: '焦痕', hp: 800, speed: 0.75, reward: 40, leak: 6, bite: 40, boss: true, size: 0.58 },
  { id: 'bigbrush', name: '塗改大筆', hp: 1300, speed: 0.45, reward: 50, leak: 6, bite: 50, inker: true, boss: true, size: 0.64 },
];
