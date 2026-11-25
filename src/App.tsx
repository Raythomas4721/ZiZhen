import { useState } from 'react';
import { ctx } from './content';
import { GameScreen } from './ui/GameScreen';

type Screen = { t: 'title' } | { t: 'game'; chapter: string };

export function App() {
  const [screen, setScreen] = useState<Screen>({ t: 'title' });

  if (screen.t === 'game') {
    return <GameScreen ctx={ctx} chapter={screen.chapter} onExit={() => setScreen({ t: 'title' })} />;
  }
  return (
    <main className="title">
      <div>
        <h1>字陣</h1>
        <p className="sub">墨妖要來啃字了。</p>
        <button className="primary" onClick={() => setScreen({ t: 'game', chapter: 'ch01' })}>
          守《蒙學》
        </button>
      </div>
    </main>
  );
}
