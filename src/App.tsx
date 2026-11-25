import { useCallback, useState } from 'react';
import { ctx } from './content';
import { chapterOf } from './engine/ctx';
import { BoxPicker } from './ui/BoxPicker';
import { Dictionary } from './ui/Dictionary';
import { GameScreen } from './ui/GameScreen';
import { loadSave, recordBox, recordFound, recordResult, recordTutorial, type SaveData } from './ui/save';
import { Help } from './ui/Help';
import { Shelf } from './ui/Shelf';
import { unlockAudio } from './ui/sound';

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  window.addEventListener('keydown', unlockAudio, { capture: true });
}

type Screen =
  | { t: 'title' }
  | { t: 'shelf' }
  | { t: 'dict' }
  | { t: 'help' }
  | { t: 'box'; chapter: string }
  | { t: 'game'; chapter: string; box?: string[]; key: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ t: 'title' });
  const [save, setSave] = useState<SaveData>(loadSave);

  const onFound = useCallback((ws: string[]) => setSave((d) => recordFound(d, ws)), []);
  const onFinish = useCallback(
    (chapter: string) => (stars: number, found: string[], secret?: string) => setSave((d) => recordResult(d, chapter, stars, found, secret)),
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
        tutorial={screen.chapter === 'ch01' && !save.tutorialDone}
        onTutorialDone={() => setSave((d) => recordTutorial(d, true))}
      />
    );
  }
  if (screen.t === 'box') {
    return (
      <BoxPicker
        ctx={ctx}
        chapter={screen.chapter}
        last={save.boxes[screen.chapter]}
        secrets={save.secrets}
        onBack={() => setScreen({ t: 'shelf' })}
        onStart={(box) => {
          setSave((d) => recordBox(d, screen.chapter, box));
          play(screen.chapter, box);
        }}
      />
    );
  }
  if (screen.t === 'help') {
    return (
      <Help
        onBack={() => setScreen({ t: 'shelf' })}
        onReplayTutorial={() => {
          setSave((d) => recordTutorial(d, false));
          play('ch01');
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
        onHelp={() => setScreen({ t: 'help' })}
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
