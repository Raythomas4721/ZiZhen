import { useCallback, useState } from 'react';
import { ctx } from './content';
import { chapterOf } from './engine/ctx';
import { BoxPicker } from './ui/BoxPicker';
import { Dictionary } from './ui/Dictionary';
import { GameScreen } from './ui/GameScreen';
import { loadSave, recordBox, recordFound, recordResult, type SaveData } from './ui/save';
import { Shelf } from './ui/Shelf';

type Screen =
  | { t: 'title' }
  | { t: 'shelf' }
  | { t: 'dict' }
  | { t: 'box'; chapter: string }
  | { t: 'game'; chapter: string; box?: string[]; key: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ t: 'title' });
  const [save, setSave] = useState<SaveData>(loadSave);

  const onFound = useCallback((ws: string[]) => setSave((d) => recordFound(d, ws)), []);
  const onFinish = useCallback(
    (chapter: string) => (stars: number, found: string[]) => setSave((d) => recordResult(d, chapter, stars, found)),
    [],
  );

  const play = (chapter: string, box?: string[]) => setScreen({ t: 'game', chapter, box, key: Date.now() });
  const open = (chapter: string) => {
    // 教學章的書箱是固定的，直接開始；其他章先挑書箱
    if (chapterOf(ctx, chapter).fixedBox) play(chapter);
    else setScreen({ t: 'box', chapter });
  };

  if (screen.t === 'game') {
    return (
      <GameScreen
        key={screen.key}
        ctx={ctx}
        chapter={screen.chapter}
        box={screen.box}
        known={save.found}
        onExit={() => setScreen({ t: 'shelf' })}
        onFound={onFound}
        onFinish={onFinish(screen.chapter)}
        onRetry={() => play(screen.chapter, screen.box)}
      />
    );
  }
  if (screen.t === 'box') {
    return (
      <BoxPicker
        ctx={ctx}
        chapter={screen.chapter}
        last={save.boxes[screen.chapter]}
        onBack={() => setScreen({ t: 'shelf' })}
        onStart={(box) => {
          setSave((d) => recordBox(d, screen.chapter, box));
          play(screen.chapter, box);
        }}
      />
    );
  }
  if (screen.t === 'dict') {
    return <Dictionary ctx={ctx} save={save} onBack={() => setScreen({ t: 'shelf' })} />;
  }
  if (screen.t === 'shelf') {
    return (
      <Shelf
        ctx={ctx}
        save={save}
        onBack={() => setScreen({ t: 'title' })}
        onPlay={open}
        onDictionary={() => setScreen({ t: 'dict' })}
      />
    );
  }
  return (
    <main className="title">
      <div>
        <h1>字陣</h1>
        <p className="sub">書院的硯台打翻了，墨妖沿著書頁啃字。</p>
        <button className="primary" onClick={() => setScreen({ t: 'shelf' })}>
          進藏書閣
        </button>
      </div>
    </main>
  );
}
