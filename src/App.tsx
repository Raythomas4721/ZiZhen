import { useCallback, useState } from 'react';
import { ctx } from './content';
import { GameScreen } from './ui/GameScreen';
import { loadSave, recordFound, recordResult, type SaveData } from './ui/save';
import { Shelf } from './ui/Shelf';

type Screen = { t: 'title' } | { t: 'shelf' } | { t: 'game'; chapter: string; box?: string[]; key: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ t: 'title' });
  const [save, setSave] = useState<SaveData>(loadSave);

  const onFound = useCallback((ws: string[]) => setSave((d) => recordFound(d, ws)), []);
  const onFinish = useCallback(
    (chapter: string) => (stars: number, found: string[]) => setSave((d) => recordResult(d, chapter, stars, found)),
    [],
  );

  const play = (chapter: string, box?: string[]) => setScreen({ t: 'game', chapter, box, key: Date.now() });

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
  if (screen.t === 'shelf') {
    return <Shelf ctx={ctx} save={save} onBack={() => setScreen({ t: 'title' })} onPlay={(id) => play(id)} />;
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
