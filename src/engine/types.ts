// 字陣的資料型別。引擎只吃這些資料，不碰 DOM、時間或 Math.random。

export const COLS = 7;
export const ROWS = 9;
/** 每秒幾個 tick。 */
export const TICK_RATE = 20;
export const MAX_LEVEL = 5;
export const HAND_SIZE = 5;
export const PAGE_HP = 10;

export interface Cell {
  x: number;
  y: number;
}

/** 字塔的類型，由部首決定。 */
export type Kind = 'fire' | 'water' | 'wall' | 'metal' | 'support' | 'light';

export interface CharDef {
  ch: string;
  /** 部首，毛筆會換成同部首的另一個字。 */
  radical: string;
  kind: Kind;
}

/** 詞發動時，兩個字都會拿到的加成。 */
export interface WordEffect {
  /** 傷害倍率加成，例如 0.5 代表 ×1.5。 */
  dmg?: number;
  /** 射程加成（格）。 */
  range?: number;
  /** 攻速加成，例如 0.3 代表冷卻 ÷1.3。 */
  rate?: number;
  /** 濺射半徑加成（格）。 */
  splash?: number;
  /** 燃燒：每秒造成這次傷害的幾成，持續 3 秒。 */
  burn?: number;
  /** 額外減速（0～1，越大越慢）。 */
  slow?: number;
  /** 凍住的機率。 */
  freeze?: number;
  /** 暴擊機率加成。 */
  crit?: number;
  /** 屏障血量倍率加成。 */
  block?: number;
}

export interface WordDef {
  w: string;
  effect: WordEffect;
  /** 詞的類別（天文、地理、器物……）。同類的兩個詞上下並排就是對仗。 */
  cat: string;
  /** 給玩家看的一句話。 */
  note: string;
}

export interface RecipeDef {
  a: string;
  b: string;
  out: string;
}

export type ToolId = 'shovel' | 'brush' | 'weight';

/** 成語大招的效果。 */
export type IdiomEffect =
  /** 全場受到最大血量幾成的傷害（頭目只吃三分之一），再燒幾秒。 */
  | { kind: 'blast'; frac: number; burnSec: number }
  /** 全場往回推幾格（頭目只推三分之一）。 */
  | { kind: 'push'; cells: number }
  /** 全場凍住幾秒（頭目只凍三分之一）。 */
  | { kind: 'freeze'; sec: number }
  /** 書頁回血，並在幾秒內不會被啃。 */
  | { kind: 'shield'; heal: number; sec: number };

export interface IdiomDef {
  w: string;
  effect: IdiomEffect;
  /** 排好以後要集氣幾秒。 */
  charge: number;
  note: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  /** 每秒幾格。 */
  speed: number;
  reward: number;
  /** 走到書頁時扣幾點。 */
  leak: number;
  /** 每秒啃屏障多少血。 */
  bite: number;
  /** 飛白：屏障擋不住。 */
  flying?: boolean;
  /** 塗改：會把附近的字塗黑。 */
  inker?: boolean;
  /** 錯字：會把附近一個詞的兩個字對調。 */
  swapper?: boolean;
  /** 隱墨：看不見，要靠光環字照出來，或走到離書頁很近才現形。 */
  hidden?: boolean;
  /** 終章頭目：不會死，沒血時變成這個字的字卡。 */
  becomes?: string;
  boss?: boolean;
  /** 畫面上的大小（格）。 */
  size: number;
}

export interface SpawnGroup {
  enemy: string;
  count: number;
  /** 每隻間隔幾秒。 */
  every: number;
  /** 這一波開始後幾秒才出。 */
  delay: number;
}

export interface WaveDef {
  groups: SpawnGroup[];
  /** 這一波墨妖血量倍率。 */
  hp: number;
  boss?: boolean;
}

export interface ChapterRules {
  /** 開局手上就有的卡。 */
  startHand?: { kind: CardKind; v: string }[];
  /** 成語直接把整句亮出來，不用自己猜。 */
  idiomHint?: boolean;
  /** 對仗：同類的兩個詞上下（或左右）並排，四個字都變強。 */
  couplets?: boolean;
  /** 終章：把這個字連成詞，就收進字典、故事收尾。 */
  finale?: { char: string };
}

export interface ChapterDef {
  id: string;
  index: number;
  title: string;
  book: string;
  intro: string;
  /** 路徑的轉折點，相鄰兩點必須同一列或同一欄。 */
  waypoints: Cell[];
  waves: WaveDef[];
  /** 這章新解鎖的字。 */
  unlock: string[];
  /** 固定書箱（教學章）；沒有就讓玩家挑。 */
  fixedBox?: string[];
  parts: string[];
  tools: ToolId[];
  startCoins: number;
  rules?: ChapterRules;
  /** 準備階段的小提示，key 是第幾波（從 0 開始）。 */
  tips?: Record<number, string>;
  /** 守住以後補回來的書頁。 */
  story: string[];
  /** 終章有把字收進字典時，改用這段結局。 */
  storyArchived?: string[];
  /** 通關後才會出現在書箱裡的字。 */
  secret?: string[];
}

export interface Content {
  chars: CharDef[];
  words: WordDef[];
  idioms: IdiomDef[];
  recipes: RecipeDef[];
  enemies: EnemyDef[];
  chapters: ChapterDef[];
}

// ---- 執行中的狀態 ----

export type CardKind = 'char' | 'part' | 'tool';

export interface Card {
  uid: number;
  kind: CardKind;
  v: string;
  lv: number;
}

export interface TowerStats {
  dmg: number;
  range: number;
  cd: number;
  splash: number;
  slow: number;
  slowTicks: number;
  burn: number;
  freeze: number;
  crit: number;
  blockMax: number;
  /** 這座塔有沒有攻擊（輔助字沒有）。 */
  attacks: boolean;
}

export interface Tower {
  id: number;
  ch: string;
  lv: number;
  x: number;
  y: number;
  onPath: boolean;
  cool: number;
  /** 被塗黑還剩幾個 tick。 */
  inked: number;
  locked: boolean;
  /** 屏障目前血量（只有放在路上的屏障字有用）。 */
  block: number;
  stats: TowerStats;
}

export interface Enemy {
  id: number;
  def: string;
  hp: number;
  maxHp: number;
  /** 沿路徑走了幾格；0 是第一格中心。 */
  d: number;
  slowMul: number;
  slowLeft: number;
  frozen: number;
  burnDps: number;
  burnLeft: number;
  /** 塗改、錯字的冷卻。 */
  inkCool: number;
  /** 隱墨這個 tick 有沒有被照出來（一般墨妖永遠是 true）。 */
  seen: boolean;
}

/** 對仗：兩個同類的詞並排。 */
export interface Couplet {
  a: string;
  b: string;
  cells: Cell[];
}

/** 被錯字對調的兩座字塔，時間到會換回來。 */
export interface Swap {
  a: number;
  b: number;
  left: number;
}

export interface ActiveIdiom {
  w: string;
  cells: Cell[];
  dir: 'h' | 'v';
}

export interface Spawn {
  at: number;
  enemy: string;
}

export interface ActiveWord {
  w: string;
  a: Cell;
  b: Cell;
  lv: number;
  dir: 'h' | 'v';
}

export type GameEvent =
  | { t: 'hit'; from: Cell; to: { x: number; y: number }; kind: Kind; crit: boolean }
  | { t: 'kill'; x: number; y: number; reward: number }
  | { t: 'leak'; dmg: number }
  | { t: 'word'; w: string; fresh: boolean }
  | { t: 'merge'; x: number; y: number; lv: number }
  | { t: 'ink'; x: number; y: number }
  | { t: 'broken'; x: number; y: number }
  | { t: 'invalid'; reason: string }
  | { t: 'placed'; x: number; y: number }
  | { t: 'drew' }
  | { t: 'waveStart'; wave: number; boss: boolean }
  | { t: 'compose'; a: string; b: string; out: string }
  | { t: 'idiomReady'; w: string }
  | { t: 'couplet'; a: string; b: string; fresh: boolean }
  | { t: 'becomeCard'; ch: string }
  | { t: 'archived'; w: string }
  | { t: 'idiom'; w: string }
  | { t: 'swap'; a: Cell; b: Cell }
  | { t: 'waveEnd'; held: boolean; bonus: number };

export type Phase = 'prep' | 'wave' | 'done';

export interface GameState {
  chapter: string;
  seed: number;
  rng: number;
  tick: number;
  phase: Phase;
  wave: number;
  waveTick: number;
  spawns: Spawn[];
  path: Cell[];
  enemies: Enemy[];
  towers: Tower[];
  words: ActiveWord[];
  idioms: ActiveIdiom[];
  couplets: Couplet[];
  /** 每個成語的集氣（0～1）。 */
  charge: Record<string, number>;
  swaps: Swap[];
  /** 書頁還有幾個 tick 不會被啃。 */
  shield: number;
  /** 終章：已經把字收進字典。 */
  archived: boolean;
  /** 終章：字卡到手後，這一波還會等玩家幾個 tick。 */
  finaleWait: number;
  hand: Card[];
  box: string[];
  coins: number;
  drawsThisWave: number;
  drawsSinceUseful: number;
  pageHp: number;
  results: ('held' | 'lost')[];
  lostStreak: number;
  assist: number;
  /** 這一局發現過的詞和成語。 */
  found: string[];
  nextId: number;
  events: GameEvent[];
}
